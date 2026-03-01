const categoryService = require('../services/category.service')
const { sendResponse } = require('../utils/response');

const getCategories = async (req, res) => {
	try {
		const categories = await categoryService.getAllCategories();
		return sendResponse(res, 200, 'List all categories success', categories);
	} catch (error) {
		return sendResponse(res, 500, "failed to get categories");
	}
}

const getCategoryById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const category = await categoryService.getCategoryById(id);
		return sendResponse(res, 200, 'List category by id success', category);
	} catch (error) {
		return sendResponse(res, 500, "failed to get category by ID");
	}
}

const getCategoryOption = async (req, res) => {
	try {
		const data = await categoryService.getCategoryOption();
		return sendResponse(res, 200, 'List category options success', data);
	} catch (error) {
		return sendResponse(res, 500, 'failed to get category options');
	}
}

const createCategory = async (req, res) => {
	try {
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const newCategory = await categoryService.createCategory(data);
		req.io.emit('REFRESH_DATA', 'CATEGORIES');

		return sendResponse(res, 201, 'Create category success', newCategory);
	} catch (error) {
		return sendResponse(res, 500, "failed to create category");
	}
}

const updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const data = req.body;
		if (!data) {
			return sendResponse(res, 400, 'Invalid body data');
		}

		const updatedCategory = await categoryService.updateCategory(id, data);
		req.io.emit('REFRESH_DATA', 'CATEGORIES');

		return sendResponse(res, 200, 'Update category success', updatedCategory);
	} catch (error) {
		return sendResponse(res, 500, "failed to update category");
	}
}

const softDeletedCategory = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return sendResponse(res, 400, 'Invalid this parameter');
		}

		const deletedCategory = await categoryService.softDeletedCategory(id);
		req.io.emit('REFRESH_DATA', 'CATEGORIES');

		return sendResponse(res, 200, 'Delete category success', deletedCategory);
	} catch (error) {
		return sendResponse(res, 500, "failed to delete category");
	}
}

module.exports = {
	getCategories,
	getCategoryById,
	getCategoryOption,
	createCategory,
	updateCategory,
	softDeletedCategory,
}