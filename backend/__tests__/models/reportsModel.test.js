// backend/__tests__/models/reportsModel.test.js
// Unit tests for Reports Model

const Report = require('../../models/reportsModel');
const pool = require('../../config/db');

jest.mock('../../config/db');
jest.mock('../../models/propertyReferralModel', () => ({
  applyExternalRuleToPropertyReferrals: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../models/leadReferralModel', () => ({
  applyExternalRuleToLeadReferrals: jest.fn().mockResolvedValue(undefined)
}));

describe('Report Model', () => {
  let mockQuery;

  const queueZeroCalculationQueries = () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0', earliest: null, latest: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0', total_amount: '0' }] })
      .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
  };

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('calculateReportData', () => {
    it('should calculate report metrics and keep commission fields manual', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ total: '10', earliest: '2024-01-01', latest: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ source_name: 'Website', count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '8' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5', total_amount: '500000' }] })
        .mockResolvedValueOnce({ rows: [{ referral_count: '2', property_count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ referral_count: '1', property_count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const result = await Report.calculateReportData(1, '2024-01-01', '2024-01-31');

      expect(result).toMatchObject({
        listings_count: 10,
        viewings_count: 8,
        sales_count: 5,
        sales_amount: 500000,
        referral_received_count: 3,
        referrals_on_properties_count: 3,
        agent_commission: 0,
        finders_commission: 0,
        team_leader_commission: 0,
        administration_commission: 0,
        total_commission: 0,
        referral_received_commission: 0,
        referrals_on_properties_commission: 0
      });
      expect(result.lead_sources).toEqual({ Website: 5 });
    });

    it('should reject invalid date ranges before querying', async () => {
      await expect(
        Report.calculateReportData(1, 'invalid-date', '2024-01-31')
      ).rejects.toThrow('Invalid date range supplied for calculation');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('createMonthlyReport', () => {
    it('should throw if year is less than 2000', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        Report.createMonthlyReport(
          { agent_id: 1, start_date: '1999-01-01', end_date: '1999-01-31', boosts: 0 },
          1
        )
      ).rejects.toThrow('Year must be 2000 or later');
    });

    it('should create a report using manual commission fields', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // ensureExternalColumnExists
        .mockResolvedValueOnce({ rows: [] }) // existing report check
        .mockResolvedValueOnce({ rows: [] }) // properties with referrals
        .mockResolvedValueOnce({ rows: [] }) // leads with referrals
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ total: '0', earliest: null, latest: null }] }) // debug
        .mockResolvedValueOnce({ rows: [] }) // leads
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // viewings
        .mockResolvedValueOnce({ rows: [{ count: '0', total_amount: '0' }] }) // sales
        .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] }) // property referrals
        .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] }) // lead referrals
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // referrals on properties
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            agent_id: 1,
            month: 1,
            year: 2000,
            start_date: '2000-01-01',
            end_date: '2000-01-31',
            listings_count: 0,
            sales_count: 0,
            agent_commission: 0,
            total_commission: 0
          }]
        });

      const result = await Report.createMonthlyReport(
        { agent_id: 1, start_date: '2000-01-01', end_date: '2000-01-31', boosts: 0 },
        1
      );

      expect(result.year).toBe(2000);
      expect(result.agent_commission).toBe(0);
      expect(result.total_commission).toBe(0);
    });
  });

  describe('getAllReports', () => {
    it('should get all reports without filters', async () => {
      const mockReports = [
        { id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: 2, agent_id: 2, start_date: '2024-02-01', end_date: '2024-02-28' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockReports });

      const result = await Report.getAllReports({});

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockReports);
    });

    it('should filter reports by agent_id', async () => {
      const mockReports = [{ id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' }];

      mockQuery.mockResolvedValueOnce({ rows: mockReports });

      const result = await Report.getAllReports({ agent_id: 1 });

      expect(result).toEqual(mockReports);
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID', async () => {
      const mockReport = {
        id: 1,
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        listings_count: 10,
        sales_count: 5,
        commission_percentage: 0
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockReport] });

      const result = await Report.getReportById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(result).toEqual(mockReport);
    });

    it('should return undefined when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Report.getReportById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('updateReport', () => {
    it('should update a report with manual commission fields', async () => {
      const updateData = {
        agent_commission: 20000,
        finders_commission: 10000,
        team_leader_commission: 10000,
        administration_commission: 40000,
        total_commission: 80000,
        referral_received_commission: 2500,
        referrals_on_properties_commission: 1500
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          month: 1,
          year: 2024,
          ...updateData
        }]
      });

      const result = await Report.updateReport(1, updateData);

      expect(result.agent_commission).toBe(20000);
      expect(result.total_commission).toBe(80000);
    });

    it('should throw when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(Report.updateReport(999, { agent_commission: 1 })).rejects.toThrow('Report not found');
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate counts without overwriting manual commissions', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // ensureExternalColumnExists
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            agent_id: 1,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            agent_commission: 1234,
            total_commission: 5678
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // properties with referrals
        .mockResolvedValueOnce({ rows: [] }) // leads with referrals
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [{ total: '15', earliest: '2024-01-01', latest: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '8', total_amount: '800000' }] })
        .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ referral_count: '0', property_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            agent_id: 1,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            listings_count: 15,
            sales_count: 8,
            agent_commission: 1234,
            total_commission: 5678
          }]
        });

      const result = await Report.recalculateReport(1);

      expect(result.listings_count).toBe(15);
      expect(result.sales_count).toBe(8);
      expect(result.agent_commission).toBe(1234);
      expect(result.total_commission).toBe(5678);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      const mockDeletedReport = { id: 1, agent_id: 1 };

      mockQuery.mockResolvedValueOnce({ rows: [mockDeletedReport] });

      const result = await Report.deleteReport(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM monthly_agent_reports'),
        [1]
      );
      expect(result).toEqual(mockDeletedReport);
    });
  });
});
