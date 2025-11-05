// backend/controllers/reportsController.js
const Report = require('../models/reportsModel');
const { exportToExcel, exportToPDF } = require('../utils/reportExporter');

class ReportsController {
  /**
   * Create a new monthly agent report
   */
  static async createMonthlyReport(req, res) {
    try {
      console.log('📊 Creating monthly report:', req.body);
      
      const { agent_id, month, year, boosts } = req.body;
      
      // Validation
      if (!agent_id || !month || !year) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID, month, and year are required'
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12'
        });
      }

      if (year < 2000 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year'
        });
      }

      const report = await Report.createMonthlyReport(
        { agent_id, month, year, boosts },
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
          message: 'A report already exists for this agent and month'
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
      
      const filters = {};
      
      if (req.query.agent_id) {
        filters.agent_id = parseInt(req.query.agent_id);
      }
      
      if (req.query.month) {
        filters.month = parseInt(req.query.month);
      }
      
      if (req.query.year) {
        filters.year = parseInt(req.query.year);
      }

      const reports = await Report.getAllReports(filters);
      
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
      
      console.log('📊 Getting report by ID:', id);
      
      const report = await Report.getReportById(parseInt(id));
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
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
      
      console.log('📊 Updating report:', id, updates);
      
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
      console.log('📊 Exporting report to Excel:', id);
      
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

      const buffer = await exportToExcel(report);
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const filename = `Report_${report.agent_name.replace(/\s+/g, '_')}_${monthNames[report.month - 1]}_${report.year}.xlsx`;
      
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
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const filename = `Report_${report.agent_name.replace(/\s+/g, '_')}_${monthNames[report.month - 1]}_${report.year}.pdf`;
      
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
}

module.exports = ReportsController;

