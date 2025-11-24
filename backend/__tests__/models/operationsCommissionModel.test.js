const operationsCommissionModel = require('../../models/operationsCommissionModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Operations Commission Model', () => {
  let mockQuery;
  let mockClient;
  let mockRelease;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: mockRelease
    };
    pool.query = mockQuery;
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCommissionData', () => {
    it('should calculate commission data for a date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ setting_value: '4.0' }]
        }) // settings
        .mockResolvedValueOnce({
          rows: [
            { id: 1, reference_number: 'P001', property_type: 'sale', price: 100000, closed_date: '2024-01-15' },
            { id: 2, reference_number: 'P002', property_type: 'rent', price: 50000, closed_date: '2024-01-20' }
          ]
        }); // properties

      const result = await operationsCommissionModel.calculateCommissionData(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.commission_percentage).toBe(4.0);
      expect(result.total_sales_count).toBe(1);
      expect(result.total_rent_count).toBe(1);
      expect(result.total_sales_value).toBe(100000);
      expect(result.total_rent_value).toBe(50000);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default commission percentage if not in settings', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // no settings
        .mockResolvedValueOnce({ rows: [] }); // no properties

      const result = await operationsCommissionModel.calculateCommissionData(startDate, endDate);

      expect(result.commission_percentage).toBe(4.0);
    });

    it('should throw error for invalid date range', async () => {
      const startDate = '2024-01-31';
      const endDate = '2024-01-01';

      await expect(
        operationsCommissionModel.calculateCommissionData(startDate, endDate)
      ).rejects.toThrow('End date cannot be before start date');
    });
  });

  describe('createReport', () => {
    it('should create a new operations commission report', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '4.0' }] })
        .mockResolvedValueOnce({ rows: [] }); // no properties

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          month: 1,
          year: 2024,
          start_date: startDate,
          end_date: endDate,
          commission_percentage: 4.0,
          total_properties_count: 0,
          total_sales_count: 0,
          total_rent_count: 0,
          total_sales_value: 0,
          total_rent_value: 0,
          total_commission_amount: 0
        }]
      });

      const result = await operationsCommissionModel.createReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.month).toBe(1);
      expect(result.year).toBe(2024);
    });
  });

  describe('getAllReports', () => {
    it('should get all reports', async () => {
      const mockReports = [
        { id: 1, month: 1, year: 2024 },
        { id: 2, month: 2, year: 2024 }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await operationsCommissionModel.getAllReports();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM operations_commission_reports'),
        []
      );
      expect(result).toEqual(mockReports);
    });

    it('should filter by date range', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockQuery.mockResolvedValue({ rows: [] });

      await operationsCommissionModel.getAllReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND start_date >= $1'),
        expect.arrayContaining([filters.start_date])
      );
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID with property details', async () => {
      const reportId = 1;

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          }]
        });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '4.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await operationsCommissionModel.getReportById(reportId);

      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });

    it('should return null if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await operationsCommissionModel.getReportById(reportId);

      expect(result).toBeNull();
    });
  });

  describe('updateReport', () => {
    it('should update a report', async () => {
      const reportId = 1;
      const updateData = {
        commission_percentage: 5.0,
        total_properties_count: 10,
        total_sales_count: 5,
        total_rent_count: 5,
        total_sales_value: 500000,
        total_rent_value: 250000,
        total_commission_amount: 37500
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            ...updateData
          }]
        });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '4.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await operationsCommissionModel.updateReport(reportId, updateData);

      expect(result).toBeDefined();
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;
      const updateData = {};

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        operationsCommissionModel.updateReport(reportId, updateData)
      ).rejects.toThrow('Report not found');
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate a report', async () => {
      const reportId = 1;

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: reportId, commission_percentage: 4.0 }]
        });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '4.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await operationsCommissionModel.recalculateReport(reportId);

      expect(result).toBeDefined();
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const reportId = 1;
      const mockReport = { id: reportId };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await operationsCommissionModel.deleteReport(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM operations_commission_reports'),
        [reportId]
      );
      expect(result).toEqual(mockReport);
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        operationsCommissionModel.deleteReport(reportId)
      ).rejects.toThrow('Report not found');
    });
  });
});

