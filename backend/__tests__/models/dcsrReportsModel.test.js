const dcsrReportsModel = require('../../models/dcsrReportsModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('DCSR Reports Model', () => {
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

  describe('calculateDCSRData', () => {
    it('should calculate DCSR data for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
        .mockResolvedValueOnce({ rows: [{ count: '8' }] }); // viewings

      const result = await dcsrReportsModel.calculateDCSRData(startDate, endDate);

      expect(result).toEqual({
        listings_count: 10,
        leads_count: 5,
        sales_count: 3,
        rent_count: 2,
        viewings_count: 8
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle string dates', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await dcsrReportsModel.calculateDCSRData(startDate, endDate);

      expect(result).toBeDefined();
    });

    it('should throw error for invalid dates', async () => {
      const startDate = new Date('invalid');
      const endDate = new Date('2024-01-31');

      await expect(
        dcsrReportsModel.calculateDCSRData(startDate, endDate)
      ).rejects.toThrow('Invalid date range');
    });
  });

  describe('createDCSRReport', () => {
    it('should create a new DCSR report', async () => {
      const reportData = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      // Mock all queries for calculateDCSRData
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '8' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      // Mock queries for createDCSRReport
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            listings_count: 10,
            leads_count: 5,
            sales_count: 3,
            rent_count: 2,
            viewings_count: 8
          }]
        });

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      const result = await dcsrReportsModel.createDCSRReport(reportData, createdBy);

      expect(result).toBeDefined();
      expect(result.month).toBe(1);
      expect(result.year).toBe(2024);
    });

    it('should throw error if report already exists', async () => {
      const reportData = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      // Mock check for existing report - return existing
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing report

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      await expect(
        dcsrReportsModel.createDCSRReport(reportData, createdBy)
      ).rejects.toThrow('A DCSR report already exists');
    });
  });

  describe('getAllDCSRReports', () => {
    it('should get all reports', async () => {
      const mockReports = [
        { id: 1, month: 1, year: 2024 },
        { id: 2, month: 2, year: 2024 }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await dcsrReportsModel.getAllDCSRReports();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM dcsr_monthly_reports'),
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

      await dcsrReportsModel.getAllDCSRReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND start_date >= $1'),
        expect.arrayContaining([filters.start_date])
      );
    });

    it('should filter by month and year', async () => {
      const filters = { month: 1, year: 2024 };

      mockQuery.mockResolvedValue({ rows: [] });

      await dcsrReportsModel.getAllDCSRReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND month = $1'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('getDCSRReportById', () => {
    it('should get a report by ID', async () => {
      const reportId = 1;
      const mockReport = { id: reportId, month: 1, year: 2024 };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await dcsrReportsModel.getDCSRReportById(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [reportId]
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('updateDCSRReport', () => {
    it('should update a DCSR report', async () => {
      const reportId = 1;
      const updateData = {
        listings_count: 15,
        leads_count: 8,
        sales_count: 5,
        rent_count: 3,
        viewings_count: 12
      };

      mockClient.query.mockResolvedValue({
        rows: [{ id: reportId, ...updateData }]
      });

      const result = await dcsrReportsModel.updateDCSRReport(reportId, updateData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dcsr_monthly_reports'),
        expect.arrayContaining([
          updateData.listings_count,
          updateData.leads_count,
          updateData.sales_count,
          updateData.rent_count,
          updateData.viewings_count,
          reportId
        ])
      );
      expect(result).toEqual({ id: reportId, ...updateData });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('recalculateDCSRReport', () => {
    it('should recalculate a DCSR report', async () => {
      const reportId = 1;

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            month: 1,
            year: 2024
          }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
        .mockResolvedValueOnce({ rows: [{ count: '8' }] })  // viewings
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            listings_count: 10,
            leads_count: 5,
            sales_count: 3,
            rent_count: 2,
            viewings_count: 8
          }]
        });

      const result = await dcsrReportsModel.recalculateDCSRReport(reportId);

      expect(result).toBeDefined();
      expect(result.listings_count).toBe(10);
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        dcsrReportsModel.recalculateDCSRReport(reportId)
      ).rejects.toThrow('Report not found');
    });
  });

  describe('deleteDCSRReport', () => {
    it('should delete a DCSR report', async () => {
      const reportId = 1;

      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await dcsrReportsModel.deleteDCSRReport(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dcsr_monthly_reports'),
        [reportId]
      );
      expect(result).toBe(true);
    });

    it('should return false if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await dcsrReportsModel.deleteDCSRReport(reportId);

      expect(result).toBe(false);
    });
  });
});

