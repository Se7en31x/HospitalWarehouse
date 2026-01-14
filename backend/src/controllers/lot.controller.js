const lotService = require('../services/lot.service');

const getAllLots = async (req, res) => {
    try {
        const lots = await lotService.getAllLots();
        res.status(200).json({
            status: "ok",
            message: "Get lots success",
            data: lots
        });
    } catch (error) {
        console.error("Get Lots Error:", error);
        res.status(500).json({
            status: "error",
            error: error.message || "Internal Server Error"
        });
    }
}

const getLotById = async (req, res) => {
    try {
        const { id } = req.params;
        const lot = await lotService.getLotById(id);
        if (!lot) {
            return res.status(404).json({
                status: "error",
                error: "Lot not found"
            });
        }

        res.status(200).json({
            status: "ok",
            data: lot
        });

    } catch (error) {
        console.error(`Get Lot ID ${req.params.id} Error:`, error);
        res.status(500).json({
            status: "error",
            error: error.message || "Internal Server Error"
        });
    }
};

const adjustLot = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, type, reason, user_id, username } = req.body;
        // validation
        if (!id) {
            return res.status(400).json({ success: false, message: "ไม่ระบุ Lot ID" });
        }
        if (!type || quantity === undefined) {
            return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน (quantity, type)" });
        }

        const user = {
            id: user_id || req.user?.id || '0',
            name: username || req.user?.username || 'System'
        };

        const result = await lotService.adjustLot(
            id,
            { quantity, type, reason },
            user
        );
        return res.status(200).json({
            success: true,
            message: "บันทึกข้อมูลเรียบร้อย",
            data: result
        });
    } catch (error) {
        console.error("🔥 Adjust Lot Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "เกิดข้อผิดพลาด"
        });
    }
}


const deleteLot = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, username } = req.body;

        // Validation 
        if (!id) {
            return res.status(400).json({ success: false, message: "ไม่ระบุ Lot ID" });
        }
        const user = {
            id: user_id || req.user?.id || '0', 
            name: username || req.user?.username || 'System'
        };
        await lotService.deleteLot(id, user);
        return res.status(200).json({
            success: true,
            message: "ลบข้อมูลเรียบร้อย" 
        });

    } catch (error) {
        console.error("🔥 Delete Lot Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = {
    getAllLots,
    getLotById,
    adjustLot,
    deleteLot,
};