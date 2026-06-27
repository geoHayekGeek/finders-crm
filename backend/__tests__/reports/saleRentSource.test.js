// backend/__tests__/reports/saleRentSource.test.js
// Unit tests for Sale & Rent Source Report

const ReportsController = require('../../controllers/reportsController');
const { getSaleRentSourceData } = require('../../models/saleRentSourceReportModel');
const {
  exportSaleRentSourceToExcel,
  exportSaleRentSourceToPDF
} = require('../../utils/saleRentSourceReportExporter');

jest.mock('../../models/saleRentSourceReportModel');
jest.mock('../../utils/saleRentSourceReportExporter');
jest.mock('../../config/db');

describe('Sale & Rent Source Report', () => {
  let req;
  let res;

  const mockRows = [
    {
      property_id: 1,
      closed_date: '2024-01-15',
      team_leader_id: 2,
      team_leader_name: 'Alpha Team',
      team_leader_code: 'TL-A',
      agent_name: 'John Doe',
      agent_code: 'A-1',
      agent_role: 'agent',
      reference_number: 'PROP-001',
      sold_rented: 'SOLD',
      source_name: 'Website',
      owner_name: 'Jane Smith',
      phone_number: '03/111111',
      finders_commission: 5000,
      notes: 'Long note for notes area'
    },
    {
      property_id: 2,
      closed_date: '2024-01-20',
      team_leader_id: 3,
      team_leader_name: 'Beta Team',
      team_leader_code: 'TL-B',
      agent_name: 'Jane Doe',
      agent_code: 'A-2',
      agent_role: 'consultant',
      reference_number: 'PROP-002',
      sold_rented: 'Rented',
      source_name: 'Referral',
      owner_name: 'Bob Johnson',
      phone_number: '03/222222',
      finders_commission: 3000,
      notes: ''
    }
  ];

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      method: 'GET',
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
    it('should get sale & rent source report successfully with valid dates', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      getSaleRentSourceData.mockResolvedValue(mockRows);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(getSaleRentSourceData).toHaveBeenCalledWith(expect.objectContaining({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRows,
        count: 2,
        message: 'Sale & Rent Source report generated successfully'
      });
    });

    it('should allow the legacy agent_id filter when provided', async () => {
      req.query = {
        agent_id: '123',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      getSaleRentSourceData.mockResolvedValue([]);

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(getSaleRentSourceData).toHaveBeenCalledWith(expect.objectContaining({
        agent_id: 123,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }));
    });

    it('should return 400 when start_date is missing', async () => {
      req.query = {
        end_date: '2024-01-31'
      };

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'start_date and end_date are required'
      });
    });

    it('should return 400 when end_date is missing', async () => {
      req.query = {
        start_date: '2024-01-01'
      };

      await ReportsController.getSaleRentSourceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'start_date and end_date are required'
      });
    });

    it('should handle errors when generating report', async () => {
      req.query = {
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
  });

  describe('exportSaleRentSourceExcel', () => {
    it('should export edited rows from POST payload without refetching', async () => {
      req.method = 'POST';
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        rows: mockRows
      };

      const mockBuffer = Buffer.from('mock excel data');
      exportSaleRentSourceToExcel.mockResolvedValue(mockBuffer);

      await ReportsController.exportSaleRentSourceExcel(req, res);

      expect(getSaleRentSourceData).not.toHaveBeenCalled();
      expect(exportSaleRentSourceToExcel).toHaveBeenCalledWith(mockRows, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Statistics_of_sale_and_rent_source'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.xlsx'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should fall back to querying rows when payload rows are absent', async () => {
      req.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const mockBuffer = Buffer.from('mock excel data');
      getSaleRentSourceData.mockResolvedValue(mockRows);
      exportSaleRentSourceToExcel.mockResolvedValue(mockBuffer);

      await ReportsController.exportSaleRentSourceExcel(req, res);

      expect(getSaleRentSourceData).toHaveBeenCalledWith(expect.objectContaining({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }));
      expect(exportSaleRentSourceToExcel).toHaveBeenCalledWith(mockRows, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
    });

    it('should return 400 when start_date is missing', async () => {
      req.method = 'POST';
      req.body = {
        end_date: '2024-01-31',
        rows: mockRows
      };

      await ReportsController.exportSaleRentSourceExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'start_date and end_date are required'
      });
      expect(exportSaleRentSourceToExcel).not.toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      req.method = 'POST';
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        rows: mockRows
      };

      const error = new Error('Export failed');
      exportSaleRentSourceToExcel.mockRejectedValue(error);

      await ReportsController.exportSaleRentSourceExcel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export Sale & Rent Source report to Excel',
        error: expect.any(String)
      });
    });
  });

  describe('exportSaleRentSourcePDF', () => {
    it('should export Sale & Rent Source report to PDF successfully from POST payload', async () => {
      req.method = 'POST';
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        rows: mockRows
      };

      const mockBuffer = Buffer.from('mock pdf data');
      exportSaleRentSourceToPDF.mockResolvedValue(mockBuffer);

      await ReportsController.exportSaleRentSourcePDF(req, res);

      expect(getSaleRentSourceData).not.toHaveBeenCalled();
      expect(exportSaleRentSourceToPDF).toHaveBeenCalledWith(mockRows, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('Statistics_of_sale_and_rent_source'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.pdf'));
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should handle errors during PDF export', async () => {
      req.method = 'POST';
      req.body = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        rows: mockRows
      };

      const error = new Error('Export failed');
      exportSaleRentSourceToPDF.mockRejectedValue(error);

      await ReportsController.exportSaleRentSourcePDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to export Sale & Rent Source report to PDF',
        error: expect.any(String)
      });
    });
  });
});
