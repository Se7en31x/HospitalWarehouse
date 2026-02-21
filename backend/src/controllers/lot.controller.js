const lotService = require('../services/lot.service');
const { sendResponse } = require('../utils/response');

const getAllLots = async (req, res) => {
    try {
        const lots = await lotService.getAllLots(req.query);
        return sendResponse(res, 200, "List all lots success", lots);
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

const createLot = async (req, res) => {
    try {
        const newLot = await lotService.createLot(req.body);
        
        return sendResponse(res, 201, "Create lot success", newLot);
    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
}


const adjustLot = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        // validation
        if (!id) {
            return res.status(400).json({ success: false, message: "Invalid lot code" });
        }
        const result = await lotService.adjustLot(id, payload);
        return sendResponse(res, 200, "adjust lot success", result);
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
        const claim = {
            user_id: req.user.user_id,
        }

        await lotService.deleteLot(id, claim);
        return sendResponse(res, 200, "delete lot success");

    } catch (error) {
        return sendResponse(res, 500, error.message || "Internal Server Error");
    }
};

module.exports = {
    getAllLots,
    getLotById,
    adjustLot,
    deleteLot,
    createLot,
};