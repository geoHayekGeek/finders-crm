const ComplaintsController = require('../../controllers/complaintsController');
const Complaint = require('../../models/complaintModel');
const Lead = require('../../models/leadsModel');
const User = require('../../models/userModel');
const Notification = require('../../models/notificationModel');

jest.mock('../../models/complaintModel');
jest.mock('../../models/leadsModel');
jest.mock('../../models/userModel');
jest.mock('../../models/notificationModel');
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  security: jest.fn(),
  debug: jest.fn()
}));

describe('Complaints Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      user: { id: 1, role: 'admin' },
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  it('should create a complaint and notify recipients', async () => {
    req.body = {
      lead_id: 15,
      target_user_id: 22,
      title: 'Missed follow-up',
      description: 'The assigned user did not follow up within the agreed time.'
    };

    Lead.getLeadById.mockResolvedValue({ id: 15, customer_name: 'Lead A' });
    User.findById.mockResolvedValue({
      id: 22,
      name: 'Agent A',
      role: 'agent',
      assigned_to: 9
    });
    Complaint.createComplaint.mockResolvedValue({
      id: 101,
      lead_id: 15,
      target_user_id: 22,
      title: req.body.title,
      description: req.body.description,
      created_by: 1,
      target_user_role: 'agent',
      target_user_name: 'Agent A',
      target_assigned_to: 9
    });
    Notification.createComplaintNotification.mockResolvedValue(1);

    await ComplaintsController.createComplaint(req, res);

    expect(Complaint.createComplaint).toHaveBeenCalledWith({
      lead_id: 15,
      target_user_id: 22,
      title: 'Missed follow-up',
      description: 'The assigned user did not follow up within the agreed time.',
      created_by: 1
    });
    expect(Notification.createComplaintNotification).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        target_user_name: 'Agent A',
        target_user_role: 'agent'
      }),
      1
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Complaint created successfully'
      })
    );
  });

  it('should block team leaders from complaining about people outside their team', async () => {
    req.user = { id: 5, role: 'team leader' };
    req.body = {
      lead_id: 15,
      target_user_id: 22,
      title: 'Issue',
      description: 'Issue description'
    };

    Lead.getLeadById.mockResolvedValue({ id: 15, customer_name: 'Lead A' });
    User.findById.mockResolvedValue({
      id: 22,
      name: 'Agent A',
      role: 'agent',
      assigned_to: 99
    });
    User.isAgentOnTeamLeader.mockResolvedValue(false);

    await ComplaintsController.createComplaint(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Complaint.createComplaint).not.toHaveBeenCalled();
  });

  it('should scope complaints for team leaders to their team members', async () => {
    req.user = { id: 5, role: 'team leader' };
    req.query = {
      search: 'follow',
      targetRole: 'agent',
      leadId: '15'
    };

    User.getTeamLeaderAgents.mockResolvedValue([{ id: 22 }, { id: 23 }]);
    Complaint.getComplaints.mockResolvedValue([{ id: 1 }]);

    await ComplaintsController.getAllComplaints(req, res);

    expect(User.getTeamLeaderAgents).toHaveBeenCalledWith(5);
    expect(Complaint.getComplaints).toHaveBeenCalledWith({
      search: 'follow',
      targetRole: 'agent',
      leadId: 15,
      targetUserId: null,
      targetUserIds: [5, 22, 23]
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 1 }],
      count: 1
    });
  });
});
