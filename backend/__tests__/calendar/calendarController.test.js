// __tests__/calendar/calendarController.test.js
const calendarController = require('../../controllers/calendarController');
const calendarEventModel = require('../../models/calendarEventModel');
const Notification = require('../../models/notificationModel');
const ReminderService = require('../../services/reminderService');
const pool = require('../../config/db');
const Property = require('../../models/propertyModel');
const Lead = require('../../models/leadsModel');

// Mock all dependencies
jest.mock('../../models/calendarEventModel');
jest.mock('../../models/notificationModel');
jest.mock('../../services/reminderService');
jest.mock('../../config/db');
jest.mock('../../models/propertyModel');
jest.mock('../../models/leadsModel');

describe('Calendar Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Test User', role: 'admin' },
      params: {},
      query: {},
      body: {},
      roleFilters: { canViewAll: true, canViewLeads: true }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAllEvents', () => {
    it('should get all events for admin without filters', async () => {
      const mockEvents = [
        {
          id: 1,
          title: 'Event 1',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          created_by: 1,
          assigned_to: 1
        }
      ];

      calendarEventModel.getAllEvents.mockResolvedValue(mockEvents);

      await calendarController.getAllEvents(req, res);

      expect(calendarEventModel.getAllEvents).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Event 1',
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T11:00:00Z'
          })
        ])
      });
    });

    it('should use advanced filters for admin with query params', async () => {
      req.query = { createdBy: '1', type: 'meeting' };
      const mockEvents = [];

      calendarEventModel.getEventsWithAdvancedFilters.mockResolvedValue(mockEvents);

      await calendarController.getAllEvents(req, res);

      expect(calendarEventModel.getEventsWithAdvancedFilters).toHaveBeenCalledWith(req.query);
    });

    it('should use hierarchy filtering for non-admin users', async () => {
      req.user = { id: 2, role: 'agent' };
      const mockEvents = [];

      calendarEventModel.getEventsForUserWithHierarchy.mockResolvedValue(mockEvents);

      await calendarController.getAllEvents(req, res);

      expect(calendarEventModel.getEventsForUserWithHierarchy).toHaveBeenCalledWith(2, 'agent');
    });

    it('should handle errors', async () => {
      calendarEventModel.getAllEvents.mockRejectedValue(new Error('Database error'));

      await calendarController.getAllEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch events'
      });
    });
  });

  describe('getEventsByDateRange', () => {
    it('should get events by date range', async () => {
      req.query = { start: '2024-01-01', end: '2024-01-31' };
      req.user = { id: 1, role: 'admin' };
      const mockEvents = [];

      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockResolvedValue(mockEvents);

      await calendarController.getEventsByDateRange(req, res);

      expect(calendarEventModel.getEventsForUserWithHierarchyByDateRange).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: []
      });
    });

    it('should return 400 if start date is missing', async () => {
      req.query = { end: '2024-01-31' };

      await calendarController.getEventsByDateRange(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start and end dates are required'
      });
    });

    it('should return 400 if end date is missing', async () => {
      req.query = { start: '2024-01-01' };

      await calendarController.getEventsByDateRange(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start and end dates are required'
      });
    });

    it('should return 400 for invalid date format', async () => {
      req.query = { start: 'invalid', end: '2024-01-31' };

      await calendarController.getEventsByDateRange(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format'
      });
    });

    it('should handle errors', async () => {
      req.query = { start: '2024-01-01', end: '2024-01-31' };
      req.user = { id: 1, role: 'admin' };
      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockRejectedValue(new Error('Database error'));

      await calendarController.getEventsByDateRange(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch events'
      });
    });
  });

  describe('getEventsByMonth', () => {
    it('should get events by month', async () => {
      req.query = { year: '2024', month: '1' };
      req.user = { id: 1, role: 'admin' };
      const mockEvents = [
        {
          id: 1,
          title: 'Event 1',
          start_time: new Date('2024-01-15T10:00:00Z')
        }
      ];

      calendarEventModel.getEventsForUserWithHierarchy.mockResolvedValue(mockEvents);

      await calendarController.getEventsByMonth(req, res);

      expect(calendarEventModel.getEventsForUserWithHierarchy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: expect.arrayContaining([
          expect.objectContaining({ id: 1, title: 'Event 1' })
        ])
      });
    });

    it('should return 400 if year is missing', async () => {
      req.query = { month: '1' };

      await calendarController.getEventsByMonth(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Year and month are required'
      });
    });

    it('should return 400 if month is missing', async () => {
      req.query = { year: '2024' };

      await calendarController.getEventsByMonth(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Year and month are required'
      });
    });

    it('should return 400 for invalid month', async () => {
      req.query = { year: '2024', month: '13' };

      await calendarController.getEventsByMonth(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid year or month'
      });
    });

    it('should handle errors', async () => {
      req.query = { year: '2024', month: '1' };
      req.user = { id: 1, role: 'admin' };
      calendarEventModel.getEventsForUserWithHierarchy.mockRejectedValue(new Error('Database error'));

      await calendarController.getEventsByMonth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch events'
      });
    });
  });

  describe('getEventsByWeek', () => {
    it('should get events by week', async () => {
      req.query = { startOfWeek: '2024-01-01' };
      req.user = { id: 1, role: 'admin' };
      const mockEvents = [];

      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockResolvedValue(mockEvents);

      await calendarController.getEventsByWeek(req, res);

      expect(calendarEventModel.getEventsForUserWithHierarchyByDateRange).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: []
      });
    });

    it('should return 400 if startOfWeek is missing', async () => {
      req.query = {};

      await calendarController.getEventsByWeek(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start of week date is required'
      });
    });

    it('should return 400 for invalid date format', async () => {
      req.query = { startOfWeek: 'invalid' };

      await calendarController.getEventsByWeek(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format'
      });
    });

    it('should handle errors', async () => {
      req.query = { startOfWeek: '2024-01-01' };
      req.user = { id: 1, role: 'admin' };
      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockRejectedValue(new Error('Database error'));

      await calendarController.getEventsByWeek(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch events'
      });
    });
  });

  describe('getEventsByDay', () => {
    it('should get events by day', async () => {
      req.query = { date: '2024-01-15' };
      req.user = { id: 1, role: 'admin' };
      const mockEvents = [];

      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockResolvedValue(mockEvents);

      await calendarController.getEventsByDay(req, res);

      expect(calendarEventModel.getEventsForUserWithHierarchyByDateRange).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: []
      });
    });

    it('should return 400 if date is missing', async () => {
      req.query = {};

      await calendarController.getEventsByDay(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Date is required'
      });
    });

    it('should return 400 for invalid date format', async () => {
      req.query = { date: 'invalid' };

      await calendarController.getEventsByDay(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format'
      });
    });

    it('should handle errors', async () => {
      req.query = { date: '2024-01-15' };
      req.user = { id: 1, role: 'admin' };
      calendarEventModel.getEventsForUserWithHierarchyByDateRange.mockRejectedValue(new Error('Database error'));

      await calendarController.getEventsByDay(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch events'
      });
    });
  });

  describe('getEventById', () => {
    it('should get event by id for admin (any event)', async () => {
      req.params.id = '1';
      req.user = { id: 1, name: 'Admin', role: 'admin' };
      const mockEvent = {
        id: 1,
        title: 'Event 1',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        created_by: 2,
        assigned_to: 3,
        attendees: []
      };

      calendarEventModel.findById.mockResolvedValue(mockEvent);

      await calendarController.getEventById(req, res);

      expect(calendarEventModel.findById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        event: expect.objectContaining({
          id: 1,
          title: 'Event 1'
        })
      });
    });

    it('should get event by id for non-admin if it is their own event', async () => {
      req.params.id = '1';
      req.user = { id: 2, name: 'User', role: 'agent' };
      const mockEvent = {
        id: 1,
        title: 'My Event',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        created_by: 2,
        assigned_to: 2,
        attendees: []
      };

      calendarEventModel.findById.mockResolvedValue(mockEvent);

      await calendarController.getEventById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        event: expect.objectContaining({
          id: 1,
          title: 'My Event'
        })
      });
    });

    it('should return 403 for non-admin trying to access another users event', async () => {
      req.params.id = '1';
      req.user = { id: 2, name: 'User', role: 'agent' };
      const mockEvent = {
        id: 1,
        title: 'Other Event',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        created_by: 3,
        assigned_to: 3,
        attendees: []
      };

      calendarEventModel.findById.mockResolvedValue(mockEvent);

      await calendarController.getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: You can only view your own events'
      });
    });

    it('should allow access if user is in attendees list', async () => {
      req.params.id = '1';
      req.user = { id: 2, name: 'User Name', role: 'agent' };
      const mockEvent = {
        id: 1,
        title: 'Event with Attendee',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        created_by: 3,
        assigned_to: 3,
        attendees: ['User Name']
      };

      calendarEventModel.findById.mockResolvedValue(mockEvent);

      await calendarController.getEventById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        event: expect.objectContaining({
          id: 1,
          title: 'Event with Attendee'
        })
      });
    });

    it('should return 400 if id is missing', async () => {
      req.params = {};

      await calendarController.getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event ID is required'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = '999';
      calendarEventModel.findById.mockResolvedValue(null);

      await calendarController.getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      calendarEventModel.findById.mockRejectedValue(new Error('Database error'));

      await calendarController.getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch event'
      });
    });
  });

  describe('createEvent', () => {
    const mockEventData = {
      title: 'New Event',
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z'
    };

    it('should create event successfully', async () => {
      req.body = mockEventData;
      const mockCreatedEvent = { id: 1, ...mockEventData, start_time: mockEventData.start, end_time: mockEventData.end };
      const mockEnrichedEvent = { ...mockCreatedEvent, created_by_name: 'Test User' };

      calendarEventModel.createEvent.mockResolvedValue(mockCreatedEvent);
      calendarEventModel.findById.mockResolvedValue(mockEnrichedEvent);
      Notification.createCalendarEventNotification.mockResolvedValue({});
      ReminderService.scheduleEventReminders.mockResolvedValue({});

      await calendarController.createEvent(req, res);

      expect(calendarEventModel.createEvent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event created successfully',
        event: expect.objectContaining({
          id: 1,
          title: 'New Event'
        })
      });
    });

    it('should return 400 if title is missing', async () => {
      req.body = { start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' };

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    });

    it('should return 400 if start time is missing', async () => {
      req.body = { title: 'Event', end: '2024-01-01T11:00:00Z' };

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    });

    it('should return 400 if end time is missing', async () => {
      req.body = { title: 'Event', start: '2024-01-01T10:00:00Z' };

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    });

    it('should return 400 for invalid date format', async () => {
      req.body = { title: 'Event', start: 'invalid', end: '2024-01-01T11:00:00Z' };

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format'
      });
    });

    it('should return 400 if end time is before start time', async () => {
      req.body = {
        title: 'Event',
        start: '2024-01-01T11:00:00Z',
        end: '2024-01-01T10:00:00Z'
      };

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End time must be after start time'
      });
    });

    it('should create notification when event is assigned to different user', async () => {
      req.body = { ...mockEventData, assignedTo: 2 };
      const mockCreatedEvent = { id: 1, ...mockEventData, assigned_to: 2, start_time: mockEventData.start, end_time: mockEventData.end };
      const mockEnrichedEvent = { ...mockCreatedEvent, created_by_name: 'Test User' };

      calendarEventModel.createEvent.mockResolvedValue(mockCreatedEvent);
      calendarEventModel.findById.mockResolvedValue(mockEnrichedEvent);
      Notification.createCalendarEventNotification.mockResolvedValue({});
      Notification.createCalendarEventAssignmentNotification.mockResolvedValue({});
      ReminderService.scheduleEventReminders.mockResolvedValue({});

      await calendarController.createEvent(req, res);

      // The controller checks if assigned_to !== req.user.id, so it should be called
      expect(Notification.createCalendarEventAssignmentNotification).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.body = mockEventData;
      calendarEventModel.createEvent.mockRejectedValue(new Error('Database error'));

      await calendarController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create event'
      });
    });
  });

  describe('updateEvent', () => {
    const mockEvent = {
      id: 1,
      title: 'Event 1',
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T11:00:00Z',
      created_by: 1,
      assigned_to: 1
    };

    it('should update own event successfully', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated Event' };
      req.user = { id: 1, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by_role: 'agent' };
      const mockUpdatedEvent = { ...mockEvent, title: 'Updated Event' };

      calendarEventModel.findById.mockResolvedValueOnce(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.updateEvent.mockResolvedValue(mockUpdatedEvent);
      Notification.createCalendarEventNotification.mockResolvedValue({});
      ReminderService.scheduleEventReminders.mockResolvedValue({});

      await calendarController.updateEvent(req, res);

      expect(calendarEventModel.updateEvent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event updated successfully',
        event: expect.objectContaining({
          id: 1,
          title: 'Updated Event'
        })
      });
    });

    it('should allow admin to update any event', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated Event' };
      req.user = { id: 1, role: 'admin' };
      const mockEventWithRole = { ...mockEvent, created_by: 2, created_by_role: 'agent' };
      const mockUpdatedEvent = { ...mockEventWithRole, title: 'Updated Event' };

      calendarEventModel.findById.mockResolvedValueOnce(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.updateEvent.mockResolvedValue(mockUpdatedEvent);
      Notification.createCalendarEventNotification.mockResolvedValue({});
      ReminderService.scheduleEventReminders.mockResolvedValue({});

      await calendarController.updateEvent(req, res);

      expect(calendarEventModel.updateEvent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event updated successfully',
        event: expect.objectContaining({
          id: 1,
          title: 'Updated Event'
        })
      });
    });

    it('should return 403 if non-admin tries to update another users event', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated Event' };
      req.user = { id: 2, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by: 3, assigned_to: 3, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValueOnce(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Access denied')
      });
      expect(calendarEventModel.updateEvent).not.toHaveBeenCalled();
    });

    it('should return 400 if id is missing', async () => {
      req.params = {};
      req.body = { title: 'Updated Event' };

      await calendarController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event ID is required'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = '999';
      req.body = { title: 'Updated Event' };
      calendarEventModel.findById.mockResolvedValue(null);

      await calendarController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should return 400 if end time is before start time', async () => {
      req.params.id = '1';
      req.body = { start: '2024-01-01T11:00:00Z', end: '2024-01-01T10:00:00Z' };
      const mockEventWithRole = { ...mockEvent, created_by_role: 'admin' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End time must be after start time'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated Event' };
      const mockEventWithRole = { ...mockEvent, created_by_role: 'admin' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.updateEvent.mockRejectedValue(new Error('Database error'));

      await calendarController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update event'
      });
    });
  });

  describe('deleteEvent', () => {
    const mockEvent = {
      id: 1,
      title: 'Event 1',
      created_by: 1,
      assigned_to: 1
    };

    it('should delete own event successfully', async () => {
      req.params.id = '1';
      req.user = { id: 1, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.deleteEvent.mockResolvedValue({});
      Notification.createCalendarEventNotification.mockResolvedValue({});

      await calendarController.deleteEvent(req, res);

      expect(calendarEventModel.deleteEvent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event deleted successfully'
      });
    });

    it('should allow admin to delete any event', async () => {
      req.params.id = '1';
      req.user = { id: 1, role: 'admin' };
      const mockEventWithRole = { ...mockEvent, created_by: 2, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.deleteEvent.mockResolvedValue({});
      Notification.createCalendarEventNotification.mockResolvedValue({});

      await calendarController.deleteEvent(req, res);

      expect(calendarEventModel.deleteEvent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event deleted successfully'
      });
    });

    it('should return 403 if non-admin tries to delete another users event', async () => {
      req.params.id = '1';
      req.user = { id: 2, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by: 3, assigned_to: 3, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Access denied')
      });
      expect(calendarEventModel.deleteEvent).not.toHaveBeenCalled();
    });

    it('should return 400 if id is missing', async () => {
      req.params = {};

      await calendarController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event ID is required'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = '999';
      calendarEventModel.findById.mockResolvedValue(null);

      await calendarController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      const mockEventWithRole = { ...mockEvent, created_by_role: 'admin' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.deleteEvent.mockRejectedValue(new Error('Database error'));

      await calendarController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete event'
      });
    });
  });

  describe('checkEventPermissions', () => {
    const mockEvent = {
      id: 1,
      title: 'Event 1',
      created_by: 1,
      assigned_to: 1
    };

    it('should allow admin to edit any event', async () => {
      req.params.id = '1';
      req.user = { id: 1, role: 'admin' };
      // Event created by user 2, assigned to user 3 - not admin's own event
      const mockEventWithRole = { ...mockEvent, created_by: 2, assigned_to: 3, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.checkEventPermissions(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        canEdit: true,
        canDelete: true,
        reason: expect.stringContaining('Admin can edit all events'),
        event: expect.objectContaining({
          id: 1,
          title: 'Event 1'
        })
      });
    });

    it('should allow user to edit own event', async () => {
      req.params.id = '1';
      req.user = { id: 1, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.checkEventPermissions(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        canEdit: true,
        canDelete: true,
        reason: expect.stringContaining('You can edit your own events'),
        event: expect.objectContaining({
          id: 1,
          title: 'Event 1'
        })
      });
    });

    it('should deny non-admin from editing another users event', async () => {
      req.params.id = '1';
      req.user = { id: 2, role: 'agent' };
      const mockEventWithRole = { ...mockEvent, created_by: 3, assigned_to: 3, created_by_role: 'agent' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockResolvedValue(mockEventWithRole);

      await calendarController.checkEventPermissions(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        canEdit: false,
        canDelete: false,
        reason: expect.stringContaining('You can only edit your own events'),
        event: expect.objectContaining({
          id: 1,
          title: 'Event 1'
        })
      });
    });

    it('should return 400 if id is missing', async () => {
      req.params = {};

      await calendarController.checkEventPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event ID is required'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = '999';
      calendarEventModel.findById.mockResolvedValue(null);

      await calendarController.checkEventPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      const mockEventWithRole = { ...mockEvent, created_by_role: 'admin' };

      calendarEventModel.findById.mockResolvedValue(mockEventWithRole);
      calendarEventModel.getEventById.mockRejectedValue(new Error('Database error'));

      await calendarController.checkEventPermissions(req, res);

      // The error is caught in canEditEvent and returns { canEdit: false, reason: 'Error checking permissions' }
      // So it should still return 200 with canEdit: false
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        canEdit: false,
        canDelete: false,
        reason: 'Error checking permissions',
        event: expect.objectContaining({
          id: 1,
          title: 'Event 1'
        })
      });
    });
  });

  describe('searchEvents', () => {
    it('should search events successfully', async () => {
      req.query = { q: 'meeting' };
      req.user = { id: 1, role: 'admin' };
      const mockEvents = [];

      calendarEventModel.searchEventsForUserWithHierarchy.mockResolvedValue(mockEvents);

      await calendarController.searchEvents(req, res);

      expect(calendarEventModel.searchEventsForUserWithHierarchy).toHaveBeenCalledWith(1, 'admin', 'meeting');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        events: []
      });
    });

    it('should return 400 if search query is missing', async () => {
      req.query = {};

      await calendarController.searchEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
    });

    it('should handle errors', async () => {
      req.query = { q: 'meeting' };
      req.user = { id: 1, role: 'admin' };
      calendarEventModel.searchEventsForUserWithHierarchy.mockRejectedValue(new Error('Database error'));

      await calendarController.searchEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search events'
      });
    });
  });

  describe('getPropertiesForDropdown', () => {
    it('should get properties for admin', async () => {
      const mockProperties = [
        { id: 1, reference_number: 'REF001', location: 'Location 1' }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await calendarController.getPropertiesForDropdown(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        properties: [
          { id: 1, reference_number: 'REF001', location: 'Location 1' }
        ]
      });
    });

    it('should get properties for agent', async () => {
      req.user = { id: 2, role: 'agent' };
      req.roleFilters = { canViewAll: false, role: 'agent' };
      const mockProperties = [];

      Property.getPropertiesAssignedOrReferredByAgent.mockResolvedValue(mockProperties);

      await calendarController.getPropertiesForDropdown(req, res);

      expect(Property.getPropertiesAssignedOrReferredByAgent).toHaveBeenCalledWith(2);
    });

    it('should handle errors', async () => {
      Property.getAllProperties.mockRejectedValue(new Error('Database error'));

      await calendarController.getPropertiesForDropdown(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch properties'
      });
    });
  });

  describe('getLeadsForDropdown', () => {
    it('should get leads for dropdown', async () => {
      const mockLeads = [
        { id: 1, customer_name: 'Customer 1', phone_number: '123' }
      ];

      Lead.getAllLeads.mockResolvedValue(mockLeads);

      await calendarController.getLeadsForDropdown(req, res);

      expect(Lead.getAllLeads).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        leads: [
          { id: 1, customer_name: 'Customer 1', phone_number: '123' }
        ]
      });
    });

    it('should return empty array if user cannot view leads', async () => {
      req.roleFilters = { canViewLeads: false };

      await calendarController.getLeadsForDropdown(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        leads: []
      });
    });

    it('should handle errors', async () => {
      Lead.getAllLeads.mockRejectedValue(new Error('Database error'));

      await calendarController.getLeadsForDropdown(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch leads'
      });
    });
  });

  describe('resetAndSeedEvents', () => {
    it('should reset and seed events for admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.body = { count: 10 };
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'User 1', role: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({});

      const mockCreatedEvent = { id: 1 };
      calendarEventModel.createEvent.mockResolvedValue(mockCreatedEvent);

      await calendarController.resetAndSeedEvents(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Events reset and seeded',
        count: expect.any(Number)
      });
    });

    it('should return 403 if user is not admin', async () => {
      req.user = { id: 2, role: 'agent' };

      await calendarController.resetAndSeedEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins can reset and seed events'
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      req.body = { count: 10 };
      pool.query.mockRejectedValue(new Error('Database error'));

      await calendarController.resetAndSeedEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to reset and seed events'
      });
    });
  });
});

