const lotService = require('../services/lot.service');
const { sendListResponse, sendMutationResponse, sendResponse } = require('../utils/response');

const parseListQuery = (query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const keyword = (query.keyword || query.search || '').toString().trim();
    const warehouse_id = (query.warehouse_id || query.warehouse || '').toString().trim();
    const category_id = (query.category_id || query.category || '').toString().trim();
    const status = (query.status || '').toString().trim();
    const expiry_status = (query.expiry_status || '').toString().trim();

    return { page, limit, keyword, warehouse_id, category_id, status, expiry_status };
};

const getAllLots = async (req, res) => {
    try {
        const query = parseListQuery(req.query);
        const lots = await lotService.getAllLots(query);
        return sendListResponse(res, 200, "List all lots success", lots);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
}

const getLotById = async (req, res) => {
    try {
        const { id } = req.params;
        const lot = await lotService.getLotById(id);
        if (!lot) {
            return sendResponse(res, 404, "Lot not found");
        }

        return sendResponse(res, 200, "Get lot by ID success", lot);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
};

const stockInLot = async (req, res) => {
    try {
        const newLot = await lotService.stockInLot(req.body, req.user || {});
        return sendMutationResponse(res, 201, "Stock in success", newLot?.id || null);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
}

const adjustLotStock = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Invalid lot code" });
        }
        const result = await lotService.adjustLotStock(id, payload, req.user || {});
        return sendMutationResponse(res, 200, "adjust lot stock success", result?.id);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
}

const updateLot = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Invalid lot code" });
        }

        const result = await lotService.updateLot(id, req.body || {});
        return sendMutationResponse(res, 200, "update lot success", result?.id);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
}


const deleteLot = async (req, res) => {
    try {
        const { id } = req.params;
        // Validation 
        if (!id) {
            return res.status(400).json({ success: false, message: "ไม่ระบุ Lot ID" });
        }

        await lotService.deleteLot(id);
        return sendMutationResponse(res, 200, "delete lot success", id);

    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
};

module.exports = {
    getAllLots,
    getLotById,
    adjustLotStock,
    updateLot,
    stockInLot,
    deleteLot,
};