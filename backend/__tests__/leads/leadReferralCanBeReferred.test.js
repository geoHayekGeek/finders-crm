// __tests__/leads/leadReferralCanBeReferred.test.js
// Comprehensive tests for can_be_referred functionality in lead referrals
const LeadsController = require('../../controllers/leadsController');
const Lead = require('../../models/leadsModel');
const LeadReferral = require('../../models/leadReferralModel');
const Notification = require('../../models/notificationModel');

jest.mock('../../models/leadsModel');
jest.mock('../../models/leadReferralModel');
jest.mock('../../models/notificationModel');

describe('Lead Referral - can_be_referred Validation', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 27, name: 'Test Agent', role: 'agent' },
      params: {},
      body: {},
      roleFilters: {
        canViewLeads: true,
        role: 'agent'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('referLeadToAgent - can_be_referred validation', () => {
    it('should allow referral when status_can_be_referred is true', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Active',
        status_can_be_referred: true
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
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Lead referred successfully'),
        data: mockReferral
      });
    });

    it('should deny referral when status_can_be_referred is false', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Closed',
        status_can_be_referred: false
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.referLeadToAgent(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('100');
      expect(LeadReferral.referLeadToAgent).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Leads with status "Closed" cannot be referred.'
      });
    });

    it('should deny referral when status_can_be_referred is null and status is closed', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Closed',
        status_can_be_referred: null
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.referLeadToAgent(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('100');
      expect(LeadReferral.referLeadToAgent).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Leads with status "Closed" cannot be referred.'
      });
    });

    it('should deny referral when status_can_be_referred is undefined and status is converted', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Converted',
        status_can_be_referred: undefined
      };

      Lead.getLeadById.mockResolvedValue(mockLead);

      await LeadsController.referLeadToAgent(req, res);

      expect(Lead.getLeadById).toHaveBeenCalledWith('100');
      expect(LeadReferral.referLeadToAgent).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Leads with status "Converted" cannot be referred.'
      });
    });

    it('should allow referral when status_can_be_referred is null but status is not closed/converted', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Active',
        status_can_be_referred: null
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
      expect(LeadReferral.referLeadToAgent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Lead referred successfully'),
        data: mockReferral
      });
    });

    it('should allow referral when status_can_be_referred is explicitly true (not just truthy)', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const mockLead = {
        id: 100,
        agent_id: 27,
        customer_name: 'John Doe',
        status: 'Active',
        status_can_be_referred: true // Explicitly true
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

      expect(LeadReferral.referLeadToAgent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Lead referred successfully'),
        data: mockReferral
      });
    });

    it('should handle different status names correctly', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;

      const testCases = [
        { status: 'Converted', status_can_be_referred: false, shouldAllow: false },
        { status: 'Closed', status_can_be_referred: false, shouldAllow: false },
        { status: 'Active', status_can_be_referred: true, shouldAllow: true },
        { status: 'Contacted', status_can_be_referred: true, shouldAllow: true }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const mockLead = {
          id: 100,
          agent_id: 27,
          customer_name: 'John Doe',
          status: testCase.status,
          status_can_be_referred: testCase.status_can_be_referred
        };

        Lead.getLeadById.mockResolvedValue(mockLead);

        if (testCase.shouldAllow) {
          const mockReferral = {
            id: 1,
            lead_id: 100,
            status: 'pending',
            referred_to_agent_id: 28,
            referred_by_user_id: 27
          };
          LeadReferral.referLeadToAgent.mockResolvedValue(mockReferral);
          Notification.createNotification.mockResolvedValue({ id: 1 });
        }

        await LeadsController.referLeadToAgent(req, res);

        if (testCase.shouldAllow) {
          expect(LeadReferral.referLeadToAgent).toHaveBeenCalled();
          expect(res.json).toHaveBeenCalled();
        } else {
          expect(LeadReferral.referLeadToAgent).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(400);
        }
      }
    });
  });
});

