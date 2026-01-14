const createItemDTO = (data, itemCode) => ({
    name: data.name,
    code: itemCode,
    min_stock: data.min_stock,
    category_id: data.category_id,
    unit_id: data.unit_id,
    status: data.status,
    image_url: data.image_url,
});

const updateItemDTO = (data) => ({
    name: data.name,
    min_stock: data.min_stock,
    unit_id: data.unit_id,
    status: data.status,
    image_url: data.image_url,
    updated_at: new Date(),
});

const softDeleteDTO = (user_id, user_name) => ({
    deleted_at: new Date(),
    deleted_by: user_name,
    deleted_by_id: user_id,
    status: "UNAVAILABLE",
});

module.exports = {
    createItemDTO,
    updateItemDTO,
    softDeleteDTO,
};