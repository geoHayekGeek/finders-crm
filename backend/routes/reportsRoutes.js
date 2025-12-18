// backend/routes/reportsRoutes.js
const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reportsController');
const { authenticateToken, canViewReports, canViewSaleRentSource } = require('../middlewares/permissions');

// All routes require authentication and block agents
router.use(authenticateToken);
router.use(canViewReports);

/**
 * @route   GET /api/reports/monthly
 * @desc    Get all monthly agent reports with optional filters
 * @query   agent_id, start_date, end_date
 * @access  Private (Admin, Operations Manager, Agent Manager)
 */
router.get('/monthly', ReportsController.getAllReports);

/**
 * @route   GET /api/reports/monthly/:id
 * @desc    Get a single monthly report by ID
 * @access  Private (Admin, Operations Manager, Agent Manager)
 */
router.get('/monthly/:id', ReportsController.getReportById);

/**
 * @route   POST /api/reports/monthly
 * @desc    Create a new monthly agent report
 * @body    agent_id, start_date, end_date, boosts (optional)
 * @access  Private (Admin, Operations Manager, Agent Manager)
 */
router.post('/monthly', ReportsController.createMonthlyReport);

/**
 * @route   PUT /api/reports/monthly/:id
 * @desc    Update a monthly report (manual fields)
 * @body    boosts (or other manual fields)
 * @access  Private (Admin, Operations Manager, Agent Manager)
 */
router.put('/monthly/:id', ReportsController.updateReport);

/**
 * @route   POST /api/reports/monthly/:id/recalculate
 * @desc    Recalculate a monthly report's automatic values
 * @access  Private (Admin, Operations Manager, Agent Manager)
 */
router.post('/monthly/:id/recalculate', ReportsController.recalculateReport);

/**
 * @route   DELETE /api/reports/monthly/:id
 * @desc    Delete a monthly report
 * @access  Private (Admin, Operations Manager)
 */
router.delete('/monthly/:id', ReportsController.deleteReport);

/**
 * @route   GET /api/reports/lead-sources
 * @desc    Get all available lead sources
 * @access  Private
 */
router.get('/lead-sources', ReportsController.getLeadSources);

/**
 * @route   GET /api/reports/sale-rent-source
 * @desc    Get Statistics of Sale and Rent Source report rows
 * @query   agent_id, start_date, end_date
 * @access  Private - admin, operations manager, operations, agent manager (read), admin/operations/operations manager (write)
 */
router.get('/sale-rent-source', canViewSaleRentSource, ReportsController.getSaleRentSourceReport);

/**
 * @route   GET /api/reports/sale-rent-source/export/excel
 * @desc    Export Sale & Rent Source report to Excel
 * @access  Private - admin, operations manager, operations, agent manager (read only)
 */
router.get('/sale-rent-source/export/excel', canViewSaleRentSource, ReportsController.exportSaleRentSourceExcel);

/**
 * @route   GET /api/reports/sale-rent-source/export/pdf
 * @desc    Export Sale & Rent Source report to PDF
 * @access  Private - admin, operations manager, operations, agent manager (read only)
 */
router.get('/sale-rent-source/export/pdf', canViewSaleRentSource, ReportsController.exportSaleRentSourcePDF);

/**
 * @route   GET /api/reports/monthly/:id/export/excel
 * @desc    Export a monthly report to Excel
 * @access  Private
 */
router.get('/monthly/:id/export/excel', ReportsController.exportReportToExcel);

/**
 * @route   GET /api/reports/monthly/:id/export/pdf
 * @desc    Export a monthly report to PDF
 * @access  Private
 */
router.get('/monthly/:id/export/pdf', ReportsController.exportReportToPDF);

module.exports = router;

