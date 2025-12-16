// controllers/statusController.js
const Status = require('../models/statusModel');

class StatusController {
  // Get all statuses (active only)
  static async getAllStatuses(req, res) {
    try {
      const statuses = await Status.getAllStatuses();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error getting statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statuses',
        error: error.message
      });
    }
  }

  // Get all statuses for admin (active and inactive)
  static async getAllStatusesForAdmin(req, res) {
    try {
      const statuses = await Status.getAllStatusesForAdmin();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error getting statuses for admin:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statuses for admin',
        error: error.message
      });
    }
  }

  // Get status by ID
  static async getStatusById(req, res) {
    try {
      const { id } = req.params;
      const status = await Status.getStatusById(id);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Status not found'
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve status',
        error: error.message
      });
    }
  }

  // Get status by code
  static async getStatusByCode(req, res) {
    try {
      const { code } = req.params;
      const status = await Status.getStatusByCode(code);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Status not found'
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting status by code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve status',
        error: error.message
      });
    }
  }

  // Create new status
  static async createStatus(req, res) {
    try {
      const { name, code, description, color, is_active, can_be_referred } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Name and code are required'
        });
      }

      const status = await Status.createStatus({
        name,
        code,
        description,
        color: color || '#6B7280',
        is_active: is_active !== undefined ? is_active : true,
        can_be_referred: can_be_referred !== undefined ? can_be_referred : true
      });

      res.status(201).json({
        success: true,
        message: 'Status created successfully',
        data: status
      });
    } catch (error) {
      console.error('Error creating status:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Status with this name or code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create status',
        error: error.message
      });
    }
  }

  // Update status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.created_at;
      delete updates.updated_at;

      const status = await Status.updateStatus(id, updates);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Status not found'
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: status
      });
    } catch (error) {
      console.error('Error updating status:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Status with this name or code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update status',
        error: error.message
      });
    }
  }

  // Delete status (soft delete)
  static async deleteStatus(req, res) {
    try {
      const { id } = req.params;
      const status = await Status.deleteStatus(id);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Status not found'
        });
      }

      res.json({
        success: true,
        message: 'Status deleted successfully',
        data: status
      });
    } catch (error) {
      console.error('Error deleting status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete status',
        error: error.message
      });
    }
  }

  // Get statuses with property count
  static async getStatusesWithPropertyCount(req, res) {
    try {
      const statuses = await Status.getStatusesWithPropertyCount();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error getting statuses with property count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statuses with property count',
        error: error.message
      });
    }
  }

  // Get status statistics
  static async getStatusStats(req, res) {
    try {
      const stats = await Status.getStatusStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting status stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve status statistics',
        error: error.message
      });
    }
  }

  // Search statuses
  static async searchStatuses(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const statuses = await Status.searchStatuses(q);
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error searching statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search statuses',
        error: error.message
      });
    }
  }
}

module.exports = StatusController;
