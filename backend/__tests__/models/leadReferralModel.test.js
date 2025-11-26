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

  describe('referLeadToAgent', () => {
    it('should create a pending referral successfully', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };
      const mockReferral = {
        id: 1,
        lead_id: 100,
        agent_id: 27, // Omar (referrer)
        name: 'Omar Referrer',
        type: 'employee',
        referral_date: expect.any(Date),
        external: false,
        status: 'pending',
        referred_to_agent_id: 28, // Ali (referred to)
        referred_by_user_id: 27 // Omar
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [] }) // Check existing pending
        .mockResolvedValueOnce({ rows: [{ name: 'Omar Referrer' }] }) // Get referrer name
        .mockResolvedValueOnce({ rows: [mockReferral] }) // INSERT referral
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.referLeadToAgent(100, 28, 27);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.status).toBe('pending');
      expect(result.referred_to_agent_id).toBe(28);
      expect(result.referred_by_user_id).toBe(27);
      expect(result.agent_id).toBe(27); // Should be the referrer, not the referred-to
    });

    it('should throw error if trying to refer to yourself', async () => {
      await expect(
        LeadReferral.referLeadToAgent(100, 27, 27)
      ).rejects.toThrow('Cannot refer lead to yourself');
    });

    it('should throw error if agent not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT agent - not found

      await expect(
        LeadReferral.referLeadToAgent(100, 999, 27)
      ).rejects.toThrow('Agent not found');
    });

    it('should throw error if trying to refer to non-agent/team_leader', async () => {
      const mockUser = {
        name: 'Admin User',
        role: 'admin'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }); // SELECT user

      await expect(
        LeadReferral.referLeadToAgent(100, 999, 27)
      ).rejects.toThrow('Can only refer leads to agents or team leaders');
    });

    it('should throw error if pending referral already exists', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing pending referral

      await expect(
        LeadReferral.referLeadToAgent(100, 28, 27)
      ).rejects.toThrow('A pending referral already exists');
    });
  });

  describe('confirmReferral', () => {
    it('should confirm referral and assign lead', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'pending',
        referred_to_agent_id: 28
      };
      const mockUpdatedReferral = {
        ...mockReferral,
        status: 'confirmed'
      };
      const mockLead = {
        id: 100,
        customer_name: 'John Doe',
        agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }) // SELECT referral
        .mockResolvedValueOnce({ rows: [mockUpdatedReferral] }) // UPDATE referral
        .mockResolvedValueOnce({}) // UPDATE lead
        .mockResolvedValueOnce({ rows: [mockLead] }) // SELECT lead
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.confirmReferral(1, 28);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.referral.status).toBe('confirmed');
      expect(result.lead.agent_id).toBe(28);
    });

    it('should throw error if referral not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT referral - not found

      await expect(
        LeadReferral.confirmReferral(999, 28)
      ).rejects.toThrow('Referral not found');
    });

    it('should throw error if referral is not pending', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'confirmed',
        referred_to_agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        LeadReferral.confirmReferral(1, 28)
      ).rejects.toThrow('Referral is already confirmed');
    });

    it('should throw error if wrong user tries to confirm', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'pending',
        referred_to_agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        LeadReferral.confirmReferral(1, 27) // Different user
      ).rejects.toThrow('Only the referred agent can confirm this referral');
    });
  });

  describe('rejectReferral', () => {
    it('should reject referral successfully', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'pending',
        referred_to_agent_id: 28
      };
      const mockRejectedReferral = {
        ...mockReferral,
        status: 'rejected'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }) // SELECT referral
        .mockResolvedValueOnce({ rows: [mockRejectedReferral] }) // UPDATE referral
        .mockResolvedValueOnce({}); // COMMIT

      const result = await LeadReferral.rejectReferral(1, 28);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.status).toBe('rejected');
    });

    it('should throw error if referral not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT referral - not found

      await expect(
        LeadReferral.rejectReferral(999, 28)
      ).rejects.toThrow('Referral not found');
    });

    it('should throw error if wrong user tries to reject', async () => {
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'pending',
        referred_to_agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        LeadReferral.rejectReferral(1, 27) // Different user
      ).rejects.toThrow('Only the referred agent can reject this referral');
    });
  });

  describe('getPendingReferralsForUser', () => {
    it('should get pending referrals for user', async () => {
      const mockReferrals = [
        {
          id: 1,
          lead_id: 100,
          status: 'pending',
          customer_name: 'John Doe',
          referred_by_name: 'Omar Referrer'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await LeadReferral.getPendingReferralsForUser(28);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [28]
      );
      expect(result).toEqual(mockReferrals);
    });

    it('should return empty array when no pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await LeadReferral.getPendingReferralsForUser(28);

      expect(result).toEqual([]);
    });
  });

  describe('getPendingReferralsCount', () => {
    it('should get count of pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '3' }] });

      const result = await LeadReferral.getPendingReferralsCount(28);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        [28]
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await LeadReferral.getPendingReferralsCount(28);

      expect(result).toBe(0);
    });
  });
});

