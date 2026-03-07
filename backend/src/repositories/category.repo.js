const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildCategoryWhere = (keyword = '') => {
	if (!keyword) return {};

	return {
		OR: [
			{ name: { contains: keyword, mode: 'insensitive' } },
			{ code_prefix: { contains: keyword, mode: 'insensitive' } },
			{ description: { contains: keyword, mode: 'insensitive' } },
		],
	};
};

const SelectAllCategories = ({ page = 1, limit = 10, keyword = '' } = {}) => {
	const where = buildCategoryWhere(keyword);
	const skip = (page - 1) * limit;

	return prisma.$transaction([
		prisma.categories.findMany({
			where,
			orderBy: { id: 'desc' },
			skip,
			take: limit,
		}),
		prisma.categories.count({ where }),
	]);
};

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