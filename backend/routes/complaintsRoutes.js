const express = require('express');
const router = express.Router();
const ComplaintsController = require('../controllers/complaintsController');
const { authenticateToken, canViewComplaints, canManageComplaints } = require('../middlewares/permissions');

router.use(authenticateToken);

router.get('/', canViewComplaints, ComplaintsController.getAllComplaints);
router.post('/', canManageComplaints, ComplaintsController.createComplaint);

module.exports = router;
