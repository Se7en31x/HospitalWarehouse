const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createStockMovement = (data, tx = prisma) => {
    return tx.stocks_movement.create({ data });
};

module.exports = {
    createStockMovement,
};
