const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SelectAllCategories = (data = {}) => prisma.categories.findMany({
	orderBy: { id: 'desc' },
	...data
});

const SelectCategoryById = (id, data = {}) => prisma.categories.findUnique({
	where: { id },
	...data
});

const createCategory = (data) => prisma.categories.create({ data });

const updateCategory = (id, data) => prisma.categories.update({
	where: { id },
	data
});

const softDeletedCategory = (id) => prisma.categories.delete({
	where: { id }
});

const selectOptions = () => prisma.categories.findMany({
	orderBy: { name: 'asc' },
	select: { id: true, name: true }
});

module.exports = {
	SelectAllCategories,
	SelectCategoryById,
	createCategory,
	updateCategory,
	softDeletedCategory,
	selectOptions,
}