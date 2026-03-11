const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createStockMovement = (data, tx = prisma) => {
    const { item_id, note, ...rest } = data || {};

    const payload = {
        ...rest,
        note: note || null,
    };

    if (item_id) {
        payload.items = { connect: { id: item_id } };
    }

    return tx.stocks_movement.create({ data: payload });
};

module.exports = {
    createStockMovement,
};
