// backend/__tests__/reports/saleRentSource.test.js
// Unit tests for Sale & Rent Source Report

const ReportsController = require('../../controllers/reportsController');
const { getSaleRentSourceData } = require('../../models/saleRentSourceReportModel');

// Mock dependencies
jest.mock('../../models/saleRentSourceReportModel');
jest.mock('../../config/db');

describe('Sale & Rent Source Report', () => {
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

  describe('getSaleRentSourceReport', () => {
    it('should get sale & rent source report successfully with valid parameters', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockData = [
        {
          closed_date: '2024-01-15',
          agent_name: 'John Doe',
          reference_number: 'PROP-001',
          sold_rented: 'Sold',
          source_name: 'Website',
          price: 500000,
          finders_commission: 5000,
          client_name: 'Jane Smith'
        },
        {
          closed_date: '2024-01-20',
          agent_name: 'John Doe',
          reference_number: 'PROP-002',
          sold_rented: 'Rented',
          source_name: 'Referral',
          price: 2000,
          finders_commission: 20,
          client_name: 'Bob Johnson'
        }
      ];

      getSaleRentSourceData.mockResolvedValue(mockData);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(getSaleRentSourceData).toHaveBeenCalledWith({
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
        count: 2,
        message: 'Sale & Rent Source report generated successfully'
      });
    });

    it('should return 400 when agent_id is missing', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'agent_id, start_date, and end_date are required'
      });
    });

    it('should return 400 when start_date is missing', async () => {
      req.query = {
        agent_id: '1',
        end_date: '2024-01-31'
      };

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'agent_id, start_date, and end_date are required'
      });
    });

    it('should return 400 when end_date is missing', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01'
      };

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'agent_id, start_date, and end_date are required'
      });
    });

    it('should handle empty results', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      getSaleRentSourceData.mockResolvedValue([]);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
        message: 'Sale & Rent Source report generated successfully'
      });
    });

    it('should handle errors when generating report', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const error = new Error('Database error');
      getSaleRentSourceData.mockRejectedValue(error);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate Sale & Rent Source report',
        error: expect.any(String)
      });
    });

    it('should parse agent_id as integer', async () => {
      req.query = {
        agent_id: '123',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      getSaleRentSourceData.mockResolvedValue([]);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(getSaleRentSourceData).toHaveBeenCalledWith({
        agent_id: 123,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should handle report with multiple sources', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockData = [
        { source_name: 'Website', price: 500000 },
        { source_name: 'Referral', price: 300000 },
        { source_name: 'Social Media', price: 200000 },
        { source_name: 'Website', price: 400000 }
      ];

      getSaleRentSourceData.mockResolvedValue(mockData);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
        count: 4,
        message: 'Sale & Rent Source report generated successfully'
      });
    });

    it('should handle report with no source (None)', async () => {
      req.query = {
        agent_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockData = [
        {
          closed_date: '2024-01-15',
          source_name: 'None',
          price: 500000
        }
      ];

      getSaleRentSourceData.mockResolvedValue(mockData);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
        count: 1,
        message: 'Sale & Rent Source report generated successfully'
      });
    });
  });
});

