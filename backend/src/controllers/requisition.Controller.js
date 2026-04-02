const requisitionService = require('../services/requisition.service');
const util = require('../utils/response');
/**
 * @typedef {Object} RequisitionItemInput
 * @property {string} item_id
 * @property {number} qty
 * @property {string=} note
 */

/**
 * @typedef {Object} CreateRequisitionBody
 * @property {string} type - 'WITHDRAW' | 'BORROW'
 * @property {string} department_id
 * @property {string|null=} note
 * @property {string|null=} due_date
 * @property {Object|null=} borrower - { fullname, phone, address, ... }
 * @property {RequisitionItemInput[]} items
 */

const REQ_TYPES = {
    WITHDRAW: 'WITHDRAW',
    BORROW: 'BORROW',
};

/** @param {CreateRequisitionBody} data */
const validateCreateRequisition = (data) => {
    if (!data || typeof data !== 'object') return 'Invalid body data';
    if (!data.type || ![REQ_TYPES.WITHDRAW, REQ_TYPES.BORROW].includes(data.type.toUpperCase())) {
        return 'type is required and must be WITHDRAW or BORROW';
    }
    if (!data.department_id) return 'department_id is required';

    if (!Array.isArray(data.items) || data.items.length === 0) {
        return 'items must be a non-empty array';
    }

    for (let i = 0; i < data.items.length; i += 1) {
        const item = data.items[i];
        if (!item?.item_id) return `items[${i}].item_id is required`;
        
        const qty = Number(item?.qty);
        if (!Number.isInteger(qty) || qty <= 0) {
            return `items[${i}].qty must be an integer greater than 0`;
        }
    }

    if (data.type === REQ_TYPES.BORROW && !data.borrower) {
        return 'borrower details are required for BORROW type';
    }

    return null;
};

const createRequisition = async (req, res) => {
    try {
        const data = { ...req.body };
        const validationMessage = validateCreateRequisition(data);
        if (validationMessage) {
            return util.sendResponse(res, 400, validationMessage);
        }

        const created = await requisitionService.createRequisition(data, req.user || null);

        // แจ้งเตือน Frontend ให้ดึงข้อมูลใหม่
        req.io.emit('REFRESH_DATA', 'REQUISITIONS');

        return util.sendResponse(res, 201, 'create requisition success', created);
    } catch (error) {
        return util.sendResponse(res, 500, error.message || 'create requisition failed');
    }
};

const getRequisitions = async (req, res) => {
    try {
        const query = req.query; 
        const result = await requisitionService.getAllRequisitions(query);

        return util.sendListResponse(res, 200, 'list requisitions success', result);
    } catch (error) {
        return util.sendResponse(res, 500, error.message || 'fetch requisitions failed');
    }
};

const getRequisitionById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return util.sendResponse(res, 400, 'invalid requisition id');
        }

        const requisition = await requisitionService.getRequisitionDetail(id);

        return util.sendResponse(res, 200, 'get requisition by id success', requisition);
    } catch (error) {
        if (error?.statusCode) {
            return util.sendResponse(res, error.statusCode, error.message);
        }
        return util.sendResponse(res, 500, error.message || 'fetch requisition failed');
    }
};

const approveRequisition = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const itemsToIssue = req.body?.items; // Expecting { "reqItemId": qty }

        if (!itemsToIssue || typeof itemsToIssue !== 'object') {
            return util.sendResponse(res, 400, 'items to issue are required');
        }

        const result = await requisitionService.approveRequisition(id, itemsToIssue, req.user || null);

        // สำคัญ: เมื่ออนุมัติ สต็อกเปลี่ยน ต้องสั่ง Refresh ทั้งระบบ
        req.io.emit('REFRESH_DATA', 'REQUISITIONS');
        req.io.emit('REFRESH_DATA', 'LOTS');
        req.io.emit('REFRESH_DATA', 'ITEMS');

        return util.sendResponse(res, 200, 'approve requisition success', result);
    } catch (error) {
        if (error?.statusCode) {
            return util.sendResponse(res, error.statusCode, error.message);
        }
        return util.sendResponse(res, 500, error.message || 'approve requisition failed');
    }
};

const rejectRequisition = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const reason = (req.body?.note || '').toString();

        const result = await requisitionService.rejectRequisition(id, reason, req.user || null);

        req.io.emit('REFRESH_DATA', 'REQUISITIONS');

        return util.sendResponse(res, 200, 'reject requisition success', result);
    } catch (error) {
        if (error?.statusCode) {
            return util.sendResponse(res, error.statusCode, error.message);
        }
        return util.sendResponse(res, 500, error.message || 'reject requisition failed');
    }
};

const cancelRequisition = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return util.sendResponse(res, 400, 'invalid requisition id');
        }

        const result = await requisitionService.cancelRequisition(id, req.user || null);

        req.io.emit('REFRESH_DATA', 'REQUISITIONS');

        return util.sendResponse(res, 200, 'cancel requisition success', result);
    } catch (error) {
        if (error?.statusCode) {
            return util.sendResponse(res, error.statusCode, error.message);
        }
        return util.sendResponse(res, 500, error.message || 'cancel requisition failed');
    }
};

const getActiveBorrows = async (req, res) => {
    try {
        const items = await requisitionService.getActiveBorrows();
        return util.sendListResponse(res, 200, 'active borrows success', {
            items,
            total: items.length,
            page: 1,
            limit: items.length,
        });
    } catch (error) {
        return util.sendResponse(res, 500, error.message || 'fetch active borrows failed');
    }
};

const processReturn = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return util.sendResponse(res, 400, 'invalid borrow id');
        }

        const returnItems = req.body?.items;
        if (!Array.isArray(returnItems) || returnItems.length === 0) {
            return util.sendResponse(res, 400, 'items must be a non-empty array');
        }

        for (let i = 0; i < returnItems.length; i++) {
            const item = returnItems[i];
            if (!item?.req_item_id) {
                return util.sendResponse(res, 400, `items[${i}].req_item_id is required`);
            }
            const qty = Number(item?.qty_returned);
            if (!Number.isInteger(qty) || qty <= 0) {
                return util.sendResponse(res, 400, `items[${i}].qty_returned must be a positive integer`);
            }
        }

        const result = await requisitionService.processReturn(id, returnItems, req.user || null);

        req.io.emit('REFRESH_DATA', 'REQUISITIONS');
        req.io.emit('REFRESH_DATA', 'LOTS');
        req.io.emit('REFRESH_DATA', 'ITEMS');

        return util.sendResponse(res, 200, 'process return success', result);
    } catch (error) {
        if (error?.statusCode) {
            return util.sendResponse(res, error.statusCode, error.message);
        }
        return util.sendResponse(res, 500, error.message || 'process return failed');
    }
};

module.exports = {
    createRequisition,
    getRequisitions,
    getRequisitionById,
    approveRequisition,
    rejectRequisition,
    cancelRequisition,
    getActiveBorrows,
    processReturn,
};