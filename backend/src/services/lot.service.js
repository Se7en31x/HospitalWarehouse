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

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = lotRepo.whereClause({
        search: query.search,
        warehouse: query.warehouse,
        category: query.category,
        status: query.status
    });
    const { lots, total } = await lotRepo.selectAllLot({ where, offset, limit })

    return {
        metaData: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        },
        data: lots,

    };
}

const getLotById = async (id) => {
    const lot = await lotRepo.selectLotById(id);
    return lot;
}

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
            lot_id: newLot.lot_code,
            quantity: qty,
            type: 'STOCK_IN',
            reason: payload.reason || 'รับเข้าสินค้า',
            created_by: user.user_fullname || null,
            created_by_id: user.user_id ? Number(user.user_id) : null,
        }, tx);

        return newLot;
    });
}

const adjustLotStock = async (lotCode, payload, user = {}) => {
    const existingLot = await lotRepo.selectLotById(lotCode);
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

    return lotRepo.withTransaction(async (tx) => {
        const nextStatus = payload.status || (type === 'EXPIRED' || type === 'DAMAGED' ? type : existingLot.status);
        const data = DTO.adjustLotDTO({
            new_quantity: newQty,
            reason: payload.reason,
            status: nextStatus,
        });

        const updatedLot = await lotRepo.updateLot(lotCode, data, tx);

        if (qtyDiff !== 0) {
            await lotRepo.updateItemCurrentStock(existingLot.item_id, qtyDiff, tx);

            await stockMovementRepo.createStockMovement({
                item_id: existingLot.item_id,
                lot_id: lotCode,
                quantity: movementQty,
                type,
                reason: `${movementDirection} | ${payload.reason || 'ปรับยอดสต็อก'}`,
                created_by: user.user_fullname || null,
                created_by_id: user.user_id ? Number(user.user_id) : null,
            }, tx);
        }

        return updatedLot;
    });

}

const updateLot = async (lotCode, payload) => {
    const existingLot = await lotRepo.selectLotById(lotCode);
    if (!existingLot) throw new Error('Lot id not found');

    const data = DTO.updateLotDTO(payload);
    const updatedLot = await lotRepo.updateLot(lotCode, data);
    return updatedLot;

}

const deleteLot = async (lotCode, claim) => {
    const existingLot = await lotRepo.selectLotById(lotCode);
    if (!existingLot) throw new Error("Lot id not found");

    const data = DTO.deleteLotDTO(claim.user_id)
    return await lotRepo.updateLot(lotCode, data)

}

module.exports = {
    getAllLots,
    getLotById,
    stockInLot,
    adjustLotStock,
    updateLot,
    deleteLot,
    createLot: stockInLot,
    adjustLot: adjustLotStock,

};