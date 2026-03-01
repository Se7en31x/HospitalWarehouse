const unitRepo = require('../repositories/unit.repo')

const getAllUnits = async () => {
	const units = await unitRepo.SelectAllUnits();
	return units;
}

const getUnitById = async (id) => {
	const unit = await unitRepo.SelectUnitById(id);
	if (!unit) throw new Error('Unit id not found');
	return unit;
}

const createUnit = async (data) => {
	const newUnit = await unitRepo.createUnit(data);
	return newUnit;
}

const updateUnit = async (id, data) => {
	const existingUnit = await unitRepo.SelectUnitById(id);
	if (!existingUnit) throw new Error('Unit id not found');

	const updatedUnit = await unitRepo.updateUnit(id, data);
	return updatedUnit;
}

const softDeletedUnit = async (id) => {
	const existingUnit = await unitRepo.SelectUnitById(id);
	if (!existingUnit) throw new Error('Unit id not found');

	const deletedUnit = await unitRepo.softDeletedUnit(id);
	return deletedUnit;
}

const getUnitOption = async () => {
	const options = await unitRepo.selectOptions();
	return options;
}

module.exports = {
	getAllUnits,
	getUnitById,
	createUnit,
	updateUnit,
	softDeletedUnit,
	getUnitOption,
}
