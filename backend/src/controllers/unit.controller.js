const unitService = require('../services/unit.service')
const { sendResponse } = require('../utils/response');

const getUnits = async (req, res) => {
	try {
		const units = await unitService.getAllUnits();
		return sendResponse(res, 200, 'List all units success', units);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const getUnitById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const unit = await unitService.getUnitById(id);
		return sendResponse(res, 200, 'List unit by id success', unit);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const getUnitOption = async (req, res) => {
	try {
		const data = await unitService.getUnitOption();
		return sendResponse(res, 200, 'List unit options success', data);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const createUnit = async (req, res) => {
	try {
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const newUnit = await unitService.createUnit(data);
		req.io.emit('REFRESH_DATA', 'UNITS');

		return sendResponse(res, 201, 'Create unit success', newUnit);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const updateUnit = async (req, res) => {
	try {
		const { id } = req.params;
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const updatedUnit = await unitService.updateUnit(id, data);
		req.io.emit('REFRESH_DATA', 'UNITS');

		return sendResponse(res, 200, 'Update unit success', updatedUnit);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

const softDeletedUnit = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const deletedUnit = await unitService.softDeletedUnit(id);
		req.io.emit('REFRESH_DATA', 'UNITS');

		return sendResponse(res, 200, 'Delete unit success', deletedUnit);
	} catch (error) {
		return sendResponse(res, 500, error.message);
	}
}

module.exports = {
	getUnits,
	getUnitById,
	getUnitOption,
	createUnit,
	updateUnit,
	softDeletedUnit,
}