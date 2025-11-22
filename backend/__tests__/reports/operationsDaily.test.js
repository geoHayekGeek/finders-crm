// backend/__tests__/reports/operationsDaily.test.js
// Unit tests for Operations Daily Report

const operationsDailyController = require('../../controllers/operationsDailyController');
const operationsDailyModel = require('../../models/operationsDailyReportModel');
const { exportOperationsDailyToExcel, exportOperationsDailyToPDF } = require('../../utils/operationsDailyExporter');

// Mock dependencies
jest.mock('../../models/operationsDailyReportModel');
jest.mock('../../utils/operationsDailyExporter');
jest.mock('../../config/db');

describe('Operations Daily Report', () => {
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

  describe('createReport', () => {
    it('should create an operations daily report successfully with valid data', async () => {
      req.body = {
        operations_id: 1,
        report_date: '2024-01-15',
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10,
        tasks_efficiency_uniform: 8,
        tasks_efficiency_after_duty: 7,
        leads_responded_out_of_duty_time: 2
      };

      const mockReport = {
        id: 1,
        operations_id: 1,
        report_date: '2024-01-15',
        properties_added: 10,
        leads_responded_to: 20,
        amending_previous_properties: 3,
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10,
        tasks_efficiency_uniform: 8,
        tasks_efficiency_after_duty: 7,
        leads_responded_out_of_duty_time: 2
      };

      operationsDailyModel.createReport.mockResolvedValue(mockReport);

      await operationsDailyController.createReport(req, res);

      expect(operationsDailyModel.createReport).toHaveBeenCalledWith(
        1,
        '2024-01-15',
        expect.objectContaining({
          preparing_contract: 5,
          tasks_efficiency_duty_time: 10,
          tasks_efficiency_uniform: 8,
          tasks_efficiency_after_duty: 7,
          leads_responded_out_of_duty_time: 2
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Operations daily report created successfully'
      });
    });

    it('should return 400 when operations_id is missing', async () => {
      req.body = {
        report_date: '2024-01-15'
      };

      await operationsDailyController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations ID and report date are required'
      });
    });

    it('should return 400 when report_date is missing', async () => {
      req.body = {
        operations_id: 1
      };

      await operationsDailyController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations ID and report date are required'
      });
    });

    it('should return 400 when date format is invalid', async () => {
      req.body = {
        operations_id: 1,
        report_date: 'invalid-date'
      };

      await operationsDailyController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    });

    it('should return 409 when report already exists for the same operations_id and date', async () => {
      req.body = {
        operations_id: 1,
        report_date: '2024-01-15'
      };

      const error = new Error('Report already exists for this operations user and date');
      error.code = '23505';
      operationsDailyModel.createReport.mockRejectedValue(error);

      await operationsDailyController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report for this operations user and date already exists',
        error: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        operations_id: 1,
        report_date: '2024-01-15'
      };

      const error = new Error('Database connection failed');
      operationsDailyModel.createReport.mockRejectedValue(error);

      await operationsDailyController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: error.message || 'Failed to create operations daily report',
        error: expect.any(String)
      });
    });

    it('should accept optional manual input fields', async () => {
      req.body = {
        operations_id: 1,
        report_date: '2024-01-15',
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10,
        tasks_efficiency_uniform: 8,
        tasks_efficiency_after_duty: 7,
        leads_responded_out_of_duty_time: 2
      };

      const mockReport = {
        id: 1,
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10
      };

      operationsDailyModel.createReport.mockResolvedValue(mockReport);

      await operationsDailyController.createReport(req, res);

      expect(operationsDailyModel.createReport).toHaveBeenCalledWith(
        1,
        '2024-01-15',
        expect.objectContaining({
          preparing_contract: 5,
          tasks_efficiency_duty_time: 10
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAllReports', () => {
    it('should get all operations daily reports without filters', async () => {
      const mockReports = [
        { id: 1, operations_id: 1, report_date: '2024-01-15' },
        { id: 2, operations_id: 2, report_date: '2024-01-16' }
      ];

      operationsDailyModel.getAllReports.mockResolvedValue(mockReports);

      await operationsDailyController.getAllReports(req, res);

      expect(operationsDailyModel.getAllReports).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        message: 'Operations daily reports retrieved successfully'
      });
    });

    it('should filter reports by operations_id', async () => {
      req.query = { operations_id: '1' };
      const mockReports = [
        { id: 1, operations_id: 1, report_date: '2024-01-15' }
      ];

      operationsDailyModel.getAllReports.mockResolvedValue(mockReports);

      await operationsDailyController.getAllReports(req, res);

      expect(operationsDailyModel.getAllReports).toHaveBeenCalledWith({
        operations_id: '1'
      });
    });

    it('should filter reports by date range', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      operationsDailyModel.getAllReports.mockResolvedValue([]);

      await operationsDailyController.getAllReports(req, res);

      expect(operationsDailyModel.getAllReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should handle errors when fetching reports', async () => {
      const error = new Error('Database error');
      operationsDailyModel.getAllReports.mockRejectedValue(error);

      await operationsDailyController.getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve operations daily reports',
        error: expect.any(String)
      });
    });
  });

  describe('getReportById', () => {
    it('should get an operations daily report by ID successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        operations_id: 1,
        report_date: '2024-01-15',
        properties_added: 10
      };

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);

      await operationsDailyController.getReportById(req, res);

      expect(operationsDailyModel.getReportById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Operations daily report retrieved successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      operationsDailyModel.getReportById.mockResolvedValue(null);

      await operationsDailyController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations daily report not found'
      });
    });

    it('should handle errors when fetching report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsDailyModel.getReportById.mockRejectedValue(error);

      await operationsDailyController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve operations daily report',
        error: expect.any(String)
      });
    });
  });

  describe('updateReport', () => {
    it('should update operations daily report successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        preparing_contract: 6,
        tasks_efficiency_duty_time: 12,
        recalculate: false
      };

      const mockUpdatedReport = {
        id: 1,
        preparing_contract: 6,
        tasks_efficiency_duty_time: 12
      };

      operationsDailyModel.updateReport.mockResolvedValue(mockUpdatedReport);

      await operationsDailyController.updateReport(req, res);

      expect(operationsDailyModel.updateReport).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          preparing_contract: 6,
          tasks_efficiency_duty_time: 12
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedReport,
        message: 'Operations daily report updated successfully'
      });
    });

    it('should recalculate report when recalculate flag is true', async () => {
      req.params = { id: '1' };
      req.body = { recalculate: true };

      const mockRecalculatedReport = {
        id: 1,
        properties_added: 15,
        leads_responded_to: 25
      };

      operationsDailyModel.updateReport.mockResolvedValue(mockRecalculatedReport);

      await operationsDailyController.updateReport(req, res);

      expect(operationsDailyModel.updateReport).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          recalculate: true
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecalculatedReport,
        message: 'Operations daily report updated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      req.body = { preparing_contract: 6 };
      const error = new Error('Report not found');
      operationsDailyModel.updateReport.mockRejectedValue(error);

      await operationsDailyController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found',
        error: expect.any(String)
      });
    });

    it('should handle errors when updating report', async () => {
      req.params = { id: '1' };
      req.body = { preparing_contract: 6 };
      const error = new Error('Database error');
      operationsDailyModel.updateReport.mockRejectedValue(error);

      await operationsDailyController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: error.message || 'Failed to update operations daily report',
        error: expect.any(String)
      });
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate operations daily report successfully', async () => {
      req.params = { id: '1' };
      const mockRecalculatedReport = {
        id: 1,
        properties_added: 15,
        leads_responded_to: 25,
        amending_previous_properties: 5
      };

      operationsDailyModel.recalculateReport.mockResolvedValue(mockRecalculatedReport);

      await operationsDailyController.recalculateReport(req, res);

      expect(operationsDailyModel.recalculateReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecalculatedReport,
        message: 'Operations daily report recalculated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      operationsDailyModel.recalculateReport.mockRejectedValue(error);

      await operationsDailyController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations daily report not found'
      });
    });

    it('should handle errors when recalculating report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsDailyModel.recalculateReport.mockRejectedValue(error);

      await operationsDailyController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to recalculate operations daily report',
        error: expect.any(String)
      });
    });
  });

  describe('deleteReport', () => {
    it('should delete operations daily report successfully', async () => {
      req.params = { id: '1' };
      const mockDeletedReport = { id: 1 };

      operationsDailyModel.deleteReport.mockResolvedValue(mockDeletedReport);

      await operationsDailyController.deleteReport(req, res);

      expect(operationsDailyModel.deleteReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeletedReport,
        message: 'Operations daily report deleted successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      operationsDailyModel.deleteReport.mockRejectedValue(error);

      await operationsDailyController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations daily report not found'
      });
    });

    it('should handle errors when deleting report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsDailyModel.deleteReport.mockRejectedValue(error);

      await operationsDailyController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete operations daily report',
        error: expect.any(String)
      });
    });
  });

  describe('exportReportToExcel', () => {
    it('should export operations daily report to Excel successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        operations_id: 1,
        operations_name: 'John Doe',
        report_date: '2024-01-15',
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10
      };
      const mockBuffer = Buffer.from('mock excel data');

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);
      exportOperationsDailyToExcel.mockResolvedValue(mockBuffer);

      await operationsDailyController.exportReportToExcel(req, res);

      expect(operationsDailyModel.getReportById).toHaveBeenCalledWith(1);
      expect(exportOperationsDailyToExcel).toHaveBeenCalledWith(mockReport);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Operations_Daily_'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.xlsx'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should include operations_name in filename', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        operations_id: 1,
        operations_name: 'John Doe',
        report_date: '2024-01-15'
      };
      const mockBuffer = Buffer.from('mock excel data');

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);
      exportOperationsDailyToExcel.mockResolvedValue(mockBuffer);

      await operationsDailyController.exportReportToExcel(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('John_Doe'));
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      operationsDailyModel.getReportById.mockResolvedValue(null);

      await operationsDailyController.exportReportToExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations daily report not found'
      });
      expect(exportOperationsDailyToExcel).not.toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      req.params = { id: '1' };
      const mockReport = { id: 1, operations_name: 'John Doe', report_date: '2024-01-15' };
      const error = new Error('Export failed');

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);
      exportOperationsDailyToExcel.mockRejectedValue(error);

      await operationsDailyController.exportReportToExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export operations daily report to Excel',
        error: expect.any(String)
      });
    });
  });

  describe('exportReportToPDF', () => {
    it('should export operations daily report to PDF successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        operations_id: 1,
        operations_name: 'John Doe',
        report_date: '2024-01-15',
        preparing_contract: 5,
        tasks_efficiency_duty_time: 10
      };
      const mockBuffer = Buffer.from('mock pdf data');

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);
      exportOperationsDailyToPDF.mockResolvedValue(mockBuffer);

      await operationsDailyController.exportReportToPDF(req, res);

      expect(operationsDailyModel.getReportById).toHaveBeenCalledWith(1);
      expect(exportOperationsDailyToPDF).toHaveBeenCalledWith(mockReport);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Operations_Daily_'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.pdf'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      operationsDailyModel.getReportById.mockResolvedValue(null);

      await operationsDailyController.exportReportToPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations daily report not found'
      });
      expect(exportOperationsDailyToPDF).not.toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      req.params = { id: '1' };
      const mockReport = { id: 1, operations_name: 'John Doe', report_date: '2024-01-15' };
      const error = new Error('Export failed');

      operationsDailyModel.getReportById.mockResolvedValue(mockReport);
      exportOperationsDailyToPDF.mockRejectedValue(error);

      await operationsDailyController.exportReportToPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export operations daily report to PDF',
        error: expect.any(String)
      });
    });
  });
});

