// routes/statusRoutes.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { 
  authenticateToken, 
  filterDataByRole, 
  canManageCategoriesAndStatuses,
  canViewCategoriesAndStatuses
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/statuses - Get all statuses (active only, filtered by role)
router.get('/', canViewCategoriesAndStatuses, statusController.getAllStatuses);

// GET /api/statuses/admin - Get all statuses for admin (active and inactive) - MANAGEMENT ONLY
router.get('/admin', canManageCategoriesAndStatuses, statusController.getAllStatusesForAdmin);

// GET /api/statuses/:id - Get single status (agents can view for property functionality)
router.get('/:id', canViewCategoriesAndStatuses, statusController.getStatusById);

// POST /api/statuses - Create new status (MANAGEMENT ONLY)
router.post('/', canManageCategoriesAndStatuses, statusController.createStatus);

// PUT /api/statuses/:id - Update status (MANAGEMENT ONLY)
router.put('/:id', canManageCategoriesAndStatuses, statusController.updateStatus);

// DELETE /api/statuses/:id - Delete status (MANAGEMENT ONLY)
router.delete('/:id', canManageCategoriesAndStatuses, statusController.deleteStatus);

module.exports = router;
