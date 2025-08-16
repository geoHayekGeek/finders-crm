// routes/calendarRoutes.js
const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

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

// Get event by ID
router.get('/:id', calendarController.getEventById);

// Create new event
router.post('/', calendarController.createEvent);

// Update event
router.put('/:id', calendarController.updateEvent);

// Delete event
router.delete('/:id', calendarController.deleteEvent);

// Search events
router.get('/search', calendarController.searchEvents);

module.exports = router;
