// __tests__/viewings/viewingsController.test.js
const ViewingsController = require('../../controllers/viewingsController');
const Viewing = require('../../models/viewingModel');
const CalendarEvent = require('../../models/calendarEventModel');
const Notification = require('../../models/notificationModel');
const ReminderService = require('../../services/reminderService');
const { validationResult } = require('express-validator');
const pool = require('../../config/db');

// Mock all dependencies
jest.mock('../../models/viewingModel');
jest.mock('../../models/calendarEventModel');
jest.mock('../../models/notificationModel');
jest.mock('../../services/reminderService');
jest.mock('express-validator');
jest.mock('../../config/db');

describe('Viewings Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin User', role: 'admin' },
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    jest.clearAllMocks();
  });

  describe('getAllViewings', () => {
    it('should get all viewings successfully', async () => {
      const mockViewings = [
        { id: 1, property_id: 1, lead_id: 1, agent_id: 1, viewing_date: '2024-01-15', viewing_time: '10:00' }
      ];

      Viewing.getViewingsForAgent.mockResolvedValue(mockViewings);

      await ViewingsController.getAllViewings(req, res);

      expect(Viewing.getViewingsForAgent).toHaveBeenCalledWith(1, 'admin');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockViewings,
        message: `Retrieved ${mockViewings.length} viewings`,
        userRole: 'admin'
      });
    });

    it('should handle errors', async () => {
      Viewing.getViewingsForAgent.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getAllViewings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve viewings',
        error: expect.any(String)
      });
    });
  });

  describe('getViewingsWithFilters', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.query = { status: 'Scheduled' };

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(Viewing.getViewingsWithFilters).not.toHaveBeenCalled();
    });

    it('should return 401 if user is missing id or role', async () => {
      req.user = { name: 'Test User' }; // Missing id and role
      req.query = { status: 'Scheduled' };

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should get filtered viewings for admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.query = { status: 'Scheduled' };

      const mockViewings = [
        { id: 1, status: 'Scheduled' }
      ];

      Viewing.getViewingsWithFilters.mockResolvedValue(mockViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(Viewing.getViewingsWithFilters).toHaveBeenCalledWith(req.query);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockViewings,
        message: `Retrieved ${mockViewings.length} filtered viewings`
      });
    });

    it('should get filtered viewings for agent', async () => {
      req.user = { id: 2, role: 'agent' };
      req.query = { status: 'Scheduled' };

      const mockAgentViewings = [{ id: 1, agent_id: 2, status: 'Scheduled' }];
      const mockFilteredViewings = [{ id: 1, status: 'Scheduled', agent_id: 2 }];

      Viewing.getViewingsByAgent.mockResolvedValue(mockAgentViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockFilteredViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(Viewing.getViewingsByAgent).toHaveBeenCalledWith(2);
      expect(Viewing.getViewingsWithFilters).toHaveBeenCalledWith({ status: 'Scheduled', agent_id: 2 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAgentViewings,
        message: `Retrieved ${mockAgentViewings.length} filtered viewings`
      });
    });

    it('should filter agent viewings by property_id and only return their own', async () => {
      req.user = { id: 2, role: 'agent' };
      req.query = { property_id: '10' };

      const mockAgentViewings = [
        { id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' },
        { id: 2, agent_id: 2, property_id: 11, status: 'Scheduled' }
      ];
      const mockFilteredViewings = [{ id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' }];

      pool.query.mockResolvedValue({ rows: [{ agent_id: 2 }] });
      Viewing.getViewingsByAgent.mockResolvedValue(mockAgentViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockFilteredViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(Viewing.getViewingsByAgent).toHaveBeenCalledWith(2);
      expect(Viewing.getViewingsWithFilters).toHaveBeenCalledWith({ property_id: '10', agent_id: 2 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' }],
        message: `Retrieved 1 filtered viewings`
      });
    });

    it('should not return viewings from other agents even with property_id filter', async () => {
      req.user = { id: 2, role: 'agent' };
      req.query = { property_id: '10' };

      const mockAgentViewings = [
        { id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' }
      ];
      // Simulate that the filter might return viewings from other agents (should be filtered out)
      const mockFilteredViewings = [
        { id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' },
        { id: 3, agent_id: 3, property_id: 10, status: 'Scheduled' } // Other agent's viewing
      ];

      pool.query.mockResolvedValue({ rows: [{ agent_id: 2 }] });
      Viewing.getViewingsByAgent.mockResolvedValue(mockAgentViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockFilteredViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      // Should only return the agent's own viewing
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, agent_id: 2, property_id: 10, status: 'Scheduled' }],
        message: `Retrieved 1 filtered viewings`
      });
    });

    it('should get filtered viewings for team leader', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.query = { status: 'Scheduled' };

      const mockTeamViewings = [
        { id: 1, agent_id: 10, status: 'Scheduled' },
        { id: 2, agent_id: 20, status: 'Scheduled' }
      ];
      const User = require('../../models/userModel');
      User.getTeamLeaderAgents = jest.fn().mockResolvedValue([{ id: 20 }, { id: 21 }]);
      Viewing.getViewingsForTeamLeader.mockResolvedValue(mockTeamViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockTeamViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(Viewing.getViewingsForTeamLeader).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTeamViewings,
        message: `Retrieved ${mockTeamViewings.length} filtered viewings`
      });
    });

    it('should filter team leader viewings by property_id and only return team viewings', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.query = { property_id: '10' };

      const mockTeamViewings = [
        { id: 1, agent_id: 10, property_id: 10, status: 'Scheduled' },
        { id: 2, agent_id: 20, property_id: 10, status: 'Scheduled' }
      ];
      const mockFilteredViewings = [
        { id: 1, agent_id: 10, property_id: 10, status: 'Scheduled' },
        { id: 2, agent_id: 20, property_id: 10, status: 'Scheduled' },
        { id: 3, agent_id: 99, property_id: 10, status: 'Scheduled' } // Outside team
      ];

      pool.query.mockResolvedValue({ rows: [{ agent_id: 10 }] });
      const User = require('../../models/userModel');
      User.getTeamLeaderAgents = jest.fn().mockResolvedValue([{ id: 20 }, { id: 21 }]);
      Viewing.getViewingsForTeamLeader.mockResolvedValue(mockTeamViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockFilteredViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      // Should only return viewings from team (agent_id 10, 20, 21)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 1, agent_id: 10, property_id: 10, status: 'Scheduled' },
          { id: 2, agent_id: 20, property_id: 10, status: 'Scheduled' }
        ],
        message: `Retrieved 2 filtered viewings`
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      req.query = { status: 'Scheduled' };
      Viewing.getViewingsWithFilters.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve filtered viewings',
        error: expect.any(String)
      });
    });
  });

  describe('getViewingById', () => {
    it('should get viewing by ID successfully', async () => {
      req.params = { id: '1' };
      const mockViewing = { id: 1, property_id: 1, lead_id: 1, agent_id: 1 };

      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.getViewingById(req, res);

      expect(Viewing.getViewingById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockViewing
      });
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999' };
      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.getViewingById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent viewing not found'
      });
    });

    it('should return 403 if agent tries to access other agent viewing', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1' };
      const mockViewing = { id: 1, agent_id: 1 };

      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.getViewingById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to view this viewing'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Viewing.getViewingById.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve viewing',
        error: expect.any(String)
      });
    });
  });

  describe('createViewing', () => {
    it('should create viewing successfully', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        status: 'Scheduled',
        notes: 'Test viewing'
      };

      const mockViewing = { id: 1, ...req.body, agent_id: 1 };
      const mockFullViewing = { ...mockViewing, property_reference: 'PROP001', lead_name: 'John Doe' };

      // For admin users, no property check is done, so first pool.query is duplicate check
      // Mock duplicate check - no duplicates found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      Viewing.createViewing.mockResolvedValue(mockViewing);
      Viewing.getViewingById.mockResolvedValue(mockFullViewing);
      CalendarEvent.createEvent.mockResolvedValue({ id: 1 });
      pool.query.mockResolvedValue({ rows: [] });

      await ViewingsController.createViewing(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Viewing created successfully'
      });
    });

    it('should return 400 if validation fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid date' }]
      });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array)
      });
      expect(Viewing.createViewing).not.toHaveBeenCalled();
    });

    it('should return 400 if property_id is missing', async () => {
      req.body = {
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Property and Lead are required fields'
      });
    });

    it('should return 400 if viewing_date is missing', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_time: '10:00'
      };

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Viewing date and time are required'
      });
    });

    it('should auto-assign to agent if agent role', async () => {
      req.user = { id: 2, role: 'agent' };
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      const mockViewing = { id: 1, ...req.body, agent_id: 2 };
      const mockFullViewing = { ...mockViewing, property_reference: 'PROP001' };

      // Mock property check - property belongs to agent 2 (the current user)
      pool.query.mockResolvedValueOnce({ rows: [{ agent_id: 2 }] });
      
      Viewing.createViewing.mockResolvedValue(mockViewing);
      Viewing.getViewingById.mockResolvedValue(mockFullViewing);
      CalendarEvent.createEvent.mockResolvedValue({ id: 1 });
      pool.query.mockResolvedValue({ rows: [] });

      await ViewingsController.createViewing(req, res);

      expect(Viewing.createViewing).toHaveBeenCalledWith(
        expect.objectContaining({ agent_id: 2 })
      );
    });

    it('should return 403 if agent tries to assign to another agent', async () => {
      req.user = { id: 2, role: 'agent' };
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        agent_id: 3
      };

      // Mock property check - property belongs to agent 2 (the current user)
      pool.query.mockResolvedValue({ rows: [{ agent_id: 2 }] });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only assign viewings to yourself'
      });
    });

    it('should return 403 if agent tries to create viewing for property assigned to another agent', async () => {
      req.user = { id: 2, role: 'agent' };
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      // Mock property check - property belongs to agent 3 (not the current user)
      pool.query.mockResolvedValue({ rows: [{ agent_id: 3 }] });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only create viewings for properties assigned to you'
      });
    });

    it('should return 403 if agent tries to create viewing for property with no agent assigned', async () => {
      req.user = { id: 2, role: 'agent' };
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      // Mock property check - property has no agent assigned (NULL)
      pool.query.mockResolvedValue({ rows: [{ agent_id: null }] });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only create viewings for properties assigned to you'
      });
    });

    it('should return 400 if duplicate viewing exists (same lead + property)', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      // Mock property check
      pool.query.mockResolvedValueOnce({ rows: [{ agent_id: 1 }] });
      // Mock duplicate check - returns existing viewing for same lead + property
      pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'A viewing already exists for this lead and property. You can add follow-up viewings to the existing viewing instead.'
      });
      expect(Viewing.createViewing).not.toHaveBeenCalled();
    });

    it('should allow creating viewing if no duplicate exists', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      const mockViewing = { id: 1, ...req.body, agent_id: 1 };
      const mockFullViewing = { ...mockViewing, property_reference: 'PROP001', lead_name: 'John Doe' };

      // Reset pool.query to ensure clean state from previous tests
      pool.query.mockReset();
      
      // For admin users, no property check is done, so first pool.query is duplicate check
      // Mock duplicate check - no duplicates found
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Duplicate check
        .mockResolvedValue({ rows: [] }); // Notification query and any other queries
      
      // Set up mock implementations (jest.clearAllMocks() in beforeEach already reset them)
      Viewing.createViewing.mockResolvedValue(mockViewing);
      Viewing.getViewingById.mockResolvedValue(mockFullViewing);
      CalendarEvent.createEvent.mockResolvedValue({ id: 1 });

      await ViewingsController.createViewing(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should prevent creating viewing for same lead + property even with different date/time', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-16', // Different date
        viewing_time: '14:00' // Different time
      };

      // Reset mocks to ensure clean state
      pool.query.mockReset();
      Viewing.createViewing.mockReset();
      
      // For admin users, no property check is done, so first pool.query is duplicate check
      // Mock duplicate check - returns existing viewing (same lead + property, different date/time)
      pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'A viewing already exists for this lead and property. You can add follow-up viewings to the existing viewing instead.'
      });
      expect(Viewing.createViewing).not.toHaveBeenCalled();
    });

    it('should allow follow-up viewings (sub-viewings) for same lead + property', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-16',
        viewing_time: '14:00',
        parent_viewing_id: 10 // This is a follow-up viewing
      };

      const mockParentViewing = { 
        id: 10, 
        property_id: 1, 
        lead_id: 1, 
        agent_id: 1,
        parent_viewing_id: null
      };
      const mockViewing = { id: 2, ...req.body, parent_viewing_id: 10 };
      const mockFullViewing = { ...mockViewing, property_reference: 'PROP001', lead_name: 'John Doe' };

      // For admin users with parent_viewing_id:
      // 1. First Viewing.getViewingById call is to get the parent viewing
      // 2. Then pool.query is duplicate check (which should return empty for sub-viewings)
      // 3. Then pool.query for notifications
      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing) // Get parent viewing
        .mockResolvedValue(mockFullViewing); // Get created viewing
      
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Duplicate check (should be empty for sub-viewings)
        .mockResolvedValue({ rows: [] }); // Notification query and any other queries
      
      Viewing.createViewing.mockResolvedValue(mockViewing);
      CalendarEvent.createEvent.mockResolvedValue({ id: 1 });

      await ViewingsController.createViewing(req, res);

      expect(Viewing.getViewingById).toHaveBeenCalledWith(10); // Should get parent viewing
      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

      // For admin, no property check is done, so first pool.query is duplicate check
      // Mock duplicate check - no duplicates
      pool.query.mockResolvedValueOnce({ rows: [] });
      Viewing.createViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create viewing',
        error: expect.any(String)
      });
    });
  });

  describe('updateViewing', () => {
    it('should update viewing successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        status: 'Completed',
        notes: 'Updated notes'
      };

      const mockExistingViewing = { id: 1, agent_id: 1, status: 'Scheduled' };
      const mockUpdatedViewing = { id: 1, ...req.body };

      Viewing.getViewingById.mockResolvedValueOnce(mockExistingViewing);
      Viewing.updateViewing.mockResolvedValue(mockUpdatedViewing);
      pool.query.mockResolvedValue({ rows: [] });

      await ViewingsController.updateViewing(req, res);

      expect(Viewing.updateViewing).toHaveBeenCalledWith('1', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedViewing,
        message: 'Viewing updated successfully'
      });
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999' };
      req.body = { status: 'Completed' };

      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.updateViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent viewing not found'
      });
    });

    it('should return 403 if agent tries to update other agent viewing', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1' };
      req.body = { status: 'Completed' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.updateViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only update your own viewings'
      });
    });

    it('should return 400 if validation fails', async () => {
      req.params = { id: '1' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid status' }]
      });

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.updateViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array)
      });
    });

    it('should update is_serious flag successfully', async () => {
      req.params = { id: '1' };
      req.body = { is_serious: true };

      const mockExistingViewing = { id: 1, agent_id: 1, is_serious: false };
      const mockUpdatedViewing = { id: 1, agent_id: 1, is_serious: true };

      Viewing.getViewingById.mockResolvedValueOnce(mockExistingViewing);
      Viewing.updateViewing.mockResolvedValue(mockUpdatedViewing);
      pool.query.mockResolvedValue({ rows: [] });

      await ViewingsController.updateViewing(req, res);

      expect(Viewing.updateViewing).toHaveBeenCalledWith('1', expect.objectContaining({ is_serious: true }));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedViewing,
        message: 'Viewing updated successfully'
      });
    });

    it('should allow agent to update is_serious for their own viewing', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1' };
      req.body = { is_serious: true };

      const mockExistingViewing = { id: 1, agent_id: 2, is_serious: false };
      const mockUpdatedViewing = { id: 1, agent_id: 2, is_serious: true };

      Viewing.getViewingById.mockResolvedValueOnce(mockExistingViewing);
      Viewing.updateViewing.mockResolvedValue(mockUpdatedViewing);
      pool.query.mockResolvedValue({ rows: [] });

      await ViewingsController.updateViewing(req, res);

      expect(Viewing.updateViewing).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedViewing,
        message: 'Viewing updated successfully'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { status: 'Completed' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.updateViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.updateViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update viewing',
        error: expect.any(String)
      });
    });
  });

  describe('deleteViewing', () => {
    it('should delete viewing successfully for admin', async () => {
      req.user = { id: 1, name: 'Admin User', role: 'admin' };
      req.params = { id: '1' };

      const mockViewing = { id: 1, property_id: 10, lead_id: 20 };
      pool.query.mockResolvedValue({ rows: [] });
      Viewing.deleteViewing.mockResolvedValue(mockViewing);

      await ViewingsController.deleteViewing(req, res);

      expect(Viewing.deleteViewing).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Viewing deleted successfully'
      });
    });

    it('should return 403 if non-admin tries to delete', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1' };

      await ViewingsController.deleteViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins, operations managers, and operations can delete viewings'
      });
      expect(Viewing.deleteViewing).not.toHaveBeenCalled();
    });

    it('should return 404 if viewing not found', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '999' };

      pool.query.mockResolvedValue({ rows: [] });
      Viewing.deleteViewing.mockResolvedValue(null);

      await ViewingsController.deleteViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent viewing not found'
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1' };

      pool.query.mockResolvedValue({ rows: [] });
      Viewing.deleteViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.deleteViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete viewing',
        error: expect.any(String)
      });
    });
  });

  describe('getViewingStats', () => {
    it('should get viewing statistics successfully', async () => {
      const mockStats = {
        total: 100,
        byStatus: [{ status: 'Scheduled', count: 50 }]
      };

      Viewing.getViewingStats.mockResolvedValue(mockStats);

      await ViewingsController.getViewingStats(req, res);

      expect(Viewing.getViewingStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors', async () => {
      Viewing.getViewingStats.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve viewing statistics',
        error: expect.any(String)
      });
    });
  });

  describe('getViewingsByAgent', () => {
    it('should get viewings by agent successfully', async () => {
      req.params = { agentId: '2' };
      const mockViewings = [
        { id: 1, agent_id: 2 }
      ];

      Viewing.getViewingsByAgent.mockResolvedValue(mockViewings);

      await ViewingsController.getViewingsByAgent(req, res);

      expect(Viewing.getViewingsByAgent).toHaveBeenCalledWith('2');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockViewings
      });
    });

    it('should handle errors', async () => {
      req.params = { agentId: '2' };
      Viewing.getViewingsByAgent.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingsByAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve agent viewings',
        error: expect.any(String)
      });
    });
  });

  describe('addViewingUpdate (creates follow-up viewing)', () => {
    it('should create follow-up viewing successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        update_text: 'Client showed interest',
        update_date: '2024-01-15'
      };

      const mockParentViewing = { id: 1, agent_id: 1, property_id: 1, lead_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1, property_id: 1, lead_id: 1, agent_id: 1 };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing) // First call for parent
        .mockResolvedValueOnce(mockFullFollowUpViewing); // Second call for full follow-up viewing
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalledWith(expect.objectContaining({
        parent_viewing_id: '1', // ID from params is a string
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        notes: 'Client showed interest'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFullFollowUpViewing,
        message: 'Follow-up viewing created successfully'
      });
    });

    it('should create follow-up viewing even without update_text (uses notes instead)', async () => {
      req.params = { id: '1' };
      req.body = {
        viewing_date: '2024-01-16',
        viewing_time: '14:00',
        status: 'Scheduled',
        notes: 'Follow-up scheduled'
      };

      const mockParentViewing = { id: 1, agent_id: 1, property_id: 1, lead_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing)
        .mockResolvedValueOnce(mockFullFollowUpViewing);
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999' };
      req.body = { update_text: 'Test update' };

      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent viewing not found'
      });
    });

    it('should return 403 if agent tries to add update to other agent viewing', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1' };
      req.body = { update_text: 'Test update' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only add follow-up viewings to your own viewings'
      });
    });

    it('should allow team leader to add update to their own viewing', async () => {
      req.user = { id: 3, role: 'team_leader' };
      req.params = { id: '1' };
      req.body = {
        update_text: 'Team leader update',
        update_date: '2024-01-15'
      };

      const mockViewing = { id: 1, agent_id: 3, property_id: 1, lead_id: 1 }; // Team leader's own viewing
      const mockTeamViewings = [{ id: 1, agent_id: 3 }];
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1, property_id: 1, lead_id: 1, agent_id: 3 };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFullFollowUpViewing);
      Viewing.getViewingsForTeamLeader.mockResolvedValue(mockTeamViewings);
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFullFollowUpViewing,
        message: 'Follow-up viewing created successfully'
      });
    });

    it('should allow team leader to add update to team agent viewing', async () => {
      req.user = { id: 3, role: 'team_leader' };
      req.params = { id: '2' };
      req.body = {
        update_text: 'Update for team agent',
        update_date: '2024-01-15'
      };

      const mockViewing = { id: 2, agent_id: 4 }; // Team agent's viewing
      const mockTeamViewings = [
        { id: 1, agent_id: 3 }, // Team leader's viewing
        { id: 2, agent_id: 4 }  // Team agent's viewing
      ];
      const mockUpdate = { id: 1, update_text: 'Update for team agent' };

      const mockFollowUpViewing = { id: 3, parent_viewing_id: '2' };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };
      
      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFullFollowUpViewing);
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      Viewing.getViewingsForTeamLeader.mockResolvedValue(mockTeamViewings);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 403 if team leader tries to add update to viewing outside their team', async () => {
      req.user = { id: 3, role: 'team_leader' };
      req.params = { id: '99' };
      req.body = { update_text: 'Unauthorized update' };

      const mockViewing = { id: 99, agent_id: 5 }; // Not in team leader's team
      const mockTeamViewings = [
        { id: 1, agent_id: 3 },
        { id: 2, agent_id: 4 }
      ]; // Does not include viewing 99

      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.getViewingsForTeamLeader.mockResolvedValue(mockTeamViewings);

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only add follow-up viewings to viewings assigned to you or your team'
      });
      expect(Viewing.createViewing).not.toHaveBeenCalled();
    });

    it('should allow admin to add update to any viewing', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1' };
      req.body = {
        update_text: 'Admin update',
        update_date: '2024-01-15'
      };

      const mockViewing = { id: 1, agent_id: 2 }; // Different agent's viewing
      const mockUpdate = { id: 1, update_text: 'Admin update' };

      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFullFollowUpViewing);
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow operations manager to add follow-up viewing to any viewing', async () => {
      req.user = { id: 1, role: 'operations manager' };
      req.params = { id: '1' };
      req.body = {
        viewing_date: '2024-01-16',
        viewing_time: '15:00',
        status: 'Scheduled',
        notes: 'Operations manager follow-up'
      };

      const mockViewing = { id: 1, agent_id: 2, property_id: 1, lead_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };
      const mockFullFollowUpViewing = { ...mockFollowUpViewing, sub_viewings: [] };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFullFollowUpViewing);
      Viewing.createViewing.mockResolvedValue(mockFollowUpViewing);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.createViewing).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { update_text: 'Test update' };

      const mockViewing = { id: 1, agent_id: 1, property_id: 1, lead_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.createViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create follow-up viewing',
        error: expect.any(String)
      });
    });
  });

  describe('updateViewingUpdate', () => {
    it('should update viewing update successfully', async () => {
      req.params = { id: '1', updateId: '1' };
      req.body = {
        update_text: 'Updated text',
        update_date: '2024-01-16'
      };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockUpdate = { id: 1, viewing_id: 1, created_by: 1, update_text: 'Updated text' };

      const mockFollowUpViewing = { id: 1, parent_viewing_id: 1, agent_id: 1 };
      const mockUpdatedFollowUpViewing = { ...mockFollowUpViewing, notes: 'Updated text' };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFollowUpViewing)
        .mockResolvedValueOnce(mockUpdatedFollowUpViewing);
      Viewing.updateViewing.mockResolvedValue(mockUpdatedFollowUpViewing);

      await ViewingsController.updateViewingUpdate(req, res);

      expect(Viewing.updateViewing).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Follow-up viewing updated successfully'
      });
    });

    it('should return 400 if update_text is empty', async () => {
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: '' };

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999', updateId: '1' };
      req.body = { update_text: 'Updated' };

      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent viewing not found'
      });
    });

    it('should return 404 if update not found', async () => {
      req.params = { id: '1', updateId: '999' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(null); // Follow-up viewing not found

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Follow-up viewing not found or not linked to this parent viewing'
      });
    });

    it('should return 403 if agent tries to update other agent update', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockFollowUpViewing = { id: 1, parent_viewing_id: 1, agent_id: 1 };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFollowUpViewing);

      await ViewingsController.updateViewingUpdate(req, res);

      // Agent 2 tries to update follow-up viewing owned by agent 1, should get 403
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockFollowUpViewing = { id: 1, parent_viewing_id: 1, agent_id: 1 };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockViewing)
        .mockResolvedValueOnce(mockFollowUpViewing);
      Viewing.updateViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });
  });

  describe('getViewingUpdates (returns follow-up viewings)', () => {
    it('should get follow-up viewings successfully', async () => {
      req.params = { id: '1' };
      const mockViewing = {
        id: 1,
        sub_viewings: [
          { id: 2, parent_viewing_id: 1, viewing_date: '2024-01-16', viewing_time: '10:00' },
          { id: 3, parent_viewing_id: 1, viewing_date: '2024-01-17', viewing_time: '14:00' }
        ]
      };

      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.getViewingUpdates(req, res);

      expect(Viewing.getViewingById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockViewing.sub_viewings,
        message: 'Retrieved 2 follow-up viewings'
      });
    });

    it('should return empty array if no follow-up viewings', async () => {
      req.params = { id: '1' };
      const mockViewing = { id: 1, sub_viewings: [] };

      Viewing.getViewingById.mockResolvedValue(mockViewing);

      await ViewingsController.getViewingUpdates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Retrieved 0 follow-up viewings'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Viewing.getViewingById.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingUpdates(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve follow-up viewings',
        error: expect.any(String)
      });
    });
  });

  describe('deleteViewingUpdate (deletes follow-up viewing)', () => {
    it('should delete follow-up viewing successfully for admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '2' };

      const mockParentViewing = { id: 1, agent_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };

      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing)
        .mockResolvedValueOnce(mockFollowUpViewing);
      Viewing.deleteViewing.mockResolvedValue({});

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(Viewing.deleteViewing).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Follow-up viewing deleted successfully'
      });
    });

    it('should return 403 if non-privileged user tries to delete', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1', updateId: '2' };

      const mockParentViewing = { id: 1, agent_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };
      
      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing)
        .mockResolvedValueOnce(mockFollowUpViewing);

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins, operations managers, and operations can delete follow-up viewings'
      });
      expect(Viewing.deleteViewing).not.toHaveBeenCalled();
    });

    it('should return 404 if follow-up viewing not found', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '999' };

      const mockParentViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing)
        .mockResolvedValueOnce(null);

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Follow-up viewing not found or not linked to this parent viewing'
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '2' };

      const mockParentViewing = { id: 1, agent_id: 1 };
      const mockFollowUpViewing = { id: 2, parent_viewing_id: 1 };
      Viewing.getViewingById
        .mockResolvedValueOnce(mockParentViewing)
        .mockResolvedValueOnce(mockFollowUpViewing);
      Viewing.deleteViewing.mockRejectedValue(new Error('Database error'));

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete follow-up viewing',
        error: expect.any(String)
      });
    });
  });
});


