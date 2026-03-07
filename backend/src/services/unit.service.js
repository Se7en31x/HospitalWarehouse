const unitRepo = require('../repositories/unit.repo')

const getAllUnits = async ({ page = 1, limit = 10, keyword = '' } = {}) => {
	const [items, total] = await unitRepo.SelectAllUnits({ page, limit, keyword });
	const totalPages = Math.max(1, Math.ceil(total / limit));

	return {
		items,
		total,
		page,
		limit,
		totalPages,
		nextPage: page < totalPages ? page + 1 : null,
		prevPage: page > 1 ? page - 1 : null,
		keyword,
	};
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
