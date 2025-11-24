const CalendarEvent = require('../../models/calendarEventModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('CalendarEvent Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create a calendar event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        all_day: false,
        color: '#FF0000',
        type: 'meeting',
        location: 'Office',
        attendees: ['John', 'Jane'],
        notes: 'Test notes',
        created_by: 1,
        assigned_to: 2,
        property_id: 1,
        lead_id: 2
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...eventData }]
      });

      const result = await CalendarEvent.createEvent(eventData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calendar_events'),
        expect.arrayContaining([
          eventData.title,
          eventData.description,
          eventData.start_time,
          eventData.end_time
        ])
      );
      expect(result).toEqual({ id: 1, ...eventData });
    });
  });

  describe('findById', () => {
    it('should get an event by ID with related data', async () => {
      const eventId = 1;
      const mockEvent = { id: eventId, title: 'Test Event' };

      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await CalendarEvent.findById(eventId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ce.id = $1'),
        [eventId]
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getAllEvents', () => {
    it('should get all events', async () => {
      const mockEvents = [{ id: 1, title: 'Event 1' }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getAllEvents();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByUser', () => {
    it('should get events for a user (created by or attendee)', async () => {
      const userId = 1;
      const mockEvents = [{ id: 1, created_by: userId }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByUser(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_by = $1 OR $1 = ANY(attendees)'),
        [userId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByDateRangeForUser', () => {
    it('should get events by date range for a user', async () => {
      const userId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByDateRangeForUser(startDate, endDate, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ce.assigned_to = $1'),
        [userId, startDate, endDate]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsForUser', () => {
    it('should get events for a user (assigned, created, or attendee)', async () => {
      const userId = 1;
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsForUser(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OR ce.created_by = $1'),
        [userId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByDateRange', () => {
    it('should get events by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByDateRange(startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        [startDate, endDate]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByMonth', () => {
    it('should get events for a specific month', async () => {
      const year = 2024;
      const month = 1;
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByMonth(year, month);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByWeek', () => {
    it('should get events for a specific week', async () => {
      const startOfWeek = new Date('2024-01-01');
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByWeek(startOfWeek);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByDay', () => {
    it('should get events for a specific day', async () => {
      const date = new Date('2024-01-15');
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByDay(date);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const eventId = 1;
      const updates = { title: 'Updated Title', description: 'Updated description' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: eventId }] })
        .mockResolvedValueOnce({ rows: [{ id: eventId, ...updates }] });

      const result = await CalendarEvent.updateEvent(eventId, updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE calendar_events'),
        expect.arrayContaining([eventId, updates.title, updates.description])
      );
      expect(result).toEqual({ id: eventId, ...updates });
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const eventId = 1;
      const mockEvent = { id: eventId };

      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await CalendarEvent.deleteEvent(eventId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM calendar_events'),
        [eventId]
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('searchEvents', () => {
    it('should search events by term', async () => {
      const searchTerm = 'test';
      const mockEvents = [{ id: 1, title: 'Test Event' }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.searchEvents(searchTerm);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [`%${searchTerm}%`]
      );
      expect(result).toEqual(mockEvents);
    });

    it('should search events for a specific user', async () => {
      const searchTerm = 'test';
      const userId = 1;
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.searchEvents(searchTerm, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        [`%${searchTerm}%`, userId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByProperty', () => {
    it('should get events for a property', async () => {
      const propertyId = 1;
      const mockEvents = [{ id: 1, property_id: propertyId }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByProperty(propertyId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ce.property_id = $1'),
        [propertyId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByLead', () => {
    it('should get events for a lead', async () => {
      const leadId = 1;
      const mockEvents = [{ id: 1, lead_id: leadId }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsByLead(leadId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ce.lead_id = $1'),
        [leadId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('isAgentUnderTeamLeader', () => {
    it('should return true if agent is under team leader', async () => {
      const teamLeaderId = 1;
      const agentId = 2;

      mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });

      const result = await CalendarEvent.isAgentUnderTeamLeader(teamLeaderId, agentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('team_agents'),
        [teamLeaderId, agentId]
      );
      expect(result).toBe(true);
    });

    it('should return false if agent is not under team leader', async () => {
      const teamLeaderId = 1;
      const agentId = 2;

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await CalendarEvent.isAgentUnderTeamLeader(teamLeaderId, agentId);

      expect(result).toBe(false);
    });

    it('should return false if agentId is not provided', async () => {
      const result = await CalendarEvent.isAgentUnderTeamLeader(1, null);

      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('getEventsForUserWithHierarchy', () => {
    it('should get events for admin (all events)', async () => {
      const userId = 1;
      const userRole = 'admin';
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsForUserWithHierarchy(userId, userRole);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        [userId]
      );
      expect(result).toEqual(mockEvents);
    });

    it('should get events for team leader (own + team)', async () => {
      const userId = 1;
      const userRole = 'team_leader';
      const mockEvents = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await CalendarEvent.getEventsForUserWithHierarchy(userId, userRole);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('team_agents'),
        [userId]
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsWithAdvancedFilters', () => {
    it('should filter events by created by', async () => {
      const filters = { createdBy: 1 };
      mockQuery.mockResolvedValue({ rows: [] });

      await CalendarEvent.getEventsWithAdvancedFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ce.created_by = $1'),
        expect.arrayContaining([1])
      );
    });

    it('should filter events by type', async () => {
      const filters = { type: 'meeting' };
      mockQuery.mockResolvedValue({ rows: [] });

      await CalendarEvent.getEventsWithAdvancedFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ce.type = $1'),
        expect.arrayContaining(['meeting'])
      );
    });

    it('should filter events by date range', async () => {
      const filters = { dateFrom: '2024-01-01', dateTo: '2024-01-31' };
      mockQuery.mockResolvedValue({ rows: [] });

      await CalendarEvent.getEventsWithAdvancedFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ce.start_time >= $1'),
        expect.any(Array)
      );
    });

    it('should filter events by search term', async () => {
      const filters = { search: 'test' };
      mockQuery.mockResolvedValue({ rows: [] });

      await CalendarEvent.getEventsWithAdvancedFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%test%'])
      );
    });
  });
});

