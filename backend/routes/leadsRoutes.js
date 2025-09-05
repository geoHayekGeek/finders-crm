// routes/leadsRoutes.js
const express = require('express');
const router = express.Router();
const LeadsController = require('../controllers/leadsController');
const LeadsStatsController = require('../controllers/leadsStatsController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties, // Reusing this for operations permissions
  canViewAllData,
  canViewAgentPerformance
} = require('../middlewares/permissions');
const {
  validateCreateLead,
  validateUpdateLead,
  validateLeadId,
  validateAgentId,
  validateLeadsFilters,
  handleValidationErrors,
  sanitizeRequestBody,
  leadsRateLimit,
  validateLeadBusinessRules
} = require('../middlewares/leadsValidation');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/leads - Get all leads (filtered by role)
router.get('/', LeadsController.getAllLeads);

// GET /api/leads/filtered - Get leads with filters (filtered by role)
router.get('/filtered', validateLeadsFilters, handleValidationErrors, LeadsController.getLeadsWithFilters);

// Get reference sources - MUST come before /:id route
router.get('/reference-sources', LeadsController.getReferenceSources);

// Get operations users - MUST come before /:id route
router.get('/operations-users', LeadsController.getOperationsUsers);

// GET /api/leads/stats - Get leads statistics (all authenticated users)
router.get('/stats', LeadsStatsController.getLeadsStats);

// GET /api/leads/agent/:agentId - Get leads by agent (admin, operations manager, agent manager)
router.get('/agent/:agentId', validateAgentId, handleValidationErrors, canViewAgentPerformance, LeadsController.getLeadsByAgent);

// GET /api/leads/:id - Get single lead (filtered by role) - MUST BE LAST GET route
router.get('/:id', validateLeadId, handleValidationErrors, LeadsController.getLeadById);

// POST /api/leads - Create new lead (admin, operations manager, operations, agent manager)
router.post('/', 
  canManageProperties, 
  sanitizeRequestBody,
  leadsRateLimit,
  validateCreateLead, 
  handleValidationErrors,
  validateLeadBusinessRules,
  LeadsController.createLead
);

// PUT /api/leads/:id - Update lead (admin, operations manager, operations, agent manager)
router.put('/:id', 
  canManageProperties,
  sanitizeRequestBody,
  leadsRateLimit,
  validateUpdateLead, 
  handleValidationErrors,
  validateLeadBusinessRules,
  LeadsController.updateLead
);

// DELETE /api/leads/:id - Delete lead (admin, operations manager only)
router.delete('/:id', validateLeadId, handleValidationErrors, LeadsController.deleteLead); // Permission check handled in controller

module.exports = router;
