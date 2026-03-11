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

const buildLotWhere = ({ keyword = '', warehouse_id = '', category_id = '', status = '', expiry_status = '' } = {}) => {
    const where = { deleted_at: null };
    const normalizedKeyword = (keyword || '').trim();

    if (normalizedKeyword) {
        where.OR = [
            { lot_code: { contains: normalizedKeyword, mode: 'insensitive' } },
            { item_name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { item_code: { contains: normalizedKeyword, mode: 'insensitive' } },
            { category_name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { warehouse_name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { supplier_name: { contains: normalizedKeyword, mode: 'insensitive' } },
        ];
    }

    if (warehouse_id && warehouse_id !== 'ทั้งหมด') {
        where.warehouse_id = warehouse_id;
    }

    if (category_id && category_id !== 'ทั้งหมด') {
        where.category_id = category_id;
    }

    const normalizedStatus = (status || '').toString().trim().toUpperCase();
    const normalizedExpiryStatus = (expiry_status || '').toString().trim().toUpperCase();

    if (normalizedStatus) {
        if (normalizedStatus === 'NEAR') {
            where.expiry_status = 'NEAR_EXPIRY';
        } else if (['EXPIRED', 'NEAR_EXPIRY', 'NORMAL', 'NO_EXPIRY'].includes(normalizedStatus)) {
            where.expiry_status = normalizedStatus;
        } else {
            where.status = normalizedStatus;
        }
    }

    if (normalizedExpiryStatus) {
        where.expiry_status = normalizedExpiryStatus === 'NEAR' ? 'NEAR_EXPIRY' : normalizedExpiryStatus;
    }

    return where;
};

const lotViewSelect = {
    id: true,
    lot_code: true,
    quantity: true,
    cost_price: true,
    status: true,
    note: true,
    expried_at: true,
    item_id: true,
    item_name: true,
    item_code: true,
    item_description: true,
    item_image: true,
    category_id: true,
    category_name: true,
    unit_id: true,
    unit_name: true,
    warehouse_id: true,
    warehouse_name: true,
    warehouse_location: true,
    supplier_id: true,
    supplier_name: true,
    supplier_contact: true,
    supplier_phone: true,
    days_until_expiry: true,
    total_value: true,
    expiry_status: true,
    created_at: true,
    updated_at: true,
};

const selectAllLot = ({ page = 1, limit = 10, keyword = '', warehouse_id = '', category_id = '', status = '', expiry_status = '' } = {}) => {
    const where = buildLotWhere({ keyword, warehouse_id, category_id, status, expiry_status });
    const skip = (page - 1) * limit;

    return prisma.$transaction([
        prisma.view_item_lots.findMany({
            where,
            select: lotViewSelect,
            orderBy: [{ expried_at: 'asc' }, { created_at: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.view_item_lots.count({ where }),
    ]);
};

const selectLotById = async (id) => {
    if (!id) return null;

    const lot = await prisma.view_item_lots.findFirst({
        where: { id, deleted_at: null },
        select: lotViewSelect,
    });

    return lot;
};

const createLot = async (data, tx = prisma) => {
    return tx.item_lots.create({
        data,
        select: {
            id: true,
        },
    });
}

const updateLot = async (lotId, data, tx = prisma) => {
    await tx.item_lots.updateMany({
        where: { id: lotId, deleted_at: null },
        data
    });

    return tx.item_lots.findFirst({
        where: { id: lotId, deleted_at: null },
        select: { id: true },
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
    selectLotById,
    createLot,
    updateLot,
    updateItemCurrentStock,
    withTransaction,
};