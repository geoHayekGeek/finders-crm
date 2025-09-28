// routes/leadStatusRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, canManageLeads } = require('../middlewares/permissions');
const LeadStatusController = require('../controllers/leadStatusController');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/lead-statuses - Get all lead statuses (admin, operations manager, operations only)
router.get('/', canManageLeads, LeadStatusController.getAllStatuses);

// GET /api/lead-statuses/:id - Get lead status by ID (admin, operations manager, operations only)
router.get('/:id', canManageLeads, LeadStatusController.getStatusById);

// POST /api/lead-statuses - Create new lead status (admin, operations manager, operations)
router.post('/', canManageLeads, LeadStatusController.createStatus);

// PUT /api/lead-statuses/:id - Update lead status (admin, operations manager, operations)  
router.put('/:id', canManageLeads, LeadStatusController.updateStatus);

// DELETE /api/lead-statuses/:id - Delete lead status (admin, operations manager, operations)
router.delete('/:id', canManageLeads, LeadStatusController.deleteStatus);

module.exports = router;
