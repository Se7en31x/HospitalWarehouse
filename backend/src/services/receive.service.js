const DTO = require('../dtos/receive.dto');
const receiveRepo = require('../repositories/receive.repo');
const lotRepo = require('../repositories/lot.repo');
const stockMovementRepo = require('../repositories/stockmovement.repo');

const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const createReceive = async (data, userSession) => {
    const createdById = userSession?.user_id || null;
    const createdByName = userSession?.user_fullname || createdById || 'SYSTEM';

    return receiveRepo.withTransaction(async (tx) => {
        const headerPayload = DTO.createReceiveHeaderDTO(data, createdById);
        const header = await receiveRepo.createReceiveHeader(headerPayload, tx);

        const receiveItemsPayload = DTO.createReceiveItemsDTO(data.items, header.id);
        await receiveRepo.createReceiveItems(receiveItemsPayload, tx);

        for (const item of data.items) {
            const lotUpsertPayload = DTO.createLotUpsertDTO(item);

            const lot = await lotRepo.upsertItemLot(
                {
                    where: lotUpsertPayload.where,
                    update: lotUpsertPayload.update,
                    create: lotUpsertPayload.create,
                },
                tx
            );

            const stockMovementPayload = DTO.createStockMovementDTO(
                item,
                data.doc_no,
                createdByName,
                createdById,
                lot.id
            );
            await stockMovementRepo.createStockMovement(stockMovementPayload, tx);
        }

        const createdHeader = await receiveRepo.SelectReceiveById(header.id, tx);
        return DTO.mapReceiveHeaderResponse(createdHeader);
    });
};

const getReceives = async ({ page = 1, limit = 10, keyword = '', type = '', start_date = '', end_date = '' } = {}) => {
    const [items, total] = await receiveRepo.SelectAllReceives({
        page,
        limit,
        keyword,
        type,
        start_date,
        end_date,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        items: items.map(DTO.mapReceiveHeaderResponse),
        total,
        page,
        limit,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
    };
};

const getReceiveById = async (headerId) => {
    const header = await receiveRepo.SelectReceiveById(headerId);
    if (!header) {
        throw createHttpError(404, 'Receive document not found');
    }

    return DTO.mapReceiveHeaderResponse(header);
};

const cancelReceive = async (headerId, userSession, reason = '') => {
    const updatedById = userSession?.user_id || null;
    const updatedByName = userSession?.user_fullname || updatedById || 'SYSTEM';

    return receiveRepo.withTransaction(async (tx) => {
        const header = await receiveRepo.SelectReceiveById(headerId, tx);
        if (!header) {
            throw createHttpError(404, 'Receive document not found');
        }

        if (header.status === 'CANCELLED') {
            throw createHttpError(400, 'This receive document has already been cancelled');
        }

        for (const receiveItem of header.receive_item) {
            const lot = await lotRepo.selectLotByItemAndCode(receiveItem.item_id, receiveItem.lot_code, tx);
            const lotQty = Number(lot?.quantity || 0);
            const receiveQty = Number(receiveItem.qty || 0);

            if (!lot || lotQty < receiveQty) {
                throw createHttpError(400, 'Cancellation failed: some items have already been issued');
            }
        }

        for (const receiveItem of header.receive_item) {
            const lot = await lotRepo.selectLotByItemAndCode(receiveItem.item_id, receiveItem.lot_code, tx);
            const receiveQty = Number(receiveItem.qty || 0);

            const decremented = await lotRepo.decrementLotQuantitySafe(lot.id, receiveQty, tx);
            if (!decremented.count) {
                throw createHttpError(400, 'Cancellation failed: some items have already been issued');
            }

            const movementPayload = DTO.createCancelStockMovementDTO(
                receiveItem,
                header.doc_no,
                updatedByName,
                updatedById,
                lot.id
            );
            await stockMovementRepo.createStockMovement(movementPayload, tx);
        }

        const cancelNote = reason?.trim()
            ? `[CANCEL] ${reason.trim()}`
            : '[CANCEL] receive document cancelled';

        await receiveRepo.updateReceiveHeader(
            headerId,
            {
                status: 'CANCELLED',
                note: header.note ? `${header.note}\n${cancelNote}` : cancelNote,
            },
            tx
        );

        const cancelledHeader = await receiveRepo.SelectReceiveById(headerId, tx);
        return DTO.mapReceiveHeaderResponse(cancelledHeader);
    });
};

module.exports = {
    createReceive,
    getReceives,
    getReceiveById,
    cancelReceive,
};
