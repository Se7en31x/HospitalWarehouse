const express = require('express')
const router = express.Router()
const itemController = require('../controllers/item.controller')
const { auth, authWarehouse, authUser, } = require('../middleware/auth');
// Authorization All Role
router.get('/', auth, itemController.getItems)
router.get('/option', auth, itemController.getItemOption)
router.get('/:id', auth, itemController.getItemById)

// Authorization warehouse
router.post('/', authWarehouse, itemController.createItem)
router.put('/:id', authWarehouse, itemController.updateItem)
router.delete('/:id', authWarehouse, itemController.softDeletedItem)

module.exports = router