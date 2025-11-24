// backend/__tests__/models/propertyReferralModel.test.js
// Unit tests for Property Referral Model

const PropertyReferral = require('../../models/propertyReferralModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('PropertyReferral Model', () => {
  let mockQuery;
  let mockClient;
  let mockConnect;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);
    
    pool.query = mockQuery;
    pool.connect = mockConnect;
    jest.clearAllMocks();
  });

  describe('createReferral', () => {
    it('should create a property referral successfully', async () => {
      const mockReferral = {
        id: 1,
        property_id: 100,
        employee_id: 5,
        name: 'John Doe',
        type: 'employee',
        date: new Date('2024-01-15'),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      const result = await PropertyReferral.createReferral(
        100,
        5,
        'John Doe',
        'employee',
        new Date('2024-01-15')
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO referrals'),
        [100, 5, 'John Doe', 'employee', expect.any(Date)]
      );
      expect(result).toEqual(mockReferral);
    });

    it('should create a custom referral with null employee_id', async () => {
      const mockReferral = {
        id: 2,
        property_id: 100,
        employee_id: null,
        name: 'External Referrer',
        type: 'custom',
        date: new Date('2024-01-15'),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      const result = await PropertyReferral.createReferral(
        100,
        null,
        'External Referrer',
        'custom',
        new Date('2024-01-15')
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO referrals'),
        [100, null, 'External Referrer', 'custom', expect.any(Date)]
      );
      expect(result).toEqual(mockReferral);
    });

    it('should default to employee type and current date', async () => {
      const mockReferral = {
        id: 3,
        property_id: 100,
        employee_id: 5,
        name: 'John Doe',
        type: 'employee',
        date: new Date(),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      await PropertyReferral.createReferral(100, 5, 'John Doe');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO referrals'),
        [100, 5, 'John Doe', 'employee', expect.any(Date)]
      );
    });
  });

  describe('getReferralsByPropertyId', () => {
    it('should get all referrals for a property', async () => {
      const mockReferrals = [
        {
          id: 1,
          property_id: 100,
          employee_id: 5,
          name: 'John Doe',
          type: 'employee',
          employee_name: 'John Doe',
          employee_role: 'agent',
          date: new Date('2024-01-15'),
          external: false
        },
        {
          id: 2,
          property_id: 100,
          employee_id: null,
          name: 'External Referrer',
          type: 'custom',
          employee_name: null,
          employee_role: null,
          date: new Date('2024-01-10'),
          external: true
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await PropertyReferral.getReferralsByPropertyId(100);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [100]
      );
      expect(result).toEqual(mockReferrals);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no referrals exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await PropertyReferral.getReferralsByPropertyId(999);

      expect(result).toEqual([]);
    });
  });

  describe('getReferralsByEmployeeId', () => {
    it('should get all referrals made by an employee', async () => {
      const mockReferrals = [
        {
          id: 1,
          property_id: 100,
          reference_number: 'PROP-001',
          location: 'Beirut',
          property_type: 'sale',
          price: 500000,
          status_id: 1,
          status_name: 'Active',
          employee_id: 5,
          date: new Date('2024-01-15'),
          external: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await PropertyReferral.getReferralsByEmployeeId(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [5]
      );
      expect(result).toEqual(mockReferrals);
    });
  });

  describe('markAsExternal', () => {
    it('should mark a referral as external', async () => {
      const mockUpdatedReferral = {
        id: 1,
        property_id: 100,
        employee_id: 5,
        name: 'John Doe',
        type: 'employee',
        date: new Date('2024-01-15'),
        external: true,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReferral] });

      const result = await PropertyReferral.markAsExternal(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE referrals'),
        [1]
      );
      expect(result.external).toBe(true);
    });
  });

  describe('deleteReferral', () => {
    it('should delete a referral successfully', async () => {
      const mockDeletedReferral = {
        id: 1,
        property_id: 100
      };

      mockQuery.mockResolvedValue({ rows: [mockDeletedReferral] });

      const result = await PropertyReferral.deleteReferral(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM referrals'),
        [1]
      );
      expect(result).toEqual(mockDeletedReferral);
    });

    it('should return null when referral not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await PropertyReferral.deleteReferral(999);

      expect(result).toBeUndefined();
    });
  });

  describe('applyExternalRuleToPropertyReferrals', () => {
    it('should mark referrals older than 30 days as external', async () => {
      const mockReferrals = [
        {
          id: 1,
          employee_id: 5,
          name: 'Recent Referral',
          type: 'employee',
          date: new Date('2024-01-15'),
          external: false
        },
        {
          id: 2,
          employee_id: 6,
          name: 'Old Referral',
          type: 'employee',
          date: new Date('2023-12-01'), // More than 30 days before recent
          external: false
        }
      ];

      // Mock transaction: BEGIN, SELECT, UPDATE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: mockReferrals }) // SELECT all referrals
        .mockResolvedValueOnce({ rows: [{ id: 2, external: true }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.applyExternalRuleToPropertyReferrals(100);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.markedExternalReferrals.length).toBeGreaterThan(0);
    });

    it('should not mark referrals within 30 days as external', async () => {
      const recentDate = new Date();
      const recentDate2 = new Date(recentDate);
      recentDate2.setDate(recentDate2.getDate() - 15); // 15 days ago

      const mockReferrals = [
        {
          id: 1,
          employee_id: 5,
          name: 'Most Recent',
          type: 'employee',
          date: recentDate,
          external: false
        },
        {
          id: 2,
          employee_id: 6,
          name: 'Recent',
          type: 'employee',
          date: recentDate2,
          external: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: mockReferrals }) // SELECT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.applyExternalRuleToPropertyReferrals(100);

      expect(mockClient.release).toHaveBeenCalled();
      // Should not mark any as external if within 30 days
      expect(result.markedExternalReferrals.length).toBe(0);
    });

    it('should handle properties with no referrals', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT - no referrals
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.applyExternalRuleToPropertyReferrals(999);

      expect(result.message).toContain('No referrals');
      expect(result.markedExternalReferrals.length).toBe(0);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

