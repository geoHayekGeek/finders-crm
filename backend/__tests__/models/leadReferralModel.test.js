// backend/__tests__/models/leadReferralModel.test.js
// Unit tests for Lead Referral Model

const LeadReferral = require('../../models/leadReferralModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('LeadReferral Model', () => {
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
    it('should create a lead referral successfully', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 50,
        agent_id: 5,
        name: 'John Doe',
        type: 'employee',
        referral_date: new Date('2024-01-15'),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      const result = await LeadReferral.createReferral(
        50,
        5,
        'John Doe',
        'employee',
        new Date('2024-01-15')
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_referrals'),
        [50, 5, 'John Doe', 'employee', expect.any(Date)]
      );
      expect(result).toEqual(mockReferral);
    });

    it('should create a custom referral with null agent_id', async () => {
      const mockReferral = {
        id: 2,
        lead_id: 50,
        agent_id: null,
        name: 'External Referrer',
        type: 'custom',
        referral_date: new Date('2024-01-15'),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      const result = await LeadReferral.createReferral(
        50,
        null,
        'External Referrer',
        'custom',
        new Date('2024-01-15')
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_referrals'),
        [50, null, 'External Referrer', 'custom', expect.any(Date)]
      );
      expect(result).toEqual(mockReferral);
    });

    it('should default to employee type and current date', async () => {
      const mockReferral = {
        id: 3,
        lead_id: 50,
        agent_id: 5,
        name: 'John Doe',
        type: 'employee',
        referral_date: new Date(),
        external: false
      };

      mockQuery.mockResolvedValue({ rows: [mockReferral] });

      await LeadReferral.createReferral(50, 5, 'John Doe');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_referrals'),
        [50, 5, 'John Doe', 'employee', expect.any(Date)]
      );
    });
  });

  describe('getReferralsByLeadId', () => {
    it('should get all referrals for a lead', async () => {
      const mockReferrals = [
        {
          id: 1,
          lead_id: 50,
          agent_id: 5,
          name: 'John Doe',
          type: 'employee',
          agent_name: 'John Doe',
          agent_role: 'agent',
          referral_date: new Date('2024-01-15'),
          external: false
        },
        {
          id: 2,
          lead_id: 50,
          agent_id: null,
          name: 'External Referrer',
          type: 'custom',
          agent_name: null,
          agent_role: null,
          referral_date: new Date('2024-01-10'),
          external: true
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await LeadReferral.getReferralsByLeadId(50);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [50]
      );
      expect(result).toEqual(mockReferrals);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no referrals exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await LeadReferral.getReferralsByLeadId(999);

      expect(result).toEqual([]);
    });
  });

  describe('getReferralsByAgentId', () => {
    it('should get all referrals made by an agent', async () => {
      const mockReferrals = [
        {
          id: 1,
          lead_id: 50,
          customer_name: 'Jane Smith',
          phone_number: '+961-1-123456',
          lead_status: 'active',
          agent_id: 5,
          referral_date: new Date('2024-01-15'),
          external: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await LeadReferral.getReferralsByAgentId(5);

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
        lead_id: 50,
        agent_id: 5,
        name: 'John Doe',
        type: 'employee',
        referral_date: new Date('2024-01-15'),
        external: true,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReferral] });

      const result = await LeadReferral.markAsExternal(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lead_referrals'),
        [1]
      );
      expect(result.external).toBe(true);
    });
  });

  describe('deleteReferral', () => {
    it('should delete a referral successfully', async () => {
      const mockDeletedReferral = {
        id: 1,
        lead_id: 50
      };

      mockQuery.mockResolvedValue({ rows: [mockDeletedReferral] });

      const result = await LeadReferral.deleteReferral(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM lead_referrals'),
        [1]
      );
      expect(result).toEqual(mockDeletedReferral);
    });

    it('should return undefined when referral not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await LeadReferral.deleteReferral(999);

      expect(result).toBeUndefined();
    });
  });

  describe('applyExternalRuleToLeadReferrals', () => {
    it('should mark referrals older than 30 days as external', async () => {
      const mockReferrals = [
        {
          id: 1,
          agent_id: 5,
          name: 'Recent Referral',
          type: 'employee',
          referral_date: new Date('2024-01-15'),
          external: false
        },
        {
          id: 2,
          agent_id: 6,
          name: 'Old Referral',
          type: 'employee',
          referral_date: new Date('2023-12-01'), // More than 30 days before recent
          external: false
        }
      ];

      // Mock transaction: BEGIN, SELECT, UPDATE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: mockReferrals }) // SELECT all referrals
        .mockResolvedValueOnce({ rows: [{ id: 2, external: true }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.applyExternalRuleToLeadReferrals(50);

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
          agent_id: 5,
          name: 'Most Recent',
          type: 'employee',
          referral_date: recentDate,
          external: false
        },
        {
          id: 2,
          agent_id: 6,
          name: 'Recent',
          type: 'employee',
          referral_date: recentDate2,
          external: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: mockReferrals }) // SELECT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.applyExternalRuleToLeadReferrals(50);

      expect(mockClient.release).toHaveBeenCalled();
      // Should not mark any as external if within 30 days
      expect(result.markedExternalReferrals.length).toBe(0);
    });

    it('should handle leads with no referrals', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT - no referrals
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.applyExternalRuleToLeadReferrals(999);

      expect(result.message).toContain('No referrals');
      expect(result.markedExternalReferrals.length).toBe(0);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

