const express = require('express');
const router = express.Router();
const requisitionController = require('../controllers/requisition.Controller');
const { auth, authWarehouse, authUser, } = require('../middleware/auth');
// Authorization All Role
router.get('/', auth, requisitionController.getRequisitions);
router.get('/:id', auth, requisitionController.getRequisitionById);

// Authorization User
router.post('/', authUser, requisitionController.createRequisition);

// Authorization Warehouse 
router.put('/approve/:id', authWarehouse, requisitionController.approveRequest);
router.put('/reject/:id', authWarehouse, requisitionController.rejectRequest);

module.exports = router;