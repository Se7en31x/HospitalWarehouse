const supplierRepo = require('../repositories/supplier.repo')

const getSupplierOption = async () => {
	const options = await supplierRepo.selectOptions();
	return options;
}

module.exports = {
	getSupplierOption,
}