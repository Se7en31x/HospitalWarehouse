const warehouseService = require('../services/warehouse.service')
const { sendResponse } = require('../utils/response');

const getWarehouses = async (req, res) => {
	try {
		const warehouses = await warehouseService.getAllWarehouses();
		return sendResponse(res, 200, 'List all warehouses success', warehouses);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const getWarehouseById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const warehouse = await warehouseService.getWarehouseById(id);
		return sendResponse(res, 200, 'List warehouse by id success', warehouse);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const getWarehouseOption = async (req, res) => {
	try {
		const data = await warehouseService.getWarehouseOption();
		return sendResponse(res, 200, 'List warehouse options success', data);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const createWarehouse = async (req, res) => {
	try {
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const newWarehouse = await warehouseService.createWarehouse(data);
		req.io.emit('REFRESH_DATA', 'WAREHOUSES');

		return sendResponse(res, 201, 'Create warehouse success', newWarehouse);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const updateWarehouse = async (req, res) => {
	try {
		const { id } = req.params;
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const updatedWarehouse = await warehouseService.updateWarehouse(id, data);
		req.io.emit('REFRESH_DATA', 'WAREHOUSES');

		return sendResponse(res, 200, 'Update warehouse success', updatedWarehouse);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const softDeletedWarehouse = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const deletedWarehouse = await warehouseService.softDeletedWarehouse(id);
		req.io.emit('REFRESH_DATA', 'WAREHOUSES');

		return sendResponse(res, 200, 'Delete warehouse success', deletedWarehouse);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

module.exports = {
	getWarehouses,
	getWarehouseById,
	getWarehouseOption,
	createWarehouse,
	updateWarehouse,
	softDeletedWarehouse,
}

