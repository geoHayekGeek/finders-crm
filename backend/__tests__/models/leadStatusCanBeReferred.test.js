// __tests__/models/leadStatusCanBeReferred.test.js
// Tests for can_be_referred field in lead status model
const LeadStatus = require('../../models/leadStatusModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Lead Status Model - can_be_referred field', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('getAllStatuses', () => {
    it('should include can_be_referred in status list', async () => {
      const mockStatuses = [
        {
          id: 1,
          status_name: 'Active',
          code: 'ACTIVE',
          color: '#10B981',
          is_active: true,
          can_be_referred: true
        },
        {
          id: 2,
          status_name: 'Closed',
          code: 'CLOSED',
          color: '#EF4444',
          is_active: true,
          can_be_referred: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockStatuses });

      const result = await LeadStatus.getAllStatuses();

      expect(mockQuery).toHaveBeenCalled();
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('can_be_referred');
      // getAllStatuses doesn't take parameters, so second arg should be undefined or empty array
      expect(callArgs[1] === undefined || callArgs[1] === []).toBe(true);
      expect(result).toEqual(mockStatuses);
      expect(result[0].can_be_referred).toBe(true);
      expect(result[1].can_be_referred).toBe(false);
    });
  });

  describe('getStatusById', () => {
    it('should include can_be_referred when getting status by ID', async () => {
      const mockStatus = {
        id: 1,
        status_name: 'Active',
        code: 'ACTIVE',
        color: '#10B981',
        is_active: true,
        can_be_referred: true
      };

      mockQuery.mockResolvedValue({ rows: [mockStatus] });

      const result = await LeadStatus.getStatusById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        [1]
      );
      expect(result.can_be_referred).toBe(true);
    });
  });

  describe('createStatus', () => {
    it('should create status with can_be_referred field', async () => {
      const statusData = {
        status_name: 'New Status',
        code: 'NEW',
        color: '#10B981',
        description: 'Test status',
        is_active: true,
        can_be_referred: false
      };

      const mockCreatedStatus = { id: 1, ...statusData };
      mockQuery.mockResolvedValue({ rows: [mockCreatedStatus] });

      const result = await LeadStatus.createStatus(statusData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        expect.arrayContaining([false])
      );
      expect(result.can_be_referred).toBe(false);
    });

    it('should default can_be_referred to true if not provided', async () => {
      const statusData = {
        status_name: 'New Status',
        code: 'NEW',
        color: '#10B981',
        description: 'Test status',
        is_active: true
        // can_be_referred not provided
      };

      const mockCreatedStatus = { id: 1, ...statusData, can_be_referred: true };
      mockQuery.mockResolvedValue({ rows: [mockCreatedStatus] });

      const result = await LeadStatus.createStatus(statusData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        expect.arrayContaining([true])
      );
      expect(result.can_be_referred).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update can_be_referred field', async () => {
      const updateData = {
        status_name: 'Active',
        code: 'ACTIVE',
        color: '#10B981',
        can_be_referred: false
      };

      const mockUpdatedStatus = { id: 1, ...updateData };
      mockQuery.mockResolvedValue({ rows: [mockUpdatedStatus] });

      const result = await LeadStatus.updateStatus(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        expect.arrayContaining([false, 1])
      );
      expect(result.can_be_referred).toBe(false);
    });

    it('should default can_be_referred to true if not provided in update', async () => {
      const updateData = {
        status_name: 'Active Updated',
        code: 'ACTIVE',
        color: '#10B981'
        // can_be_referred not in update
      };

      const mockUpdatedStatus = {
        id: 1,
        ...updateData,
        can_be_referred: true // Defaults to true
      };
      mockQuery.mockResolvedValue({ rows: [mockUpdatedStatus] });

      const result = await LeadStatus.updateStatus(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        expect.arrayContaining([true, 1])
      );
      expect(result.can_be_referred).toBe(true);
    });
  });

  describe('getStatusByName', () => {
    it('should include can_be_referred when getting status by name', async () => {
      const mockStatus = {
        id: 1,
        status_name: 'Active',
        code: 'ACTIVE',
        color: '#10B981',
        is_active: true,
        can_be_referred: true
      };

      mockQuery.mockResolvedValue({ rows: [mockStatus] });

      const result = await LeadStatus.getStatusByName('Active');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('can_be_referred'),
        expect.arrayContaining(['Active'])
      );
      expect(result.can_be_referred).toBe(true);
    });
  });
});

