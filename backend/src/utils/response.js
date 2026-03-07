const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        status: statusCode < 400 ? "ok" : "error",
        message: message,
        data: data
    });
};

const sendListResponse = (res, statusCode, message, result) => {
    const { items, ...meta } = result;

    return res.status(statusCode).json({
        status: "ok",
        message: message,
        meta: meta,
        data: items
    });
};

module.exports = { 
    sendResponse ,
    sendListResponse,
};