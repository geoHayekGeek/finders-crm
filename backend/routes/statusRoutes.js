// routes/statusRoutes.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties,
  canViewAllData
} = require('../middlewares/permissions');

// PUBLIC ENDPOINT FOR DEMO (no authentication required)
router.get('/demo', statusController.getAllStatuses);

// Apply authentication and role filtering to all other routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/statuses - Get all statuses
router.get('/', statusController.getAllStatuses);

// GET /api/statuses/with-count - Get statuses with property count
router.get('/with-count', statusController.getStatusesWithPropertyCount);

// GET /api/statuses/stats - Get status statistics
router.get('/stats', statusController.getStatusStats);

// GET /api/statuses/search - Search statuses
router.get('/search', statusController.searchStatuses);

// GET /api/statuses/:id - Get status by ID
router.get('/:id', statusController.getStatusById);

// GET /api/statuses/code/:code - Get status by code
router.get('/code/:code', statusController.getStatusByCode);

// POST /api/statuses - Create new status (admin, operations manager, operations, agent manager)
router.post('/', canManageProperties, statusController.createStatus);

// PUT /api/statuses/:id - Update status (admin, operations manager, operations, agent manager)
router.put('/:id', canManageProperties, statusController.updateStatus);

// DELETE /api/statuses/:id - Delete status (admin, operations manager, operations, agent manager)
router.delete('/:id', canManageProperties, statusController.deleteStatus);

module.exports = router;
