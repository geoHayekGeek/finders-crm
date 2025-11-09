// routes/leadsRoutes.js
const express = require('express');
const router = express.Router();
const LeadsController = require('../controllers/leadsController');
const LeadsStatsController = require('../controllers/leadsStatsController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageLeads,
  canViewLeads,
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
router.get('/', canViewLeads, LeadsController.getAllLeads);

// GET /api/leads/filtered - Get leads with filters (filtered by role)
router.get('/filtered', canViewLeads, validateLeadsFilters, handleValidationErrors, LeadsController.getLeadsWithFilters);

// Get reference sources - MUST come before /:id route
router.get('/reference-sources', LeadsController.getReferenceSources);

// Get operations users - MUST come before /:id route
router.get('/operations-users', LeadsController.getOperationsUsers);

// GET /api/leads/stats - Get leads statistics (users who can view leads)
router.get('/stats', canViewLeads, LeadsStatsController.getLeadsStats);

// GET /api/leads/agent/:agentId - Get leads by agent (admin, operations manager, agent manager)
router.get('/agent/:agentId', canViewLeads, validateAgentId, handleValidationErrors, canViewAgentPerformance, LeadsController.getLeadsByAgent);

// Lead Referrals Routes
// GET /api/leads/:id/referrals - Get referrals for a lead
router.get('/:id/referrals', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.getLeadReferrals);

// POST /api/leads/:id/referrals - Manually add a referral to a lead
router.post('/:id/referrals', canManageLeads, validateLeadId, handleValidationErrors, LeadsController.addLeadReferral);

// DELETE /api/leads/:id/referrals/:referralId - Delete a referral from a lead
router.delete('/:id/referrals/:referralId', canManageLeads, validateLeadId, handleValidationErrors, LeadsController.deleteLeadReferral);

// GET /api/leads/agent/:agentId/referral-stats - Get referral statistics for an agent
router.get('/agent/:agentId/referral-stats', canViewLeads, validateAgentId, handleValidationErrors, canViewAgentPerformance, LeadsController.getAgentReferralStats);

// GET /api/leads/:id - Get single lead (filtered by role) - MUST BE LAST GET route
router.get('/:id', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.getLeadById);

// POST /api/leads - Create new lead (admin, operations manager, operations)
router.post('/', 
  canManageLeads, 
  sanitizeRequestBody,
  leadsRateLimit,
  validateCreateLead, 
  handleValidationErrors,
  validateLeadBusinessRules,
  LeadsController.createLead
);

// PUT /api/leads/:id - Update lead (admin, operations manager, operations)
router.put('/:id', 
  canManageLeads,
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
