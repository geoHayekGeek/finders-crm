const TeamReport = require('../models/teamReportsModel');
const { exportTeamReportToExcel } = require('../utils/teamReportExporter');
const { normalizeRole } = require('../utils/roleUtils');

function formatRangeLabel(report) {
  const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
  const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  return `${formatter.format(startDate).replace(/[, ]/g, '-')}_to_${formatter.format(endDate).replace(/[, ]/g, '-')}`;
}

class TeamReportsController {
  static async createTeamMonthlyReport(req, res) {
    try {
      const role = normalizeRole(req.user.role);
      const allowedRoles = ['admin', 'operations manager', 'operations', 'agent manager', 'team leader'];

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create team reports'
        });
      }

      const { team_leader_id, start_date, end_date } = req.body;
      if (!team_leader_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Team leader ID, start date, and end date are required'
        });
      }

      if (role === 'team leader' && parseInt(team_leader_id, 10) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Team leaders can only create reports for their own team'
        });
      }

      const report = await TeamReport.createTeamMonthlyReport(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: report,
        message: 'Team report created successfully'
      });
    } catch (error) {
      if (error.message?.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'A team report already exists for this team and date range'
        });
      }

      if (error.message?.includes('Year must be')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create team report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getAllTeamMonthlyReports(req, res) {
    try {
      const role = normalizeRole(req.user.role);
      const filters = {};

      if (role === 'team leader') {
        filters.team_leader_id = req.user.id;
      } else if (req.query.team_leader_id) {
        filters.team_leader_id = parseInt(req.query.team_leader_id, 10);
      }
      if (req.query.start_date) {
        filters.start_date = req.query.start_date;
      }
      if (req.query.end_date) {
        filters.end_date = req.query.end_date;
      }
      if (req.query.date_from && !filters.start_date) {
        filters.start_date = req.query.date_from;
      }
      if (req.query.date_to && !filters.end_date) {
        filters.end_date = req.query.date_to;
      }

      const reports = await TeamReport.getAllTeamMonthlyReports(filters);

      res.json({
        success: true,
        data: reports,
        count: reports.length,
        message: `Retrieved ${reports.length} team reports`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve team reports',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getTeamMonthlyReportById(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      const report = await TeamReport.getTeamMonthlyReportById(parseInt(id, 10));

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Team report not found'
        });
      }

      if (role === 'team leader' && report.team_leader_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own team reports'
        });
      }

      res.json({
        success: true,
        data: report,
        message: 'Team report retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve team report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async deleteTeamMonthlyReport(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      const report = await TeamReport.getTeamMonthlyReportById(parseInt(id, 10));

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Team report not found'
        });
      }

      const allowedRoles = ['admin', 'operations manager', 'operations', 'agent manager'];
      if (role === 'team leader' && report.team_leader_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own team reports'
        });
      }
      if (!allowedRoles.includes(role) && role !== 'team leader') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete team reports'
        });
      }

      const deleted = await TeamReport.deleteTeamMonthlyReport(parseInt(id, 10));

      res.json({
        success: true,
        data: deleted,
        message: 'Team report deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Team report not found') {
        return res.status(404).json({
          success: false,
          message: 'Team report not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete team report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async exportTeamMonthlyReportToExcel(req, res) {
    try {
      const { id } = req.params;
      const role = normalizeRole(req.user.role);
      const report = await TeamReport.getTeamMonthlyReportById(parseInt(id, 10));

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Team report not found'
        });
      }

      if (role === 'team leader' && report.team_leader_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only export your own team reports'
        });
      }

      const buffer = await exportTeamReportToExcel(report);
      const filename = `Team_Report_${(report.team_leader_name || 'Team').replace(/\s+/g, '_')}_${formatRangeLabel(report)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to export team report to Excel',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = TeamReportsController;
