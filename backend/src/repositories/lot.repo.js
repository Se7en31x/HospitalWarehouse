// src/repositories/lot.repo.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

const generateLotCode = async (item_id) => {
    console.log("Generating lot code for item_id:", item_id);
    const item = await prisma.items.findUnique({ where: { id: item_id }, include: { category: true } });
    if (!item) throw new Error("Item not found for generating lot code");
    const prefix = item.category.code_prefix;
    const dateStr = dayjs().format('YYMMDD');

    const searchPattern = `${prefix}-${dateStr}-`;
    const lastLot = await prisma.item_lot.findFirst({
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
                { lot_code: { contains: search } },
                { items: { name: { contains: search } } },
                { items: { code: { contains: search } } }
            ]
        });
    }
    if (warehouse && warehouse !== 'ทั้งหมด') {
        where.AND.push({ warehouse_id: Number(warehouse) });
    }
    if (category && category !== 'ทั้งหมด') {
        where.AND.push({ items: { category: { name: category } } });
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
        prisma.item_lot.findMany({
            where,
            skip: offset,
            take: limit,
            include: {
                items: {
                    include: { category: true, unit: true }
                },
                warehouse: true,
                supplier: true
            },
            orderBy: { expried_at: 'asc' }
        }),
        prisma.item_lot.count({ where })
    ]);
    return { lots, total }
};

const selectLotById = async (id) => {
    if (!id) return null; 

    const lot = await prisma.item_lot.findUnique({
        where: { lot_code: id },
        include: {
            items: {
                include: { 
                    category: true, 
                    unit: true 
                }
            },
            warehouse: true,
            supplier: true
        },
    });

    return lot;
};

const createLot = async (data) => {
    const newLot = await prisma.item_lot.create({ data });
    return newLot;
}

const updateLot = async (lotCode, data) => {
    return await prisma.item_lot.update({
        where: { lot_code: lotCode },
        data: data
    });

};

module.exports = {
    generateLotCode,
    selectAllLot,
    whereClause,
    selectLotById,
    createLot,
    updateLot
};