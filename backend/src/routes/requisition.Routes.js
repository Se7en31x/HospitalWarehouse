const express = require('express');
const router = express.Router();
const requisitionController = require('../controllers/requisition.Controller');
// const { auth, authWarehouse, authUser, } = require('../middleware/auth');
// Authorization All Role
router.get('/', requisitionController.getRequisitions);
router.get('/:id', requisitionController.getRequisitionById);

// Authorization User
router.post('/', requisitionController.createRequisition);

// Authorization Warehouse 
router.put('/approve/:id', requisitionController.approveRequest);
router.put('/reject/:id', requisitionController.rejectRequest);

module.exports = router;