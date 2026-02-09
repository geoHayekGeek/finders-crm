// routes/leadsRoutes.js
const express = require('express');
const router = express.Router();
const LeadsController = require('../controllers/leadsController');
const LeadsStatsController = require('../controllers/leadsStatsController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageLeads,
  canImportLeads,
  canDeleteLeads,
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
const leadsImportUpload = require('../middlewares/leadsImportUpload');

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

// POST /api/leads/import - Import leads from Excel/CSV (dry-run or commit)
router.post('/import',
  canImportLeads,
  leadsRateLimit,
  leadsImportUpload,
  LeadsController.importLeads
);

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

// Lead referral routes (must be before /:id route to avoid conflicts)
// GET /api/leads/referrals/pending - Get pending referrals for current user
router.get('/referrals/pending', canViewLeads, LeadsController.getPendingReferrals);

// GET /api/leads/referrals/pending/count - Get count of pending referrals
router.get('/referrals/pending/count', canViewLeads, LeadsController.getPendingReferralsCount);

// PUT /api/leads/referrals/:id/confirm - Confirm a referral
router.put('/referrals/:id/confirm', canViewLeads, LeadsController.confirmReferral);

// PUT /api/leads/referrals/:id/reject - Reject a referral
router.put('/referrals/:id/reject', canViewLeads, LeadsController.rejectReferral);

// POST /api/leads/:id/refer - Refer a lead to an agent (must be before /:id route)
router.post('/:id/refer', canViewLeads, LeadsController.referLeadToAgent);

// Lead Notes Routes
router.get('/:id/notes', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.getLeadNotes);
router.post('/:id/notes', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.addLeadNote);
router.put('/:id/notes/:noteId', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.updateLeadNote);
router.delete('/:id/notes/:noteId', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.deleteLeadNote);

// Lead Profile Routes (viewings and owned properties)
// GET /api/leads/:id/viewings - Get viewings for a lead
router.get('/:id/viewings', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.getLeadViewings);

// GET /api/leads/:id/owned-properties - Get owned properties for a lead
router.get('/:id/owned-properties', canViewLeads, validateLeadId, handleValidationErrors, LeadsController.getLeadOwnedProperties);

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
router.delete('/:id', canDeleteLeads, validateLeadId, handleValidationErrors, LeadsController.deleteLead);

module.exports = router;
