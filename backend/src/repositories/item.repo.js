const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateItemCode = async (category_id) => {
    const category = await prisma.categories.findUnique({ where: { id: category_id } });
    const prefix = category?.code_prefix || "ITEM";
    const lastItem = await prisma.items.findFirst({
        where: { category_id, code: { startsWith: prefix } },
        orderBy: { code: 'desc' }
    });

    let nextNumber = 1;
    if (lastItem?.code) {
        const parts = lastItem.code.split('-');
        const lastRunningNo = parseInt(parts[1]);
        if (!isNaN(lastRunningNo)) nextNumber = lastRunningNo + 1;
    }

    let newCode = "";
    let isUnique = false;
    while (!isUnique) {
        newCode = `${prefix}-${String(nextNumber).padStart(6, '0')}`;
        const existingItem = await prisma.items.findFirst({ where: { code: newCode } });
        if (!existingItem) isUnique = true; else nextNumber++;
    }
    return newCode;
};

const SelectAllItems = (data = {}) => prisma.items.findMany({
    where: { deleted_at: null },
    orderBy: { id: 'desc' },
    include: {
        categories: {
            select: { id: true, name: true }
        },
        unit: {
            select: { id: true, name: true }
        },
    },
    ...data
});

const SelectItemById = (id, data = {}) => prisma.items.findUnique({
    where: { id },
    include: {
        categories: {
            select: { id: true, name: true }
        },
        unit: {
            select: { id: true, name: true }
        },
        item_lots: true,
    },
    ...data
});

const createItem = (data) => prisma.items.create({ data });

const updateItem = (id, data) => prisma.items.update({
    where: { id },
    data
});

const softDeletedItem = (id, data) => prisma.items.update({
    where: { id },
    data
});

const selectOptions = () => Promise.all([
    prisma.categories.findMany({ select: { id: true, name: true } }),
    prisma.units.findMany({ select: { id: true, name: true } }),
    prisma.warehouses.findMany({ select: { id: true, name: true } })
]);

module.exports = {
    generateItemCode,
    SelectAllItems,
    SelectItemById,
    createItem,
    updateItem,
    softDeletedItem,
    selectOptions,
}