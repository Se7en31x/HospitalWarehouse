const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SelectAllWarehouses = (data = {}) => prisma.warehouses.findMany({
	orderBy: { id: 'desc' },
	...data
});

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

