const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Helper: สร้างเลขที่เอกสารอัตโนมัติ (เช่น REQ-6901-0001)
 */
async function generateDocNo(type, tx) {
    const prefix = type === 'WITHDRAW' ? 'REQ' : 'BOR';
    const date = new Date();
    const year = (date.getFullYear() + 543).toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const docPrefix = `${prefix}-${year}${month}-`;

    const client = tx || prisma;
    const lastDoc = await client.requisition_header.findFirst({
        where: { doc_no: { startsWith: docPrefix } },
        orderBy: { doc_no: 'desc' },
    });

    let runNo = 1;
    if (lastDoc?.doc_no) {
        const lastDigits = lastDoc.doc_no.split('-').pop();
        runNo = parseInt(lastDigits) + 1;
    }

    return `${docPrefix}${runNo.toString().padStart(4, '0')}`;
}

/**
 * 1. สร้างใบเบิกพัสดุ
 */
const createRequisition = async (data, userSession) => {
    if (!data.items?.length) throw new Error('ต้องระบุรายการสินค้าอย่างน้อย 1 รายการ');

    return await prisma.$transaction(async (tx) => {
        const newDocNo = await generateDocNo(data.type, tx);

        const header = await tx.requisition_header.create({
            data: {
                doc_no: newDocNo,
                type: data.type,
                status: 'PENDING',
                department_code: data.department_code,
                department_name: data.department_name,
                requester_id: Number(userSession.user_id),
                note: data.note,
                due_date: data.due_date ? new Date(data.due_date) : null,
                requisition_item: {
                    create: data.items.map((item) => ({
                        item_id: Number(item.item_id),
                        req_qty: Number(item.qty),
                        approved_qty: Number(item.qty),
                        note: item.note,
                    })),
                },
            },
            include: { requisition_item: true },
        });

        // บันทึก Log
        await tx.logs_transaction.create({
            data: {
                action: header.type === 'BORROW' ? 'CREATE_BORROW' : 'CREATE_REQUISITION',
                module: "WAREHOUSE",
                code: header.doc_no,
                description: `สร้างใบ${header.type === 'BORROW' ? 'ยืม' : 'เบิก'} เลขที่ ${header.doc_no}`,
                status: "SUCCESS",
                created_by: userSession.user_fullname,
                created_by_id: Number(userSession.user_id),
            },
        });

        return header;
    });
};

const getRequisitions = async (filters = {}) => {
    return await prisma.requisition_header.findMany({
        where: {
            // กรองตามแผนก (ถ้าส่ง department_codes มาจาก Token)
            ...(filters.department_codes && { department_code: { in: filters.department_codes } }),
            ...(filters.status && { status: filters.status }),
            ...(filters.type && { type: filters.type })
        },
        include: {
            requisition_item: {
                include: { item: { select: { name: true, code: true, current_stock: true } } }
            }
        },
        orderBy: { request_date: 'desc' }
    });
};

const getRequisitionById = async (id) => {
    return await prisma.requisition_header.findUnique({
        where: { id: Number(id) },
        include: { requisition_item: { include: { item: true } } }
    });
};

const approveRequisition = async (headerId, itemsToIssue, userSession) => {
    return await prisma.$transaction(async (tx) => {
        const header = await tx.requisition_header.findUnique({ where: { id: Number(headerId) } });
        if (!header) throw new Error("ไม่พบรายการใบเบิก/ยืม");

        let totalQty = 0;

        for (const [reqItemId, issuedQty] of Object.entries(itemsToIssue)) {
            const rItemId = Number(reqItemId);
            const qtyNeeded = Number(issuedQty);
            totalQty += qtyNeeded;

            // ดึงข้อมูลสินค้าที่ต้องการเบิก
            const reqItem = await tx.requisition_item.findUnique({ where: { id: rItemId } });

            // อัปเดตจำนวนที่จ่ายจริงใน Requisition Item
            await tx.requisition_item.update({
                where: { id: rItemId },
                data: { issued_qty: qtyNeeded, approved_qty: qtyNeeded }
            });

            if (qtyNeeded <= 0) continue;

            // จัดการตัดสต็อกตามล็อต (FEFO)
            const lots = await tx.item_lot.findMany({
                where: { item_id: reqItem.item_id, quantity: { gt: 0 } },
                orderBy: { expried_at: 'asc' }
            });

            let remaining = qtyNeeded;
            for (const lot of lots) {
                if (remaining <= 0) break;
                const take = Math.min(remaining, lot.quantity);
                remaining -= take;

                await tx.item_lot.update({ where: { id: lot.id }, data: { quantity: { decrement: take } } });
                await tx.item_allocation.create({ data: { req_item_id: rItemId, lot_id: lot.id, qty: take, status: "COMPLETED" } });
                await tx.stock_movement.create({
                    data: {
                        item_id: reqItem.item_id, lot_id: lot.id, quantity: take, type: "OUT",
                        reason: `เบิกตามใบงาน: ${header.doc_no}`,
                        created_by: userSession.user_fullname, created_by_id: parseInt(userSession.user_id)
                    }
                });
            }
            if (remaining > 0) throw new Error(`พัสดุรหัส ${reqItem.item_id} สต็อกไม่พอจ่าย`);
        }

        // บันทึก Audit Log และอัปเดต Header
        await tx.logs_transaction.create({
            data: {
                action: "APPROVE", module: "WAREHOUSE", code: header.doc_no,
                description: `อนุมัติจ่ายพัสดุ รวม ${totalQty} ชิ้น`,
                status: "SUCCESS", created_by: userSession.user_fullname, created_by_id: parseInt(userSession.user_id)
            }
        });

        return await tx.requisition_header.update({
            where: { id: Number(headerId) },
            data: { status: "COMPLETED", approver_id: parseInt(userSession.user_id), updated_at: new Date() }
        });
    });
};

const rejectRequisition = async (headerId, note, userSession) => {
    return await prisma.$transaction(async (tx) => {
        const header = await tx.requisition_header.findUnique({ where: { id: Number(headerId) } });
        if (!header) throw new Error("ไม่พบรายการ");

        await tx.logs_transaction.create({
            data: {
                action: "REJECT", module: "WAREHOUSE", code: header.doc_no,
                description: `ปฏิเสธใบเบิก ${header.doc_no} เหตุผล: ${note || 'ไม่ระบุ'}`,
                status: "SUCCESS", created_by: userSession.user_fullname, created_by_id: parseInt(userSession.user_id)
            }
        });

        return await tx.requisition_header.update({
            where: { id: Number(headerId) },
            data: { status: "REJECTED", note: note, approver_id: parseInt(userSession.user_id), updated_at: new Date() }
        });
    });
};

module.exports = { createRequisition, getRequisitions, getRequisitionById, approveRequisition, rejectRequisition };