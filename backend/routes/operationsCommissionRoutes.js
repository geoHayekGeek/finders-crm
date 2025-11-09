// backend/routes/operationsCommissionRoutes.js
const express = require('express');
const router = express.Router();
const operationsCommissionController = require('../controllers/operationsCommissionController');
const { authenticateToken } = require('../middlewares/permissions');

// All routes require authentication
router.use(authenticateToken);

// Get all operations commission reports with optional filters
router.get('/monthly', operationsCommissionController.getAllReports);

// Get a single operations commission report by ID
router.get('/monthly/:id', operationsCommissionController.getReportById);

// Create a new operations commission report
router.post('/monthly', operationsCommissionController.createReport);

// Update an existing operations commission report
router.put('/monthly/:id', operationsCommissionController.updateReport);

// Recalculate operations commission report
router.post('/monthly/:id/recalculate', operationsCommissionController.recalculateReport);

// Delete operations commission report
router.delete('/monthly/:id', operationsCommissionController.deleteReport);

// Export operations commission report to Excel
router.get('/monthly/:id/export/excel', operationsCommissionController.exportReportToExcel);

// Export operations commission report to PDF
router.get('/monthly/:id/export/pdf', operationsCommissionController.exportReportToPDF);

module.exports = router;

