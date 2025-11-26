// backend/__tests__/models/leadsModel.test.js
// Unit tests for Leads Model

const Lead = require('../../models/leadsModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Lead Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const leadData = {
        date: '2024-01-01',
        customer_name: 'John Doe',
        phone_number: '1234567890',
        agent_id: 1,
        price: 200000,
        reference_source_id: 1,
        operations_id: 2,
        status: 'Active'
      };

      const mockLead = {
        rows: [{
          id: 1,
          ...leadData
        }]
      };

      mockQuery.mockResolvedValueOnce(mockLead);

      const result = await Lead.createLead(leadData);

      expect(result.id).toBe(1);
      expect(result.customer_name).toBe('John Doe');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leads'),
        expect.arrayContaining([
          '2024-01-01',
          'John Doe',
          '1234567890',
          1,
          undefined,
          200000,
          1,
          2,
          'unknown',
          'Active'
        ])
      );
    });

    it('should use default date when not provided', async () => {
      const leadData = {
        customer_name: 'John Doe',
        phone_number: '1234567890',
        operations_id: 2
      };

      const mockLead = { rows: [{ id: 1, ...leadData }] };
      mockQuery.mockResolvedValueOnce(mockLead);

      await Lead.createLead(leadData);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[0]).toBeDefined(); // Date should be set
    });

    it('should use default status when not provided', async () => {
      const leadData = {
        customer_name: 'John Doe',
        phone_number: '1234567890',
        operations_id: 2
      };

      const mockLead = { rows: [{ id: 1 }] };
      mockQuery.mockResolvedValueOnce(mockLead);

      await Lead.createLead(leadData);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[9]).toBe('Active'); // Default status
    });

    it('should throw error when operations_id is missing', async () => {
      const leadData = {
        customer_name: 'John Doe',
        phone_number: '1234567890'
      };

      await expect(Lead.createLead(leadData)).rejects.toThrow(
        'operations_id is required and cannot be null'
      );
    });
  });

  describe('getAllLeads', () => {
    it('should get all leads with joins', async () => {
      const mockLeads = {
        rows: [
          {
            id: 1,
            customer_name: 'John Doe',
            agent_id: 1,
            assigned_agent_name: 'Agent 1',
            reference_source_name: 'Website',
            operations_name: 'Ops 1'
          }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getAllLeads();

      expect(result).toHaveLength(1);
      expect(result[0].customer_name).toBe('John Doe');
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('users');
    });

    it('should handle empty leads list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Lead.getAllLeads();

      expect(result).toEqual([]);
    });
  });

  describe('getLeadById', () => {
    it('should get lead by id with referrals', async () => {
      const mockLead = {
        rows: [{
          id: 1,
          customer_name: 'John Doe',
          referrals: [
            { id: 1, agent_id: 2, name: 'Ref 1', type: 'employee' }
          ]
        }]
      };

      mockQuery.mockResolvedValueOnce(mockLead);

      const result = await Lead.getLeadById(1);

      expect(result.id).toBe(1);
      expect(result.referrals).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN lead_referrals'),
        [1]
      );
    });

    it('should include status fields in referrals', async () => {
      const mockLead = {
        rows: [{
          id: 1,
          customer_name: 'John Doe',
          referrals: JSON.stringify([
            {
              id: 1,
              agent_id: 2,
              name: 'Ref 1',
              type: 'employee',
              agent_name: 'Agent 2',
              referral_date: '2024-01-15',
              external: false,
              status: 'pending',
              referred_to_agent_id: 3,
              referred_by_user_id: 2,
              referred_by_name: 'Referrer Name',
              referred_to_name: 'Referred To Name'
            }
          ])
        }]
      };

      mockQuery.mockResolvedValueOnce(mockLead);

      const result = await Lead.getLeadById(1);

      expect(result.id).toBe(1);
      expect(result.referrals).toBeDefined();
      // Verify the query includes status fields
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('status');
      expect(queryCall).toContain('referred_to_agent_id');
      expect(queryCall).toContain('referred_by_user_id');
      expect(queryCall).toContain('referred_by_name');
      expect(queryCall).toContain('referred_to_name');
      expect(queryCall).toContain('LEFT JOIN users referred_by');
      expect(queryCall).toContain('LEFT JOIN users referred_to');
      // Verify ordering prioritizes pending referrals
      expect(queryCall).toContain('CASE');
      expect(queryCall).toContain('WHEN lr.status = \'pending\' THEN 0');
    });

    it('should order referrals with pending first', async () => {
      const mockLead = {
        rows: [{
          id: 1,
          customer_name: 'John Doe',
          referrals: JSON.stringify([
            { id: 1, status: 'confirmed', referral_date: '2024-01-15' },
            { id: 2, status: 'pending', referral_date: '2024-01-20' },
            { id: 3, status: 'rejected', referral_date: '2024-01-10' }
          ])
        }]
      };

      mockQuery.mockResolvedValueOnce(mockLead);

      await Lead.getLeadById(1);

      const queryCall = mockQuery.mock.calls[0][0];
      // Verify the ORDER BY clause prioritizes pending
      expect(queryCall).toContain('ORDER BY');
      expect(queryCall).toContain('CASE');
      expect(queryCall).toContain('WHEN lr.status = \'pending\' THEN 0');
      expect(queryCall).toContain('WHEN lr.status = \'rejected\' THEN 2');
    });

    it('should return undefined when lead not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Lead.getLeadById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getLeadsByAgent', () => {
    it('should get leads for a specific agent', async () => {
      const mockLeads = {
        rows: [
          { id: 1, agent_id: 1, customer_name: 'John Doe' },
          { id: 2, agent_id: 1, customer_name: 'Jane Doe' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsByAgent(1);

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE l.agent_id = $1'),
        [1]
      );
    });
  });

  describe('updateLead', () => {
    it('should update lead successfully', async () => {
      const updates = {
        customer_name: 'Jane Doe',
        phone_number: '9876543210',
        status: 'Contacted'
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          ...updates
        }]
      };

      mockQuery.mockResolvedValueOnce(mockUpdated);

      const result = await Lead.updateLead(1, updates);

      expect(result.customer_name).toBe('Jane Doe');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leads'),
        expect.arrayContaining([1, 'Jane Doe', '9876543210', 'Contacted'])
      );
    });

    it('should throw error when operations_id is set to null', async () => {
      const updates = {
        operations_id: null
      };

      await expect(Lead.updateLead(1, updates)).rejects.toThrow(
        'operations_id is required and cannot be null'
      );
    });

    it('should filter out undefined values', async () => {
      const updates = {
        customer_name: 'Jane Doe',
        phone_number: undefined,
        status: 'Active'
      };

      const mockUpdated = { rows: [{ id: 1 }] };
      mockQuery.mockResolvedValueOnce(mockUpdated);

      await Lead.updateLead(1, updates);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs).not.toContain(undefined);
    });

    it('should return current lead when no fields to update', async () => {
      const updates = {};
      const mockLead = { rows: [{ id: 1, customer_name: 'John Doe' }] };

      mockQuery.mockResolvedValueOnce(mockLead);

      const result = await Lead.updateLead(1, updates);

      expect(result.customer_name).toBe('John Doe');
    });
  });

  describe('deleteLead', () => {
    it('should delete lead successfully', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          customer_name: 'John Doe'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockDeleted);

      const result = await Lead.deleteLead(1);

      expect(result.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM leads'),
        [1]
      );
    });

    it('should return undefined when lead not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Lead.deleteLead(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getLeadsWithFilters', () => {
    it('should filter by status', async () => {
      const filters = { status: 'Active' };
      const mockLeads = { rows: [{ id: 1, status: 'Active' }] };

      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND l.status = $'),
        expect.arrayContaining(['Active'])
      );
    });

    it('should filter by agent_id', async () => {
      const filters = { agent_id: 1 };
      const mockLeads = { rows: [] };

      mockQuery.mockResolvedValueOnce(mockLeads);

      await Lead.getLeadsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND l.agent_id = $'),
        expect.arrayContaining([1])
      );
    });

    it('should filter by date range', async () => {
      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };
      const mockLeads = { rows: [] };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Sample query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // date_from count
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // date_to count
        .mockResolvedValueOnce(mockLeads); // Main query

      await Lead.getLeadsWithFilters(filters);

      const queryCall = mockQuery.mock.calls[3][0];
      expect(queryCall).toContain('AND l.date >=');
      expect(queryCall).toContain('AND l.date <');
    });

    it('should filter by search term', async () => {
      const filters = { search: 'John' };
      const mockLeads = { rows: [] };

      mockQuery.mockResolvedValueOnce(mockLeads);

      await Lead.getLeadsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%John%'])
      );
    });

    it('should handle empty filters', async () => {
      const mockLeads = { rows: [] };
      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsWithFilters({});

      expect(result).toEqual([]);
    });
  });

  describe('getLeadStats', () => {
    it('should return lead statistics', async () => {
      const mockStats = {
        rows: [{
          total_leads: 100,
          active: 50,
          contacted: 20,
          qualified: 15,
          converted: 10,
          closed: 5
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStats);

      const result = await Lead.getLeadStats();

      expect(result.total_leads).toBe(100);
      expect(result.active).toBe(50);
    });
  });

  describe('getLeadsByOperations', () => {
    it('should get leads for a specific operations user', async () => {
      const mockLeads = {
        rows: [
          { id: 1, operations_id: 2, customer_name: 'John Doe' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsByOperations(2);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE l.operations_id = $1'),
        [2]
      );
    });
  });

  describe('getReferenceSources', () => {
    it('should get all reference sources', async () => {
      const mockSources = {
        rows: [
          { id: 1, source_name: 'Website' },
          { id: 2, source_name: 'Facebook' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockSources);

      const result = await Lead.getReferenceSources();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('source_name');
    });
  });

  describe('getOperationsUsers', () => {
    it('should get operations users', async () => {
      const mockUsers = {
        rows: [
          { id: 1, name: 'Ops User 1', role: 'operations' },
          { id: 2, name: 'Ops Manager 1', role: 'operations_manager' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockUsers);

      const result = await Lead.getOperationsUsers();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('operations');
    });
  });

  describe('getLeadsForAgent', () => {
    it('should return assigned leads for agent role', async () => {
      const mockLeads = { rows: [{ id: 1, agent_id: 1 }] };
      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsForAgent(1, 'agent');

      expect(result).toHaveLength(1);
    });

    it('should return all leads for admin role', async () => {
      const mockLeads = { rows: [{ id: 1 }, { id: 2 }] };
      mockQuery.mockResolvedValueOnce(mockLeads);

      const result = await Lead.getLeadsForAgent(1, 'admin');

      expect(result).toHaveLength(2);
    });
  });
});

