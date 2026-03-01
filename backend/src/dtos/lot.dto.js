const dayjs = require('dayjs'); // อย่าลืม import
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// ตั้งค่าให้รู้จัก Timezone
dayjs.extend(utc);
dayjs.extend(timezone);

const createLotDTO = (payload, generatedLotCode) => {
    return {
        lot_code: generatedLotCode,
        item_id: payload.item_id,
        warehouse_id: payload.warehouse_id,
        quantity: Number(payload.quantity),
        cost_price: payload.cost_price, 
        supplier_id: payload.supplier_id || null,
        expried_at: dayjs(payload.expried_at).toDate(),
        status: 'ACTIVE',
        created_at: new Date()
    };
};

const adjustLotDTO = (payload) => {
    return {
        quantity: Number(payload.new_quantity),
        reason: payload.reason,
        updated_at: new Date(),
    }
}

const deleteLotDTO = (userID) => {
    const deletedBy = Number(userID);
    return {
        status: 'DELETED',
        deleted_at: new Date(),
        deleted_by: Number.isNaN(deletedBy) ? null : deletedBy,
    };
};

module.exports = {
    createLotDTO,
    adjustLotDTO,
    deleteLotDTO,
};