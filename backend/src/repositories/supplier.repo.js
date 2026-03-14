const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const selectOptions = () => prisma.supplier.findMany({
	where: { active: true },
	orderBy: { name: 'asc' },
	select: { id: true, name: true }
});

module.exports = {
	selectOptions,
}