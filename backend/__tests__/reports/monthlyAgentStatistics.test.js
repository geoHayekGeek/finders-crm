// backend/__tests__/reports/monthlyAgentStatistics.test.js
// Unit tests for Monthly Agent Statistics Report

const ReportsController = require('../../controllers/reportsController');
const Report = require('../../models/reportsModel');
const { exportToExcel, exportToPDF } = require('../../utils/reportExporter');

// Mock dependencies
jest.mock('../../models/reportsModel');
jest.mock('../../models/userModel');
jest.mock('../../utils/reportExporter');
jest.mock('../../config/db');

describe('Monthly Agent Statistics Report', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('createMonthlyReport', () => {
    it('should create a report successfully with valid data', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        boosts: 0
      };

      const mockReport = {
        id: 1,
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        boosts: 0,
        listings_count: 10,
        sales_count: 5,
        sales_amount: 500000
      };

      Report.createMonthlyReport.mockResolvedValue(mockReport);

      await ReportsController.createMonthlyReport(req, res);

      expect(Report.createMonthlyReport).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          boosts: 0
        }),
        1
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Monthly report created successfully'
      });
    });

    it('should return 400 when agent_id is missing', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Agent ID, start date, and end date are required'
      });
    });

    it('should return 400 when start_date is missing', async () => {
      req.body = {
        agent_id: 1,
        end_date: '2024-01-31'
      };

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Agent ID, start date, and end date are required'
      });
    });

    it('should return 400 when end_date is missing', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-01'
      };

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Agent ID, start date, and end date are required'
      });
    });

    it('should return 400 when date format is invalid', async () => {
      req.body = {
        agent_id: 1,
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    });

    it('should return 400 when end_date is before start_date', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-31',
        end_date: '2024-01-01'
      };

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End date cannot be before start date'
      });
    });

    it('should return 409 when report already exists', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const error = new Error('Report already exists for this agent and date range');
      Report.createMonthlyReport.mockRejectedValue(error);

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'A report already exists for this agent and date range'
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const error = new Error('Database connection failed');
      Report.createMonthlyReport.mockRejectedValue(error);

      await ReportsController.createMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create monthly report',
        error: expect.any(String)
      });
    });

    it('should accept optional boosts parameter', async () => {
      req.body = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        boosts: 100
      };

      const mockReport = {
        id: 1,
        agent_id: 1,
        boosts: 100
      };

      Report.createMonthlyReport.mockResolvedValue(mockReport);

      await ReportsController.createMonthlyReport(req, res);

      expect(Report.createMonthlyReport).toHaveBeenCalledWith(
        expect.objectContaining({ boosts: 100 }),
        1
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAllReports', () => {
    it('should get all reports without filters', async () => {
      const mockReports = [
        { id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: 2, agent_id: 2, start_date: '2024-02-01', end_date: '2024-02-28' }
      ];

      Report.getAllReports.mockResolvedValue(mockReports);

      await ReportsController.getAllReports(req, res);

      expect(Report.getAllReports).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        count: 2,
        message: 'Retrieved 2 reports'
      });
    });

    it('should filter reports by agent_id', async () => {
      req.query = { agent_id: '1' };
      const mockReports = [
        { id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' }
      ];

      Report.getAllReports.mockResolvedValue(mockReports);

      await ReportsController.getAllReports(req, res);

      expect(Report.getAllReports).toHaveBeenCalledWith({
        agent_id: 1
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        count: 1,
        message: 'Retrieved 1 reports'
      });
    });

    it('should filter reports by date range using start_date and end_date', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockReports = [];
      Report.getAllReports.mockResolvedValue(mockReports);

      await ReportsController.getAllReports(req, res);

      expect(Report.getAllReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should support backwards compatibility with date_from and date_to', async () => {
      req.query = {
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };

      Report.getAllReports.mockResolvedValue([]);

      await ReportsController.getAllReports(req, res);

      expect(Report.getAllReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should handle errors when fetching reports', async () => {
      const error = new Error('Database error');
      Report.getAllReports.mockRejectedValue(error);

      await ReportsController.getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve monthly reports',
        error: expect.any(String)
      });
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      Report.getReportById.mockResolvedValue(mockReport);

      await ReportsController.getReportById(req, res);

      expect(Report.getReportById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Report retrieved successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      Report.getReportById.mockResolvedValue(null);

      await ReportsController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
    });

    it('should handle errors when fetching report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      Report.getReportById.mockRejectedValue(error);

      await ReportsController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve report',
        error: expect.any(String)
      });
    });
  });

  describe('updateReport', () => {
    it('should update report successfully with boosts', async () => {
      req.params = { id: '1' };
      req.body = { boosts: 150 };
      const mockReport = { id: 1, agent_id: 1 };
      const mockUpdatedReport = {
        id: 1,
        agent_id: 1,
        boosts: 150
      };

      Report.getReportById.mockResolvedValue(mockReport);
      Report.updateReport.mockResolvedValue(mockUpdatedReport);

      await ReportsController.updateReport(req, res);

      expect(Report.updateReport).toHaveBeenCalledWith(1, { boosts: 150 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedReport,
        message: 'Report updated successfully'
      });
    });

    it('should update report with all commission fields', async () => {
      req.params = { id: '1' };
      req.body = {
        listings_count: 20,
        viewings_count: 15,
        boosts: 200,
        sales_count: 10,
        sales_amount: 1000000,
        agent_commission: 20000,
        finders_commission: 10000,
        // referral_commission removed - use referrals_on_properties_commission instead
        team_leader_commission: 10000,
        administration_commission: 40000,
        total_commission: 80000, // Updated: removed referral_commission (5000)
        referral_received_count: 5,
        referral_received_commission: 2500,
        referrals_on_properties_count: 3,
        referrals_on_properties_commission: 1500
      };
      const mockReport = { id: 1, agent_id: 1 };
      const mockUpdatedReport = {
        id: 1,
        agent_id: 1,
        ...req.body
      };

      Report.getReportById.mockResolvedValue(mockReport);
      Report.updateReport.mockResolvedValue(mockUpdatedReport);

      await ReportsController.updateReport(req, res);

      expect(Report.updateReport).toHaveBeenCalledWith(1, req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedReport,
        message: 'Report updated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      req.body = { boosts: 150 };

      Report.getReportById.mockResolvedValue(null);

      await ReportsController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
      expect(Report.updateReport).not.toHaveBeenCalled();
    });

    it('should handle errors when updating report', async () => {
      req.params = { id: '1' };
      req.body = { boosts: 150 };
      const mockReport = { id: 1, agent_id: 1 };
      const error = new Error('Database error');
      
      Report.getReportById.mockResolvedValue(mockReport);
      Report.updateReport.mockRejectedValue(error);

      await ReportsController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update report',
        error: expect.any(String)
      });
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate report successfully', async () => {
      req.params = { id: '1' };
      const mockRecalculatedReport = {
        id: 1,
        agent_id: 1,
        listings_count: 15,
        sales_count: 8
      };

      Report.recalculateReport.mockResolvedValue(mockRecalculatedReport);

      await ReportsController.recalculateReport(req, res);

      expect(Report.recalculateReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecalculatedReport,
        message: 'Report recalculated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      Report.recalculateReport.mockRejectedValue(error);

      await ReportsController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
    });

    it('should handle errors when recalculating report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      Report.recalculateReport.mockRejectedValue(error);

      await ReportsController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to recalculate report',
        error: expect.any(String)
      });
    });
  });

  describe('deleteReport', () => {
    it('should delete report successfully', async () => {
      req.params = { id: '1' };
      const mockDeletedReport = { id: 1 };

      Report.deleteReport.mockResolvedValue(mockDeletedReport);

      await ReportsController.deleteReport(req, res);

      expect(Report.deleteReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeletedReport,
        message: 'Report deleted successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      Report.deleteReport.mockRejectedValue(error);

      await ReportsController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
    });

    it('should handle errors when deleting report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      Report.deleteReport.mockRejectedValue(error);

      await ReportsController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete report',
        error: expect.any(String)
      });
    });
  });

  describe('getLeadSources', () => {
    it('should get all lead sources successfully', async () => {
      const mockSources = ['Website', 'Referral', 'Social Media', 'Walk-in'];
      Report.getAvailableLeadSources.mockResolvedValue(mockSources);

      await ReportsController.getLeadSources(req, res);

      expect(Report.getAvailableLeadSources).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSources,
        message: 'Lead sources retrieved successfully'
      });
    });

    it('should handle errors when fetching lead sources', async () => {
      const error = new Error('Database error');
      Report.getAvailableLeadSources.mockRejectedValue(error);

      await ReportsController.getLeadSources(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve lead sources',
        error: expect.any(String)
      });
    });
  });

  describe('exportReportToExcel', () => {
    it('should export report to Excel successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_id: 1,
        agent_name: 'John Doe',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        lead_sources: { Website: 10, Referral: 5 }
      };
      const mockBuffer = Buffer.from('mock excel data');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToExcel.mockResolvedValue(mockBuffer);

      await ReportsController.exportReportToExcel(req, res);

      expect(Report.getReportById).toHaveBeenCalledWith(1);
      expect(exportToExcel).toHaveBeenCalledWith(mockReport);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Report_'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.xlsx'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should parse lead_sources if it is a string', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_name: 'John Doe',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        lead_sources: '{"Website": 10, "Referral": 5}'
      };
      const mockBuffer = Buffer.from('mock excel data');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToExcel.mockResolvedValue(mockBuffer);

      await ReportsController.exportReportToExcel(req, res);

      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_sources: { Website: 10, Referral: 5 }
        })
      );
    });

    it('should handle invalid lead_sources JSON gracefully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_name: 'John Doe',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        lead_sources: 'invalid json'
      };
      const mockBuffer = Buffer.from('mock excel data');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToExcel.mockResolvedValue(mockBuffer);

      await ReportsController.exportReportToExcel(req, res);

      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_sources: {}
        })
      );
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      Report.getReportById.mockResolvedValue(null);

      await ReportsController.exportReportToExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
      expect(exportToExcel).not.toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      req.params = { id: '1' };
      const mockReport = { id: 1, agent_name: 'John Doe', start_date: '2024-01-01', end_date: '2024-01-31' };
      const error = new Error('Export failed');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToExcel.mockRejectedValue(error);

      await ReportsController.exportReportToExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export report to Excel',
        error: expect.any(String)
      });
    });
  });

  describe('exportReportToPDF', () => {
    it('should export report to PDF successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_id: 1,
        agent_name: 'John Doe',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        lead_sources: { Website: 10, Referral: 5 }
      };
      const mockBuffer = Buffer.from('mock pdf data');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToPDF.mockResolvedValue(mockBuffer);

      await ReportsController.exportReportToPDF(req, res);

      expect(Report.getReportById).toHaveBeenCalledWith(1);
      expect(exportToPDF).toHaveBeenCalledWith(mockReport);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Report_'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.pdf'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should parse lead_sources if it is a string', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        agent_name: 'John Doe',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        lead_sources: '{"Website": 10, "Referral": 5}'
      };
      const mockBuffer = Buffer.from('mock pdf data');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToPDF.mockResolvedValue(mockBuffer);

      await ReportsController.exportReportToPDF(req, res);

      expect(exportToPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_sources: { Website: 10, Referral: 5 }
        })
      );
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      Report.getReportById.mockResolvedValue(null);

      await ReportsController.exportReportToPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found'
      });
      expect(exportToPDF).not.toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      req.params = { id: '1' };
      const mockReport = { id: 1, agent_name: 'John Doe', start_date: '2024-01-01', end_date: '2024-01-31' };
      const error = new Error('Export failed');

      Report.getReportById.mockResolvedValue(mockReport);
      exportToPDF.mockRejectedValue(error);

      await ReportsController.exportReportToPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export report to PDF',
        error: expect.any(String)
      });
    });
  });

  describe('Report Permissions', () => {
    const User = require('../../models/userModel');
    const pool = require('../../config/db');
    
    jest.mock('../../models/userModel');
    jest.mock('../../config/db');

    describe('getAllReports - Role-based filtering', () => {
      it('should return all reports for admin', async () => {
        req.user = { id: 1, role: 'admin' };
        req.query = {};
        const mockReports = [
          { id: 1, agent_id: 1, agent_name: 'Agent 1' },
          { id: 2, agent_id: 2, agent_name: 'Agent 2' }
        ];

        Report.getAllReports.mockResolvedValue(mockReports);

        await ReportsController.getAllReports(req, res);

        expect(Report.getAllReports).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockReports,
          count: 2,
          message: 'Retrieved 2 reports'
        });
      });

      it('should return only agent\'s own reports for agent role', async () => {
        req.user = { id: 1, role: 'agent' };
        req.query = {};
        const mockReports = [{ id: 1, agent_id: 1, agent_name: 'Agent 1' }];

        Report.getAllReports.mockResolvedValue(mockReports);

        await ReportsController.getAllReports(req, res);

        expect(Report.getAllReports).toHaveBeenCalledWith({ agent_id: 1 });
        expect(res.json).toHaveBeenCalled();
      });

      it('should return reports for team leader\'s agents', async () => {
        req.user = { id: 10, role: 'team_leader' };
        req.query = {};
        const mockTeamAgents = [
          { id: 20, name: 'Agent 20' },
          { id: 21, name: 'Agent 21' }
        ];
        const mockReports = [
          { id: 1, agent_id: 20, agent_name: 'Agent 20', boosts: 100, lead_sources: {} },
          { id: 2, agent_id: 21, agent_name: 'Agent 21', boosts: 200, lead_sources: {} }
        ];

        User.getTeamLeaderAgents = jest.fn().mockResolvedValue(mockTeamAgents);
        Report.getAllReports.mockResolvedValue(mockReports);

        await ReportsController.getAllReports(req, res);

        expect(User.getTeamLeaderAgents).toHaveBeenCalledWith(10);
        expect(Report.getAllReports).toHaveBeenCalledWith({
          agent_ids: [20, 21]
        });
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              agent_id: 20,
              boosts: 100,
              lead_sources: {}
            })
          ]),
          count: 2,
          message: 'Retrieved 2 reports'
        });
      });

      it('should return empty array for team leader with no agents', async () => {
        req.user = { id: 10, role: 'team_leader' };
        req.query = {};

        User.getTeamLeaderAgents = jest.fn().mockResolvedValue([]);

        await ReportsController.getAllReports(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: [],
          count: 0,
          message: 'No reports found'
        });
      });

      it('should return only agent reports for agent manager', async () => {
        req.user = { id: 1, role: 'agent_manager' };
        req.query = {};
        const mockReports = [
          { id: 1, agent_id: 1, agent_name: 'Agent 1', agent_role: 'agent' }
        ];

        Report.getAllReports.mockResolvedValue(mockReports);

        await ReportsController.getAllReports(req, res);

        expect(Report.getAllReports).toHaveBeenCalledWith({ agent_role_only: true });
        expect(res.json).toHaveBeenCalled();
      });
    });

    describe('getReportById - Role-based access', () => {
      it('should allow agent to view their own report', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params.id = '1';
        const mockReport = { id: 1, agent_id: 1, agent_name: 'Agent 1' };

        Report.getReportById.mockResolvedValue(mockReport);

        await ReportsController.getReportById(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockReport,
          message: 'Report retrieved successfully'
        });
      });

      it('should prevent agent from viewing other agent\'s report', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params.id = '1';
        const mockReport = { id: 1, agent_id: 2, agent_name: 'Agent 2' };

        Report.getReportById.mockResolvedValue(mockReport);

        await ReportsController.getReportById(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You can only view your own reports'
        });
      });

      it('should allow team leader to view their team agent\'s report', async () => {
        req.user = { id: 10, role: 'team_leader' };
        req.params.id = '1';
        const mockReport = {
          id: 1,
          agent_id: 20,
          agent_name: 'Agent 20',
          boosts: 100,
          lead_sources: {}
        };

        Report.getReportById.mockResolvedValue(mockReport);
        pool.query.mockResolvedValue({ rows: [{ 1: 1 }] });

        await ReportsController.getReportById(req, res);

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('team_agents'),
          [10, 20]
        );
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            id: 1,
            agent_id: 20,
            boosts: 100,
            lead_sources: {}
          }),
          message: 'Report retrieved successfully'
        });
      });

      it('should prevent team leader from viewing report outside their team', async () => {
        req.user = { id: 10, role: 'team_leader' };
        req.params.id = '1';
        const mockReport = { id: 1, agent_id: 99, agent_name: 'Agent 99' };

        Report.getReportById.mockResolvedValue(mockReport);
        pool.query.mockResolvedValue({ rows: [] });

        await ReportsController.getReportById(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You can only view reports for agents under you'
        });
      });

      it('should allow agent manager to view agent reports', async () => {
        req.user = { id: 1, role: 'agent_manager' };
        req.params.id = '1';
        const mockReport = { id: 1, agent_id: 1, agent_name: 'Agent 1', agent_role: 'agent' };

        Report.getReportById.mockResolvedValue(mockReport);

        await ReportsController.getReportById(req, res);

        expect(res.json).toHaveBeenCalled();
      });

      it('should prevent agent manager from viewing non-agent reports', async () => {
        req.user = { id: 1, role: 'agent_manager' };
        req.params.id = '1';
        const mockReport = { id: 1, agent_id: 1, agent_name: 'User 1', agent_role: 'operations' };

        Report.getReportById.mockResolvedValue(mockReport);

        await ReportsController.getReportById(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You can only view reports for agents'
        });
      });
    });

    describe('createMonthlyReport - Permissions', () => {
      it('should allow admin to create reports', async () => {
        req.user = { id: 1, role: 'admin' };
        req.body = { agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };
        const mockReport = { id: 1, agent_id: 1 };

        Report.createMonthlyReport.mockResolvedValue(mockReport);

        await ReportsController.createMonthlyReport(req, res);

        expect(Report.createMonthlyReport).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
      });

      it('should allow operations manager to create reports', async () => {
        req.user = { id: 1, role: 'operations_manager' };
        req.body = { agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };
        const mockReport = { id: 1, agent_id: 1 };

        Report.createMonthlyReport.mockResolvedValue(mockReport);

        await ReportsController.createMonthlyReport(req, res);

        expect(Report.createMonthlyReport).toHaveBeenCalled();
      });

      it('should allow operations to create reports', async () => {
        req.user = { id: 1, role: 'operations' };
        req.body = { agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };
        const mockReport = { id: 1, agent_id: 1 };

        Report.createMonthlyReport.mockResolvedValue(mockReport);

        await ReportsController.createMonthlyReport(req, res);

        expect(Report.createMonthlyReport).toHaveBeenCalled();
      });

      it('should prevent team leader from creating reports', async () => {
        req.user = { id: 1, role: 'team_leader' };
        req.body = { agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };

        await ReportsController.createMonthlyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to create reports'
        });
        expect(Report.createMonthlyReport).not.toHaveBeenCalled();
      });

      it('should prevent agent from creating reports', async () => {
        req.user = { id: 1, role: 'agent' };
        req.body = { agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };

        await ReportsController.createMonthlyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(Report.createMonthlyReport).not.toHaveBeenCalled();
      });
    });

    describe('updateReport - Permissions', () => {
      it('should allow admin to update reports', async () => {
        req.user = { id: 1, role: 'admin' };
        req.params.id = '1';
        req.body = { boosts: 150 };
        const mockReport = { id: 1, agent_id: 1 };

        Report.getReportById.mockResolvedValue(mockReport);
        Report.updateReport.mockResolvedValue({ ...mockReport, boosts: 150 });

        await ReportsController.updateReport(req, res);

        expect(Report.updateReport).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
      });

      it('should allow operations manager to update reports', async () => {
        req.user = { id: 1, role: 'operations_manager' };
        req.params.id = '1';
        req.body = { boosts: 150 };
        const mockReport = { id: 1, agent_id: 1 };

        Report.getReportById.mockResolvedValue(mockReport);
        Report.updateReport.mockResolvedValue({ ...mockReport, boosts: 150 });

        await ReportsController.updateReport(req, res);

        expect(Report.updateReport).toHaveBeenCalled();
      });

      it('should allow operations to update reports', async () => {
        req.user = { id: 1, role: 'operations' };
        req.params.id = '1';
        req.body = { boosts: 150 };
        const mockReport = { id: 1, agent_id: 1 };

        Report.getReportById.mockResolvedValue(mockReport);
        Report.updateReport.mockResolvedValue({ ...mockReport, boosts: 150 });

        await ReportsController.updateReport(req, res);

        expect(Report.updateReport).toHaveBeenCalled();
      });

      it('should prevent team leader from updating reports', async () => {
        req.user = { id: 1, role: 'team_leader' };
        req.params.id = '1';
        req.body = { boosts: 150 };

        await ReportsController.updateReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to update reports'
        });
        expect(Report.updateReport).not.toHaveBeenCalled();
      });

      it('should prevent agent from updating reports', async () => {
        req.user = { id: 1, role: 'agent' };
        req.params.id = '1';
        req.body = { boosts: 150 };

        await ReportsController.updateReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(Report.updateReport).not.toHaveBeenCalled();
      });
    });

    describe('deleteReport - Permissions', () => {
      it('should allow admin to delete reports', async () => {
        req.user = { id: 1, role: 'admin' };
        req.params.id = '1';
        const mockReport = { id: 1 };

        Report.deleteReport.mockResolvedValue(mockReport);

        await ReportsController.deleteReport(req, res);

        expect(Report.deleteReport).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
      });

      it('should allow operations manager to delete reports', async () => {
        req.user = { id: 1, role: 'operations_manager' };
        req.params.id = '1';
        const mockReport = { id: 1 };

        Report.deleteReport.mockResolvedValue(mockReport);

        await ReportsController.deleteReport(req, res);

        expect(Report.deleteReport).toHaveBeenCalled();
      });

      it('should prevent operations from deleting reports', async () => {
        req.user = { id: 1, role: 'operations' };
        req.params.id = '1';

        await ReportsController.deleteReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to delete reports'
        });
        expect(Report.deleteReport).not.toHaveBeenCalled();
      });
    });
  });
});

