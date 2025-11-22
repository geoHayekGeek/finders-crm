// backend/__tests__/reports/operationsCommission.test.js
// Unit tests for Operations Commission Report

const operationsCommissionController = require('../../controllers/operationsCommissionController');
const operationsCommissionModel = require('../../models/operationsCommissionModel');

// Mock dependencies
jest.mock('../../models/operationsCommissionModel');
jest.mock('../../config/db');

describe('Operations Commission Report', () => {
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
    it('should create an operations commission report successfully with valid data', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockReport = {
        id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        commission_percentage: 2.5,
        total_properties_count: 100,
        total_sales_count: 50,
        total_rent_count: 50,
        total_sales_value: 5000000,
        total_rent_value: 100000,
        total_commission_amount: 127500
      };

      operationsCommissionModel.getAllReports.mockResolvedValue([]);
      operationsCommissionModel.createReport.mockResolvedValue(mockReport);

      await operationsCommissionController.createReport(req, res);

      expect(operationsCommissionModel.createReport).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Operations commission report created successfully'
      });
    });

    it('should return 400 when start_date is missing', async () => {
      req.body = {
        end_date: '2024-01-31'
      };

      await operationsCommissionController.createReport(req, res);

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

      await operationsCommissionController.createReport(req, res);

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

      await operationsCommissionController.createReport(req, res);

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

      await operationsCommissionController.createReport(req, res);

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

      const existingReport = [{ id: 1 }];
      operationsCommissionModel.getAllReports.mockResolvedValue(existingReport);

      await operationsCommissionController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report for this date range already exists'
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      operationsCommissionModel.getAllReports.mockResolvedValue([]);
      const error = new Error('Database connection failed');
      error.code = '23505';
      operationsCommissionModel.createReport.mockRejectedValue(error);

      await operationsCommissionController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report for this date range already exists',
        error: expect.any(String)
      });
    });
  });

  describe('getAllReports', () => {
    it('should get all operations commission reports without filters', async () => {
      const mockReports = [
        { id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: 2, start_date: '2024-02-01', end_date: '2024-02-28' }
      ];

      operationsCommissionModel.getAllReports.mockResolvedValue(mockReports);

      await operationsCommissionController.getAllReports(req, res);

      expect(operationsCommissionModel.getAllReports).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        message: 'Operations commission reports retrieved successfully'
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

      operationsCommissionModel.getAllReports.mockResolvedValue(mockReports);

      await operationsCommissionController.getAllReports(req, res);

      expect(operationsCommissionModel.getAllReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should support backwards compatibility with date_from and date_to', async () => {
      req.query = {
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };

      operationsCommissionModel.getAllReports.mockResolvedValue([]);

      await operationsCommissionController.getAllReports(req, res);

      expect(operationsCommissionModel.getAllReports).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      });
    });

    it('should filter reports by month and year', async () => {
      req.query = {
        month: '1',
        year: '2024'
      };

      operationsCommissionModel.getAllReports.mockResolvedValue([]);

      await operationsCommissionController.getAllReports(req, res);

      expect(operationsCommissionModel.getAllReports).toHaveBeenCalledWith({
        month: 1,
        year: 2024
      });
    });

    it('should handle errors when fetching reports', async () => {
      const error = new Error('Database error');
      operationsCommissionModel.getAllReports.mockRejectedValue(error);

      await operationsCommissionController.getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve operations commission reports',
        error: expect.any(String)
      });
    });
  });

  describe('getReportById', () => {
    it('should get an operations commission report by ID successfully', async () => {
      req.params = { id: '1' };
      const mockReport = {
        id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        commission_percentage: 2.5
      };

      operationsCommissionModel.getReportById.mockResolvedValue(mockReport);

      await operationsCommissionController.getReportById(req, res);

      expect(operationsCommissionModel.getReportById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Operations commission report retrieved successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      operationsCommissionModel.getReportById.mockResolvedValue(null);

      await operationsCommissionController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations commission report not found'
      });
    });

    it('should handle errors when fetching report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsCommissionModel.getReportById.mockRejectedValue(error);

      await operationsCommissionController.getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve operations commission report',
        error: expect.any(String)
      });
    });
  });

  describe('updateReport', () => {
    it('should update operations commission report successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        commission_percentage: 3.0,
        total_properties_count: 120,
        total_sales_count: 60,
        total_rent_count: 60,
        total_sales_value: 6000000,
        total_rent_value: 120000,
        total_commission_amount: 183600
      };

      const mockUpdatedReport = {
        id: 1,
        commission_percentage: 3.0,
        total_properties_count: 120
      };

      operationsCommissionModel.updateReport.mockResolvedValue(mockUpdatedReport);

      await operationsCommissionController.updateReport(req, res);

      expect(operationsCommissionModel.updateReport).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          commission_percentage: 3.0,
          total_properties_count: 120
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedReport,
        message: 'Operations commission report updated successfully'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      req.params = { id: '1' };
      req.body = {
        commission_percentage: 3.0
        // Missing other required fields
      };

      await operationsCommissionController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      req.body = {
        commission_percentage: 3.0,
        total_properties_count: 120,
        total_sales_count: 60,
        total_rent_count: 60,
        total_sales_value: 6000000,
        total_rent_value: 120000,
        total_commission_amount: 183600
      };

      const error = new Error('Report not found');
      operationsCommissionModel.updateReport.mockRejectedValue(error);

      await operationsCommissionController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Report not found',
        error: expect.any(String)
      });
    });

    it('should handle errors when updating report', async () => {
      req.params = { id: '1' };
      req.body = {
        commission_percentage: 3.0,
        total_properties_count: 120,
        total_sales_count: 60,
        total_rent_count: 60,
        total_sales_value: 6000000,
        total_rent_value: 120000,
        total_commission_amount: 183600
      };

      const error = new Error('Database error');
      operationsCommissionModel.updateReport.mockRejectedValue(error);

      await operationsCommissionController.updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
        error: expect.any(String)
      });
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate operations commission report successfully', async () => {
      req.params = { id: '1' };
      const mockRecalculatedReport = {
        id: 1,
        commission_percentage: 2.5,
        total_properties_count: 110
      };

      operationsCommissionModel.recalculateReport.mockResolvedValue(mockRecalculatedReport);

      await operationsCommissionController.recalculateReport(req, res);

      expect(operationsCommissionModel.recalculateReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecalculatedReport,
        message: 'Operations commission report recalculated successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      operationsCommissionModel.recalculateReport.mockRejectedValue(error);

      await operationsCommissionController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations commission report not found'
      });
    });

    it('should handle errors when recalculating report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsCommissionModel.recalculateReport.mockRejectedValue(error);

      await operationsCommissionController.recalculateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to recalculate operations commission report',
        error: expect.any(String)
      });
    });
  });

  describe('deleteReport', () => {
    it('should delete operations commission report successfully', async () => {
      req.params = { id: '1' };
      const mockDeletedReport = { id: 1 };

      operationsCommissionModel.deleteReport.mockResolvedValue(mockDeletedReport);

      await operationsCommissionController.deleteReport(req, res);

      expect(operationsCommissionModel.deleteReport).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeletedReport,
        message: 'Operations commission report deleted successfully'
      });
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Report not found');
      operationsCommissionModel.deleteReport.mockRejectedValue(error);

      await operationsCommissionController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operations commission report not found'
      });
    });

    it('should handle errors when deleting report', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      operationsCommissionModel.deleteReport.mockRejectedValue(error);

      await operationsCommissionController.deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete operations commission report',
        error: expect.any(String)
      });
    });
  });
});

