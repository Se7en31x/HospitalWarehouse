const categoryRepo = require('../repositories/category.repo')

const getAllCategories = async ({ page = 1, limit = 10, keyword = '' } = {}) => {
	const [items, total] = await categoryRepo.SelectAllCategories({ page, limit, keyword });
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
