const requisitionRepo = require('../repositories/requisition.repo');
const stockMovementRepo = require('../repositories/stockmovement.repo');

/**
 * 1. สร้างใบเบิกพัสดุ
 */
const createRequisition = async (data, userSession) => {
    if (!data.items?.length) throw new Error('ต้องระบุรายการสินค้าอย่างน้อย 1 รายการ');

    // เรียกใช้ Transaction ผ่าน Repo แทน
    return await requisitionRepo.withTransaction(async (tx) => {
        const newDocNo = await requisitionRepo.generateDocNo(data.type, tx);

        const header = await requisitionRepo.createHeader({
            doc_no: newDocNo,
            type: data.type,
            department_code: data.department_code,
            department_name: data.department_name,
            requester_id: Number(userSession.user_id),
            note: data.note,
            due_date: data.due_date,
        }, tx);

        await requisitionRepo.createItems(data.items, header.id, tx);

        await requisitionRepo.createTransactionLog({
            action: data.type === 'BORROW' ? 'CREATE_BORROW' : 'CREATE_REQUISITION',
            module: "WAREHOUSE",
            code: newDocNo,
            description: `สร้างใบ${data.type === 'BORROW' ? 'ยืม' : 'เบิก'} เลขที่ ${newDocNo}`,
            status: "SUCCESS",
            created_by: userSession.user_fullname,
            created_by_id: Number(userSession.user_id),
        }, tx);

        header.requisition_item = data.items.map(item => ({
            ...item,
            header_id: header.id
        }));

        return header;
    });
};

const getRequisitions = async (filters = {}) => {
    return await requisitionRepo.getRequisitions(filters);
};

const getRequisitionById = async (id) => {
    return await requisitionRepo.getRequisitionById(id);
};

/**
 * 2. อนุมัติและตัดสต็อกพัสดุ (FEFO)
 */
const approveRequisition = async (headerId, itemsToIssue, userSession) => {
    // เรียกใช้ Transaction ผ่าน Repo
    return await requisitionRepo.withTransaction(async (tx) => {
        const header = await requisitionRepo.getRequisitionById(headerId);
        if (!header) throw new Error("ไม่พบรายการใบเบิก/ยืม");

        if (header.status !== 'PENDING') {
            throw new Error(`ไม่สามารถดำเนินการได้ สถานะปัจจุบันคือ ${header.status}`);
        }

        let totalQty = 0;
        const reqItemMap = new Map(header.requisition_item.map(item => [item.id, item]));

        for (const [reqItemId, issuedQty] of Object.entries(itemsToIssue)) {
            const rItemId = Number(reqItemId);
            const qtyNeeded = Number(issuedQty);
            
            if (qtyNeeded <= 0) continue;

            const currentReqItem = reqItemMap.get(rItemId);
            if (!currentReqItem) throw new Error(`ไม่พบรายการเบิกชิ้นย่อย ID: ${rItemId} ในระบบ`);

            totalQty += qtyNeeded;

            await requisitionRepo.updateRequisitionItem(
                rItemId, 
                { issued_qty: qtyNeeded, approved_qty: qtyNeeded },
                tx
            );

            const lots = await requisitionRepo.getItemLots(currentReqItem.item_id, tx);

            let remaining = qtyNeeded;
            for (const lot of lots) {
                if (remaining <= 0) break;
                if (lot.quantity <= 0) continue; 

                const take = Math.min(remaining, lot.quantity);
                remaining -= take;

                await requisitionRepo.decrementLotStock(lot.id, take, tx);

                await requisitionRepo.createAllocation({
                    req_item_id: rItemId, 
                    lot_id: lot.id, 
                    qty: take, 
                    status: "COMPLETED"
                }, tx);

                await stockMovementRepo.createStockMovement({
                    lot_id: lot.id,
                    quantity: take,
                    type: "OUT",
                    note: `เบิกตามใบงาน: ${header.doc_no}`,
                    items: { connect: { id: currentReqItem.item_id } },
                    created_by: userSession.user_fullname, 
                    created_by_id: Number(userSession.user_id)
                }, tx);
            }
            
            if (remaining > 0) {
                throw new Error(`พัสดุรหัส ${currentReqItem.item_id} สต็อกไม่พอจ่าย (ขาดอีก ${remaining})`);
            }
        }

        await requisitionRepo.createTransactionLog({
            action: "APPROVE", 
            module: "WAREHOUSE", 
            code: header.doc_no,
            description: `อนุมัติจ่ายพัสดุ รวม ${totalQty} ชิ้น`,
            status: "SUCCESS", 
            created_by: userSession.user_fullname, 
            created_by_id: Number(userSession.user_id)
        }, tx);

        return await requisitionRepo.updateHeaderStatus(
            headerId, 
            "COMPLETED", 
            Number(userSession.user_id),
            null,
            tx
        );
    });
};

/**
 * 3. ปฏิเสธใบเบิก
 */
const rejectRequisition = async (headerId, note, userSession) => {
    // เรียกใช้ Transaction ผ่าน Repo
    return await requisitionRepo.withTransaction(async (tx) => {
        const header = await requisitionRepo.getRequisitionById(headerId);
        if (!header) throw new Error("ไม่พบรายการ");

        if (header.status !== 'PENDING') {
            throw new Error(`ไม่สามารถดำเนินการได้ สถานะปัจจุบันคือ ${header.status}`);
        }

        await requisitionRepo.createTransactionLog({
            action: "REJECT", 
            module: "WAREHOUSE", 
            code: header.doc_no,
            description: `ปฏิเสธใบเบิก ${header.doc_no} เหตุผล: ${note || 'ไม่ระบุ'}`,
            status: "SUCCESS", 
            created_by: userSession.user_fullname, 
            created_by_id: Number(userSession.user_id)
        }, tx);

        return await requisitionRepo.updateHeaderStatus(
            headerId, 
            "REJECTED", 
            Number(userSession.user_id),
            note,
            tx
        );
    });
};

module.exports = { 
    createRequisition, 
    getRequisitions, 
    getRequisitionById, 
    approveRequisition, 
    rejectRequisition 
};