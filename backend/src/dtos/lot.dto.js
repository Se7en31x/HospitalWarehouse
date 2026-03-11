const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const parseClientDate = (value) => {
    if (!value) return null;

    const raw = value.toString().trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return dayjs.utc(raw, 'YYYY-MM-DD', true).startOf('day').toDate();
    }

    return dayjs(raw).toDate();
};

const createLotDTO = (payload, generatedLotCode) => {
    return {
        lot_code: generatedLotCode,
        item_id: payload.item_id,
        warehouse_id: payload.warehouse_id,
        quantity: Number(payload.quantity),
        cost_price: payload.cost_price, 
        supplier_id: payload.supplier_id || null,
        expried_at: parseClientDate(payload.expried_at),
        note: payload.note || null,
        status: 'ACTIVE',
    };
};

const adjustLotDTO = (payload) => {
    return {
        quantity: Number(payload.new_quantity),
        note: payload.note,
        status: payload.status,
    }
}

const updateLotDTO = (payload = {}) => {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'warehouse_id')) {
        data.warehouse_id = payload.warehouse_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'supplier_id')) {
        data.supplier_id = payload.supplier_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'cost_price')) {
        data.cost_price = payload.cost_price === null || payload.cost_price === undefined
            ? null
            : Number(payload.cost_price);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'expried_at')) {
        data.expried_at = parseClientDate(payload.expried_at);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
        data.status = payload.status;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'note')) {
        data.note = payload.note;
    }

    return data;
};

const deleteLotDTO = () => {
    return {
        status: 'DELETED',
        deleted_at: new Date(),
    };
};

module.exports = {
    createLotDTO,
    adjustLotDTO,
    deleteLotDTO,
    updateLotDTO,
};