// controllers/leadsController.js
const Lead = require('../models/leadsModel');
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
      
      let leads;
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'operations') {
        // Operations employees only see their own leads, even with filters
        const filters = { ...req.query, agent_id: userId };
        leads = await Lead.getLeadsWithFilters(filters);
      } else if (userRole === 'agent') {
        // Agents see leads assigned to them or that they referred, with filters
        leads = await Lead.getLeadsAssignedOrReferredByAgent(userId);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredLeads = await Lead.getLeadsWithFilters(req.query);
          // Filter the agent's leads by the query results
          leads = leads.filter(lead => 
            filteredLeads.some(filtered => filtered.id === lead.id)
          );
        }
      } else {
        // Admins, operations managers, and agent managers see all leads with filters
        leads = await Lead.getLeadsWithFilters(req.query);
      }
      
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
      if (['admin', 'operations', 'operations manager', 'agent manager'].includes(userRole)) {
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
      
      // Validate required fields
      const { customer_name } = req.body;
      
      if (!customer_name) {
        return res.status(400).json({
          success: false,
          message: 'Customer name is required'
        });
      }

      // If user is operations role, set them as the default agent
      let leadData = { ...req.body };
      if (req.user.role === 'operations') {
        leadData.agent_id = req.user.id;
        leadData.agent_name = req.user.name;
      }

      const newLead = await Lead.createLead(leadData);
      
      console.log('✅ Lead created successfully:', newLead.id);
      
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
      if (['admin', 'operations', 'operations manager', 'agent manager'].includes(userRole)) {
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
      if (!['admin', 'operations', 'operations manager', 'agent manager'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete leads'
        });
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
