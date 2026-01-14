const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const itemRepo = require('../repositories/item.repo')
const DTO = require('../dtos/item.dto')

const getAllItems = async () => {
    const items = await itemRepo.SelectAllItems();
    return items
}

const getItemById = async (id) => {
    const item = await itemRepo.SelectItemById(id);
    if (!item) throw new Error("Item id not found");

    return item
}

const createItem = async (data) => {
    const itemCode = await itemRepo.generateItemCode(data.category_id);
    const payload = DTO.createItemDTO(data, itemCode);
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

const softDeletedItem = async (id, user_id, user_name) => {
    const existingItem = await itemRepo.SelectItemById(id);
    if (!existingItem) throw new Error("Item id not found");

    const payload = DTO.softDeleteDTO(user_id, user_name)
    const itemDeleted = await itemRepo.softDeletedItem(payload)

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