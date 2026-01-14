// 📂 src/utils/socket.js
const { Server } = require("socket.io");

let io;

module.exports = {
    init: (server) => {
        io = new Server(server, { cors: { origin: "*" } });
        return io;
    },
    getIO: () => {
        if (!io) throw new Error("Socket not initialized");
        return io;
    }
};