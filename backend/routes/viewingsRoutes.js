// routes/viewingsRoutes.js
const express = require('express');
const router = express.Router();
const ViewingsController = require('../controllers/viewingsController');
const { 
  authenticateToken, 
  filterDataByRole
} = require('../middlewares/permissions');
const { createRateLimiter } = require('../middlewares/rateLimiter');

// Rate limiter for viewings read operations
const viewingsReadLimiter = createRateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes

// Rate limiter for viewings write operations (stricter)
const viewingsWriteLimiter = createRateLimiter(50, 15 * 60 * 1000); // 50 requests per 15 minutes

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/viewings - Get all viewings (filtered by role)
router.get('/', viewingsReadLimiter, ViewingsController.getAllViewings);

// GET /api/viewings/filtered - Get viewings with filters (filtered by role)
router.get('/filtered', viewingsReadLimiter, ViewingsController.getViewingsWithFilters);

// GET /api/viewings/stats - Get viewing statistics
router.get('/stats', viewingsReadLimiter, ViewingsController.getViewingStats);

// GET /api/viewings/serious-count - Get count of properties with serious viewings
router.get('/serious-count', viewingsReadLimiter, ViewingsController.getSeriousViewingsCount);

// GET /api/viewings/agent/:agentId - Get viewings by agent
router.get('/agent/:agentId', viewingsReadLimiter, ViewingsController.getViewingsByAgent);

// GET /api/viewings/:id/updates - Get updates for a viewing
router.get('/:id/updates', viewingsReadLimiter, ViewingsController.getViewingUpdates);

// POST /api/viewings/:id/updates - Add update to a viewing
router.post('/:id/updates', viewingsWriteLimiter, ViewingsController.addViewingUpdate);

// PUT /api/viewings/:id/updates/:updateId - Update a viewing update
router.put('/:id/updates/:updateId', viewingsWriteLimiter, ViewingsController.updateViewingUpdate);

// DELETE /api/viewings/:id/updates/:updateId - Delete a viewing update
router.delete('/:id/updates/:updateId', viewingsWriteLimiter, ViewingsController.deleteViewingUpdate);

// GET /api/viewings/:id - Get single viewing (must be after other GET routes)
router.get('/:id', viewingsReadLimiter, ViewingsController.getViewingById);

// POST /api/viewings - Create new viewing
router.post('/', viewingsWriteLimiter, ViewingsController.createViewing);

// PUT /api/viewings/:id - Update viewing
router.put('/:id', viewingsWriteLimiter, ViewingsController.updateViewing);

// DELETE /api/viewings/:id - Delete viewing
router.delete('/:id', viewingsWriteLimiter, ViewingsController.deleteViewing);

module.exports = router;

