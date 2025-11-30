// __tests__/leads/leadsController.test.js
const LeadsController = require('../../controllers/leadsController');
const Lead = require('../../models/leadsModel');
const LeadReferral = require('../../models/leadReferralModel');
const Notification = require('../../models/notificationModel');
const LeadNote = require('../../models/leadNotesModel');
const pool = require('../../config/db');

// Mock all dependencies
jest.mock('../../models/leadsModel');
jest.mock('../../models/leadReferralModel');
jest.mock('../../models/notificationModel');
jest.mock('../../models/leadNotesModel');
jest.mock('../../config/db');

describe('Leads Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Test User', role: 'admin' },
      params: {},
      query: {},
      body: {},
      roleFilters: {
        canViewLeads: true,
        canManageLeads: true,
        role: 'admin'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAllLeads', () => {
    it('should get all leads for admin', async () => {
      const mockLeads = [
        { id: 1, customer_name: 'Customer 1', phone_number: '123', agent_id: 1 },
        { id: 2, customer_name: 'Customer 2', phone_number: '456', agent_id: 2 }
      ];

      Lead.getLeadsForAgent.mockResolvedValue(mockLeads);

      await LeadsController.getAllLeads(req, res);

      expect(Lead.getLeadsForAgent).toHaveBeenCalledWith(1, 'admin');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeads,
        message: 'Retrieved 2 leads',
        userRole: 'admin'
      });
    });

    it('should filter data for agents', async () => {
      req.user = { id: 1, name: 'Agent', role: 'agent' };
      const mockLeads = [
        {
          id: 1,
          customer_name: 'Customer 1',
          phone_number: '123',
          agent_id: 1,
          assigned_agent_name: 'Agent',
          operations_id: 1,
          operations_name: 'Ops',
          operations_role: 'operations',
          reference_source_id: 1,
          reference_source_name: 'Source',
          contact_source: 'phone',
          price: 100000,
          status: 'active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          date: '2024-01-01'
        }
      ];

      Lead.getLeadsForAgent.mockResolvedValue(mockLeads);

      await LeadsController.getAllLeads(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          id: 1,
          date: '2024-01-01',
          customer_name: 'Customer 1',
          phone_number: '123',
          agent_id: 1,
          assigned_agent_name: 'Agent',
          operations_id: 1,
          operations_name: 'Ops',
          operations_role: 'operations',
          reference_source_id: 1,
          reference_source_name: 'Source',
          price: 100000,
          status: 'active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }],
        message: 'Retrieved 1 leads',
        userRole: 'agent'
      });
    });

    it('should handle errors', async () => {
      Lead.getLeadsForAgent.mockRejectedValue(new Error('Database error'));

      await LeadsController.getAllLeads(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve leads',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadsWithFilters', () => {
    it('should get filtered leads for admin', async () => {
      req.query = { status: 'active' };
      const mockLeads = [
        { id: 1, customer_name: 'Customer 1', status: 'active' }
      ];

      Lead.getLeadsWithFilters.mockResolvedValue(mockLeads);

      await LeadsController.getLeadsWithFilters(req, res);

      expect(Lead.getLeadsWithFilters).toHaveBeenCalledWith(req.query);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeads,
        message: 'Retrieved 1 filtered leads',
        userRole: 'admin'
      });
    });

    it('should filter leads for agents', async () => {
      req.user = { id: 1, name: 'Agent', role: 'agent' };
      req.query = { status: 'active' };
      const mockLeads = [
        { id: 1, customer_name: 'Customer 1', status: 'active', agent_id: 1 }
      ];
      const mockFilteredLeads = [
        { id: 1, customer_name: 'Customer 1', status: 'active' }
      ];

      Lead.getLeadsAssignedOrReferredByAgent.mockResolvedValue(mockLeads);
      Lead.getLeadsWithFilters.mockResolvedValue(mockFilteredLeads);

      await LeadsController.getLeadsWithFilters(req, res);

      expect(Lead.getLeadsAssignedOrReferredByAgent).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { status: 'active' };
      Lead.getLeadsWithFilters.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadsWithFilters(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve filtered leads',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadById', () => {
    it('should get lead by id for admin', async () => {
      req.params.id = '1';
      const mockLead = {
        id: 1,
        customer_name: 'Customer 1',
        phone_number: '123',
        agent_id: 1
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.getLeadById(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLead,
        userRole: 'admin'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.getLeadById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should prevent agent from viewing other agent\'s lead', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 2 });

      await LeadsController.getLeadById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to view this lead'
      });
    });

    it('should filter data for agents', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      const mockLead = {
        id: 1,
        date: '2024-01-01',
        customer_name: 'Customer 1',
        phone_number: '123',
        agent_id: 1,
        assigned_agent_name: 'Agent',
        price: 100000,
        status: 'active',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        extra_field: 'should be filtered'
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.getLeadById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 1,
          date: '2024-01-01',
          customer_name: 'Customer 1',
          phone_number: '123',
          agent_id: 1,
          assigned_agent_name: 'Agent',
          price: 100000,
          status: 'active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          referrals: []
        },
        userRole: 'agent'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Lead.getLeadById.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead',
        error: 'Internal server error'
      });
    });
  });

  describe('createLead', () => {
    const mockLeadData = {
      customer_name: 'Customer 1',
      phone_number: '123',
      agent_id: 1,
      price: 100000,
      status: 'active'
    };

    it('should create lead successfully', async () => {
      req.body = mockLeadData;
      const mockCreatedLead = { id: 1, ...mockLeadData };
      const mockCompleteLead = { id: 1, ...mockLeadData, referrals: [] };

      Lead.createLead.mockResolvedValue(mockCreatedLead);
      Lead.getLeadById.mockResolvedValue(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.createLead(req, res);

      expect(Lead.createLead).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompleteLead,
        message: 'Lead created successfully'
      });
    });

    it('should set operations_id for operations role', async () => {
      req.user = { id: 2, role: 'operations' };
      req.body = { ...mockLeadData, operations_id: undefined };
      const mockCreatedLead = { id: 1, ...mockLeadData, operations_id: 2 };
      const mockCompleteLead = { id: 1, ...mockCreatedLead, referrals: [] };

      Lead.createLead.mockResolvedValue(mockCreatedLead);
      Lead.getLeadById.mockResolvedValue(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.createLead(req, res);

      expect(Lead.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ operations_id: 2 })
      );
    });

    it('should create lead with referrals', async () => {
      req.body = {
        ...mockLeadData,
        referrals: [
          { type: 'employee', employee_id: 2, name: 'Agent 2', date: '2024-01-01' }
        ]
      };
      const mockCreatedLead = { id: 1, ...mockLeadData };
      const mockCompleteLead = { id: 1, ...mockLeadData, referrals: [] };

      pool.query.mockResolvedValue({ rows: [{ name: 'Agent 2' }] });
      Lead.createLead.mockResolvedValue(mockCreatedLead);
      Lead.getLeadById.mockResolvedValue(mockCompleteLead);
      LeadReferral.createReferral.mockResolvedValue({ id: 1 });
      LeadReferral.applyExternalRuleToLeadReferrals.mockResolvedValue({
        message: 'Rule applied',
        markedExternalReferrals: []
      });
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.createLead(req, res);

      expect(LeadReferral.createReferral).toHaveBeenCalled();
      expect(LeadReferral.applyExternalRuleToLeadReferrals).toHaveBeenCalledWith(1);
    });

    it('should create notification when agent is assigned', async () => {
      req.body = { ...mockLeadData, agent_id: 2 };
      const mockCreatedLead = { id: 1, ...mockLeadData, agent_id: 2 };
      const mockCompleteLead = { id: 1, ...mockCreatedLead, referrals: [] };

      Lead.createLead.mockResolvedValue(mockCreatedLead);
      Lead.getLeadById.mockResolvedValue(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});
      Notification.createLeadAssignmentNotification.mockResolvedValue({});

      await LeadsController.createLead(req, res);

      expect(Notification.createLeadAssignmentNotification).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.body = mockLeadData;
      Lead.createLead.mockRejectedValue(new Error('Database error'));

      await LeadsController.createLead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create lead',
        error: 'Internal server error'
      });
    });
  });

  describe('updateLead', () => {
    const mockLead = {
      id: 1,
      customer_name: 'Customer 1',
      phone_number: '123',
      agent_id: 1,
      status: 'active'
    };

    it('should update lead successfully', async () => {
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      const mockUpdatedLead = { ...mockLead, customer_name: 'Updated Customer' };
      const mockCompleteLead = { ...mockUpdatedLead, referrals: [] };

      Lead.getLeadById.mockResolvedValueOnce(mockLead);
      Lead.updateLead.mockResolvedValue(mockUpdatedLead);
      Lead.getLeadById.mockResolvedValueOnce(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.updateLead(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(Lead.updateLead).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompleteLead,
        message: 'Lead updated successfully'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      req.body = { customer_name: 'Updated Customer' };
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.updateLead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should prevent agent from updating other agent\'s lead', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      Lead.getLeadById.mockResolvedValue({ ...mockLead, agent_id: 2 });

      await LeadsController.updateLead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to update this lead'
      });
    });

    it('should process referral reassignment when agent changes', async () => {
      req.params.id = '1';
      req.body = { agent_id: 2 };
      const mockUpdatedLead = { ...mockLead, agent_id: 2 };
      const mockCompleteLead = { ...mockUpdatedLead, referrals: [] };

      Lead.getLeadById.mockResolvedValueOnce(mockLead);
      Lead.updateLead.mockResolvedValue(mockUpdatedLead);
      Lead.getLeadById.mockResolvedValueOnce(mockCompleteLead);
      LeadReferral.processLeadReassignment.mockResolvedValue({
        message: 'Processed',
        markedExternalReferrals: []
      });
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.updateLead(req, res);

      expect(LeadReferral.processLeadReassignment).toHaveBeenCalledWith(1, 2, 1);
    });

    it('should create status change notification', async () => {
      req.params.id = '1';
      req.body = { status: 'closed' };
      const mockUpdatedLead = { ...mockLead, status: 'closed' };
      const mockCompleteLead = { ...mockUpdatedLead, referrals: [] };

      Lead.getLeadById.mockResolvedValueOnce(mockLead);
      Lead.updateLead.mockResolvedValue(mockUpdatedLead);
      Lead.getLeadById.mockResolvedValueOnce(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.updateLead(req, res);

      expect(Notification.createLeadNotification).toHaveBeenCalledWith(
        1,
        'status_changed',
        expect.any(Object),
        1
      );
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      Lead.getLeadById.mockResolvedValue(mockLead);
      Lead.updateLead.mockRejectedValue(new Error('Database error'));

      await LeadsController.updateLead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update lead',
        error: 'Internal server error'
      });
    });
  });

  describe('deleteLead', () => {
    const mockLead = {
      id: 1,
      customer_name: 'Customer 1',
      phone_number: '123',
      status: 'active'
    };

    it('should delete lead successfully', async () => {
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue(mockLead);
      Lead.deleteLead.mockResolvedValue(mockLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.deleteLead(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(Lead.deleteLead).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLead,
        message: 'Lead deleted successfully'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.deleteLead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should return 403 if user cannot delete leads', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.deleteLead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to delete leads'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue(mockLead);
      Lead.deleteLead.mockRejectedValue(new Error('Database error'));

      await LeadsController.deleteLead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete lead',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadsByAgent', () => {
    it('should get leads by agent', async () => {
      req.params.agentId = '1';
      const mockLeads = [
        { id: 1, customer_name: 'Customer 1', agent_id: 1 },
        { id: 2, customer_name: 'Customer 2', agent_id: 1 }
      ];

      Lead.getLeadsByAgent.mockResolvedValue(mockLeads);

      await LeadsController.getLeadsByAgent(req, res);

      expect(Lead.getLeadsByAgent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeads,
        message: 'Retrieved 2 leads for agent'
      });
    });

    it('should handle errors', async () => {
      req.params.agentId = '1';
      Lead.getLeadsByAgent.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadsByAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve leads by agent',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadStats', () => {
    it('should get lead statistics', async () => {
      const mockStats = { total: 100, active: 50, closed: 50 };
      const mockByDate = [];
      const mockByStatus = [];
      const mockByAgent = [];

      Lead.getLeadStats.mockResolvedValue(mockStats);
      Lead.getLeadsByDateRange.mockResolvedValue(mockByDate);
      Lead.getLeadsByStatus.mockResolvedValue(mockByStatus);
      Lead.getLeadsByAgentStats.mockResolvedValue(mockByAgent);

      await LeadsController.getLeadStats(req, res);

      expect(Lead.getLeadStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overview: mockStats,
          byDate: mockByDate,
          byStatus: mockByStatus,
          byAgent: mockByAgent
        }
      });
    });

    it('should handle errors', async () => {
      Lead.getLeadStats.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead statistics',
        error: 'Internal server error'
      });
    });
  });

  describe('getReferenceSources', () => {
    it('should get reference sources', async () => {
      const mockSources = [
        { id: 1, name: 'Source 1' },
        { id: 2, name: 'Source 2' }
      ];

      Lead.getReferenceSources.mockResolvedValue(mockSources);

      await LeadsController.getReferenceSources(req, res);

      expect(Lead.getReferenceSources).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSources,
        message: 'Reference sources retrieved successfully'
      });
    });

    it('should handle errors', async () => {
      Lead.getReferenceSources.mockRejectedValue(new Error('Database error'));

      await LeadsController.getReferenceSources(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve reference sources',
        error: 'Internal server error'
      });
    });
  });

  describe('getOperationsUsers', () => {
    it('should get operations users', async () => {
      const mockUsers = [
        { id: 1, name: 'Ops User 1', role: 'operations' },
        { id: 2, name: 'Ops User 2', role: 'operations' }
      ];

      Lead.getOperationsUsers.mockResolvedValue(mockUsers);

      await LeadsController.getOperationsUsers(req, res);

      expect(Lead.getOperationsUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        message: 'Operations users retrieved successfully'
      });
    });

    it('should handle errors', async () => {
      Lead.getOperationsUsers.mockRejectedValue(new Error('Database error'));

      await LeadsController.getOperationsUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve operations users',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadReferrals', () => {
    it('should get lead referrals', async () => {
      req.params.id = '1';
      const mockLead = { id: 1, customer_name: 'Customer 1' };
      const mockReferrals = [
        { id: 1, lead_id: 1, employee_id: 2, name: 'Agent 2' }
      ];

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadReferral.getReferralsByLeadId.mockResolvedValue(mockReferrals);

      await LeadsController.getLeadReferrals(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(LeadReferral.getReferralsByLeadId).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReferrals,
        message: 'Lead referrals retrieved successfully'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.getLeadReferrals(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue({ id: 1 });
      LeadReferral.getReferralsByLeadId.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadReferrals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead referrals',
        error: 'Internal server error'
      });
    });
  });

  describe('getAgentReferralStats', () => {
    it('should get agent referral statistics', async () => {
      req.params.agentId = '1';
      const mockStats = { total: 10, internal: 8, external: 2 };
      const mockReferrals = [
        { id: 1, lead_id: 1, employee_id: 1 }
      ];

      LeadReferral.getReferralStats.mockResolvedValue(mockStats);
      LeadReferral.getReferralsByAgentId.mockResolvedValue(mockReferrals);

      await LeadsController.getAgentReferralStats(req, res);

      expect(LeadReferral.getReferralStats).toHaveBeenCalledWith(1);
      expect(LeadReferral.getReferralsByAgentId).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          stats: mockStats,
          referrals: mockReferrals
        },
        message: 'Agent referral statistics retrieved successfully'
      });
    });

    it('should handle errors', async () => {
      req.params.agentId = '1';
      LeadReferral.getReferralStats.mockRejectedValue(new Error('Database error'));

      await LeadsController.getAgentReferralStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve agent referral statistics',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeadNotes', () => {
    it('should get lead notes', async () => {
      req.params.id = '1';
      const mockLead = { id: 1, customer_name: 'Customer 1' };
      const mockNotes = [
        { id: 1, lead_id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'admin' }
      ];

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

      await LeadsController.getLeadNotes(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(LeadNote.getNotesForLead).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotes,
        message: 'Retrieved 1 notes for lead'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.getLeadNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should filter notes for agents', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      const mockLead = { id: 1, customer_name: 'Customer 1' };
      const mockNotes = [
        { id: 1, lead_id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'agent' },
        { id: 2, lead_id: 1, note_text: 'Note 2', created_by: 2, created_by_role: 'agent' }
      ];

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

      await LeadsController.getLeadNotes(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, lead_id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'agent' }],
        message: 'Retrieved 1 notes for lead'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Lead.getLeadById.mockResolvedValue({ id: 1 });
      LeadNote.getNotesForLead.mockRejectedValue(new Error('Database error'));

      await LeadsController.getLeadNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead notes',
        error: 'Internal server error'
      });
    });
  });

  describe('addLeadNote', () => {
    it('should add note to lead', async () => {
      req.params.id = '1';
      req.body = { note_text: 'New note' };
      const mockLead = { id: 1, customer_name: 'Customer 1', agent_id: 1 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'New note', created_by: 1 };
      const mockNotes = [mockNote];

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

      await LeadsController.addLeadNote(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(LeadNote.createNote).toHaveBeenCalledWith('1', req.user, 'New note');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNote,
        message: 'Note added successfully'
      });
    });

    it('should return 400 if note_text is missing', async () => {
      req.params.id = '1';
      req.body = {};

      await LeadsController.addLeadNote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Note text is required'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      req.body = { note_text: 'New note' };
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.addLeadNote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should return 403 if agent cannot add note to unassigned lead', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      req.body = { note_text: 'New note' };
      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 2 });

      await LeadsController.addLeadNote(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to add notes to this lead'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.body = { note_text: 'New note' };
      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 1 });
      pool.query.mockResolvedValue({ rows: [] }); // Team agent check
      LeadNote.createNote.mockRejectedValue(new Error('Database error'));

      await LeadsController.addLeadNote(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to add lead note',
        error: 'Internal server error'
      });
    });
  });

  describe('addLeadReferral', () => {
    it('should add referral to lead', async () => {
      req.params.id = '1';
      req.body = { name: 'Agent 2', type: 'employee', employee_id: 2, date: '2024-01-01' };
      const mockLead = { id: 1, customer_name: 'Customer 1' };
      const mockReferral = { id: 1, lead_id: 1, employee_id: 2, name: 'Agent 2' };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadReferral.createReferral.mockResolvedValue(mockReferral);

      await LeadsController.addLeadReferral(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(LeadReferral.createReferral).toHaveBeenCalledWith(1, 2, 'Agent 2', 'employee', expect.any(Date));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReferral,
        message: 'Referral added successfully'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      req.body = { name: 'Agent 2', type: 'employee', employee_id: 2, date: '2024-01-01' };
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.addLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should return 403 if user cannot add referrals', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      req.body = { name: 'Agent 2', type: 'employee', employee_id: 2, date: '2024-01-01' };
      Lead.getLeadById.mockResolvedValue({ id: 1 });

      await LeadsController.addLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to add referrals'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.params.id = '1';
      req.body = { name: 'Agent 2' };
      Lead.getLeadById.mockResolvedValue({ id: 1 });

      await LeadsController.addLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name, type, and date are required'
      });
    });

    it('should return 400 if employee_id is missing for employee type', async () => {
      req.params.id = '1';
      req.body = { name: 'Agent 2', type: 'employee', date: '2024-01-01' };
      Lead.getLeadById.mockResolvedValue({ id: 1 });

      await LeadsController.addLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'employee_id is required for employee referrals'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.body = { name: 'Agent 2', type: 'employee', employee_id: 2, date: '2024-01-01' };
      Lead.getLeadById.mockResolvedValue({ id: 1 });
      LeadReferral.createReferral.mockRejectedValue(new Error('Database error'));

      await LeadsController.addLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to add referral',
        error: 'Internal server error'
      });
    });
  });

  describe('deleteLeadReferral', () => {
    it('should delete referral from lead', async () => {
      req.params.id = '1';
      req.params.referralId = '1';
      const mockLead = { id: 1, customer_name: 'Customer 1' };
      const mockDeletedReferral = { id: 1, lead_id: 1 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadReferral.deleteReferral.mockResolvedValue(mockDeletedReferral);

      await LeadsController.deleteLeadReferral(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('1');
      expect(LeadReferral.deleteReferral).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Referral deleted successfully'
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      req.params.referralId = '1';
      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.deleteLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lead not found'
      });
    });

    it('should return 403 if user cannot delete referrals', async () => {
      req.user = { id: 1, role: 'agent' };
      req.params.id = '1';
      req.params.referralId = '1';
      Lead.getLeadById.mockResolvedValue({ id: 1 });

      await LeadsController.deleteLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to delete referrals'
      });
    });

    it('should return 404 if referral not found', async () => {
      req.params.id = '1';
      req.params.referralId = '999';
      Lead.getLeadById.mockResolvedValue({ id: 1 });
      LeadReferral.deleteReferral.mockResolvedValue(null);

      await LeadsController.deleteLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Referral not found'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.params.referralId = '1';
      Lead.getLeadById.mockResolvedValue({ id: 1 });
      LeadReferral.deleteReferral.mockRejectedValue(new Error('Database error'));

      await LeadsController.deleteLeadReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete referral',
        error: 'Internal server error'
      });
    });
  });

  describe('Team Leader Lead Permissions', () => {
    it('should allow team leader to view their own lead', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      const mockLead = { id: 1, agent_id: 10, customer_name: 'Customer 1' };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.getLeadById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 1,
          customer_name: 'Customer 1'
        }),
        userRole: 'team_leader'
      });
    });

    it('should allow team leader to view their team agent\'s lead', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      const mockLead = { id: 1, agent_id: 20, customer_name: 'Customer 1' };

      Lead.getLeadById.mockResolvedValue(mockLead);
      pool.query.mockResolvedValue({ rows: [{ 1: 1 }] }); // Team agent check returns result

      await LeadsController.getLeadById(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('team_agents'),
        [10, 20]
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('should prevent team leader from viewing lead outside their team', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      const mockLead = { id: 1, agent_id: 99, customer_name: 'Customer 1' };

      Lead.getLeadById.mockResolvedValue(mockLead);
      pool.query.mockResolvedValue({ rows: [] }); // Team agent check returns empty

      await LeadsController.getLeadById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to view this lead'
      });
    });

    it('should allow team leader to update their own lead', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      const mockLead = { id: 1, agent_id: 10, customer_name: 'Customer 1' };
      const mockUpdatedLead = { ...mockLead, customer_name: 'Updated Customer' };
      const mockCompleteLead = { ...mockUpdatedLead, referrals: [] };

      Lead.getLeadById.mockResolvedValueOnce(mockLead);
      Lead.updateLead.mockResolvedValue(mockUpdatedLead);
      Lead.getLeadById.mockResolvedValueOnce(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.updateLead(req, res);

      expect(Lead.updateLead).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompleteLead,
        message: 'Lead updated successfully'
      });
    });

    it('should allow team leader to update their team agent\'s lead', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      const mockLead = { id: 1, agent_id: 20, customer_name: 'Customer 1' };
      const mockUpdatedLead = { ...mockLead, customer_name: 'Updated Customer' };
      const mockCompleteLead = { ...mockUpdatedLead, referrals: [] };

      Lead.getLeadById.mockResolvedValueOnce(mockLead);
      pool.query.mockResolvedValue({ rows: [{ 1: 1 }] }); // Team agent check
      Lead.updateLead.mockResolvedValue(mockUpdatedLead);
      Lead.getLeadById.mockResolvedValueOnce(mockCompleteLead);
      Notification.createLeadNotification.mockResolvedValue({});

      await LeadsController.updateLead(req, res);

      expect(Lead.updateLead).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should prevent team leader from updating lead outside their team', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      req.body = { customer_name: 'Updated Customer' };
      const mockLead = { id: 1, agent_id: 99, customer_name: 'Customer 1' };

      Lead.getLeadById.mockResolvedValue(mockLead);
      pool.query.mockResolvedValue({ rows: [] }); // Team agent check returns empty

      await LeadsController.updateLead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to update this lead'
      });
    });
  });

  describe('Lead Notes Permissions', () => {
    describe('getLeadNotes', () => {
      it('should show all notes to admin', async () => {
        req.user = { id: 1, role: 'admin' };
        req.params.id = '1';
        const mockLead = { id: 1 };
        const mockNotes = [
          { id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'admin' },
          { id: 2, note_text: 'Note 2', created_by: 2, created_by_role: 'agent' },
          { id: 3, note_text: 'Note 3', created_by: 3, created_by_role: 'operations' }
        ];

        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.getLeadNotes(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockNotes,
          message: 'Retrieved 3 notes for lead'
        });
      });

      it('should show all notes to operations manager', async () => {
        req.user = { id: 1, role: 'operations_manager' };
        req.params.id = '1';
        const mockLead = { id: 1 };
        const mockNotes = [
          { id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'admin' },
          { id: 2, note_text: 'Note 2', created_by: 2, created_by_role: 'agent' }
        ];

        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.getLeadNotes(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockNotes,
          message: 'Retrieved 2 notes for lead'
        });
      });

      it('should filter notes for non-admin/operations_manager users', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params.id = '1';
        const mockLead = { id: 1 };
        const mockNotes = [
          { id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'agent' },
          { id: 2, note_text: 'Note 2', created_by: 2, created_by_role: 'agent' }
        ];

        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.getLeadNotes(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: [{ id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'agent' }],
          message: 'Retrieved 1 notes for lead'
        });
      });
    });

    describe('addLeadNote', () => {
      it('should allow team leader to add note to their team agent\'s lead', async () => {
        req.user = { id: 10, role: 'team_leader' };
        req.params.id = '1';
        req.body = { note_text: 'New note' };
        const mockLead = { id: 1, agent_id: 20 };
        const mockNote = { id: 1, lead_id: 1, note_text: 'New note', created_by: 10 };
        const mockNotes = [mockNote];

        Lead.getLeadById.mockResolvedValue(mockLead);
        pool.query.mockResolvedValue({ rows: [{ 1: 1 }] }); // Team agent check
        LeadNote.createNote.mockResolvedValue(mockNote);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.addLeadNote(req, res);

        expect(LeadNote.createNote).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
      });

      it('should allow anyone who can view lead to add note', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params.id = '1';
        req.body = { note_text: 'New note' };
        const mockLead = { id: 1, agent_id: 1 };
        const mockNote = { id: 1, lead_id: 1, note_text: 'New note', created_by: 1 };
        const mockNotes = [mockNote];

        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.createNote.mockResolvedValue(mockNote);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.addLeadNote(req, res);

        expect(LeadNote.createNote).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
      });
    });

    describe('updateLeadNote', () => {
      it('should allow admin to update any note', async () => {
        req.user = { id: 1, role: 'admin' };
        req.params = { id: '1', noteId: '10' };
        req.body = { note_text: 'Updated note' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Original note', created_by: 99 };
        const mockUpdatedNote = { ...mockNote, note_text: 'Updated note' };
        const mockLead = { id: 1 };
        const mockNotes = [mockUpdatedNote];

        LeadNote.getNoteById.mockResolvedValue(mockNote);
        LeadNote.updateNote.mockResolvedValue(mockUpdatedNote);
        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.updateLeadNote(req, res);

        expect(LeadNote.updateNote).toHaveBeenCalledWith('10', 'Updated note');
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({ note_text: 'Updated note' }),
          message: 'Note updated successfully'
        });
      });

      it('should allow user to update their own note', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params = { id: '1', noteId: '10' };
        req.body = { note_text: 'Updated note' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Original note', created_by: 1 };
        const mockUpdatedNote = { ...mockNote, note_text: 'Updated note' };
        const mockLead = { id: 1 };
        const mockNotes = [mockUpdatedNote];

        LeadNote.getNoteById.mockResolvedValue(mockNote);
        LeadNote.updateNote.mockResolvedValue(mockUpdatedNote);
        Lead.getLeadById.mockResolvedValue(mockLead);
        LeadNote.getNotesForLead.mockResolvedValue(mockNotes);

        await LeadsController.updateLeadNote(req, res);

        expect(LeadNote.updateNote).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
      });

      it('should prevent user from updating other user\'s note', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params = { id: '1', noteId: '10' };
        req.body = { note_text: 'Updated note' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Original note', created_by: 99 };

        LeadNote.getNoteById.mockResolvedValue(mockNote);

        await LeadsController.updateLeadNote(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to edit this note'
        });
        expect(LeadNote.updateNote).not.toHaveBeenCalled();
      });

      it('should return 404 if note not found', async () => {
        req.params = { id: '1', noteId: '999' };
        req.body = { note_text: 'Updated note' };
        LeadNote.getNoteById.mockResolvedValue(null);

        await LeadsController.updateLeadNote(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Note not found'
        });
      });

      it('should return 400 if note does not belong to lead', async () => {
        req.params = { id: '1', noteId: '10' };
        req.body = { note_text: 'Updated note' };
        const mockNote = { id: 10, lead_id: 99, note_text: 'Original note', created_by: 1 };

        LeadNote.getNoteById.mockResolvedValue(mockNote);

        await LeadsController.updateLeadNote(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Note does not belong to this lead'
        });
      });
    });

    describe('deleteLeadNote', () => {
      it('should allow admin to delete any note', async () => {
        req.user = { id: 1, role: 'admin' };
        req.params = { id: '1', noteId: '10' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Note to delete', created_by: 99 };

        LeadNote.getNoteById.mockResolvedValue(mockNote);
        LeadNote.deleteNote.mockResolvedValue(mockNote);

        await LeadsController.deleteLeadNote(req, res);

        expect(LeadNote.deleteNote).toHaveBeenCalledWith('10');
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Note deleted successfully'
        });
      });

      it('should allow user to delete their own note', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params = { id: '1', noteId: '10' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Note to delete', created_by: 1 };

        LeadNote.getNoteById.mockResolvedValue(mockNote);
        LeadNote.deleteNote.mockResolvedValue(mockNote);

        await LeadsController.deleteLeadNote(req, res);

        expect(LeadNote.deleteNote).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
      });

      it('should prevent user from deleting other user\'s note', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params = { id: '1', noteId: '10' };
        const mockNote = { id: 10, lead_id: 1, note_text: 'Note to delete', created_by: 99 };

        LeadNote.getNoteById.mockResolvedValue(mockNote);

        await LeadsController.deleteLeadNote(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to delete this note'
        });
        expect(LeadNote.deleteNote).not.toHaveBeenCalled();
      });

      it('should return 404 if note not found', async () => {
        req.params = { id: '1', noteId: '999' };
        LeadNote.getNoteById.mockResolvedValue(null);

        await LeadsController.deleteLeadNote(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Note not found'
        });
      });
    });
  });

  describe('referLeadToAgent', () => {
    it('should refer lead to agent successfully', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.user.name = 'Test User';
      req.roleFilters.canViewLeads = true;
      req.roleFilters.role = 'agent';

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe'
      };
      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'pending',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadReferral.referLeadToAgent.mockResolvedValue(mockReferral);
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await LeadsController.referLeadToAgent(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('100');
      expect(LeadReferral.referLeadToAgent).toHaveBeenCalledWith(100, 28, 27);
      expect(Notification.createNotification).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Lead referred successfully'),
        data: mockReferral
      });
    });

    it('should return 404 if lead not found', async () => {
      req.params.id = '999';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewLeads = true;
      req.roleFilters.role = 'agent';

      Lead.getLeadById.mockResolvedValue(null);

      await LeadsController.referLeadToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lead not found' });
    });

    it('should return 403 if user does not own the lead', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewLeads = true;
      req.roleFilters.role = 'agent';

      const mockLead = {
        id: 100,
        agent_id: 99 // Different agent
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.referLeadToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You can only refer leads that are assigned to you.'
      });
    });

    it('should return 400 if referred_to_agent_id is missing', async () => {
      req.params.id = '100';
      req.body = {};
      req.user.id = 27;
      req.roleFilters.canViewLeads = true;
      req.roleFilters.role = 'agent';

      await LeadsController.referLeadToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'referred_to_agent_id is required'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewLeads = true;
      req.roleFilters.role = 'agent';

      Lead.getLeadById.mockRejectedValue(new Error('Database error'));

      await LeadsController.referLeadToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('getPendingReferrals', () => {
    it('should get pending referrals for current user', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferrals = [
        {
          id: 1,
          lead_id: 100,
          status: 'pending',
          customer_name: 'John Doe',
          referred_by_name: 'Omar',
          referred_by_role: 'agent'
        }
      ];

      LeadReferral.getPendingReferralsForUser.mockResolvedValue(mockReferrals);

      await LeadsController.getPendingReferrals(req, res);

      expect(LeadReferral.getPendingReferralsForUser).toHaveBeenCalledWith(28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReferrals,
        count: 1
      });
    });

    it('should return 403 for non-agent/team_leader', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'admin';

      await LeadsController.getPendingReferrals(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. Only agents and team leaders can have pending referrals.'
      });
    });

    it('should handle errors', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.getPendingReferralsForUser.mockRejectedValue(new Error('Database error'));

      await LeadsController.getPendingReferrals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getPendingReferralsCount', () => {
    it('should get count of pending referrals', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.getPendingReferralsCount.mockResolvedValue(3);

      await LeadsController.getPendingReferralsCount(req, res);

      expect(LeadReferral.getPendingReferralsCount).toHaveBeenCalledWith(28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 3
      });
    });

    it('should return 0 when no pending referrals', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.getPendingReferralsCount.mockResolvedValue(0);

      await LeadsController.getPendingReferralsCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0
      });
    });

    it('should return 0 for non-agent/team_leader', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'admin';

      await LeadsController.getPendingReferralsCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0
      });
    });

    it('should handle errors', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.getPendingReferralsCount.mockRejectedValue(new Error('Database error'));

      await LeadsController.getPendingReferralsCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('confirmReferral', () => {
    it('should confirm referral and assign lead', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'confirmed',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };
      const mockLead = {
        id: 100,
        agent_id: 28,
        customer_name: 'John Doe'
      };

      LeadReferral.confirmReferral.mockResolvedValue({
        referral: mockReferral,
        lead: mockLead
      });
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await LeadsController.confirmReferral(req, res);

      expect(LeadReferral.confirmReferral).toHaveBeenCalledWith(1, 28);
      expect(Notification.createNotification).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Referral confirmed'),
        data: {
          referral: mockReferral,
          lead: mockLead
        }
      });
    });

    it('should return 403 for non-agent/team_leader', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'admin';

      await LeadsController.confirmReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. Only agents and team leaders can confirm referrals.'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.confirmReferral.mockRejectedValue(new Error('Database error'));

      await LeadsController.confirmReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('rejectReferral', () => {
    it('should reject referral successfully', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferral = {
        id: 1,
        lead_id: 100,
        status: 'rejected',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };
      const mockLead = {
        id: 100,
        customer_name: 'John Doe'
      };

      LeadReferral.rejectReferral.mockResolvedValue(mockReferral);
      Lead.getLeadById.mockResolvedValue(mockLead);
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await LeadsController.rejectReferral(req, res);

      expect(LeadReferral.rejectReferral).toHaveBeenCalledWith(1, 28);
      expect(Notification.createNotification).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Referral rejected'),
        data: mockReferral
      });
    });

    it('should return 403 for non-agent/team_leader', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'admin';

      await LeadsController.rejectReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. Only agents and team leaders can reject referrals.'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      LeadReferral.rejectReferral.mockRejectedValue(new Error('Database error'));

      await LeadsController.rejectReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });
});

