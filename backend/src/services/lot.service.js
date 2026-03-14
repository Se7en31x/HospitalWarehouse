const lotRepo = require('../repositories/lot.repo');
const stockMovementRepo = require('../repositories/stockmovement.repo');
const DTO = require('../dtos/lot.dto');

const getAllLots = async (query) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const keyword = (query.keyword || query.search || '').toString().trim();
    const warehouse_id = (query.warehouse_id || query.warehouse || '').toString().trim();
    const category_id = (query.category_id || query.category || '').toString().trim();
    const item_id = (query.item_id || query.item || '').toString().trim();
    const status = (query.status || '').toString().trim();

    const [items, total] = await lotRepo.selectAllLot({
        page,
        limit,
        keyword,
        warehouse_id,
        category_id,
        item_id,
        status,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        items: items.map(DTO.mapLotItem),
        total,
        page,
        limit,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
    };
}

const getLotById = async (id) => {
    const lot = await lotRepo.selectLotById(id);
    if (!lot) return null;

    const movements = await lotRepo.selectLotMovementHistory(id);

    return {
        ...DTO.mapLotItem(lot),
        movements: movements.map(DTO.mapLotMovement),
    };
}

const resolveNote = (payload = {}) => payload.note || null;

const adjustLotStock = async (lotId, payload, user = {}) => {
    const existingLot = await lotRepo.selectLotById(lotId);
    if (!existingLot) throw new Error("Lot id not found");

    const currentQty = Number(existingLot.quantity || 0);
    const hasNewQuantity = payload.new_quantity !== undefined && payload.new_quantity !== null;
    if (!hasNewQuantity) {
        throw new Error('new_quantity is required');
    }

    const newQty = Number(payload.new_quantity);
    if (Number.isNaN(newQty)) {
        throw new Error('new_quantity must be a valid number');
    }

    if (Number.isNaN(newQty) || newQty < 0) {
        throw new Error('new_quantity cannot be less than 0');
    }

    const qtyDiff = newQty - currentQty;
    const movementType = qtyDiff >= 0 ? 'ADJUST_IN' : 'ADJUST_OUT';
    const movementQty = Math.abs(qtyDiff);
    const reason = (payload.reason || '').toString().trim();
    const note = resolveNote(payload);
    const fullNote = reason
        ? `PHYSICAL_COUNT | ${reason}${note ? ` | ${note}` : ''}`
        : `PHYSICAL_COUNT${note ? ` | ${note}` : ''}`;

    return lotRepo.withTransaction(async (tx) => {
        const nextStatus = payload.status || existingLot.status;
        const data = DTO.adjustLotDTO({
            new_quantity: newQty,
            note,
            status: nextStatus,
        });

        await lotRepo.updateLot(lotId, data, tx);

        if (qtyDiff !== 0) {
            await stockMovementRepo.createStockMovement({
                item_id: existingLot.item_id,
                lot_id: existingLot.id,
                quantity: movementQty,
                type: movementType,
                note: fullNote,
                created_by: user.user_fullname || null,
                created_by_id: user.user_id ? Number(user.user_id) : null,
            }, tx);
        }

        const updatedLot = await lotRepo.selectLotById(lotId, tx);
        const movements = await lotRepo.selectLotMovementHistory(lotId, tx);

        return {
            ...DTO.mapLotItem(updatedLot),
            movements: movements.map(DTO.mapLotMovement),
        };
    });

}

module.exports = {
    getAllLots,
    getLotById,
    adjustLotStock,
};