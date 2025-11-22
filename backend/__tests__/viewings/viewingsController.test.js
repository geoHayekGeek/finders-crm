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
      const mockFilteredViewings = [{ id: 1, status: 'Scheduled' }];

      Viewing.getViewingsByAgent.mockResolvedValue(mockAgentViewings);
      Viewing.getViewingsWithFilters.mockResolvedValue(mockFilteredViewings);

      await ViewingsController.getViewingsWithFilters(req, res);

      expect(Viewing.getViewingsByAgent).toHaveBeenCalledWith(2);
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
        message: 'Viewing not found'
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
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        status: 'Scheduled',
        notes: 'Test viewing'
      };

      const mockViewing = { id: 1, ...req.body, agent_id: 1 };
      const mockFullViewing = { ...mockViewing, property_reference: 'PROP001', lead_name: 'John Doe' };

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

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only assign viewings to yourself'
      });
    });

    it('should handle errors', async () => {
      req.body = {
        property_id: 1,
        lead_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00'
      };

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
        message: 'Viewing not found'
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
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1' };

      const mockViewing = { id: 1 };
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
        message: 'Viewing not found'
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

  describe('addViewingUpdate', () => {
    it('should add viewing update successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        update_text: 'Client showed interest',
        update_date: '2024-01-15'
      };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockUpdate = { id: 1, update_text: 'Client showed interest' };

      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.addViewingUpdate.mockResolvedValue(mockUpdate);
      ReminderService.clearViewingReminder.mockResolvedValue();

      await ViewingsController.addViewingUpdate(req, res);

      expect(Viewing.addViewingUpdate).toHaveBeenCalledWith('1', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdate,
        message: 'Update added successfully'
      });
    });

    it('should return 400 if update_text is missing', async () => {
      req.params = { id: '1' };
      req.body = { update_date: '2024-01-15' };

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Update text is required'
      });
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999' };
      req.body = { update_text: 'Test update' };

      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Viewing not found'
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
        message: 'You can only add updates to your own viewings'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { update_text: 'Test update' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.addViewingUpdate.mockRejectedValue(new Error('Database error'));

      await ViewingsController.addViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to add viewing update',
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

      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.getViewingUpdateById.mockResolvedValue(mockUpdate);
      Viewing.updateViewingUpdate.mockResolvedValue();
      Viewing.getViewingUpdateById.mockResolvedValueOnce(mockUpdate).mockResolvedValueOnce({ ...mockUpdate, update_text: 'Updated text' });

      await ViewingsController.updateViewingUpdate(req, res);

      expect(Viewing.updateViewingUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Update edited successfully'
      });
    });

    it('should return 400 if update_text is empty', async () => {
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: '' };

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Update text cannot be empty'
      });
    });

    it('should return 404 if viewing not found', async () => {
      req.params = { id: '999', updateId: '1' };
      req.body = { update_text: 'Updated' };

      Viewing.getViewingById.mockResolvedValue(null);

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Viewing not found'
      });
    });

    it('should return 404 if update not found', async () => {
      req.params = { id: '1', updateId: '999' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.getViewingUpdateById.mockResolvedValue(null);

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Viewing update not found'
      });
    });

    it('should return 403 if agent tries to update other agent update', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockUpdate = { id: 1, viewing_id: 1, created_by: 1 };

      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.getViewingUpdateById.mockResolvedValue(mockUpdate);

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to edit this update'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1', updateId: '1' };
      req.body = { update_text: 'Updated' };

      const mockViewing = { id: 1, agent_id: 1 };
      const mockUpdate = { id: 1, viewing_id: 1, created_by: 1 };

      Viewing.getViewingById.mockResolvedValue(mockViewing);
      Viewing.getViewingUpdateById.mockResolvedValue(mockUpdate);
      Viewing.updateViewingUpdate.mockRejectedValue(new Error('Database error'));

      await ViewingsController.updateViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update viewing update',
        error: expect.any(String)
      });
    });
  });

  describe('getViewingUpdates', () => {
    it('should get viewing updates successfully', async () => {
      req.params = { id: '1' };
      const mockUpdates = [
        { id: 1, update_text: 'First update' },
        { id: 2, update_text: 'Second update' }
      ];

      Viewing.getViewingUpdates.mockResolvedValue(mockUpdates);

      await ViewingsController.getViewingUpdates(req, res);

      expect(Viewing.getViewingUpdates).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdates
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Viewing.getViewingUpdates.mockRejectedValue(new Error('Database error'));

      await ViewingsController.getViewingUpdates(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve viewing updates',
        error: expect.any(String)
      });
    });
  });

  describe('deleteViewingUpdate', () => {
    it('should delete viewing update successfully for admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '1' };

      const mockUpdate = { id: 1 };
      Viewing.deleteViewingUpdate.mockResolvedValue(mockUpdate);

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(Viewing.deleteViewingUpdate).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Update deleted successfully'
      });
    });

    it('should return 403 if non-admin tries to delete', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params = { id: '1', updateId: '1' };

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins and operations managers can delete updates'
      });
      expect(Viewing.deleteViewingUpdate).not.toHaveBeenCalled();
    });

    it('should return 404 if update not found', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '999' };

      Viewing.deleteViewingUpdate.mockResolvedValue(null);

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Update not found'
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params = { id: '1', updateId: '1' };

      Viewing.deleteViewingUpdate.mockRejectedValue(new Error('Database error'));

      await ViewingsController.deleteViewingUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete viewing update',
        error: expect.any(String)
      });
    });
  });
});


