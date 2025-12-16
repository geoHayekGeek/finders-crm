// __tests__/status/statusController.test.js
const StatusController = require('../../controllers/statusController');
const Status = require('../../models/statusModel');

// Mock dependencies
jest.mock('../../models/statusModel');

describe('Status Controller', () => {
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
    it('should get all active statuses successfully', async () => {
      const mockStatuses = [
        { id: 1, name: 'For Sale', code: 'FOR_SALE', is_active: true },
        { id: 2, name: 'Sold', code: 'SOLD', is_active: true }
      ];

      Status.getAllStatuses.mockResolvedValue(mockStatuses);

      await StatusController.getAllStatuses(req, res);

      expect(Status.getAllStatuses).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatuses
      });
    });

    it('should handle errors', async () => {
      Status.getAllStatuses.mockRejectedValue(new Error('Database error'));

      await StatusController.getAllStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve statuses',
        error: 'Database error'
      });
    });
  });

  describe('getAllStatusesForAdmin', () => {
    it('should get all statuses for admin successfully', async () => {
      const mockStatuses = [
        { id: 1, name: 'For Sale', code: 'FOR_SALE', is_active: true },
        { id: 2, name: 'Sold', code: 'SOLD', is_active: false }
      ];

      Status.getAllStatusesForAdmin.mockResolvedValue(mockStatuses);

      await StatusController.getAllStatusesForAdmin(req, res);

      expect(Status.getAllStatusesForAdmin).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatuses
      });
    });

    it('should handle errors', async () => {
      Status.getAllStatusesForAdmin.mockRejectedValue(new Error('Database error'));

      await StatusController.getAllStatusesForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve statuses for admin',
        error: 'Database error'
      });
    });
  });

  describe('getStatusById', () => {
    it('should get status by ID successfully', async () => {
      req.params = { id: '1' };
      const mockStatus = { id: 1, name: 'For Sale', code: 'FOR_SALE', is_active: true };

      Status.getStatusById.mockResolvedValue(mockStatus);

      await StatusController.getStatusById(req, res);

      expect(Status.getStatusById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      Status.getStatusById.mockResolvedValue(null);

      await StatusController.getStatusById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Status.getStatusById.mockRejectedValue(new Error('Database error'));

      await StatusController.getStatusById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve status',
        error: 'Database error'
      });
    });
  });

  describe('getStatusByCode', () => {
    it('should get status by code successfully', async () => {
      req.params = { code: 'FOR_SALE' };
      const mockStatus = { id: 1, name: 'For Sale', code: 'FOR_SALE', is_active: true };

      Status.getStatusByCode.mockResolvedValue(mockStatus);

      await StatusController.getStatusByCode(req, res);

      expect(Status.getStatusByCode).toHaveBeenCalledWith('FOR_SALE');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { code: 'INVALID' };
      Status.getStatusByCode.mockResolvedValue(null);

      await StatusController.getStatusByCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status not found'
      });
    });
  });

  describe('createStatus', () => {
    it('should create status successfully', async () => {
      req.body = {
        name: 'For Sale',
        code: 'FOR_SALE',
        description: 'Property for sale',
        color: '#10B981',
        is_active: true
      };

      const mockStatus = { id: 1, ...req.body };
      Status.createStatus.mockResolvedValue(mockStatus);

      await StatusController.createStatus(req, res);

      expect(Status.createStatus).toHaveBeenCalledWith({
        name: 'For Sale',
        code: 'FOR_SALE',
        description: 'Property for sale',
        color: '#10B981',
        is_active: true,
        can_be_referred: true
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status created successfully',
        data: mockStatus
      });
    });

    it('should create status with can_be_referred field', async () => {
      req.body = {
        name: 'Sold',
        code: 'SOLD',
        description: 'Property has been sold',
        color: '#EF4444',
        is_active: true,
        can_be_referred: false
      };

      const mockStatus = { id: 1, ...req.body };
      Status.createStatus.mockResolvedValue(mockStatus);

      await StatusController.createStatus(req, res);

      expect(Status.createStatus).toHaveBeenCalledWith({
        name: 'Sold',
        code: 'SOLD',
        description: 'Property has been sold',
        color: '#EF4444',
        is_active: true,
        can_be_referred: false
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should use default can_be_referred if not provided', async () => {
      req.body = {
        name: 'Active',
        code: 'ACTIVE',
        description: 'Property is active',
        color: '#10B981',
        is_active: true
      };

      const mockStatus = { id: 1, ...req.body, can_be_referred: true };
      Status.createStatus.mockResolvedValue(mockStatus);

      await StatusController.createStatus(req, res);

      expect(Status.createStatus).toHaveBeenCalledWith({
        name: 'Active',
        code: 'ACTIVE',
        description: 'Property is active',
        color: '#10B981',
        is_active: true,
        can_be_referred: true
      });
    });

    it('should use default color and is_active if not provided', async () => {
      req.body = {
        name: 'For Sale',
        code: 'FOR_SALE'
      };

      const mockStatus = { id: 1, ...req.body, color: '#6B7280', is_active: true };
      Status.createStatus.mockResolvedValue(mockStatus);

      await StatusController.createStatus(req, res);

      expect(Status.createStatus).toHaveBeenCalledWith({
        name: 'For Sale',
        code: 'FOR_SALE',
        description: undefined,
        color: '#6B7280',
        is_active: true,
        can_be_referred: true
      });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { code: 'FOR_SALE' };

      await StatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and code are required'
      });
      expect(Status.createStatus).not.toHaveBeenCalled();
    });

    it('should return 400 if code is missing', async () => {
      req.body = { name: 'For Sale' };

      await StatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and code are required'
      });
    });

    it('should handle duplicate status error', async () => {
      req.body = {
        name: 'For Sale',
        code: 'FOR_SALE'
      };

      const error = new Error('Duplicate key');
      error.code = '23505';
      Status.createStatus.mockRejectedValue(error);

      await StatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status with this name or code already exists'
      });
    });

    it('should handle errors', async () => {
      req.body = {
        name: 'For Sale',
        code: 'FOR_SALE'
      };

      Status.createStatus.mockRejectedValue(new Error('Database error'));

      await StatusController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create status',
        error: 'Database error'
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        name: 'Updated Status',
        color: '#10B981'
      };

      const mockStatus = { id: 1, name: 'Updated Status', color: '#10B981', can_be_referred: true };
      Status.updateStatus.mockResolvedValue(mockStatus);

      await StatusController.updateStatus(req, res);

      expect(Status.updateStatus).toHaveBeenCalledWith('1', {
        name: 'Updated Status',
        color: '#10B981'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status updated successfully',
        data: mockStatus
      });
    });

    it('should update status with can_be_referred field', async () => {
      req.params = { id: '1' };
      req.body = {
        name: 'Sold',
        can_be_referred: false
      };

      const mockStatus = { id: 1, name: 'Sold', can_be_referred: false };
      Status.updateStatus.mockResolvedValue(mockStatus);

      await StatusController.updateStatus(req, res);

      expect(Status.updateStatus).toHaveBeenCalledWith('1', {
        name: 'Sold',
        can_be_referred: false
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status updated successfully',
        data: mockStatus
      });
    });

    it('should update multiple fields including can_be_referred', async () => {
      req.params = { id: '1' };
      req.body = {
        name: 'Sold',
        color: '#EF4444',
        can_be_referred: false,
        description: 'Property has been sold'
      };

      const mockStatus = { 
        id: 1, 
        name: 'Sold', 
        color: '#EF4444', 
        can_be_referred: false,
        description: 'Property has been sold'
      };
      Status.updateStatus.mockResolvedValue(mockStatus);

      await StatusController.updateStatus(req, res);

      expect(Status.updateStatus).toHaveBeenCalledWith('1', {
        name: 'Sold',
        color: '#EF4444',
        can_be_referred: false,
        description: 'Property has been sold'
      });
    });

    it('should remove protected fields from updates', async () => {
      req.params = { id: '1' };
      req.body = {
        id: 999,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        name: 'Updated Status'
      };

      const mockStatus = { id: 1, name: 'Updated Status' };
      Status.updateStatus.mockResolvedValue(mockStatus);

      await StatusController.updateStatus(req, res);

      const updateCall = Status.updateStatus.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('id');
      expect(updateCall[1]).not.toHaveProperty('created_at');
      expect(updateCall[1]).not.toHaveProperty('updated_at');
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated' };
      Status.updateStatus.mockResolvedValue(null);

      await StatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status not found'
      });
    });

    it('should handle duplicate status error', async () => {
      req.params = { id: '1' };
      req.body = { name: 'For Sale', code: 'FOR_SALE' };

      const error = new Error('Duplicate key');
      error.code = '23505';
      Status.updateStatus.mockRejectedValue(error);

      await StatusController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status with this name or code already exists'
      });
    });
  });

  describe('deleteStatus', () => {
    it('should delete status successfully', async () => {
      req.params = { id: '1' };
      const mockStatus = { id: 1, name: 'For Sale', is_active: false };
      Status.deleteStatus.mockResolvedValue(mockStatus);

      await StatusController.deleteStatus(req, res);

      expect(Status.deleteStatus).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status deleted successfully',
        data: mockStatus
      });
    });

    it('should return 404 if status not found', async () => {
      req.params = { id: '999' };
      Status.deleteStatus.mockResolvedValue(null);

      await StatusController.deleteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Status.deleteStatus.mockRejectedValue(new Error('Database error'));

      await StatusController.deleteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete status',
        error: 'Database error'
      });
    });
  });

  describe('getStatusesWithPropertyCount', () => {
    it('should get statuses with property count successfully', async () => {
      const mockStatuses = [
        { id: 1, name: 'For Sale', code: 'FOR_SALE', property_count: 50 },
        { id: 2, name: 'Sold', code: 'SOLD', property_count: 30 }
      ];

      Status.getStatusesWithPropertyCount.mockResolvedValue(mockStatuses);

      await StatusController.getStatusesWithPropertyCount(req, res);

      expect(Status.getStatusesWithPropertyCount).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatuses
      });
    });

    it('should handle errors', async () => {
      Status.getStatusesWithPropertyCount.mockRejectedValue(new Error('Database error'));

      await StatusController.getStatusesWithPropertyCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve statuses with property count',
        error: 'Database error'
      });
    });
  });

  describe('getStatusStats', () => {
    it('should get status statistics successfully', async () => {
      const mockStats = [
        { name: 'For Sale', color: '#10B981', count: 50 },
        { name: 'Sold', color: '#059669', count: 30 }
      ];

      Status.getStatusStats.mockResolvedValue(mockStats);

      await StatusController.getStatusStats(req, res);

      expect(Status.getStatusStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors', async () => {
      Status.getStatusStats.mockRejectedValue(new Error('Database error'));

      await StatusController.getStatusStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve status statistics',
        error: 'Database error'
      });
    });
  });

  describe('searchStatuses', () => {
    it('should search statuses successfully', async () => {
      req.query = { q: 'sale' };
      const mockStatuses = [
        { id: 1, name: 'For Sale', code: 'FOR_SALE' }
      ];

      Status.searchStatuses.mockResolvedValue(mockStatuses);

      await StatusController.searchStatuses(req, res);

      expect(Status.searchStatuses).toHaveBeenCalledWith('sale');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatuses
      });
    });

    it('should return 400 if search query is missing', async () => {
      req.query = {};

      await StatusController.searchStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
      expect(Status.searchStatuses).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { q: 'sale' };
      Status.searchStatuses.mockRejectedValue(new Error('Database error'));

      await StatusController.searchStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search statuses',
        error: 'Database error'
      });
    });
  });
});















