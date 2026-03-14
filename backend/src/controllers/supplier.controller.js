const supplierService = require('../services/supplier.service')
const util = require('../utils/response');

const getSupplierOption = async (req, res) => {
	try {
		const data = await supplierService.getSupplierOption();
		return util.sendResponse(res, 200, 'List supplier options success', data);
	} catch (error) {
		return util.sendResponse(res, 500, error.message);
	}
}

module.exports = {
	getSupplierOption,
}