// controllers/viewingsController.js
const Viewing = require('../models/viewingModel');
const { validationResult } = require('express-validator');

class ViewingsController {
  // Get all viewings (with role-based filtering)
  static async getAllViewings(req, res) {
    try {
      console.log('📋 Getting all viewings for user:', req.user?.name, 'Role:', req.user?.role);
      
      const viewings = await Viewing.getViewingsForAgent(req.user.id, req.user.role);
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} viewings`,
        userRole: req.user.role
      });
    } catch (error) {
      console.error('❌ Error getting viewings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewings with filters
  static async getViewingsWithFilters(req, res) {
    try {
      console.log('🔍 Getting filtered viewings for user:', req.user?.name, 'Filters:', req.query);
      
      let viewings;
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'agent') {
        // Agents see only their viewings, with filters
        viewings = await Viewing.getViewingsByAgent(userId);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredViewings = await Viewing.getViewingsWithFilters(req.query);
          viewings = viewings.filter(viewing => 
            filteredViewings.some(filtered => filtered.id === viewing.id)
          );
        }
      } else if (userRole === 'team_leader') {
        // Team leaders see their own and their team's viewings, with filters
        viewings = await Viewing.getViewingsForTeamLeader(userId);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredViewings = await Viewing.getViewingsWithFilters(req.query);
          viewings = viewings.filter(viewing => 
            filteredViewings.some(filtered => filtered.id === viewing.id)
          );
        }
      } else {
        // Admins, operations managers, operations, and agent managers see all viewings with filters
        viewings = await Viewing.getViewingsWithFilters(req.query);
      }
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} filtered viewings`
      });
    } catch (error) {
      console.error('❌ Error getting filtered viewings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve filtered viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get single viewing by ID
  static async getViewingById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Getting viewing by ID:', id);
      
      const viewing = await Viewing.getViewingById(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }

      // Check if user has permission to view this viewing
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'agent' && viewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this viewing'
        });
      }
      
      if (userRole === 'team_leader') {
        // Check if viewing is assigned to team leader or their team agents
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === viewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this viewing'
          });
        }
      }
      
      res.json({
        success: true,
        data: viewing
      });
    } catch (error) {
      console.error('❌ Error getting viewing by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create new viewing
  static async createViewing(req, res) {
    try {
      console.log('➕ Creating new viewing');
      console.log('📋 Request body:', req.body);
      console.log('👤 User:', req.user?.name, 'Role:', req.user?.role);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions for agent assignment
      // Agents and team leaders can only assign viewings to themselves
      if (['agent', 'team_leader'].includes(userRole)) {
        if (req.body.agent_id && req.body.agent_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign viewings to yourself'
          });
        }
        // Auto-assign to the current user if not specified
        req.body.agent_id = userId;
      }
      
      // Validate required fields
      if (!req.body.property_id || !req.body.lead_id) {
        return res.status(400).json({
          success: false,
          message: 'Property and Lead are required fields'
        });
      }
      
      if (!req.body.viewing_date || !req.body.viewing_time) {
        return res.status(400).json({
          success: false,
          message: 'Viewing date and time are required'
        });
      }
      
      const viewing = await Viewing.createViewing(req.body);
      
      console.log('✅ Viewing created successfully:', viewing.id);
      
      res.status(201).json({
        success: true,
        data: viewing,
        message: 'Viewing created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating viewing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update viewing
  static async updateViewing(req, res) {
    try {
      const { id } = req.params;
      console.log('🔧 Updating viewing:', id);
      console.log('📋 Update data:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get existing viewing
      const existingViewing = await Viewing.getViewingById(id);
      if (!existingViewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && existingViewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own viewings'
        });
      }
      
      if (userRole === 'team_leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === existingViewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only update viewings assigned to you or your team'
          });
        }
      }
      
      // Agents and team leaders cannot reassign viewings to others
      if (['agent', 'team_leader'].includes(userRole) && req.body.agent_id && req.body.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You cannot reassign viewings to other agents'
        });
      }
      
      const viewing = await Viewing.updateViewing(id, req.body);
      
      console.log('✅ Viewing updated successfully');
      
      res.json({
        success: true,
        data: viewing,
        message: 'Viewing updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating viewing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete viewing
  static async deleteViewing(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Deleting viewing:', id);
      
      // Only admins and operations managers can delete viewings
      if (!['admin', 'operations manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and operations managers can delete viewings'
        });
      }
      
      const viewing = await Viewing.deleteViewing(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }
      
      console.log('✅ Viewing deleted successfully');
      
      res.json({
        success: true,
        message: 'Viewing deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting viewing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewing statistics
  static async getViewingStats(req, res) {
    try {
      console.log('📊 Getting viewing statistics');
      
      const stats = await Viewing.getViewingStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error getting viewing stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewings by agent
  static async getViewingsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      console.log('🔍 Getting viewings for agent:', agentId);
      
      const viewings = await Viewing.getViewingsByAgent(agentId);
      
      res.json({
        success: true,
        data: viewings
      });
    } catch (error) {
      console.error('❌ Error getting viewings by agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve agent viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Add update to viewing
  static async addViewingUpdate(req, res) {
    try {
      const { id } = req.params;
      console.log('➕ Adding update to viewing:', id);
      
      const { update_text, update_date } = req.body;
      
      if (!update_text || !update_text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Update text is required'
        });
      }
      
      // Check if viewing exists and user has access
      const viewing = await Viewing.getViewingById(id);
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }
      
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && viewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add updates to your own viewings'
        });
      }
      
      if (userRole === 'team_leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === viewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only add updates to viewings assigned to you or your team'
          });
        }
      }
      
      const updateData = {
        update_text: update_text.trim(),
        update_date: update_date || new Date().toISOString().split('T')[0],
        created_by: userId
      };
      
      const update = await Viewing.addViewingUpdate(id, updateData);
      
      console.log('✅ Viewing update added successfully');
      
      res.status(201).json({
        success: true,
        data: update,
        message: 'Update added successfully'
      });
    } catch (error) {
      console.error('❌ Error adding viewing update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add viewing update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get updates for a viewing
  static async getViewingUpdates(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Getting updates for viewing:', id);
      
      const updates = await Viewing.getViewingUpdates(id);
      
      res.json({
        success: true,
        data: updates
      });
    } catch (error) {
      console.error('❌ Error getting viewing updates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing updates',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete viewing update
  static async deleteViewingUpdate(req, res) {
    try {
      const { id, updateId } = req.params;
      console.log('🗑️ Deleting update:', updateId, 'from viewing:', id);
      
      // Only admins and operations managers can delete updates
      if (!['admin', 'operations manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and operations managers can delete updates'
        });
      }
      
      const update = await Viewing.deleteViewingUpdate(updateId);
      
      if (!update) {
        return res.status(404).json({
          success: false,
          message: 'Update not found'
        });
      }
      
      console.log('✅ Viewing update deleted successfully');
      
      res.json({
        success: true,
        message: 'Update deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting viewing update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete viewing update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ViewingsController;

