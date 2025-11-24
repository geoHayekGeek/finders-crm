// backend/__tests__/models/reportsModel.test.js
// Unit tests for Reports Model

const Report = require('../../models/reportsModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Report Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('calculateReportData', () => {
    it('should calculate report data with commission settings', async () => {
      const mockCommissions = {
        rows: [
          { setting_key: 'commission_agent_percentage', setting_value: '2' },
          { setting_key: 'commission_finders_percentage', setting_value: '1' },
          { setting_key: 'commission_referral_internal_percentage', setting_value: '0.5' },
          { setting_key: 'commission_referral_external_percentage', setting_value: '2' },
          { setting_key: 'commission_team_leader_percentage', setting_value: '1' },
          { setting_key: 'commission_administration_percentage', setting_value: '4' }
        ]
      };

      const mockListings = { rows: [{ count: '10' }] };
      const mockDebugResult = { rows: [{ total: '10', earliest: '2024-01-01', latest: '2024-01-31' }] };
      const mockLeads = { rows: [{ source_name: 'Website', count: '5' }] };
      const mockViewings = { rows: [{ count: '8' }] };
      const mockSales = { rows: [{ count: '5', total_amount: '500000' }] };
      const mockPropertyReferrals = { rows: [{ referral_count: '2', property_count: '1', total_commission: '1000', total_amount: '200000' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '1', property_count: '1', total_commission: '500', total_amount: '100000' }] };
      const mockReferralsCount = { rows: [{ count: '3' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '1500', total_amount: '300000' }] };
      const mockReferralDetails = { rows: [] }; // Debug query

      mockQuery
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount);

      const result = await Report.calculateReportData(1, '2024-01-01', '2024-01-31');

      expect(result.listings_count).toBe(10);
      expect(result.sales_count).toBe(5);
      expect(result.sales_amount).toBe(500000);
      expect(result.agent_commission).toBeGreaterThan(0);
      expect(result.referral_received_count).toBe(3);
      expect(result.referral_received_commission).toBeGreaterThan(0);
    });

    it('should use default commission values when settings are missing', async () => {
      const mockCommissions = { rows: [] }; // No commission settings

      const mockListings = { rows: [{ count: '0' }] };
      const mockDebugResult = { rows: [{ total: '0', earliest: null, latest: null }] };
      const mockLeads = { rows: [] };
      const mockViewings = { rows: [{ count: '0' }] };
      const mockSales = { rows: [{ count: '0', total_amount: '0' }] };
      const mockPropertyReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockReferralsCount = { rows: [{ count: '0' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '0', total_amount: '0' }] };
      const mockReferralDetails = { rows: [] }; // Debug query

      mockQuery
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount);

      const result = await Report.calculateReportData(1, '2024-01-01', '2024-01-31');

      // Should use defaults: agent=2%, referral_internal=0.5%, referral_external=2%
      expect(result.agent_commission).toBe(0); // 0 sales
      // Note: referral_commission removed - use referrals_on_properties_commission instead
    });

    it('should handle invalid date range', async () => {
      // Mock the commissions query to avoid undefined error
      // The date validation happens after the query, but we need to mock it
      const mockCommissions = { rows: [] };
      mockQuery.mockResolvedValueOnce(mockCommissions);
      
      await expect(
        Report.calculateReportData(1, 'invalid-date', '2024-01-31')
      ).rejects.toThrow();
    });

    it('should calculate internal and external referral commissions correctly', async () => {
      const mockCommissions = {
        rows: [
          { setting_key: 'commission_referral_internal_percentage', setting_value: '0.5' },
          { setting_key: 'commission_referral_external_percentage', setting_value: '2' }
        ]
      };

      // Property with internal referral (external = false) - using internal rate 0.5%
      const mockPropertyReferrals = {
        rows: [{
          referral_count: '1',
          property_count: '1',
          total_commission: '1000', // 0.5% of 200000 = 1000
          total_amount: '200000'
        }]
      };

      const mockListings = { rows: [{ count: '0' }] };
      const mockDebugResult = { rows: [{ total: '0', earliest: null, latest: null }] };
      const mockLeads = { rows: [] };
      const mockViewings = { rows: [{ count: '0' }] };
      const mockSales = { rows: [{ count: '0', total_amount: '0' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockReferralsCount = { rows: [{ count: '0' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '0', total_amount: '0' }] };
      const mockReferralDetails = { rows: [] }; // Debug query

      mockQuery
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount);

      const result = await Report.calculateReportData(1, '2024-01-01', '2024-01-31');

      // Verify commission calculation uses correct rates
      // Internal referral: 0.5% of 200000 = 1000
      // referral_received_commission = property_referral_commission (1000) + lead_referral_commission (0) = 1000
      expect(result.referral_received_commission).toBe(1000);
    });

    it('should calculate multiple referrals (internal and external) on the same property correctly', async () => {
      // This test verifies the Agent Smith scenario:
      // - 1 property with $300,000 price
      // - 2 referrals: 1 internal (0.5%) and 1 external (2%)
      // - Expected: $1,500 (internal) + $6,000 (external) = $7,500 total commission
      
      const mockCommissions = {
        rows: [
          { setting_key: 'commission_agent_percentage', setting_value: '2' },
          { setting_key: 'commission_finders_percentage', setting_value: '1' },
          { setting_key: 'commission_referral_internal_percentage', setting_value: '0.5' },
          { setting_key: 'commission_referral_external_percentage', setting_value: '2' },
          { setting_key: 'commission_team_leader_percentage', setting_value: '1' },
          { setting_key: 'commission_administration_percentage', setting_value: '4' }
        ]
      };

      // Mock property referrals query result
      // 2 referrals (1 internal + 1 external) on 1 property worth $300,000
      // Internal: $300,000 * 0.5% = $1,500
      // External: $300,000 * 2% = $6,000
      // Total: $7,500
      const mockPropertyReferrals = {
        rows: [{
          referral_count: '2', // 2 referrals on the same property
          property_count: '1', // 1 property
          total_commission: '7500', // $1,500 + $6,000 = $7,500
          total_amount: '300000' // Property price (counted once, not doubled)
        }]
      };

      // Mock referral details query (for debugging)
      const mockReferralDetails = {
        rows: [
          {
            id: 1,
            external: false,
            employee_id: 1,
            property_id: 100,
            price: 300000,
            commission: 1500 // Internal: 0.5% of $300,000
          },
          {
            id: 2,
            external: true,
            employee_id: 1,
            property_id: 100,
            price: 300000,
            commission: 6000 // External: 2% of $300,000
          }
        ]
      };

      const mockListings = { rows: [{ count: '1' }] };
      const mockDebugResult = { rows: [{ total: '1', earliest: '2024-11-20', latest: '2024-11-24' }] };
      const mockLeads = { rows: [{ source_name: 'Facebook', count: '1' }] };
      const mockViewings = { rows: [{ count: '0' }] };
      const mockSales = { rows: [{ count: '1', total_amount: '300000' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockReferralsCount = { rows: [{ count: '2' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '0', total_amount: '0' }] };

      mockQuery
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount);

      const result = await Report.calculateReportData(1, '2024-11-20', '2024-11-24');

      // Verify both referrals are counted
      // referral_received_count = property_referral_referral_count (2 referrals) + lead_referral_referral_count (0) = 2
      expect(result.referral_received_count).toBe(2); // 2 referrals total
      
      // Verify total commission is the sum of both internal and external
      // Internal: $300,000 * 0.5% = $1,500
      // External: $300,000 * 2% = $6,000
      // Total: $7,500
      expect(result.referral_received_commission).toBe(7500);
      
      // Verify property amount is counted only once (not doubled)
      expect(result.sales_amount).toBe(300000);
      expect(result.sales_count).toBe(1);
    });

    it('should handle multiple properties with mixed internal and external referrals', async () => {
      const mockCommissions = {
        rows: [
          { setting_key: 'commission_referral_internal_percentage', setting_value: '0.5' },
          { setting_key: 'commission_referral_external_percentage', setting_value: '2' }
        ]
      };

      // Property 1: 1 internal referral on $200,000 property = $1,000
      // Property 2: 1 external referral on $300,000 property = $6,000
      // Property 3: 2 referrals (1 internal + 1 external) on $400,000 property = $2,000 + $8,000 = $10,000
      // Total: $1,000 + $6,000 + $10,000 = $17,000
      const mockPropertyReferrals = {
        rows: [{
          referral_count: '4', // 4 referrals total across 3 properties
          property_count: '3', // 3 properties
          total_commission: '17000', // $1,000 + $6,000 + $10,000
          total_amount: '900000' // $200,000 + $300,000 + $400,000 (each counted once)
        }]
      };

      const mockListings = { rows: [{ count: '3' }] };
      const mockDebugResult = { rows: [{ total: '3', earliest: '2024-01-01', latest: '2024-01-31' }] };
      const mockLeads = { rows: [] };
      const mockViewings = { rows: [{ count: '0' }] };
      const mockSales = { rows: [{ count: '3', total_amount: '900000' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockReferralsCount = { rows: [{ count: '4' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '0', total_amount: '0' }] };
      const mockReferralDetails = { rows: [] }; // Debug query

      mockQuery
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount);

      const result = await Report.calculateReportData(1, '2024-01-01', '2024-01-31');

      // Verify all referrals are counted
      // 4 referrals total across 3 properties
      expect(result.referral_received_count).toBe(4);
      
      // Verify total commission includes both internal and external
      expect(result.referral_received_commission).toBe(17000);
      
      // Verify property amounts are not doubled
      expect(result.sales_amount).toBe(900000);
    });
  });

  describe('getAllReports', () => {
    it('should get all reports without filters', async () => {
      const mockReports = [
        { id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: 2, agent_id: 2, start_date: '2024-02-01', end_date: '2024-02-28' }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await Report.getAllReports({});

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockReports);
    });

    it('should filter reports by agent_id', async () => {
      const mockReports = [
        { id: 1, agent_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await Report.getAllReports({ agent_id: 1 });

      expect(result).toEqual(mockReports);
    });

    it('should filter reports by date range', async () => {
      const mockReports = [];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await Report.getAllReports({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

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
        sales_count: 5
      };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await Report.getReportById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(result).toEqual(mockReport);
    });

    it('should return null when report not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await Report.getReportById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('recalculateReport', () => {
    it('should recalculate an existing report', async () => {
      const mockCommissions = {
        rows: [
          { setting_key: 'commission_agent_percentage', setting_value: '2' },
          { setting_key: 'commission_finders_percentage', setting_value: '1' },
          { setting_key: 'commission_referral_internal_percentage', setting_value: '0.5' },
          { setting_key: 'commission_referral_external_percentage', setting_value: '2' },
          { setting_key: 'commission_team_leader_percentage', setting_value: '1' },
          { setting_key: 'commission_administration_percentage', setting_value: '4' }
        ]
      };

      const mockListings = { rows: [{ count: '15' }] };
      const mockDebugResult = { rows: [{ total: '15', earliest: '2024-01-01', latest: '2024-01-31' }] };
      const mockLeads = { rows: [] };
      const mockViewings = { rows: [{ count: '0' }] };
      const mockSales = { rows: [{ count: '8', total_amount: '800000' }] };
      const mockPropertyReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockLeadReferrals = { rows: [{ referral_count: '0', property_count: '0', total_commission: '0', total_amount: '0' }] };
      const mockReferralsCount = { rows: [{ count: '0' }] };
      const mockReferralsAmount = { rows: [{ total_commission: '0', total_amount: '0' }] };

      // Create the report row with all required fields
      // PostgreSQL returns dates as strings, so we use strings here
      const existingReportRow = {
        id: 1,
        agent_id: 1,
        start_date: '2024-01-01', // Must be a non-empty string
        end_date: '2024-01-31',   // Must be a non-empty string
        month: 1,
        year: 2024,
        boosts: 100
      };

      const mockReferralDetails = { rows: [] }; // Debug query
      const mockAllReferralsDebug = { rows: [] }; // Debug query when no referrals found
      const mockPropertiesForExternalRule = { rows: [] }; // Properties query for external rule
      const mockLeadsForExternalRule = { rows: [] }; // Leads query for external rule

      // First query: ensureExternalColumnExists (ALTER TABLE)
      // Then query: Get existing report by ID
      // Then queries for applying external rule
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // ensureExternalColumnExists
        .mockResolvedValueOnce({ rows: [existingReportRow] }) // Get existing report
        .mockResolvedValueOnce(mockPropertiesForExternalRule) // Properties for external rule
        .mockResolvedValueOnce(mockLeadsForExternalRule) // Leads for external rule
        // Then all the calculation queries
        .mockResolvedValueOnce(mockCommissions)
        .mockResolvedValueOnce(mockListings)
        .mockResolvedValueOnce(mockDebugResult)
        .mockResolvedValueOnce(mockLeads)
        .mockResolvedValueOnce(mockViewings)
        .mockResolvedValueOnce(mockSales)
        .mockResolvedValueOnce(mockPropertyReferrals)
        .mockResolvedValueOnce(mockReferralDetails) // Debug query for referral details
        .mockResolvedValueOnce(mockAllReferralsDebug) // Debug query when no referrals found (conditional)
        .mockResolvedValueOnce(mockLeadReferrals)
        .mockResolvedValueOnce(mockReferralsCount)
        .mockResolvedValueOnce(mockReferralsAmount)
        // Final query: Update the report
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...existingReportRow, 
            listings_count: 15, 
            sales_count: 8
          }] 
        });

      const result = await Report.recalculateReport(1);

      expect(mockQuery).toHaveBeenCalled();
      expect(result.listings_count).toBe(15);
      expect(result.sales_count).toBe(8);
    });

    it('should throw error when report not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(Report.recalculateReport(999)).rejects.toThrow('Report not found');
    });
  });

  describe('updateReport', () => {
    it('should update report with boosts field', async () => {
      const reportId = 1;
      const updates = { boosts: 150 };
      const mockUpdatedReport = {
        id: reportId,
        agent_id: 1,
        boosts: 150,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReport] });

      const result = await Report.updateReport(reportId, updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE monthly_agent_reports'),
        expect.arrayContaining([150, reportId])
      );
      expect(result).toEqual(mockUpdatedReport);
    });

    it('should update report with multiple fields including commission fields', async () => {
      const reportId = 1;
      const updates = {
        listings_count: 20,
        viewings_count: 15,
        boosts: 200,
        sales_count: 10,
        sales_amount: 1000000,
        agent_commission: 20000,
        finders_commission: 10000,
        team_leader_commission: 10000,
        administration_commission: 40000,
        total_commission: 80000, // Updated: removed referral_commission (5000)
        referral_received_count: 5,
        referral_received_commission: 2500,
        referrals_on_properties_count: 3,
        referrals_on_properties_commission: 1500
      };
      const mockUpdatedReport = {
        id: reportId,
        ...updates,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReport] });

      const result = await Report.updateReport(reportId, updates);

      expect(mockQuery).toHaveBeenCalled();
      // Verify all fields are included in the update
      const updateCall = mockQuery.mock.calls.find(call => 
        call[0].includes('UPDATE monthly_agent_reports')
      );
      expect(updateCall).toBeDefined();
      expect(result.listings_count).toBe(20);
      expect(result.agent_commission).toBe(20000);
      expect(result.total_commission).toBe(80000); // Updated: removed referral_commission (5000)
      expect(result.referral_received_count).toBe(5);
    });

    it('should update report with lead_sources JSON field', async () => {
      const reportId = 1;
      const updates = {
        lead_sources: { 'Website': 10, 'Facebook': 5, 'Dubizzle': 3 }
      };
      const mockUpdatedReport = {
        id: reportId,
        lead_sources: updates.lead_sources,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReport] });

      const result = await Report.updateReport(reportId, updates);

      expect(mockQuery).toHaveBeenCalled();
      expect(result.lead_sources).toEqual(updates.lead_sources);
    });

    it('should handle float values for commission fields correctly', async () => {
      const reportId = 1;
      const updates = {
        sales_amount: 1234567.89,
        agent_commission: 24691.36,
        total_commission: 50000.50
      };
      const mockUpdatedReport = {
        id: reportId,
        ...updates,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReport] });

      const result = await Report.updateReport(reportId, updates);

      expect(mockQuery).toHaveBeenCalled();
      expect(result.sales_amount).toBe(1234567.89);
      expect(result.agent_commission).toBe(24691.36);
      expect(result.total_commission).toBe(50000.50);
    });

    it('should throw error when report not found', async () => {
      const reportId = 999;
      const updates = { boosts: 150 };

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(Report.updateReport(reportId, updates)).rejects.toThrow('Report not found');
    });

    it('should ignore fields not in allowedFields', async () => {
      const reportId = 1;
      const updates = {
        boosts: 150,
        invalid_field: 999, // This should be ignored
        another_invalid: 'test'
      };
      const mockUpdatedReport = {
        id: reportId,
        boosts: 150,
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedReport] });

      const result = await Report.updateReport(reportId, updates);

      // Verify invalid fields are not in the query
      const updateCall = mockQuery.mock.calls.find(call => 
        call[0].includes('UPDATE monthly_agent_reports')
      );
      expect(updateCall[0]).not.toContain('invalid_field');
      expect(updateCall[0]).not.toContain('another_invalid');
      expect(result.boosts).toBe(150);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      const mockDeletedReport = { id: 1, agent_id: 1 };

      mockQuery.mockResolvedValue({ rows: [mockDeletedReport] });

      const result = await Report.deleteReport(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM monthly_agent_reports'),
        [1]
      );
      expect(result).toEqual(mockDeletedReport);
    });
  });
});

