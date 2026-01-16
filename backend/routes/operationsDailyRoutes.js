// backend/routes/operationsDailyRoutes.js
const express = require('express');
const router = express.Router();
const operationsDailyController = require('../controllers/operationsDailyController');
const { authenticateToken } = require('../middlewares/permissions');

// All routes require authentication
router.use(authenticateToken);

// Get operations users for selector - MUST come before /:id route
router.get('/operations-users', operationsDailyController.getOperationsUsers);

// Get all operations daily reports with optional filters
router.get('/', operationsDailyController.getAllReports);

// Get a single operations daily report by ID
router.get('/:id', operationsDailyController.getReportById);

// Create a new operations daily report
router.post('/', operationsDailyController.createReport);

// Update an existing operations daily report
router.put('/:id', operationsDailyController.updateReport);

// Recalculate operations daily report
router.post('/:id/recalculate', operationsDailyController.recalculateReport);

// Delete operations daily report
router.delete('/:id', operationsDailyController.deleteReport);

// Export operations daily report to Excel
router.get('/:id/export/excel', operationsDailyController.exportReportToExcel);

// Export operations daily report to PDF
router.get('/:id/export/pdf', operationsDailyController.exportReportToPDF);

module.exports = router;

