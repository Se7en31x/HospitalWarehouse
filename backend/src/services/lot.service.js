const lotRepo = require('../repositories/lot.repo');
const DTO = require('../dtos/lot.dto');

const getAllLots = async (query) => {

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = lotRepo.whereClause({
        search: query.search,
        warehouse: query.warehouse,
        category: query.category,
        status: query.status
    });
    const { lots, total } = await lotRepo.selectAllLot({ where, offset, limit })

    return {
        metaData: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        },
        data: lots,

    };
}

const getLotById = async (id) => {
    const lot = await lotRepo.selectLotById(id);
    return lot;
}

const createLot = async (payload) => {
    const generatedCode = await lotRepo.generateLotCode(payload.item_id);
    const data = DTO.createLotDTO(payload, generatedCode);
    const newLot = await lotRepo.createLot(data);
    return newLot
}

const adjustLot = async (lotCode, payload) => {
    const existingLot = await lotRepo.selectLotById(lotCode);
    if (!existingLot) throw new Error("Lot id not found");

    const data = DTO.adjustLotDTO(payload)
    const updatedLot = await lotRepo.updateLot(lotCode, data)
    return updatedLot;

}

const deleteLot = async (lotCode, claim) => {
    const existingLot = await lotRepo.selectLotById(lotCode);
    if (!existingLot) throw new Error("Lot id not found");

    const data = DTO.deleteLotDTO(claim.user_id)
    return await lotRepo.updateLot(lotCode, data)

}

module.exports = {
    getAllLots,
    getLotById,
    createLot,
    adjustLot,
    deleteLot,

};