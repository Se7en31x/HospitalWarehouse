const express = require('express')
const router = express.Router()

const healthController = require('../controllers/health.controller')
const itemRoutes = require('./item.routes')
const lotRoutes = require('./lot.routes')
const requisitionRoutes = require('./requisition.Routes')

router.get('/health', healthController.check)

router.use('/item', itemRoutes)
router.use('/lot', lotRoutes)
router.use('/requisition', requisitionRoutes)

module.exports = router
