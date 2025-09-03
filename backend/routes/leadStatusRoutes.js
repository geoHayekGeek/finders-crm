// routes/leadStatusRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/permissions');
const LeadStatusController = require('../controllers/leadStatusController');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/lead-statuses - Get all lead statuses
router.get('/', LeadStatusController.getAllStatuses);

// GET /api/lead-statuses/:id - Get lead status by ID
router.get('/:id', LeadStatusController.getStatusById);

// POST /api/lead-statuses - Create new lead status (admin/management only)
router.post('/', LeadStatusController.createStatus);

// PUT /api/lead-statuses/:id - Update lead status (admin/management only)  
router.put('/:id', LeadStatusController.updateStatus);

// DELETE /api/lead-statuses/:id - Delete lead status (admin/management only)
router.delete('/:id', LeadStatusController.deleteStatus);

module.exports = router;
