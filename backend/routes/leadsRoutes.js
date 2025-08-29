// routes/leadsRoutes.js
const express = require('express');
const router = express.Router();
const LeadsController = require('../controllers/leadsController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties, // Reusing this for operations permissions
  canViewAllData,
  canViewAgentPerformance
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/leads - Get all leads (filtered by role)
router.get('/', LeadsController.getAllLeads);

// GET /api/leads/filtered - Get leads with filters (filtered by role)
router.get('/filtered', LeadsController.getLeadsWithFilters);

// Get reference sources - MUST come before /:id route
router.get('/reference-sources', LeadsController.getReferenceSources);

// Get operations users - MUST come before /:id route
router.get('/operations-users', LeadsController.getOperationsUsers);

// GET /api/leads/stats/overview - Get lead statistics (admin, operations manager, operations, agent manager)
router.get('/stats/overview', canViewAllData, LeadsController.getLeadStats);

// GET /api/leads/agent/:agentId - Get leads by agent (admin, operations manager, agent manager)
router.get('/agent/:agentId', canViewAgentPerformance, LeadsController.getLeadsByAgent);

// GET /api/leads/:id - Get single lead (filtered by role) - MUST BE LAST GET route
router.get('/:id', LeadsController.getLeadById);

// POST /api/leads - Create new lead (admin, operations manager, operations, agent manager)
router.post('/', canManageProperties, LeadsController.createLead);

// PUT /api/leads/:id - Update lead (admin, operations manager, operations, agent manager)
router.put('/:id', canManageProperties, LeadsController.updateLead);

// DELETE /api/leads/:id - Delete lead (admin, operations manager only)
router.delete('/:id', LeadsController.deleteLead); // Permission check handled in controller

module.exports = router;
