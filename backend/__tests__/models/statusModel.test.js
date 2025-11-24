// backend/__tests__/models/statusModel.test.js
// Unit tests for Status Model

const Status = require('../../models/statusModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Status Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('getAllStatuses', () => {
    it('should get all active statuses', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', code: 'active', is_active: true },
          { id: 2, name: 'Sold', code: 'sold', is_active: true }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getAllStatuses();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('is_active = true');
    });
  });

  describe('getAllStatusesForAdmin', () => {
    it('should get all statuses including inactive', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', is_active: true },
          { id: 2, name: 'Inactive', is_active: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getAllStatusesForAdmin();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('SELECT * FROM statuses');
    });
  });

  describe('getStatusById', () => {
    it('should get status by id', async () => {
      const mockStatus = {
        rows: [{
          id: 1,
          name: 'Active',
          code: 'active',
          is_active: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusById(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Active');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND is_active = true'),
        [1]
      );
    });

    it('should return undefined when status not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Status.getStatusById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getStatusByCode', () => {
    it('should get status by code', async () => {
      const mockStatus = {
        rows: [{
          id: 1,
          name: 'Active',
          code: 'active',
          is_active: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusByCode('active');

      expect(result.code).toBe('active');
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('code');
    });
  });

  describe('createStatus', () => {
    it('should create a new status', async () => {
      const statusData = {
        name: 'New Status',
        code: 'new_status',
        description: 'A new status',
        color: '#FF0000',
        is_active: true
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData }]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await Status.createStatus(statusData);

      expect(result.name).toBe('New Status');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        ['New Status', 'new_status', 'A new status', '#FF0000', true]
      );
    });

    it('should use default is_active when not provided', async () => {
      const statusData = {
        name: 'New Status',
        code: 'new_status'
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData, is_active: true }]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await Status.createStatus(statusData);

      expect(result.is_active).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const updates = {
        name: 'Updated Status',
        color: '#00FF00'
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          ...updates
        }]
      };

      mockQuery.mockResolvedValueOnce(mockUpdated);

      const result = await Status.updateStatus(1, updates);

      expect(result.name).toBe('Updated Status');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        expect.arrayContaining([1, 'Updated Status', '#00FF00'])
      );
    });
  });

  describe('deleteStatus', () => {
    it('should soft delete status by setting is_active to false', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          name: 'Status',
          is_active: false
        }]
      };

      mockQuery.mockResolvedValueOnce(mockDeleted);

      const result = await Status.deleteStatus(1);

      expect(result.is_active).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses SET is_active = false'),
        [1]
      );
    });
  });

  describe('getStatusesWithPropertyCount', () => {
    it('should get statuses with property counts', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', property_count: 10 },
          { id: 2, name: 'Sold', property_count: 5 }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getStatusesWithPropertyCount();

      expect(result).toHaveLength(2);
      expect(result[0].property_count).toBe(10);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('properties');
    });
  });

  describe('searchStatuses', () => {
    it('should search statuses by name, code, or description', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active Status', code: 'active' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.searchStatuses('active');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('ILIKE');
    });
  });

  describe('getStatusStats', () => {
    it('should return status statistics', async () => {
      const mockStats = {
        rows: [
          { name: 'Active', color: '#00FF00', count: 50 },
          { name: 'Sold', color: '#FF0000', count: 20 }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStats);

      const result = await Status.getStatusStats();

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(50);
    });
  });
});

