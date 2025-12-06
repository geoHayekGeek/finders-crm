// __tests__/leads/leadStatusController.test.js
const LeadStatusController = require('../../controllers/leadStatusController');
const LeadStatus = require('../../models/leadStatusModel');

// Mock dependencies
jest.mock('../../models/leadStatusModel');

describe('Lead Status Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAllStatuses', () => {
    it('should get all lead statuses successfully', async () => {
      const mockStatuses = [
        { id: 1, status_name: 'New', code: 'NEW', color: '#10B981', is_active: true },
        { id: 2, status_name: 'Contacted', code: 'CONTACTED', color: '#3B82F6', is_active: true }
      ];

      LeadStatus.getAllStatuses.mockResolvedValue(mockStatuses);

      await LeadStatusController.getAllStatuses(req, res);

      expect(LeadStatus.getAllStatuses).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatuses
      });
    });

    it('should handle errors', async () => {
      LeadStatus.getAllStatuses.mockRejectedValue(new Error('Database error'));

      await LeadStatusController.getAllStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead statuses'
      });
    });
  });

  describe('getStatusById', () => {
    it('should get lead status by ID successfully', async () => {
      req.params = { id: '1' };
      const mockStatus = { id: 1, status_name: 'New', code: 'NEW', color: '#10B981', is_active: true };

      LeadStatus.getStatusById.mockResolvedValue(mockStatus);

      await LeadStatusController.getStatusById(req, res);

      expect(LeadStatus.getStatusById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      LeadStatus.getStatusById.mockResolvedValue(null);

      await LeadStatusController.getStatusById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead status not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      LeadStatus.getStatusById.mockRejectedValue(new Error('Database error'));

      await LeadStatusController.getStatusById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead status'
      });
    });
  });

  describe('createStatus', () => {
    it('should create lead status successfully', async () => {
      req.body = {
        status_name: 'New',
        code: 'NEW',
        color: '#10B981',
        description: 'New lead status',
        is_active: true
      };

      const mockStatus = { id: 1, ...req.body };
      LeadStatus.createStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.createStatus(req, res);

      expect(LeadStatus.createStatus).toHaveBeenCalledWith({
        status_name: 'New',
        code: 'NEW',
        color: '#10B981',
        description: 'New lead status',
        is_active: true
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        message: 'Lead status created successfully'
      });
    });

    it('should convert code to uppercase', async () => {
      req.body = {
        status_name: 'New',
        code: 'new',
        color: '#10B981'
      };

      const mockStatus = { id: 1, ...req.body, code: 'NEW' };
      LeadStatus.createStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.createStatus(req, res);

      expect(LeadStatus.createStatus).toHaveBeenCalledWith({
        status_name: 'New',
        code: 'NEW',
        color: '#10B981',
        description: '',
        is_active: true
      });
    });

    it('should use default color and is_active if not provided', async () => {
      req.body = {
        status_name: 'New',
        code: 'NEW'
      };

      const mockStatus = { id: 1, ...req.body, color: '#6B7280', is_active: true };
      LeadStatus.createStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.createStatus(req, res);

      expect(LeadStatus.createStatus).toHaveBeenCalledWith({
        status_name: 'New',
        code: 'NEW',
        color: '#6B7280',
        description: '',
        is_active: true
      });
    });

    it('should return 400 if status_name is missing', async () => {
      req.body = { code: 'NEW' };

      await LeadStatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status name is required'
      });
      expect(LeadStatus.createStatus).not.toHaveBeenCalled();
    });

    it('should return 400 if code is missing', async () => {
      req.body = { status_name: 'New' };

      await LeadStatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status code is required'
      });
    });

    it('should handle duplicate status error', async () => {
      req.body = {
        status_name: 'New',
        code: 'NEW'
      };

      const error = new Error('Duplicate key');
      error.code = '23505';
      LeadStatus.createStatus.mockRejectedValue(error);

      await LeadStatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead status with this name or code already exists'
      });
    });

    it('should handle errors', async () => {
      req.body = {
        status_name: 'New',
        code: 'NEW'
      };

      LeadStatus.createStatus.mockRejectedValue(new Error('Database error'));

      await LeadStatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create lead status'
      });
    });
  });

  describe('updateStatus', () => {
    it('should update lead status successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        status_name: 'Updated Status',
        code: 'UPDATED',
        color: '#10B981',
        description: 'Updated description',
        is_active: true
      };

      const mockStatus = { id: 1, ...req.body };
      LeadStatus.updateStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.updateStatus(req, res);

      expect(LeadStatus.updateStatus).toHaveBeenCalledWith('1', {
        status_name: 'Updated Status',
        code: 'UPDATED',
        color: '#10B981',
        description: 'Updated description',
        is_active: true
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        message: 'Lead status updated successfully'
      });
    });

    it('should convert code to uppercase', async () => {
      req.params = { id: '1' };
      req.body = {
        status_name: 'Updated Status',
        code: 'updated',
        color: '#10B981'
      };

      const mockStatus = { id: 1, ...req.body, code: 'UPDATED' };
      LeadStatus.updateStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.updateStatus(req, res);

      expect(LeadStatus.updateStatus).toHaveBeenCalledWith('1', {
        status_name: 'Updated Status',
        code: 'UPDATED',
        color: '#10B981',
        description: '',
        is_active: true
      });
    });

    it('should return 400 if status_name is missing', async () => {
      req.params = { id: '1' };
      req.body = { code: 'UPDATED' };

      await LeadStatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status name is required'
      });
      expect(LeadStatus.updateStatus).not.toHaveBeenCalled();
    });

    it('should return 400 if code is missing', async () => {
      req.params = { id: '1' };
      req.body = { status_name: 'Updated Status' };

      await LeadStatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status code is required'
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      req.body = {
        status_name: 'Updated Status',
        code: 'UPDATED'
      };
      LeadStatus.updateStatus.mockResolvedValue(null);

      await LeadStatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead status not found'
      });
    });

    it('should handle duplicate status error', async () => {
      req.params = { id: '1' };
      req.body = {
        status_name: 'New',
        code: 'NEW'
      };

      const error = new Error('Duplicate key');
      error.code = '23505';
      LeadStatus.updateStatus.mockRejectedValue(error);

      await LeadStatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead status with this name or code already exists'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = {
        status_name: 'Updated Status',
        code: 'UPDATED'
      };

      LeadStatus.updateStatus.mockRejectedValue(new Error('Database error'));

      await LeadStatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update lead status'
      });
    });
  });

  describe('deleteStatus', () => {
    it('should delete lead status successfully', async () => {
      req.params = { id: '1' };
      const mockStatus = { id: 1, status_name: 'New', is_active: false };
      LeadStatus.deleteStatus.mockResolvedValue(mockStatus);

      await LeadStatusController.deleteStatus(req, res);

      expect(LeadStatus.deleteStatus).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        message: 'Lead status deleted successfully'
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      LeadStatus.deleteStatus.mockResolvedValue(null);

      await LeadStatusController.deleteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead status not found'
      });
    });

    it('should handle foreign key constraint error', async () => {
      req.params = { id: '1' };
      const error = new Error('Foreign key constraint');
      error.code = '23503';
      LeadStatus.deleteStatus.mockRejectedValue(error);

      await LeadStatusController.deleteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete lead status - it is being used by existing leads'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      LeadStatus.deleteStatus.mockRejectedValue(new Error('Database error'));

      await LeadStatusController.deleteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete lead status'
      });
    });
  });
});








