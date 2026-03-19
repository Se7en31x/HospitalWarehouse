const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { upload } = require('../middleware/upload');
// const { authWarehouse } = require('../middleware/auth');

router.patch('/items/:id/image', upload.single('image'), fileController.updateItemImage);

module.exports = router;
