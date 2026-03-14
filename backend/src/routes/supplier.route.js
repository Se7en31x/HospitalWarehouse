const express = require('express')
const router = express.Router()

const supplierController = require('../controllers/supplier.controller')

router.get('/option', supplierController.getSupplierOption)

module.exports = router;