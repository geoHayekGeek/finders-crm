// backend/__tests__/models/statusModel.test.js
// Unit tests for Status Model

const Status = require('../../models/statusModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Status Model', () => {
  let mockQuery;
  let mockClient;
  let mockConnect;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);
    pool.connect = mockConnect;
    jest.clearAllMocks();
  });

  describe('getAllStatuses', () => {
    it('should get all active statuses', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', code: 'active', is_active: true, can_be_referred: true },
          { id: 2, name: 'Sold', code: 'sold', is_active: true, can_be_referred: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getAllStatuses();

      expect(result).toHaveLength(2);
      expect(result[0].can_be_referred).toBe(true);
      expect(result[1].can_be_referred).toBe(false);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('is_active = true');
    });
  });

  describe('getAllStatusesForAdmin', () => {
    it('should get all statuses including inactive', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', is_active: true, can_be_referred: true },
          { id: 2, name: 'Inactive', is_active: false, can_be_referred: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getAllStatusesForAdmin();

      expect(result).toHaveLength(2);
      expect(result[0].can_be_referred).toBe(true);
      expect(result[1].can_be_referred).toBe(false);
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
          is_active: true,
          can_be_referred: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusById(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Active');
      expect(result.can_be_referred).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND is_active = true'),
        [1]
      );
    });

    it('should return status with can_be_referred false', async () => {
      const mockStatus = {
        rows: [{
          id: 2,
          name: 'Sold',
          code: 'sold',
          is_active: true,
          can_be_referred: false
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusById(2);

      expect(result.can_be_referred).toBe(false);
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
          is_active: true,
          can_be_referred: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusByCode('active');

      expect(result.code).toBe('active');
      expect(result.can_be_referred).toBe(true);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('code');
    });

    it('should return status with can_be_referred false', async () => {
      const mockStatus = {
        rows: [{
          id: 2,
          name: 'Sold',
          code: 'sold',
          is_active: true,
          can_be_referred: false
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStatus);

      const result = await Status.getStatusByCode('sold');

      expect(result.can_be_referred).toBe(false);
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
        rows: [{ id: 1, ...statusData, can_be_referred: true, is_closure_status: false, is_default_status: false }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(mockConnect).toHaveBeenCalled();
      expect(result.name).toBe('New Status');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        ['New Status', 'new_status', 'A new status', '#FF0000', true, true, false, false]
      );
    });

    it('should use default is_active when not provided', async () => {
      const statusData = {
        name: 'New Status',
        code: 'new_status'
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData, is_active: true, can_be_referred: true, is_closure_status: false, is_default_status: false }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(result.is_active).toBe(true);
    });

    it('should use default can_be_referred when not provided', async () => {
      const statusData = {
        name: 'New Status',
        code: 'new_status',
        description: 'A new status',
        color: '#FF0000',
        is_active: true
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData, can_be_referred: true, is_closure_status: false, is_default_status: false }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(result.can_be_referred).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        expect.arrayContaining([true, false]) // closure + default flag values
      );
    });

    it('should create status with can_be_referred set to false', async () => {
      const statusData = {
        name: 'Sold',
        code: 'sold',
        description: 'Property has been sold',
        color: '#EF4444',
        is_active: true,
        can_be_referred: false
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData, is_closure_status: false, is_default_status: false }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(result.can_be_referred).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        ['Sold', 'sold', 'Property has been sold', '#EF4444', true, false, false, false]
      );
    });

    it('should create status with is_closure_status set to true', async () => {
      const statusData = {
        name: 'Closed Won',
        code: 'closed_won',
        description: 'Custom closure status',
        color: '#111827',
        is_active: true,
        can_be_referred: false,
        is_closure_status: true
      };

      const mockCreated = {
        rows: [{ id: 1, ...statusData, is_default_status: false }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(result.is_closure_status).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        ['Closed Won', 'closed_won', 'Custom closure status', '#111827', true, false, true, false]
      );
    });

    it('should create status with is_default_status set to true and clear others', async () => {
      const statusData = {
        name: 'Featured',
        code: 'featured',
        description: 'Featured default status',
        color: '#0F172A',
        is_active: true,
        can_be_referred: true,
        is_closure_status: false,
        is_default_status: true
      };

      const mockCreated = {
        rows: [{ id: 10, ...statusData }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // clear existing defaults
        .mockResolvedValueOnce(mockCreated) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.createStatus(statusData);

      expect(result.is_default_status).toBe(true);
      expect(mockClient.query.mock.calls[1][0]).toContain('SET is_default_status = false');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO statuses'),
        ['Featured', 'featured', 'Featured default status', '#0F172A', true, true, false, true]
      );
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
          ...updates,
          can_be_referred: true
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.updateStatus(1, updates);

      expect(mockConnect).toHaveBeenCalled();
      expect(result.name).toBe('Updated Status');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        expect.arrayContaining([1, 'Updated Status', '#00FF00'])
      );
    });

    it('should update can_be_referred field', async () => {
      const updates = {
        can_be_referred: false
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          name: 'Sold',
          code: 'sold',
          can_be_referred: false
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.updateStatus(1, updates);

      expect(result.can_be_referred).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        expect.arrayContaining([1, false])
      );
    });

    it('should update is_closure_status field', async () => {
      const updates = {
        is_closure_status: true
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          name: 'Closed Won',
          code: 'closed_won',
          is_closure_status: true
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.updateStatus(1, updates);

      expect(result.is_closure_status).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        expect.arrayContaining([1, true])
      );
    });

    it('should update multiple fields including can_be_referred', async () => {
      const updates = {
        name: 'Sold',
        can_be_referred: false,
        color: '#EF4444'
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          ...updates
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.updateStatus(1, updates);

      expect(result.name).toBe('Sold');
      expect(result.can_be_referred).toBe(false);
      expect(result.color).toBe('#EF4444');
    });

    it('should promote the updated status to default and clear previous defaults', async () => {
      const updates = {
        is_default_status: true
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          name: 'Featured',
          code: 'featured',
          is_default_status: true,
          is_active: true
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // clear previous defaults
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.updateStatus(1, updates);

      expect(result.is_default_status).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE COALESCE(is_default_status, FALSE) = true')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        expect.arrayContaining([1, true])
      );
    });
  });

  describe('deleteStatus', () => {
    it('should soft delete status by setting is_active to false', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          name: 'Status',
          is_active: false,
          is_default_status: false
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockDeleted) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // ensureDefaultStatus existing default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.deleteStatus(1);

      expect(mockConnect).toHaveBeenCalled();
      expect(result.is_active).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE statuses'),
        [1]
      );
    });

    it('should promote another active status when deleting the default status', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          name: 'Featured',
          is_active: false,
          is_default_status: false
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockDeleted) // UPDATE
        .mockResolvedValueOnce({}) // ensureDefaultStatus clear inactive defaults
        .mockResolvedValueOnce({ rows: [] }) // no active default remains
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // preferred active fallback
        .mockResolvedValueOnce({}) // promote fallback to default
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Status.deleteStatus(1);

      expect(result.is_active).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_default_status = true'),
        [2]
      );
    });
  });

  describe('getStatusesWithPropertyCount', () => {
    it('should get statuses with property counts', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active', property_count: 10, can_be_referred: true },
          { id: 2, name: 'Sold', property_count: 5, can_be_referred: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.getStatusesWithPropertyCount();

      expect(result).toHaveLength(2);
      expect(result[0].property_count).toBe(10);
      expect(result[0].can_be_referred).toBe(true);
      expect(result[1].can_be_referred).toBe(false);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('properties');
    });
  });

  describe('searchStatuses', () => {
    it('should search statuses by name, code, or description', async () => {
      const mockStatuses = {
        rows: [
          { id: 1, name: 'Active Status', code: 'active', can_be_referred: true }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockStatuses);

      const result = await Status.searchStatuses('active');

      expect(result).toHaveLength(1);
      expect(result[0].can_be_referred).toBe(true);
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
