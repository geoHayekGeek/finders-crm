// controllers/leadsController.js
const Lead = require('../models/leadsModel');
const Notification = require('../models/notificationModel');
const { validationResult } = require('express-validator');

class LeadsController {
  // Get all leads (with role-based filtering applied by middleware)
  static async getAllLeads(req, res) {
    try {
      console.log('📋 Getting all leads for user:', req.user?.name, 'Role:', req.user?.role);
      
      const leads = await Lead.getLeadsForAgent(req.user.id, req.user.role);
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} leads`
      });
    } catch (error) {
      console.error('❌ Error getting leads:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leads',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get leads with filters (with role-based filtering applied by middleware)
  static async getLeadsWithFilters(req, res) {
    try {
      console.log('🔍 Getting filtered leads for user:', req.user?.name, 'Filters:', req.query);
      console.log('🔍 User role:', req.user?.role, 'User ID:', req.user?.id);
      console.log('🔍 Date filters from query:', { 
        date_from: req.query.date_from, 
        date_to: req.query.date_to,
        date_from_type: typeof req.query.date_from,
        date_to_type: typeof req.query.date_to
      });
      
      let leads;
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'agent') {
        console.log('🔍 Agent user - complex filtering logic');
        // Agents see leads assigned to them or that they referred, with filters
        leads = await Lead.getLeadsAssignedOrReferredByAgent(userId);
        console.log('🔍 Agent leads before filtering:', leads.length);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredLeads = await Lead.getLeadsWithFilters(req.query);
          console.log('🔍 Filtered leads from query:', filteredLeads.length);
          // Filter the agent's leads by the query results
          leads = leads.filter(lead => 
            filteredLeads.some(filtered => filtered.id === lead.id)
          );
          console.log('🔍 Final agent leads after filtering:', leads.length);
        }
      } else {
        console.log('🔍 Admin/Manager/Operations user - direct filtering');
        // Admins, operations managers, operations, and agent managers see all leads with filters
        leads = await Lead.getLeadsWithFilters(req.query);
      }
      
      console.log('🔍 Final leads count:', leads.length);
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} filtered leads`
      });
    } catch (error) {
      console.error('❌ Error getting filtered leads:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve filtered leads',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get single lead by ID
  static async getLeadById(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.getLeadById(id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check if user has permission to view this lead
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
        // Full access - no restrictions
      } else if (userRole === 'agent' && lead.agent_id !== userId) {
        // Agents can only view leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lead'
        });
      }
      
      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      console.error('❌ Error getting lead by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create new lead
  static async createLead(req, res) {
    try {
      console.log('➕ Creating new lead:', req.body);
      
      // All validation is now handled by middleware
      // If user is operations role, set them as the default operations_id
      let leadData = { ...req.body };
      if (req.user.role === 'operations' && !leadData.operations_id) {
        leadData.operations_id = req.user.id;
      }

      const newLead = await Lead.createLead(leadData);
      
      console.log('✅ Lead created successfully:', newLead.id);

      // Create notifications for relevant users
      try {
        await Notification.createLeadNotification(
          newLead.id,
          'created',
          {
            customer_name: newLead.customer_name,
            phone_number: newLead.phone_number,
            status: newLead.status
          },
          req.user.id
        );

        // If an agent is assigned, create a specific "Lead Assigned" notification for them
        if (newLead.agent_id && newLead.agent_id !== req.user.id) {
          await Notification.createLeadAssignmentNotification(
            newLead.id,
            newLead.agent_id,
            {
              customer_name: newLead.customer_name,
              phone_number: newLead.phone_number
            }
          );
        }
      } catch (notificationError) {
        console.error('Error creating lead notifications:', notificationError);
        // Don't fail the lead creation if notifications fail
      }
      
      res.status(201).json({
        success: true,
        data: newLead,
        message: 'Lead created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update lead
  static async updateLead(req, res) {
    try {
      const { id } = req.params;
      console.log('📝 Updating lead:', id, req.body);
      
      // Check if lead exists and user has permission
      const existingLead = await Lead.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
        // Full access - no restrictions
      } else if (userRole === 'agent' && existingLead.agent_id !== userId) {
        // Agents can only update leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this lead'
        });
      }

      const updatedLead = await Lead.updateLead(id, req.body);
      
      if (!updatedLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Create notifications for relevant users
      try {
        const notificationData = {
          customer_name: updatedLead.customer_name,
          phone_number: updatedLead.phone_number,
          status: updatedLead.status
        };

        // Check if status changed
        if (req.body.status && req.body.status !== existingLead.status) {
          await Notification.createLeadNotification(
            parseInt(id),
            'status_changed',
            notificationData,
            req.user.id
          );
        } else {
          await Notification.createLeadNotification(
            parseInt(id),
            'updated',
            notificationData,
            req.user.id
          );
        }

        // If agent assignment changed, create a specific "Lead Assigned" notification for the new agent
        if (req.body.agent_id && req.body.agent_id !== existingLead.agent_id && req.body.agent_id !== req.user.id) {
          await Notification.createLeadAssignmentNotification(
            parseInt(id),
            req.body.agent_id,
            {
              customer_name: updatedLead.customer_name,
              phone_number: updatedLead.phone_number
            }
          );
        }
      } catch (notificationError) {
        console.error('Error creating lead update notifications:', notificationError);
        // Don't fail the lead update if notifications fail
      }
      
      console.log('✅ Lead updated successfully:', updatedLead.id);
      
      res.json({
        success: true,
        data: updatedLead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete lead
  static async deleteLead(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Deleting lead:', id);
      
      // Check if lead exists and user has permission
      const existingLead = await Lead.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - only admins, operations, operations managers, and agent managers can delete leads
      const userRole = req.user.role;
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete leads'
        });
      }

      // Create notifications for relevant users before deleting
      try {
        await Notification.createLeadNotification(
          parseInt(id),
          'deleted',
          {
            customer_name: existingLead.customer_name,
            phone_number: existingLead.phone_number,
            status: existingLead.status
          },
          req.user.id
        );
      } catch (notificationError) {
        console.error('Error creating lead deletion notifications:', notificationError);
        // Don't fail the lead deletion if notifications fail
      }

      const deletedLead = await Lead.deleteLead(id);
      
      if (!deletedLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }
      
      console.log('✅ Lead deleted successfully:', deletedLead.id);
      
      res.json({
        success: true,
        data: deletedLead,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get leads by agent
  static async getLeadsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      console.log('👤 Getting leads for agent:', agentId);
      
      const leads = await Lead.getLeadsByAgent(agentId);
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} leads for agent`
      });
    } catch (error) {
      console.error('❌ Error getting leads by agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leads by agent',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get lead statistics
  static async getLeadStats(req, res) {
    try {
      console.log('📊 Getting lead statistics');
      
      const [
        stats,
        leadsByDate,
        leadsByStatus,
        leadsByAgent
      ] = await Promise.all([
        Lead.getLeadStats(),
        Lead.getLeadsByDateRange(),
        Lead.getLeadsByStatus(),
        Lead.getLeadsByAgentStats()
      ]);
      
      res.json({
        success: true,
        data: {
          overview: stats,
          byDate: leadsByDate,
          byStatus: leadsByStatus,
          byAgent: leadsByAgent
        }
      });
    } catch (error) {
      console.error('❌ Error getting lead statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get reference sources
  static async getReferenceSources(req, res) {
    try {
      console.log('📋 Getting reference sources');
      
      const sources = await Lead.getReferenceSources();
      
      res.json({
        success: true,
        data: sources,
        message: 'Reference sources retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting reference sources:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reference sources',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get operations users
  static async getOperationsUsers(req, res) {
    try {
      console.log('👥 Getting operations users');
      
      const users = await Lead.getOperationsUsers();
      
      res.json({
        success: true,
        data: users,
        message: 'Operations users retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting operations users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve operations users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = LeadsController;
