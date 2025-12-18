// backend/routes/dcsrReportsRoutes.js
// Routes for DCSR (Daily Client/Sales Report) Monthly Reports

const express = require('express');
const router = express.Router();
const dcsrReportsController = require('../controllers/dcsrReportsController');
const { authenticateToken, canViewDCSR, canManageDCSR } = require('../middlewares/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all DCSR reports (with optional filters) - read access
router.get('/monthly', canViewDCSR, dcsrReportsController.getAllDCSRReports);

// Get single DCSR report by ID - read access
router.get('/monthly/:id', canViewDCSR, dcsrReportsController.getDCSRReportById);

// Create new DCSR report - write access required
router.post('/monthly', canManageDCSR, dcsrReportsController.createDCSRReport);

// Update DCSR report - write access required
router.put('/monthly/:id', canManageDCSR, dcsrReportsController.updateDCSRReport);

// Recalculate DCSR report - write access required
router.post('/monthly/:id/recalculate', canManageDCSR, dcsrReportsController.recalculateDCSRReport);

// Delete DCSR report - write access required
router.delete('/monthly/:id', canManageDCSR, dcsrReportsController.deleteDCSRReport);

// Export DCSR report to Excel - read access
router.get('/monthly/:id/export/excel', canViewDCSR, dcsrReportsController.exportDCSRReportToExcel);

// Export DCSR report to PDF - read access
router.get('/monthly/:id/export/pdf', canViewDCSR, dcsrReportsController.exportDCSRReportToPDF);

// Get team-level DCSR breakdown - read access (team leaders can only see their own team)
router.get('/team-breakdown', canViewDCSR, dcsrReportsController.getTeamDCSRBreakdown);

// Get all teams DCSR breakdown (includes unassigned) - read access (only for non-team-leaders)
router.get('/teams-breakdown', canViewDCSR, dcsrReportsController.getAllTeamsDCSRBreakdown);

// Get detailed data for a team - read access (team leaders can only see their own team)
router.get('/team/:teamLeaderId/properties', canViewDCSR, dcsrReportsController.getTeamProperties);
router.get('/team/:teamLeaderId/leads', canViewDCSR, dcsrReportsController.getTeamLeads);
router.get('/team/:teamLeaderId/viewings', canViewDCSR, dcsrReportsController.getTeamViewings);

module.exports = router;

