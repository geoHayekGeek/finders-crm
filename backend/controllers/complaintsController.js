const Complaint = require('../models/complaintModel');
const Lead = require('../models/leadsModel');
const User = require('../models/userModel');
const logger = require('../utils/logger');
const { normalizeRole, isAgentLikeRole } = require('../utils/roleUtils');

const ALLOWED_CREATORS = new Set(['admin', 'operations manager', 'operations', 'agent manager', 'hr', 'team leader']);
function normalizeId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildComplaintVisibilityScope(userId, role, teamAgents) {
  if (role === 'team leader') {
    const ids = new Set([userId]);
    (teamAgents || []).forEach((user) => ids.add(user.id));
    return { targetUserIds: Array.from(ids) };
  }

  if (isAgentLikeRole(role)) {
    return { targetUserId: userId };
  }

  return {};
}

class ComplaintsController {
  static async getAllComplaints(req, res) {
    try {
      const role = normalizeRole(req.user?.role);

      const teamAgents =
        role === 'team leader' ? await User.getTeamLeaderAgents(req.user.id) : [];
      const complaintScope = buildComplaintVisibilityScope(req.user.id, role, teamAgents);

      const complaints = await Complaint.getComplaints({
        search: req.query.search,
        targetRole: req.query.targetRole ? normalizeRole(req.query.targetRole) : null,
        leadId: normalizeId(req.query.leadId),
        targetUserId: normalizeId(req.query.targetUserId),
        ...complaintScope
      });

      res.json({
        success: true,
        data: complaints,
        count: complaints.length
      });
    } catch (error) {
      logger.error('Error getting complaints', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve complaints'
      });
    }
  }

  static async createComplaint(req, res) {
    try {
      const role = normalizeRole(req.user?.role);
      const leadId = normalizeId(req.body?.lead_id);
      const targetUserId = normalizeId(req.body?.target_user_id);
      const title = String(req.body?.title || '').trim();
      const description = String(req.body?.description || '').trim();

      if (!leadId || !targetUserId || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Lead, target user, title, and description are required'
        });
      }

      const lead = await Lead.getLeadById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found'
        });
      }

      const targetRole = normalizeRole(targetUser.role);
      const targetIsAllowed = isAgentLikeRole(targetRole) || targetRole === 'team leader';
      if (!targetIsAllowed) {
        return res.status(400).json({
          success: false,
          message: 'Complaints can only be filed against agents, consultants, or team leaders'
        });
      }

      if (!ALLOWED_CREATORS.has(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add complaints'
        });
      }

      if (role === 'team leader') {
        if (!isAgentLikeRole(targetRole)) {
          return res.status(403).json({
            success: false,
            message: 'Team leaders can only add complaints to their own team members'
          });
        }

        const onTeam = await User.isAgentOnTeamLeader(req.user.id, targetUserId);
        if (!onTeam) {
          return res.status(403).json({
            success: false,
            message: 'Team leaders can only add complaints to their own team members'
          });
        }
      }

      const complaint = await Complaint.createComplaint({
        lead_id: leadId,
        target_user_id: targetUserId,
        title,
        description,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        data: complaint,
        message: 'Complaint created successfully'
      });
    } catch (error) {
      logger.error('Error creating complaint', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create complaint'
      });
    }
  }

  static async deleteComplaint(req, res) {
    try {
      const complaintId = normalizeId(req.params?.id);

      if (!complaintId) {
        return res.status(400).json({
          success: false,
          message: 'Valid complaint ID is required'
        });
      }

      const deleted = await Complaint.deleteComplaint(complaintId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      res.json({
        success: true,
        message: 'Complaint deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting complaint', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete complaint'
      });
    }
  }
}

module.exports = ComplaintsController;
