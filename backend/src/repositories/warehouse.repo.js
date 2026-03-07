const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildWarehouseWhere = (keyword = '') => {
	if (!keyword) return {};

	return {
		OR: [
			{ name: { contains: keyword, mode: 'insensitive' } },
			{ location: { contains: keyword, mode: 'insensitive' } },
			{ description: { contains: keyword, mode: 'insensitive' } },
		],
	};
};

const SelectAllWarehouses = ({ page = 1, limit = 10, keyword = '' } = {}) => {
	const where = buildWarehouseWhere(keyword);
	const skip = (page - 1) * limit;

	return prisma.$transaction([
		prisma.warehouses.findMany({
			where,
			orderBy: { id: 'desc' },
			skip,
			take: limit,
		}),
		prisma.warehouses.count({ where }),
	]);
};

const SelectWarehouseById = (id, data = {}) => prisma.warehouses.findUnique({
	where: { id },
	...data
});

const createWarehouse = (data) => prisma.warehouses.create({ data });

const updateWarehouse = (id, data) => prisma.warehouses.update({
	where: { id },
	data
}); 

const softDeletedWarehouse = (id) => prisma.warehouses.delete({
	where: { id }
});

const selectOptions = () => prisma.warehouses.findMany({
	orderBy: { name: 'asc' },
	select: { id: true, name: true }
});

module.exports = {
	SelectAllWarehouses,
	SelectWarehouseById,
	createWarehouse,
	updateWarehouse,
	softDeletedWarehouse,
	selectOptions,
};

