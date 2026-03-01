const categoryRepo = require('../repositories/category.repo')

const getAllCategories = async () => {
	const categories = await categoryRepo.SelectAllCategories();
	return categories;
}

const getCategoryById = async (id) => {
	const category = await categoryRepo.SelectCategoryById(id);
	if (!category) throw new Error('Category id not found');
	return category;
}

const createCategory = async (data) => {
	const newCategory = await categoryRepo.createCategory(data);
	return newCategory;
}

const updateCategory = async (id, data) => {
	const existingCategory = await categoryRepo.SelectCategoryById(id);
	if (!existingCategory) throw new Error('Category id not found');

	const updatedCategory = await categoryRepo.updateCategory(id, data);
	return updatedCategory;
}

const softDeletedCategory = async (id) => {
	const existingCategory = await categoryRepo.SelectCategoryById(id);
	if (!existingCategory) throw new Error('Category id not found');

	const deletedCategory = await categoryRepo.softDeletedCategory(id);
	return deletedCategory;
}

const getCategoryOption = async () => {
	const options = await categoryRepo.selectOptions();
	return options;
}

module.exports = {
	getAllCategories,
	getCategoryById,
	createCategory,
	updateCategory,
	softDeletedCategory,
	getCategoryOption,
}
