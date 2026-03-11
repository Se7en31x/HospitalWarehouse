const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildItemWhere = ({ keyword = '', start_date = '', end_date = '' } = {}) => {
    const normalizedKeyword = (keyword || '').trim();

    const where = { deleted_at: null };

    if (normalizedKeyword) {
        where.OR = [
            { code: { contains: normalizedKeyword, mode: 'insensitive' } },
            { name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { category_name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { unit_name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { warehouse_name: { contains: normalizedKeyword, mode: 'insensitive' } },
        ];
    }

    const dateFilter = {};
    if (start_date) {
        const startDate = new Date(start_date);
        if (!Number.isNaN(startDate.getTime())) {
            dateFilter.gte = startDate;
        }
    }

    if (end_date) {
        const endDate = new Date(end_date);
        if (!Number.isNaN(endDate.getTime())) {
            endDate.setHours(23, 59, 59, 999);
            dateFilter.lte = endDate;
        }
    }

    if (Object.keys(dateFilter).length > 0) {
        where.created_at = dateFilter;
    }

    return where;
};

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

const SelectAllItems = ({ page = 1, limit = 10, keyword = '', start_date = '', end_date = '' } = {}) => {
    const where = buildItemWhere({ keyword, start_date, end_date });
    const skip = (page - 1) * limit;

    return prisma.$transaction([
        prisma.view_items.findMany({
            where,
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                category_id: true,
                category_name: true,
                unit_id: true,
                unit_name: true,
                warehouse_id: true,
                warehouse_name: true,
                current_stock: true,
                min_stock: true,
                status: true,
                image_url: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit,
        }),
        prisma.view_items.count({ where }),
    ]);
};

const SelectItemById = (id, data = {}) => {
    return prisma.view_items.findUnique({
        where: { id, deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            description: true,
            category_id: true,
            category_name: true,
            unit_id: true,
            unit_name: true,
            warehouse_id: true,
            warehouse_name: true,
            current_stock: true,
            min_stock: true,
            sell_price: true,
            status: true,
            image_url: true,
            created_at: true,
            updated_at: true,
        }
    });
};

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