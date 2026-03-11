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
    description: data.description,
    min_stock: data.min_stock,
    unit_id: data.unit_id,
    warehouse_id: data.warehouse_id, 
    category_id: data.category_id,
    sell_price: data.sell_price,    
    status: data.status,
    image_url: data.image_url,
});

const softDeleteDTO = () => ({
    deleted_at: new Date(),
    status: "UNAVAILABLE",
});

module.exports = {
    createItemDTO,
    updateItemDTO,
    softDeleteDTO,
};