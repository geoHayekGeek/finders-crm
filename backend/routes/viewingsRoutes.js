// routes/viewingsRoutes.js
const express = require('express');
const router = express.Router();
const ViewingsController = require('../controllers/viewingsController');
const { 
  authenticateToken, 
  filterDataByRole
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/viewings - Get all viewings (filtered by role)
router.get('/', ViewingsController.getAllViewings);

// GET /api/viewings/filtered - Get viewings with filters (filtered by role)
router.get('/filtered', ViewingsController.getViewingsWithFilters);

// GET /api/viewings/stats - Get viewing statistics
router.get('/stats', ViewingsController.getViewingStats);

// GET /api/viewings/agent/:agentId - Get viewings by agent
router.get('/agent/:agentId', ViewingsController.getViewingsByAgent);

// GET /api/viewings/:id/updates - Get updates for a viewing
router.get('/:id/updates', ViewingsController.getViewingUpdates);

// POST /api/viewings/:id/updates - Add update to a viewing
router.post('/:id/updates', ViewingsController.addViewingUpdate);

// PUT /api/viewings/:id/updates/:updateId - Update a viewing update
router.put('/:id/updates/:updateId', ViewingsController.updateViewingUpdate);

// DELETE /api/viewings/:id/updates/:updateId - Delete a viewing update
router.delete('/:id/updates/:updateId', ViewingsController.deleteViewingUpdate);

// GET /api/viewings/:id - Get single viewing (must be after other GET routes)
router.get('/:id', ViewingsController.getViewingById);

// POST /api/viewings - Create new viewing
router.post('/', ViewingsController.createViewing);

// PUT /api/viewings/:id - Update viewing
router.put('/:id', ViewingsController.updateViewing);

// DELETE /api/viewings/:id - Delete viewing
router.delete('/:id', ViewingsController.deleteViewing);

module.exports = router;

