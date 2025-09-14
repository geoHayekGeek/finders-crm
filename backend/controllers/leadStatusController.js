// controllers/leadStatusController.js
const LeadStatus = require('../models/leadStatusModel');

class LeadStatusController {
  // Get all lead statuses
  static async getAllStatuses(req, res) {
    try {
      console.log('📊 Getting all lead statuses');
      const statuses = await LeadStatus.getAllStatuses();
      
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('❌ Error getting lead statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead statuses'
      });
    }
  }

  // Get lead status by ID
  static async getStatusById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Getting lead status by ID:', id);
      
      const status = await LeadStatus.getStatusById(id);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Lead status not found'
        });
      }
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('❌ Error getting lead status by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead status'
      });
    }
  }

  // Create new lead status
  static async createStatus(req, res) {
    try {
      const { status_name, code, color, description, is_active } = req.body;
      console.log('➕ Creating new lead status:', status_name);
      
      if (!status_name) {
        return res.status(400).json({
          success: false,
          message: 'Status name is required'
        });
      }
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Status code is required'
        });
      }
      
      const statusData = {
        status_name,
        code: code.toUpperCase(),
        color: color || '#6B7280',
        description: description || '',
        is_active: is_active !== undefined ? is_active : true
      };
      
      const status = await LeadStatus.createStatus(statusData);
      
      res.status(201).json({
        success: true,
        data: status,
        message: 'Lead status created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating lead status:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Lead status with this name or code already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create lead status'
        });
      }
    }
  }

  // Update lead status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status_name, code, color, description, is_active } = req.body;
      console.log('📝 Updating lead status:', id, '->', status_name);
      
      if (!status_name) {
        return res.status(400).json({
          success: false,
          message: 'Status name is required'
        });
      }
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Status code is required'
        });
      }
      
      const statusData = {
        status_name,
        code: code.toUpperCase(),
        color: color || '#6B7280',
        description: description || '',
        is_active: is_active !== undefined ? is_active : true
      };
      
      const status = await LeadStatus.updateStatus(id, statusData);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Lead status not found'
        });
      }
      
      res.json({
        success: true,
        data: status,
        message: 'Lead status updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating lead status:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Lead status with this name or code already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update lead status'
        });
      }
    }
  }

  // Delete lead status
  static async deleteStatus(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Deleting lead status:', id);
      
      const status = await LeadStatus.deleteStatus(id);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Lead status not found'
        });
      }
      
      res.json({
        success: true,
        data: status,
        message: 'Lead status deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting lead status:', error);
      if (error.code === '23503') { // Foreign key constraint violation
        res.status(409).json({
          success: false,
          message: 'Cannot delete lead status - it is being used by existing leads'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete lead status'
        });
      }
    }
  }
}

module.exports = LeadStatusController;
