const requisitionService = require('../services/requisition.Service');

/**
 * Helper function สำหรับส่ง Error Response
 */
const sendError = (res, status, message) => res.status(status).json({ 
    success: false, 
    message: message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" 
});

/**
 * 🚩 MOCK USER (สำหรับ Tester Mode)
 * ในอนาคตเมื่อทำระบบ Login เสร็จ ให้เปลี่ยนกลับไปใช้ req.user
 */
const mockUser = {
    user_id: 1,
    username: "admin_tester",
    user_fullname: "Admin test",
    role: "ADMIN",
    department_code: "ADMIN",
};

/**
 * 1. สร้างใบเบิก/ยืม (Create)
 */
const createRequisition = async (req, res) => {
    // ใช้ mockUser แทน req.user ชั่วคราว
    const userSession = mockUser; 

    try {
        const { type, items, due_date, note, department_id, department_name } = req.body;
        
        // ตรวจสอบข้อมูลเบื้องต้น
        if (!items || items.length === 0) return sendError(res, 400, "กรุณาเลือกรายการพัสดุ");

        const result = await requisitionService.createRequisition(
            {
                type,
                items,
                due_date,
                note,
                department_code: department_id,
                department_name: department_name,
            },
            userSession
        );

        res.status(201).json({ 
            success: true, 
            message: `สร้างใบ${type === 'WITHDRAW' ? 'เบิก' : 'ยืม'}สำเร็จ`, 
            data: result 
        });
    } catch (error) {
        console.error("Create Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * 2. ดึงรายการใบเบิกทั้งหมด (List)
 */
const getRequisitions = async (req, res) => {
    try {
        const result = await requisitionService.getRequisitions(req.query);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Get List Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * 3. ดึงรายละเอียดใบเบิกตาม ID (Detail)
 */
const getRequisitionById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return sendError(res, 400, "รูปแบบ ID ไม่ถูกต้อง");

        const result = await requisitionService.getRequisitionById(id);
        if (!result) return sendError(res, 404, "ไม่พบเลขที่เอกสารนี้");
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Get Detail Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * 4. อนุมัติใบเบิกและตัดสต็อก (Approve)
 */
const approveRequest = async (req, res) => {
    // ใช้ mockUser เป็นผู้อนุมัติ
    const userSession = mockUser; 

    const { itemsToIssue } = req.body;
    if (!itemsToIssue || Object.keys(itemsToIssue).length === 0) {
        return sendError(res, 400, "กรุณาระบุจำนวนที่ต้องการอนุมัติจ่าย");
    }

    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return sendError(res, 400, "รูปแบบ ID ไม่ถูกต้อง");

        const result = await requisitionService.approveRequisition(id, itemsToIssue, userSession);
        
        res.status(200).json({ 
            success: true, 
            message: "อนุมัติและหักสต็อกเรียบร้อย", 
            data: result 
        });
    } catch (error) {
        console.error("Approve Error:", error);
        sendError(res, 400, error.message); 
    }
};

/**
 * 5. ปฏิเสธรายการ (Reject)
 */
const rejectRequest = async (req, res) => {
    // ใช้ mockUser เป็นผู้ปฏิเสธ
    const userSession = mockUser; 

    const { note } = req.body;
    if (!note?.trim()) return sendError(res, 400, "กรุณาระบุเหตุผลในการปฏิเสธ");

    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return sendError(res, 400, "รูปแบบ ID ไม่ถูกต้อง");

        const result = await requisitionService.rejectRequisition(id, note, userSession);
        
        res.status(200).json({ 
            success: true, 
            message: "ปฏิเสธรายการเรียบร้อยแล้ว", 
            data: result 
        });
    } catch (error) {
        console.error("Reject Error:", error);
        sendError(res, 400, error.message);
    }
};

module.exports = { 
    createRequisition, 
    getRequisitions, 
    getRequisitionById, 
    approveRequest, 
    rejectRequest 
};