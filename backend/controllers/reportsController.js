// backend/controllers/reportsController.js
const Report = require('../models/reportsModel');
const User = require('../models/userModel');
const { exportToExcel, exportToPDF } = require('../utils/reportExporter');
const { getSaleRentSourceData } = require('../models/saleRentSourceReportModel');
const {
  exportSaleRentSourceToExcel,
  exportSaleRentSourceToPDF
} = require('../utils/saleRentSourceReportExporter');
const pool = require('../config/db');

const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/\s+/g, '_') : '';

class ReportsController {
  /**
   * Create a new monthly agent report
   */
  static async createMonthlyReport(req, res) {
    try {
      console.log('📊 Creating monthly report:', req.body);
      
      const role = normalizeRole(req.user.role);
      
      // Only admin, operations manager, and operations can create reports
      if (!['admin', 'operations_manager', 'operations'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create reports'
        });
      }
      
      const { agent_id, start_date, end_date, boosts } = req.body;
      
      // Validation
      if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID, start date, and end date are required'
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD.'
        });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date'
        });
      }

      const report = await Report.createMonthlyReport(
        { agent_id, start_date, end_date, boosts },
        req.user.id
      );

      console.log('✅ Report created successfully:', report.id);
      
      res.status(201).json({
        success: true,
        data: report,
        message: 'Monthly report created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating monthly report:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'A report already exists for this agent and date range'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create monthly report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all monthly reports with optional filters
   */
  static async getAllReports(req, res) {
    try {
      console.log('📊 Getting monthly reports with filters:', req.query);
      console.log('👤 User:', req.user?.name, 'Role:', req.user?.role);
      
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      const filters = {};
      
      // Apply role-based filtering
      if (role === 'agent') {
        // Agents can only see their own reports
        filters.agent_id = userId;
      } else if (role === 'team_leader') {
        // Team leaders can see reports for agents under them
        const teamAgents = await User.getTeamLeaderAgents(userId);
        const teamAgentIds = teamAgents.map(agent => agent.id);
        
        if (teamAgentIds.length === 0) {
          // No agents under this team leader
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: 'No reports found'
          });
        }
        
        // Filter by team agent IDs
        filters.agent_ids = teamAgentIds;
      } else if (role === 'agent_manager') {
        // Agent manager can see all reports for agents only
        // Filter will be applied in the model to only show agent reports
        filters.agent_role_only = true;
      }
      // Admin, operations_manager, operations: no filtering (see all)
      
      if (req.query.agent_id) {
        // Additional filter from query (if user has permission)
        if (role === 'agent' && parseInt(req.query.agent_id) !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own reports'
          });
        }
        filters.agent_id = parseInt(req.query.agent_id);
      }
      
      if (req.query.start_date) {
        filters.start_date = req.query.start_date;
      }

      if (req.query.end_date) {
        filters.end_date = req.query.end_date;
      }

      // Backwards compatibility for old parameter names
      if (req.query.date_from && !filters.start_date) {
        filters.start_date = req.query.date_from;
      }

      if (req.query.date_to && !filters.end_date) {
        filters.end_date = req.query.date_to;
      }

      let reports = await Report.getAllReports(filters);
      
      // Filter data for team leaders (only show boost and lead sources)
      if (role === 'team_leader') {
        reports = reports.map(report => ({
          id: report.id,
          agent_id: report.agent_id,
          agent_name: report.agent_name,
          agent_code: report.agent_code,
          start_date: report.start_date,
          end_date: report.end_date,
          boosts: report.boosts,
          lead_sources: report.lead_sources,
          created_at: report.created_at,
          updated_at: report.updated_at
        }));
      }
      
      console.log('✅ Retrieved reports:', reports.length);
      
      res.json({
        success: true,
        data: reports,
        count: reports.length,
        message: `Retrieved ${reports.length} reports`
      });
    } catch (error) {
      console.error('❌ Error getting monthly reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve monthly reports',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get a single report by ID
   */
  static async getReportById(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      console.log('📊 Getting report by ID:', id);
      
      let report = await Report.getReportById(parseInt(id));
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // Check permissions
      if (role === 'agent' && report.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own reports'
        });
      } else if (role === 'team_leader') {
        // Check if report belongs to an agent under this team leader
        if (report.agent_id !== userId) {
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, report.agent_id]
          );
          
          if (teamAgentCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You can only view reports for agents under you'
            });
          }
        }
        
        // Filter data for team leaders (only show boost and lead sources)
        report = {
          id: report.id,
          agent_id: report.agent_id,
          agent_name: report.agent_name,
          agent_code: report.agent_code,
          start_date: report.start_date,
          end_date: report.end_date,
          boosts: report.boosts,
          lead_sources: report.lead_sources,
          created_at: report.created_at,
          updated_at: report.updated_at
        };
      } else if (role === 'agent_manager') {
        // Agent manager can only see reports for agents
        if (report.agent_role !== 'agent') {
          return res.status(403).json({
            success: false,
            message: 'You can only view reports for agents'
          });
        }
      }
      // Admin, operations_manager, operations: full access
      
      console.log('✅ Retrieved report:', report.id);
      
      res.json({
        success: true,
        data: report,
        message: 'Report retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update a report (mainly for manual fields)
   */
  static async updateReport(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      console.log('📊 Updating report:', id, updates);
      
      // Check if report exists and user has permission
      const existingReport = await Report.getReportById(parseInt(id));
      
      if (!existingReport) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // Check permissions
      if (!['admin', 'operations_manager', 'operations'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update reports'
        });
      }
      
      const report = await Report.updateReport(parseInt(id), updates);
      
      console.log('✅ Report updated successfully:', report.id);
      
      res.json({
        success: true,
        data: report,
        message: 'Report updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating report:', error);
      
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Recalculate report data
   */
  static async recalculateReport(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      
      // Only admin, operations manager, and operations can recalculate reports
      if (!['admin', 'operations_manager', 'operations'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to recalculate reports'
        });
      }
      
      console.log('📊 Recalculating report:', id);
      
      const report = await Report.recalculateReport(parseInt(id));
      
      console.log('✅ Report recalculated successfully:', report.id);
      
      res.json({
        success: true,
        data: report,
        message: 'Report recalculated successfully'
      });
    } catch (error) {
      console.error('❌ Error recalculating report:', error);
      
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete a report
   */
  static async deleteReport(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      
      // Only admin and operations manager can delete reports
      if (!['admin', 'operations_manager'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete reports'
        });
      }
      
      console.log('📊 Deleting report:', id);
      
      const report = await Report.deleteReport(parseInt(id));
      
      console.log('✅ Report deleted successfully:', id);
      
      res.json({
        success: true,
        data: report,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting report:', error);
      
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available lead sources
   */
  static async getLeadSources(req, res) {
    try {
      console.log('📊 Getting available lead sources');
      
      const sources = await Report.getAvailableLeadSources();
      
      console.log('✅ Retrieved lead sources:', sources.length);
      
      res.json({
        success: true,
        data: sources,
        message: 'Lead sources retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting lead sources:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead sources',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Export report to Excel
   */
  static async exportReportToExcel(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      console.log('📊 Exporting report to Excel:', id);
      
      let report = await Report.getReportById(parseInt(id));
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // Check permissions (same as getReportById)
      if (role === 'agent' && report.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only export your own reports'
        });
      } else if (role === 'team_leader') {
        if (report.agent_id !== userId) {
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, report.agent_id]
          );
          
          if (teamAgentCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You can only export reports for agents under you'
            });
          }
        }
        // Filter data for team leaders
        report = {
          id: report.id,
          agent_id: report.agent_id,
          agent_name: report.agent_name,
          agent_code: report.agent_code,
          start_date: report.start_date,
          end_date: report.end_date,
          boosts: report.boosts,
          lead_sources: report.lead_sources,
          created_at: report.created_at,
          updated_at: report.updated_at
        };
      } else if (role === 'agent_manager') {
        if (report.agent_role !== 'agent') {
          return res.status(403).json({
            success: false,
            message: 'You can only export reports for agents'
          });
        }
      }

      // Parse lead_sources if it's a string
      if (report.lead_sources && typeof report.lead_sources === 'string') {
        try {
          report.lead_sources = JSON.parse(report.lead_sources);
        } catch (e) {
          console.warn('Failed to parse lead_sources:', e);
          report.lead_sources = {};
        }
      }

      const buffer = await exportToExcel(report);
      
      const formatRangeLabel = () => {
        const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
        const endDate = report.end_date
          ? new Date(report.end_date)
          : new Date(report.year, report.month, 0);

        const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        return `${formatter.format(startDate).replace(/[, ]/g, '-')}_to_${formatter.format(endDate).replace(/[, ]/g, '-')}`;
      };

      const filename = `Report_${report.agent_name.replace(/\s+/g, '_')}_${formatRangeLabel()}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
      
      console.log('✅ Report exported to Excel successfully');
    } catch (error) {
      console.error('❌ Error exporting report to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report to Excel',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Export report to PDF
   */
  static async exportReportToPDF(req, res) {
    try {
      const { id } = req.params;
      console.log('📊 Exporting report to PDF:', id);
      
      const report = await Report.getReportById(parseInt(id));
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Parse lead_sources if it's a string
      if (report.lead_sources && typeof report.lead_sources === 'string') {
        try {
          report.lead_sources = JSON.parse(report.lead_sources);
        } catch (e) {
          console.warn('Failed to parse lead_sources:', e);
          report.lead_sources = {};
        }
      }

      const buffer = await exportToPDF(report);
      
      const formatRangeLabel = () => {
        const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
        const endDate = report.end_date
          ? new Date(report.end_date)
          : new Date(report.year, report.month, 0);

        const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        return `${formatter.format(startDate).replace(/[, ]/g, '-')}_to_${formatter.format(endDate).replace(/[, ]/g, '-')}`;
      };

      const filename = `Report_${report.agent_name.replace(/\s+/g, '_')}_${formatRangeLabel()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
      
      console.log('✅ Report exported to PDF successfully');
    } catch (error) {
      console.error('❌ Error exporting report to PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report to PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get "Statistics of Sale and Rent Source" report rows
   */
  static async getSaleRentSourceReport(req, res) {
    try {
      const { agent_id, start_date, end_date } = req.query;

      if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'agent_id, start_date, and end_date are required'
        });
      }

      const data = await getSaleRentSourceData({
        agent_id: parseInt(agent_id, 10),
        start_date,
        end_date
      });

      res.json({
        success: true,
        data,
        count: data.length,
        message: 'Sale & Rent Source report generated successfully'
      });
    } catch (error) {
      console.error('❌ Error getting Sale & Rent Source report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Sale & Rent Source report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Export Sale & Rent Source report to Excel
   */
  static async exportSaleRentSourceExcel(req, res) {
    try {
      const { agent_id, start_date, end_date } = req.query;

      if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'agent_id, start_date, and end_date are required'
        });
      }

      const rows = await getSaleRentSourceData({
        agent_id: parseInt(agent_id, 10),
        start_date,
        end_date
      });

      const buffer = await exportSaleRentSourceToExcel(rows, {
        agentName: rows[0]?.agent_name || 'Agent',
        startDate: start_date,
        endDate: end_date
      });

      const filename = `Sale_Rent_Source_${(rows[0]?.agent_name || 'Agent').replace(/\s+/g, '_')}_${start_date}_to_${end_date}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('❌ Error exporting Sale & Rent Source report to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export Sale & Rent Source report to Excel',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Export Sale & Rent Source report to PDF
   */
  static async exportSaleRentSourcePDF(req, res) {
    try {
      const { agent_id, start_date, end_date } = req.query;

      if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'agent_id, start_date, and end_date are required'
        });
      }

      const rows = await getSaleRentSourceData({
        agent_id: parseInt(agent_id, 10),
        start_date,
        end_date
      });

      const buffer = await exportSaleRentSourceToPDF(rows, {
        agentName: rows[0]?.agent_name || 'Agent',
        startDate: start_date,
        endDate: end_date
      });

      const filename = `Sale_Rent_Source_${(rows[0]?.agent_name || 'Agent').replace(/\s+/g, '_')}_${start_date}_to_${end_date}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('❌ Error exporting Sale & Rent Source report to PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export Sale & Rent Source report to PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ReportsController;

