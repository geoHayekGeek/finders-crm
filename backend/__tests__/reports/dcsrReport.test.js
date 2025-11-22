// backend/__tests__/reports/dcsrReport.test.js
// Unit tests for DCSR (Daily Client/Sales Report) Report

const dcsrReportsController = require('../../controllers/dcsrReportsController');
const dcsrReportsModel = require('../../models/dcsrReportsModel');

// Mock dependencies
jest.mock('../../models/dcsrReportsModel');
jest.mock('../../config/db');

describe('DCSR Report', () => {
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

  describe('createDCSRReport', () => {
    it('should create a DCSR report successfully with valid data', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockReport = {
        id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        total_listings: 50,
        total_sales: 25,
        total_sales_amount: 5000000
      };

      dcsrReportsModel.createDCSRReport.mockResolvedValue(mockReport);

      await dcsrReportsController.createDCSRReport(req, res);

      expect(dcsrReportsModel.createDCSRReport).toHaveBeenCalledWith(
        req.body,
        1
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'DCSR report created successfully'
      });
    });

    it('should return 400 when start_date is missing', async () => {
      req.body = {
        end_date: '2024-01-31'
      };

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start date and end date are required'
      });
    });

    it('should return 400 when end_date is missing', async () => {
      req.body = {
        start_date: '2024-01-01'
      };

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start date and end date are required'
      });
    });

    it('should return 400 when date format is invalid', async () => {
      req.body = {
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    });

    it('should return 400 when end_date is before start_date', async () => {
      req.body = {
        start_date: '2024-01-31',
        end_date: '2024-01-01'
      };

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End date cannot be before start date'
      });
    });

    it('should return 409 when report already exists', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const error = new Error('A DCSR report already exists for this date range');
      error.code = '23505';
      dcsrReportsModel.createDCSRReport.mockRejectedValue(error);

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'A DCSR report already exists for this date range'
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const error = new Error('Database connection failed');
      dcsrReportsModel.createDCSRReport.mockRejectedValue(error);

      await dcsrReportsController.createDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create DCSR report',
        error: expect.any(String)
      });
    });
  });

  describe('getAllDCSRReports', () => {
    it('should get all DCSR reports without filters', async () => {
      const mockReports = [
        { id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: 2, start_date: '2024-02-01', end_date: '2024-02-28' }
      ];

      dcsrReportsModel.getAllDCSRReports.mockResolvedValue(mockReports);

      await dcsrReportsController.getAllDCSRReports(req, res);

      expect(dcsrReportsModel.getAllDCSRReports).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        message: 'DCSR reports retrieved successfully'
      });
    });

    it('should filter reports by start_date and end_date', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockReports = [
        { id: 1, start_date: '2024-01-01', end_date: '2024-01-31' }
      ];

      dcsrReportsModel.getAllDCSRReports.mockResolvedValue(mockReports);

      await dcsrReportsController.getAllDCSRReports(req, res);

      expect(dcsrReportsModel.getAllDCSRReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should support backwards compatibility with date_from and date_to', async () => {
      req.query = {
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };

      dcsrReportsModel.getAllDCSRReports.mockResolvedValue([]);

      await dcsrReportsController.getAllDCSRReports(req, res);

      expect(dcsrReportsModel.getAllDCSRReports).toHaveBeenCalledWith({
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      });
    });

    it('should filter reports by month and year', async () => {
      req.query = {
        month: '1',
        year: '2024'
      };

      dcsrReportsModel.getAllDCSRReports.mockResolvedValue([]);

      await dcsrReportsController.getAllDCSRReports(req, res);

      expect(dcsrReportsModel.getAllDCSRReports).toHaveBeenCalledWith({
        month: 1,
        year: 2024
      });
    });

    it('should handle errors when fetching reports', async () => {
      const error = new Error('Database error');
      dcsrReportsModel.getAllDCSRReports.mockRejectedValue(error);

      await dcsrReportsController.getAllDCSRReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch DCSR reports',
        error: expect.any(String)
      });
    });
  });

  describe('getDCSRReportById', () => {
    it('should get a DCSR report by ID successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        total_listings: 50
      };

      dcsrReportsModel.getDCSRReportById.mockResolvedValue(mockReport);

      await dcsrReportsController.getDCSRReportById(req, res);

      expect(dcsrReportsModel.getDCSRReportById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'DCSR report retrieved successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue(null);

      await dcsrReportsController.getDCSRReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DCSR report not found'
      });
    });

    it('should handle errors when fetching report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      dcsrReportsModel.getDCSRReportById.mockRejectedValue(error);

      await dcsrReportsController.getDCSRReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch DCSR report',
        error: expect.any(String)
      });
    });
  });

  describe('updateDCSRReport', () => {
    it('should update DCSR report successfully', async () => {
      req.params = { id: '1' };
      req.body = { total_listings: 60 };
      const mockUpdatedReport = {
        id: 1,
        total_listings: 60
      };

      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      dcsrReportsModel.updateDCSRReport.mockResolvedValue(mockUpdatedReport);

      await dcsrReportsController.updateDCSRReport(req, res);

      expect(dcsrReportsModel.updateDCSRReport).toHaveBeenCalledWith(1, req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedReport,
        message: 'DCSR report updated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      req.body = { total_listings: 60 };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue(null);

      await dcsrReportsController.updateDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DCSR report not found'
      });
    });

    it('should handle errors when updating report', async () => {
      req.params = { id: '1' };
      req.body = { total_listings: 60 };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      const error = new Error('Database error');
      dcsrReportsModel.updateDCSRReport.mockRejectedValue(error);

      await dcsrReportsController.updateDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update DCSR report',
        error: expect.any(String)
      });
    });
  });

  describe('recalculateDCSRReport', () => {
    it('should recalculate DCSR report successfully', async () => {
      req.params = { id: '1' };
      const mockRecalculatedReport = {
        id: 1,
        total_listings: 55,
        total_sales: 30
      };

      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      dcsrReportsModel.recalculateDCSRReport.mockResolvedValue(mockRecalculatedReport);

      await dcsrReportsController.recalculateDCSRReport(req, res);

      expect(dcsrReportsModel.recalculateDCSRReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecalculatedReport,
        message: 'DCSR report recalculated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue(null);

      await dcsrReportsController.recalculateDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DCSR report not found'
      });
    });

    it('should handle errors when recalculating report', async () => {
      req.params = { id: '1' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      const error = new Error('Database error');
      dcsrReportsModel.recalculateDCSRReport.mockRejectedValue(error);

      await dcsrReportsController.recalculateDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to recalculate DCSR report',
        error: expect.any(String)
      });
    });
  });

  describe('deleteDCSRReport', () => {
    it('should delete DCSR report successfully', async () => {
      req.params = { id: '1' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      dcsrReportsModel.deleteDCSRReport.mockResolvedValue(true);

      await dcsrReportsController.deleteDCSRReport(req, res);

      expect(dcsrReportsModel.deleteDCSRReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'DCSR report deleted successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue(null);

      await dcsrReportsController.deleteDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DCSR report not found'
      });
    });

    it('should return 404 when delete returns false', async () => {
      req.params = { id: '1' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      dcsrReportsModel.deleteDCSRReport.mockResolvedValue(false);

      await dcsrReportsController.deleteDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DCSR report not found'
      });
    });

    it('should handle errors when deleting report', async () => {
      req.params = { id: '1' };
      dcsrReportsModel.getDCSRReportById.mockResolvedValue({ id: 1 });
      const error = new Error('Database error');
      dcsrReportsModel.deleteDCSRReport.mockRejectedValue(error);

      await dcsrReportsController.deleteDCSRReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete DCSR report',
        error: expect.any(String)
      });
    });
  });
});

