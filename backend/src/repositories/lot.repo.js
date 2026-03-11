// src/repositories/lot.repo.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

const generateLotCode = async (item_id, tx = prisma) => {
    const item = await tx.items.findUnique({ where: { id: item_id }, include: { categories: true } });
    if (!item) throw new Error("Item not found for generating lot code");
    const prefix = item.categories?.code_prefix || 'ITEM';
    const dateStr = dayjs().format('YYMMDD');

    const searchPattern = `${prefix}-${dateStr}-`;
    const lastLot = await tx.item_lots.findFirst({
        where: {
            lot_code: { startsWith: searchPattern }
        },
        orderBy: { lot_code: 'desc' },
        select: { lot_code: true }
    });

    let runningNo = 1;
    if (lastLot) {
        const parts = lastLot.lot_code.split('-');
        const lastDigit = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastDigit)) runningNo = lastDigit + 1;
    }

    return `${prefix}-${dateStr}-${String(runningNo).padStart(4, '0')}`;

}

const whereClause = ({ search, warehouse, category, status }) => {
    const where = { AND: [] };
    where.AND.push({ deleted_at: null });
    if (search) {
        where.AND.push({
            OR: [
                { lot_code: { contains: search, mode: 'insensitive' } },
                { items: { name: { contains: search, mode: 'insensitive' } } },
                { items: { code: { contains: search, mode: 'insensitive' } } }
            ]
        });
    }
    if (warehouse && warehouse !== 'ทั้งหมด') {
        where.AND.push({ warehouse_id: warehouse });
    }
    if (category && category !== 'ทั้งหมด') {
        where.AND.push({ items: { categories: { name: category } } });
    }

    const today = dayjs();

    // 4. แก้ expired_at -> expried_at (ตาม Schema)
    if (status === 'EXPIRED') {
        where.AND.push({ expried_at: { lt: today.toDate() } });
    } else if (status === 'NEAR') {
        where.AND.push({
            expried_at: {
                gte: today.toDate(),
                lte: today.add(3, 'month').toDate()
            }
        });
    }
    return where;
};

const selectAllLot = async ({ where, offset, limit }) => {
    const [lots, total] = await prisma.$transaction([
        prisma.item_lots.findMany({
            where,
            skip: offset,
            take: limit,
            include: {
                items: {
                    include: { categories: true, unit: true }
                },
                warehouses: true,
                supplier: true
            },
            orderBy: { expried_at: 'asc' }
        }),
        prisma.item_lots.count({ where })
    ]);
    return { lots, total }
};

const selectLotById = async (id) => {
    if (!id) return null; 

    const lot = await prisma.item_lots.findFirst({
        where: { lot_code: id, deleted_at: null },
        include: {
            items: {
                include: { 
                    categories: true, 
                    unit: true 
                }
            },
            warehouses: true,
            supplier: true
        },
    });

    return lot;
};

const createLot = async (data, tx = prisma) => {
    const newLot = await tx.item_lots.create({ data });
    return newLot;
}

const updateLot = async (lotCode, data, tx = prisma) => {
    await tx.item_lots.updateMany({
        where: { lot_code: lotCode, deleted_at: null },
        data
    });

    return tx.item_lots.findFirst({
        where: { lot_code: lotCode, deleted_at: null },
        include: {
            items: {
                include: {
                    categories: true,
                    unit: true
                }
            },
            warehouses: true,
            supplier: true
        }
    });
};

const updateItemCurrentStock = async (itemId, qtyDiff, tx = prisma) => {
    return tx.items.update({
        where: { id: itemId },
        data: {
            current_stock: {
                increment: qtyDiff
            }
        }
    });
};

const withTransaction = async (callback) => {
    return prisma.$transaction((tx) => callback(tx));
};

module.exports = {
    generateLotCode,
    selectAllLot,
    whereClause,
    selectLotById,
    createLot,
    updateLot,
    updateItemCurrentStock,
    withTransaction,
};