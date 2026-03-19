const itemRepo = require('../repositories/item.repo')
const DTO = require('../dtos/item.dto')
const { uploadToCloudinary } = require('../middleware/upload')

const getAllItems = async ({ page = 1, limit = 10, keyword = '', start_date = '', end_date = '' } = {}) => {
    const [items, total] = await itemRepo.SelectAllItems({
        page,
        limit,
        keyword,
        start_date,
        end_date,
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

const getItemById = async (id) => {
    const item = await itemRepo.SelectItemById(id);
    if (!item) throw new Error("Item id not found");
    return item
}

const createItem = async (data, file = null) => {
    let image_url = null;
    let image_public_id = null;
    if (file) {
        const result = await uploadToCloudinary(file.buffer, 'items');
        image_url = result.secure_url;
        image_public_id = result.public_id;
    }

    const itemCode = await itemRepo.generateItemCode(data.category_id);
    const payload = DTO.createItemDTO({ ...data, image_url, image_public_id }, itemCode);
    const newItem = await itemRepo.createItem(payload);

    return newItem;
}

const updateItem = async (id, data) => {
    const existingItem = await itemRepo.SelectItemById(id);
    if (!existingItem) throw new Error("Item id not found");

    const payload = DTO.updateItemDTO(data);
    const itemUpdated = await itemRepo.updateItem(id, payload)
    return itemUpdated;
}

const softDeletedItem = async (id) => {
    const existingItem = await itemRepo.SelectItemById(id);
    if (!existingItem) throw new Error("Item id not found");

    const payload = DTO.softDeleteDTO()
    const itemDeleted = await itemRepo.softDeletedItem(id, payload)

    return itemDeleted;
}

const getItemOption = async () => {
    const [category, unit, warehouse] = await itemRepo.selectOptions();

    const result = {
        category: category,
        unit: unit,
        warehouse: warehouse
    };

    return result;
}

module.exports = {
    getAllItems,
    getItemById,
    createItem,
    getItemOption,
    softDeletedItem,
    updateItem,
}