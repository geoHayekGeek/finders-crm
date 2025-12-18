// backend/routes/operationsCommissionRoutes.js
const express = require('express');
const router = express.Router();
const operationsCommissionController = require('../controllers/operationsCommissionController');
const { authenticateToken, canViewOperationsCommission, canManageOperationsCommission } = require('../middlewares/permissions');

// All routes require authentication
router.use(authenticateToken);

// Get all operations commission reports with optional filters - read access
router.get('/monthly', canViewOperationsCommission, operationsCommissionController.getAllReports);

// Get a single operations commission report by ID - read access
router.get('/monthly/:id', canViewOperationsCommission, operationsCommissionController.getReportById);

// Create a new operations commission report - write access required
router.post('/monthly', canManageOperationsCommission, operationsCommissionController.createReport);

// Update an existing operations commission report - write access required
router.put('/monthly/:id', canManageOperationsCommission, operationsCommissionController.updateReport);

// Recalculate operations commission report - write access required
router.post('/monthly/:id/recalculate', canManageOperationsCommission, operationsCommissionController.recalculateReport);

// Delete operations commission report - write access required
router.delete('/monthly/:id', canManageOperationsCommission, operationsCommissionController.deleteReport);

// Export operations commission report to Excel - read access
router.get('/monthly/:id/export/excel', canViewOperationsCommission, operationsCommissionController.exportReportToExcel);

// Export operations commission report to PDF - read access
router.get('/monthly/:id/export/pdf', canViewOperationsCommission, operationsCommissionController.exportReportToPDF);

module.exports = router;

