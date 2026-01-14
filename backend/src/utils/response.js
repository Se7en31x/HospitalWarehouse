const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        status: statusCode < 400 ? "ok" : "error",
        message: message,
        data: data
    });
};

module.exports = { sendResponse };