const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildUnitWhere = (keyword = '') => {
	if (!keyword) return {};

	return {
		OR: [
			{ name: { contains: keyword, mode: 'insensitive' } },
			{ description: { contains: keyword, mode: 'insensitive' } },
		],
	};
};

const SelectAllUnits = ({ page = 1, limit = 10, keyword = '' } = {}) => {
	const where = buildUnitWhere(keyword);
	const skip = (page - 1) * limit;

	return prisma.$transaction([
		prisma.units.findMany({
			where,
			orderBy: { id: 'desc' },
			skip,
			take: limit,
		}),
		prisma.units.count({ where }),
	]);
};

const SelectUnitById = (id, data = {}) => prisma.units.findUnique({
	where: { id },
	...data
});

const createUnit = (data) => prisma.units.create({ data });

const updateUnit = (id, data) => prisma.units.update({
	where: { id },
	data
});

const softDeletedUnit = (id) => prisma.units.delete({
	where: { id }
});

const selectOptions = () => prisma.units.findMany({
	orderBy: { name: 'asc' },
	select: { id: true, name: true }
});

module.exports = {
	SelectAllUnits,
	SelectUnitById,
	createUnit,
	updateUnit,
	softDeletedUnit,
	selectOptions,
}