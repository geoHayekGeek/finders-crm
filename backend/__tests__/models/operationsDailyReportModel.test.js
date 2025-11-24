const operationsDailyReportModel = require('../../models/operationsDailyReportModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Operations Daily Report Model', () => {
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

  describe('calculateDailyData', () => {
    it('should calculate daily data for an operations user', async () => {
      const operationsId = 1;
      const reportDate = '2024-01-15';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: operationsId, name: 'Operations User' }]
        }) // user
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // properties added
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // leads responded
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // amending properties

      const result = await operationsDailyReportModel.calculateDailyData(operationsId, reportDate);

      expect(result).toEqual({
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate,
        properties_added: 5,
        leads_responded_to: 3,
        amending_previous_properties: 2
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid operations user', async () => {
      const operationsId = 999;
      const reportDate = '2024-01-15';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // user not found

      await expect(
        operationsDailyReportModel.calculateDailyData(operationsId, reportDate)
      ).rejects.toThrow('Invalid operations user ID');
    });
  });

  describe('createReport', () => {
    it('should create a new daily report', async () => {
      const operationsId = 1;
      const reportDate = '2024-01-15';
      const manualFields = {
        preparing_contract: 1,
        tasks_efficiency_duty_time: 5,
        tasks_efficiency_uniform: 3,
        tasks_efficiency_after_duty: 2,
        leads_responded_out_of_duty_time: 1
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: operationsId, name: 'Operations User' }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            operations_id: operationsId,
            report_date: reportDate,
            ...manualFields
          }]
        });

      const result = await operationsDailyReportModel.createReport(
        operationsId,
        reportDate,
        manualFields
      );

      expect(result).toBeDefined();
      expect(result.operations_id).toBe(operationsId);
    });

    it('should throw error if report already exists', async () => {
      const operationsId = 1;
      const reportDate = '2024-01-15';

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing report

      await expect(
        operationsDailyReportModel.createReport(operationsId, reportDate)
      ).rejects.toThrow('A report already exists');
    });
  });

  describe('getAllReports', () => {
    it('should get all reports', async () => {
      const mockReports = [
        { id: 1, operations_id: 1, report_date: '2024-01-15' },
        { id: 2, operations_id: 2, report_date: '2024-01-16' }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await operationsDailyReportModel.getAllReports();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM operations_daily_reports'),
        []
      );
      expect(result).toEqual(mockReports);
    });

    it('should filter by operations_id', async () => {
      const filters = { operations_id: 1 };

      mockQuery.mockResolvedValue({ rows: [] });

      await operationsDailyReportModel.getAllReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND operations_id = $1'),
        expect.arrayContaining([1])
      );
    });

    it('should filter by date range', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockQuery.mockResolvedValue({ rows: [] });

      await operationsDailyReportModel.getAllReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND report_date >= $1'),
        expect.arrayContaining([filters.start_date])
      );
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID', async () => {
      const reportId = 1;
      const mockReport = {
        id: reportId,
        operations_id: 1,
        report_date: '2024-01-15'
      };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await operationsDailyReportModel.getReportById(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [reportId]
      );
      expect(result).toEqual(mockReport);
    });

    it('should return null if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await operationsDailyReportModel.getReportById(reportId);

      expect(result).toBeNull();
    });
  });

  describe('updateReport', () => {
    it('should update manual fields', async () => {
      const reportId = 1;
      const updateData = {
        preparing_contract: 2,
        tasks_efficiency_duty_time: 6
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            operations_id: 1,
            report_date: '2024-01-15'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: reportId, ...updateData }]
        });

      const result = await operationsDailyReportModel.updateReport(reportId, updateData);

      expect(result).toBeDefined();
      expect(result.preparing_contract).toBe(2);
    });

    it('should recalculate calculated fields if recalculate flag is set', async () => {
      const reportId = 1;
      const updateData = { recalculate: true };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            operations_id: 1,
            report_date: '2024-01-15'
          }]
        });

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Operations User' }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reportId, properties_added: 5 }]
      });

      const result = await operationsDailyReportModel.updateReport(reportId, updateData);

      expect(result).toBeDefined();
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;
      const updateData = {};

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        operationsDailyReportModel.updateReport(reportId, updateData)
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
            operations_id: 1,
            report_date: '2024-01-15'
          }]
        });

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Operations User' }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reportId, properties_added: 5 }]
      });

      const result = await operationsDailyReportModel.recalculateReport(reportId);

      expect(result).toBeDefined();
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const reportId = 1;
      const mockReport = { id: reportId };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await operationsDailyReportModel.deleteReport(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM operations_daily_reports'),
        [reportId]
      );
      expect(result).toEqual(mockReport);
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        operationsDailyReportModel.deleteReport(reportId)
      ).rejects.toThrow('Report not found');
    });
  });
});

