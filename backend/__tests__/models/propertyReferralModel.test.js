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

  describe('referPropertyToAgent', () => {
    it('should create a pending referral successfully', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };
      const mockReferral = {
        id: 1,
        property_id: 100,
        employee_id: 27, // Omar (referrer)
        name: 'Omar Referrer',
        type: 'employee',
        date: expect.any(Date),
        external: false,
        status: 'pending',
        referred_to_agent_id: 28, // Ali (referred to)
        referred_by_user_id: 27 // Omar
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [{ id: 100, can_be_referred: true, status_name: 'Active' }] }) // SELECT property
        .mockResolvedValueOnce({ rows: [] }) // Check existing pending
        .mockResolvedValueOnce({ rows: [{ name: 'Omar Referrer' }] }) // Get referrer name
        .mockResolvedValueOnce({ rows: [mockReferral] }) // INSERT referral
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.referPropertyToAgent(100, 28, 27);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.status).toBe('pending');
      expect(result.referred_to_agent_id).toBe(28);
      expect(result.referred_by_user_id).toBe(27);
      expect(result.employee_id).toBe(27); // Should be the referrer, not the referred-to
    });

    it('should throw error if trying to refer to yourself', async () => {
      await expect(
        PropertyReferral.referPropertyToAgent(100, 27, 27)
      ).rejects.toThrow('Cannot refer property to yourself');
    });

    it('should throw error if agent not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT agent - not found (will throw before property check)

      await expect(
        PropertyReferral.referPropertyToAgent(100, 999, 27)
      ).rejects.toThrow('Agent not found');
    });

    it('should throw error if trying to refer to non-agent/team_leader', async () => {
      const mockUser = {
        name: 'Admin User',
        role: 'admin'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }); // SELECT user (will throw before property check)

      await expect(
        PropertyReferral.referPropertyToAgent(100, 999, 27)
      ).rejects.toThrow('Can only refer properties to agents or team leaders');
    });

    it('should throw error if pending referral already exists', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [{ id: 100, can_be_referred: true, status_name: 'Active' }] }) // SELECT property
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing pending referral

      await expect(
        PropertyReferral.referPropertyToAgent(100, 28, 27)
      ).rejects.toThrow('A pending referral already exists');
    });

    it('should throw error if property status does not allow referrals (can_be_referred = false)', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [{ id: 100, can_be_referred: false, status_name: 'Sold' }] }); // SELECT property with can_be_referred = false

      await expect(
        PropertyReferral.referPropertyToAgent(100, 28, 27)
      ).rejects.toThrow('Properties with status "Sold" cannot be referred.');
    });

    it('should allow referral when property status allows referrals (can_be_referred = true)', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };
      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'pending',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [{ id: 100, can_be_referred: true, status_name: 'Active' }] }) // SELECT property with can_be_referred = true
        .mockResolvedValueOnce({ rows: [] }) // No existing pending referral
        .mockResolvedValueOnce({ rows: [{ name: 'Omar Referrer' }] }) // Get referrer name
        .mockResolvedValueOnce({ rows: [mockReferral] }) // INSERT referral
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.referPropertyToAgent(100, 28, 27);

      expect(result).toEqual(mockReferral);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if property not found when checking can_be_referred', async () => {
      const mockAgent = {
        name: 'Ali Agent',
        role: 'agent'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgent] }) // SELECT agent
        .mockResolvedValueOnce({ rows: [] }); // Property not found

      await expect(
        PropertyReferral.referPropertyToAgent(999, 28, 27)
      ).rejects.toThrow('Property not found');
    });
  });

  describe('confirmReferral', () => {
    it('should confirm referral and assign property to agent', async () => {
      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'pending',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };
      const mockProperty = {
        id: 100,
        reference_number: 'PROP-001',
        agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }) // SELECT referral
        .mockResolvedValueOnce({ rows: [{ ...mockReferral, status: 'confirmed' }] }) // UPDATE referral
        .mockResolvedValueOnce({}) // UPDATE property
        .mockResolvedValueOnce({ rows: [mockProperty] }) // SELECT property
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.confirmReferral(1, 28);

      expect(mockConnect).toHaveBeenCalled();
      expect(result.referral.status).toBe('confirmed');
      expect(result.property.agent_id).toBe(28);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if referral not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT referral - not found

      await expect(
        PropertyReferral.confirmReferral(999, 28)
      ).rejects.toThrow('Referral not found');
    });

    it('should throw error if referral is not pending', async () => {
      const mockReferral = {
        id: 1,
        status: 'confirmed'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        PropertyReferral.confirmReferral(1, 28)
      ).rejects.toThrow('Referral is already confirmed');
    });

    it('should throw error if wrong user tries to confirm', async () => {
      const mockReferral = {
        id: 1,
        status: 'pending',
        referred_to_agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        PropertyReferral.confirmReferral(1, 99) // Wrong user
      ).rejects.toThrow('Only the referred agent can confirm this referral');
    });
  });

  describe('rejectReferral', () => {
    it('should reject referral successfully', async () => {
      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'pending',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }) // SELECT referral
        .mockResolvedValueOnce({ rows: [{ ...mockReferral, status: 'rejected' }] }) // UPDATE referral
        .mockResolvedValueOnce({}); // COMMIT

      const result = await PropertyReferral.rejectReferral(1, 28);

      expect(mockConnect).toHaveBeenCalled();
      expect(result.status).toBe('rejected');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if wrong user tries to reject', async () => {
      const mockReferral = {
        id: 1,
        status: 'pending',
        referred_to_agent_id: 28
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReferral] }); // SELECT referral

      await expect(
        PropertyReferral.rejectReferral(1, 99) // Wrong user
      ).rejects.toThrow('Only the referred agent can reject this referral');
    });
  });

  describe('getPendingReferralsForUser', () => {
    it('should get all pending referrals for a user', async () => {
      const mockReferrals = [
        {
          id: 1,
          property_id: 100,
          status: 'pending',
          reference_number: 'PROP-001',
          location: 'Beirut',
          referred_by_name: 'Omar',
          referred_by_role: 'agent'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockReferrals });

      const result = await PropertyReferral.getPendingReferralsForUser(28);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [28]
      );
      expect(result).toEqual(mockReferrals);
      expect(result[0].status).toBe('pending');
    });

    it('should return empty array when no pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await PropertyReferral.getPendingReferralsForUser(28);

      expect(result).toEqual([]);
    });
  });

  describe('getPendingReferralsCount', () => {
    it('should return count of pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '3' }] });

      const result = await PropertyReferral.getPendingReferralsCount(28);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        [28]
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no pending referrals', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await PropertyReferral.getPendingReferralsCount(28);

      expect(result).toBe(0);
    });
  });
});

