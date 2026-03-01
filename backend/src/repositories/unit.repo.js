const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SelectAllUnits = (data = {}) => prisma.units.findMany({
	orderBy: { id: 'desc' },
	...data
});

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