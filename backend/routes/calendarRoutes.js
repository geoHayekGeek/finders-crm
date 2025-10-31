// routes/calendarRoutes.js
const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken, filterDataByRole } = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// Default route - Get all events (for backward compatibility)
router.get('/', calendarController.getAllEvents);

// Get all events
router.get('/all', calendarController.getAllEvents);

// Get events by date range
router.get('/range', calendarController.getEventsByDateRange);

// Get events by month
router.get('/month', calendarController.getEventsByMonth);

// Get events by week
router.get('/week', calendarController.getEventsByWeek);

// Get events by day
router.get('/day', calendarController.getEventsByDay);

// Search events (must come before /:id route)
router.get('/search', calendarController.searchEvents);

// Get properties for dropdown
router.get('/properties', calendarController.getPropertiesForDropdown);

// Get leads for dropdown
router.get('/leads', calendarController.getLeadsForDropdown);

// Check event permissions
router.get('/:id/permissions', calendarController.checkEventPermissions);

// Get event by ID
router.get('/:id', calendarController.getEventById);

// Create new event
router.post('/', calendarController.createEvent);

// Update event
router.put('/:id', calendarController.updateEvent);

// Delete event
router.delete('/:id', calendarController.deleteEvent);

// Admin: reset and seed events
router.post('/seed/reset', calendarController.resetAndSeedEvents);

module.exports = router;
