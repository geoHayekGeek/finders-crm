// backend/routes/dcsrReportsRoutes.js
// Routes for DCSR (Daily Client/Sales Report) Monthly Reports

const express = require('express');
const router = express.Router();
const dcsrReportsController = require('../controllers/dcsrReportsController');
const { authenticateToken } = require('../middlewares/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all DCSR reports (with optional filters)
router.get('/monthly', dcsrReportsController.getAllDCSRReports);

// Get single DCSR report by ID
router.get('/monthly/:id', dcsrReportsController.getDCSRReportById);

// Create new DCSR report
router.post('/monthly', dcsrReportsController.createDCSRReport);

// Update DCSR report
router.put('/monthly/:id', dcsrReportsController.updateDCSRReport);

// Recalculate DCSR report
router.post('/monthly/:id/recalculate', dcsrReportsController.recalculateDCSRReport);

// Delete DCSR report
router.delete('/monthly/:id', dcsrReportsController.deleteDCSRReport);

// Export DCSR report to Excel
router.get('/monthly/:id/export/excel', dcsrReportsController.exportDCSRReportToExcel);

// Export DCSR report to PDF
router.get('/monthly/:id/export/pdf', dcsrReportsController.exportDCSRReportToPDF);

// Get team-level DCSR breakdown
router.get('/team-breakdown', dcsrReportsController.getTeamDCSRBreakdown);

// Get all teams DCSR breakdown (includes unassigned)
router.get('/teams-breakdown', dcsrReportsController.getAllTeamsDCSRBreakdown);

// Get detailed data for a team
router.get('/team/:teamLeaderId/properties', dcsrReportsController.getTeamProperties);
router.get('/team/:teamLeaderId/leads', dcsrReportsController.getTeamLeads);
router.get('/team/:teamLeaderId/viewings', dcsrReportsController.getTeamViewings);

module.exports = router;

