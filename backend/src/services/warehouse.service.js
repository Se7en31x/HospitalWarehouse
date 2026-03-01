const warehouseRepo = require('../repositories/warehouse.repo')

const getAllWarehouses = async () => {
	const warehouses = await warehouseRepo.SelectAllWarehouses();
	return warehouses;
}

const getWarehouseById = async (id) => {
	const warehouse = await warehouseRepo.SelectWarehouseById(id);
	if (!warehouse) throw new Error('Warehouse id not found');
	return warehouse;
}

const createWarehouse = async (data) => {
	const newWarehouse = await warehouseRepo.createWarehouse(data);
	return newWarehouse;
}

const updateWarehouse = async (id, data) => {
	const existingWarehouse = await warehouseRepo.SelectWarehouseById(id);
	if (!existingWarehouse) throw new Error('Warehouse id not found');

	const updatedWarehouse = await warehouseRepo.updateWarehouse(id, data);
	return updatedWarehouse;
}

const softDeletedWarehouse = async (id) => {
	const existingWarehouse = await warehouseRepo.SelectWarehouseById(id);
	if (!existingWarehouse) throw new Error('Warehouse id not found');

	const deletedWarehouse = await warehouseRepo.softDeletedWarehouse(id);
	return deletedWarehouse;
}

const getWarehouseOption = async () => {
	const options = await warehouseRepo.selectOptions();
	return options;
}

module.exports = {
	getAllWarehouses,
	getWarehouseById,
	createWarehouse,
	updateWarehouse,
	softDeletedWarehouse,
	getWarehouseOption,
}
