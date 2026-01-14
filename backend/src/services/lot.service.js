const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getAllLots = async () => {
    try {
        const lots = await prisma.item_lot.findMany({
            where: { deleted_at: null },
            orderBy: { created_at: 'desc' },
            include: {
                items: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        image_url: true,
                        category: {
                            select: { name: true }
                        },
                        unit: {
                            select: { name: true }
                        }
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                        location: true
                    }
                }
            }
        });
        const formatLots = lots.map(lot => {
            return {
                id: lot.id,
                item_id: lot.item_id,
                item_code: lot.items?.code || "-",
                item_name: lot.items?.name || "ไม่ระบุชื่อสินค้า",
                image_url: lot.image_url || lot.items?.image_url || "", // ใช้รูป Lot ก่อน ถ้าไม่มีใช้รูป Item
                category_name: lot.items?.category?.name || "-",
                unit_name: lot.items?.unit?.name || "ชิ้น",
                quantity: lot.quantity || 0,
                expiry_date: lot.expried_at,
                status: lot.status || "active",
                warehouse_name: lot.warehouse?.name || "-",
                created_at: lot.created_at
            };
        });

        return formatLots;

    } catch (error) {
        console.error("Error getting all lots:", error);
        throw new Error("Cannot fetch lots data");
    }
}

const getLotById = async (id) => {
    try {
        const lot = await prisma.item_lot.findUnique({
            where: { id: id },
            include: {
                items: {
                    include: {
                        category: true,
                        unit: true
                    }
                },
                warehouse: true
            }
        });

        if (!lot) return null;

        // Format แบบเดียวกับ getAllLots
        return {
            id: lot.id,
            item_id: lot.item_id,
            item_code: lot.items?.code,
            item_name: lot.items?.name,
            image_url: lot.image_url || lot.items?.image_url,
            category_name: lot.items?.category?.name,
            unit_name: lot.items?.unit?.name,
            quantity: lot.quantity,
            expiry_date: lot.expried_at, // ⚠️ ตาม Schema
            status: lot.status,
            warehouse_name: lot.warehouse?.name,
            warehouse_id: lot.warehouse_id,
            created_at: lot.created_at
        };

    } catch (error) {
        console.error(`Error getting lot id ${id}:`, error);
        throw error;
    }
};

const adjustLot = async (lot_id, payload, user) => {

    const { quantity, type, reason } = payload;
    const adjustQty = parseInt(quantity);

    return await prisma.$transaction(async (tx) => {
        const lot = await tx.item_lot.findUnique({
            where: { id: lot_id }
        });
        if (!lot) throw new Error("ไม่พบช้อมูล Lot");

        let newQuantity = 0;
        let diffQuantity = 0;
        const currentQty = lot.quantity || 0;

        if (type === 'adjust') {
            if (adjustQty < 0) throw new Error("จำนวนต้องไม่ติดลบ");
            newQuantity = adjustQty;
            diffQuantity = newQuantity - currentQty;
        } else if (['damage', 'expire'].includes(type)) {
            if (adjustQty <= 0) throw new Error("กรุณาระบุจำนวนที่ชำรุดให้ถูกต้อง");
            if (adjustQty > currentQty) throw new Error("กรุณาระบุจำนวนที่หมดอายุให้ถูกต้อง");

            newQuantity = currentQty - adjustQty;
            diffQuantity = -adjustQty;
        } else {
            throw new Error("failed to adjust");
        }

        let newStatus = lot.status;
        if (newQuantity === 0) {
            newStatus = 'out_of_stock';
        } else if (newQuantity > 0 && lot.status == 'out_of_stock') {
            newStatus = 'active';
        }

        const updateLot = await tx.item_lot.update({
            where: { id: lot_id },
            data: {
                quantity: newQuantity,
                status: newStatus
            }
        });

        await tx.stock_movement.create({
            data: {
                item_id: lot.item_id,
                lot_id: lot.id,
                quantity: diffQuantity,
                type: type,
                reason: reason,
                created_by_id: parseInt(user.id) || 999,
                created_by: user.name
            }
        });
        return updateLot;
    });
}

const deleteLot = async (lot_id, user) => {
    return await prisma.item_lot.update({
        where: { id: lot_id },
        data: {
            deleted_at: new Date(),
            deleted_by: user.name,
            deleted_by_id: String(user.id)
        }
    });
};

module.exports = {
    getAllLots,
    getLotById,
    adjustLot,
    deleteLot,
};