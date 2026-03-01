const itemService = require('../services/item.service')
const { sendResponse } = require('../utils/response');

const getItems = async (req, res) => {
    try {
        const items = await itemService.getAllItems()
        return sendResponse(res, 200, "List all items success", items)
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
};

const getItemById = async (req, res) => {
    try {
        // validator parameter 
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Invalid this parameter");
        }

        const item = await itemService.getItemById(id)
        return sendResponse(res, 200, "List item by id success", item)

    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
}

const getItemOption = async (req, res) => {
    try {
        const data = await itemService.getItemOption()
        return sendResponse(res, 200, "list item options success", data)
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
}

const createItem = async (req, res) => {
    try {
        const data = req.body
        if (!data) {
            return sendResponse(res, 400, "Invalid body data")
        }

        const newItem = await itemService.createItem(data)
        req.io.emit('REFRESH_DATA', 'ITEMS');

        return sendResponse(res, 201, "create item success", newItem)
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
}

const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!data) {
            return sendResponse(res, 400, "Invalid body data")
        }

        const updatedItem = await itemService.updateItem(id, data);
        req.io.emit('REFRESH_DATA', 'ITEMS');

        return sendResponse(res, 200, "update item success", updatedItem)
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
}

const softDeletedItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Invalid this parameter");
        }
        const deletedItem = await itemService.softDeletedItem(id, req.user.user_id, req.user.user_fullname)

        req.io.emit('REFRESH_DATA', 'ITEMS');

        return sendResponse(res, 200, "delete item success", deletedItem)
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
}

module.exports = {
    getItems,
    getItemById,
    createItem,
    getItemOption,
    softDeletedItem,
    updateItem,
}