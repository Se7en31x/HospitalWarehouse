const lotRepo = require('../repositories/lot.repo');
const stockMovementRepo = require('../repositories/stockmovement.repo');
const DTO = require('../dtos/lot.dto');

const ADJUST_TYPES = ['EXPIRED', 'DAMAGED', 'ADJUST'];
const ADJUST_TYPE_ALIAS = {
    'หมดอายุ': 'EXPIRED',
    'ชำรุด': 'DAMAGED',
    'ปรับยอด': 'ADJUST',
};

const normalizeAdjustType = (value = '') => {
    const raw = value.toString().trim();
    const fromAlias = ADJUST_TYPE_ALIAS[raw];
    return (fromAlias || raw).toUpperCase();
};

const getAllLots = async (query) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const keyword = (query.keyword || query.search || '').toString().trim();
    const warehouse_id = (query.warehouse_id || query.warehouse || '').toString().trim();
    const category_id = (query.category_id || query.category || '').toString().trim();
    const status = (query.status || '').toString().trim();
    const expiry_status = (query.expiry_status || '').toString().trim();

    const [items, total] = await lotRepo.selectAllLot({
        page,
        limit,
        keyword,
        warehouse_id,
        category_id,
        status,
        expiry_status,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        items,
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
    return lot;
}

const resolveNote = (payload = {}) => payload.note || null;

const stockInLot = async (payload, user = {}) => {
    const qty = Number(payload.quantity);
    if (!payload.item_id) throw new Error('item_id is required');
    if (!payload.warehouse_id) throw new Error('warehouse_id is required');
    if (Number.isNaN(qty) || qty <= 0) throw new Error('quantity must be greater than 0');

    return lotRepo.withTransaction(async (tx) => {
        const generatedCode = await lotRepo.generateLotCode(payload.item_id, tx);
        const data = DTO.createLotDTO(payload, generatedCode);
        const newLot = await lotRepo.createLot(data, tx);

        await lotRepo.updateItemCurrentStock(payload.item_id, qty, tx);

        await stockMovementRepo.createStockMovement({
            item_id: payload.item_id,
            lot_id: newLot.id,
            quantity: qty,
            type: 'STOCK_IN',
            note: resolveNote(payload) || 'รับเข้าสินค้า',
            created_by: user.user_fullname || null,
            created_by_id: user.user_id ? Number(user.user_id) : null,
        }, tx);

        return newLot;
    });
}

const adjustLotStock = async (lotId, payload, user = {}) => {
    const existingLot = await lotRepo.selectLotById(lotId);
    if (!existingLot) throw new Error("Lot id not found");

    const type = normalizeAdjustType(payload.type || '');
    if (!ADJUST_TYPES.includes(type)) {
        throw new Error('type must be EXPIRED, DAMAGED, or ADJUST');
    }

    const currentQty = Number(existingLot.quantity || 0);
    let newQty;

    if (payload.new_quantity !== undefined && payload.new_quantity !== null) {
        newQty = Number(payload.new_quantity);
    } else {
        const adjustQty = Number(payload.adjust_quantity || 0);
        const direction = (payload.direction || (type === 'ADJUST' ? 'IN' : 'OUT')).toString().trim().toUpperCase();

        if (Number.isNaN(adjustQty) || adjustQty <= 0) {
            throw new Error('adjust_quantity must be greater than 0');
        }
        if (!['IN', 'OUT'].includes(direction)) {
            throw new Error('direction must be IN or OUT');
        }

        newQty = direction === 'IN' ? currentQty + adjustQty : currentQty - adjustQty;
    }

    if (Number.isNaN(newQty) || newQty < 0) {
        throw new Error('new_quantity cannot be less than 0');
    }

    const qtyDiff = newQty - currentQty;
    const movementDirection = qtyDiff >= 0 ? 'IN' : 'OUT';
    const movementQty = Math.abs(qtyDiff);
    const note = resolveNote(payload);

    return lotRepo.withTransaction(async (tx) => {
        const nextStatus = payload.status || (type === 'EXPIRED' || type === 'DAMAGED' ? type : existingLot.status);
        const data = DTO.adjustLotDTO({
            new_quantity: newQty,
            note,
            status: nextStatus,
        });

        const updatedLot = await lotRepo.updateLot(lotId, data, tx);

        if (qtyDiff !== 0) {
            await lotRepo.updateItemCurrentStock(existingLot.item_id, qtyDiff, tx);

            await stockMovementRepo.createStockMovement({
                item_id: existingLot.item_id,
                lot_id: existingLot.id,
                quantity: movementQty,
                type,
                note: `${movementDirection} | ${note || 'ปรับยอดสต็อก'}`,
                created_by: user.user_fullname || null,
                created_by_id: user.user_id ? Number(user.user_id) : null,
            }, tx);
        }

        return updatedLot;
    });

}
const updateLot = async (lotId, payload) => {
    const existingLot = await lotRepo.selectLotById(lotId);
    if (!existingLot) throw new Error('Lot id not found');

    const data = DTO.updateLotDTO(payload);
    const updatedLot = await lotRepo.updateLot(lotId, data);
    return updatedLot;

}

const deleteLot = async (lotId) => {
    const existingLot = await lotRepo.selectLotById(lotId);
    if (!existingLot) throw new Error("Lot id not found");

    const data = DTO.deleteLotDTO()
    return await lotRepo.updateLot(lotId, data)

}

module.exports = {
    getAllLots,
    getLotById,
    stockInLot,
    adjustLotStock,
    updateLot,
    deleteLot,
};