// routes/statusRoutes.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { authenticateToken, filterDataByRole } = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/statuses - Get all statuses (filtered by role)
router.get('/', statusController.getAllStatuses);

// GET /api/statuses/:id - Get single status
router.get('/:id', statusController.getStatusById);

// POST /api/statuses - Create new status (admin only)
router.post('/', statusController.createStatus);

// PUT /api/statuses/:id - Update status (admin only)
router.put('/:id', statusController.updateStatus);

// DELETE /api/statuses/:id - Delete status (admin only)
router.delete('/:id', statusController.deleteStatus);

module.exports = router;
