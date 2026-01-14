const requisitionService = require('../services/requisition.Service');

const sendError = (res, status, message) => res.status(status).json({ success: false, message });

const createRequisition = async (req, res) => {
    const userSession = req.user;
    if (!userSession) return sendError(res, 401, "กรุณาล็อกอินใหม่");

    try {
        const { type, items, due_date, note, department_id, department_name } = req.body;
        const result = await requisitionService.createRequisition(
            {
                type,
                items,
                due_date,
                note,
                requester_id: userSession.user_id,
                department_code: department_id,
                department_name: department_name,
            },
            userSession
        );

        res.status(201).json({ success: true, message: `สร้างใบ${type === 'WITHDRAW' ? 'เบิก' : 'ยืม'}สำเร็จ`, data: result });
    } catch (error) {
        sendError(res, 400, error.message);
    }
};

const getRequisitions = async (req, res) => {
    try {
        const result = await requisitionService.getRequisitions(req.query);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

const getRequisitionById = async (req, res) => {
    try {
        const result = await requisitionService.getRequisitionById(req.params.id);
        if (!result) return sendError(res, 404, "ไม่พบเลขที่เอกสารนี้");
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

const approveRequest = async (req, res) => {
    const userSession = req.user;
    if (!userSession) return sendError(res, 401, "ไม่พบข้อมูลผู้อนุมัติ");

    const { itemsToIssue } = req.body;
    if (!itemsToIssue || Object.keys(itemsToIssue).length === 0) {
        return sendError(res, 400, "กรุณาระบุจำนวนที่ต้องการอนุมัติจ่าย");
    }

    try {
        const result = await requisitionService.approveRequisition(parseInt(req.params.id), itemsToIssue, userSession);
        res.status(200).json({ success: true, message: "อนุมัติและหักสต็อกเรียบร้อย", data: result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

const rejectRequest = async (req, res) => {
    const userSession = req.user;
    if (!userSession) return sendError(res, 401, "กรุณาล็อกอินใหม่");

    const { note } = req.body;
    if (!note?.trim()) return sendError(res, 400, "กรุณาระบุเหตุผลในการปฏิเสธ");

    try {
        const result = await requisitionService.rejectRequisition(parseInt(req.params.id), note, userSession);
        res.status(200).json({ success: true, message: "ปฏิเสธรายการเรียบร้อยแล้ว", data: result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

module.exports = { createRequisition, getRequisitions, getRequisitionById, approveRequest, rejectRequest };