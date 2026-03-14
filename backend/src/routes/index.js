const express = require('express')
const router = express.Router()

const healthController = require('../controllers/health.controller')
const itemRoutes = require('./item.routes')
const lotRoutes = require('./lot.routes')
const requisitionRoutes = require('./requisition.Routes')
const categoryRoutes = require('./category.route')
const warehouseRoutes = require('./warehouse.route')
const unitRoutes = require('./unit.route')
const supplierRoutes = require('./supplier.route')
const receiveRoutes = require('./receive.routes')


const v1 = express.Router()
router.use('/v1', v1)

v1.get('/health', healthController.check)

v1.use('/items', itemRoutes)
v1.use('/lots', lotRoutes)
v1.use('/requisitions', requisitionRoutes)
v1.use('/categories', categoryRoutes)
v1.use('/warehouses', warehouseRoutes)
v1.use('/units', unitRoutes)
v1.use('/suppliers', supplierRoutes)
v1.use('/receives', receiveRoutes)

module.exports = router
