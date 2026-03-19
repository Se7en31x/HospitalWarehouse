const createItemDTO = (data, itemCode) => ({
    name: data.name,
    code: itemCode,
    min_stock: data.min_stock,
    category_id: data.category_id,
    warehouse_id: data.warehouse_id,
    unit_id: data.unit_id,
    status: data.status,
    image_url: data.image_url || null,
    image_public_id: data.image_public_id || null,
});

const updateItemDTO = (data = {}) => {
    const payload = {};

    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
        payload.name = data.name;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        payload.description = data.description;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'min_stock')) {
        payload.min_stock = data.min_stock === null || data.min_stock === undefined
            ? null
            : Number(data.min_stock);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'unit_id')) {
        payload.unit_id = data.unit_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'warehouse_id')) {
        payload.warehouse_id = data.warehouse_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'category_id')) {
        payload.category_id = data.category_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sell_price')) {
        payload.sell_price = data.sell_price === null || data.sell_price === undefined
            ? null
            : Number(data.sell_price);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'status')) {
        payload.status = data.status;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'image_url')) {
        payload.image_url = data.image_url;
    }

    return payload;
};

const softDeleteDTO = () => ({
    deleted_at: new Date(),
    status: "UNAVAILABLE",
});

module.exports = {
    createItemDTO,
    updateItemDTO,
    softDeleteDTO,
};