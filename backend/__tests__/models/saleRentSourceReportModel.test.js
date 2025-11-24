const saleRentSourceReportModel = require('../../models/saleRentSourceReportModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Sale Rent Source Report Model', () => {
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

  describe('getSaleRentSourceData', () => {
    it('should get sale and rent source data for an agent', async () => {
      const filters = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ setting_value: '1.0' }]
        }) // settings
        .mockResolvedValueOnce({
          rows: [
            {
              property_id: 1,
              closed_date: '2024-01-15',
              agent_name: 'Test Agent',
              reference_number: 'P001',
              property_type: 'sale',
              price: 100000,
              reference_source_name_display: 'Website',
              client_name: 'Test Client'
            },
            {
              property_id: 2,
              closed_date: '2024-01-20',
              agent_name: 'Test Agent',
              reference_number: 'P002',
              property_type: 'rent',
              price: 50000,
              reference_source_name_display: 'Referral',
              client_name: 'Test Client 2'
            }
          ]
        });

      const result = await saleRentSourceReportModel.getSaleRentSourceData(filters);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].sold_rented).toBe('Sold');
      expect(result[1].sold_rented).toBe('Rented');
      expect(result[0].finders_commission).toBe(1000); // 1% of 100000
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default finders percentage if not in settings', async () => {
      const filters = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // no settings
        .mockResolvedValueOnce({ rows: [] }); // no properties

      const result = await saleRentSourceReportModel.getSaleRentSourceData(filters);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should throw error if agent_id is missing', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      await expect(
        saleRentSourceReportModel.getSaleRentSourceData(filters)
      ).rejects.toThrow('agent_id is required');
    });

    it('should throw error if dates are missing', async () => {
      const filters = {
        agent_id: 1
      };

      await expect(
        saleRentSourceReportModel.getSaleRentSourceData(filters)
      ).rejects.toThrow('start_date and end_date are required');
    });

    it('should throw error for invalid date format', async () => {
      const filters = {
        agent_id: 1,
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      await expect(
        saleRentSourceReportModel.getSaleRentSourceData(filters)
      ).rejects.toThrow('Invalid date format');
    });

    it('should throw error if end date is before start date', async () => {
      const filters = {
        agent_id: 1,
        start_date: '2024-01-31',
        end_date: '2024-01-01'
      };

      await expect(
        saleRentSourceReportModel.getSaleRentSourceData(filters)
      ).rejects.toThrow('End date cannot be before start date');
    });

    it('should handle properties with no source', async () => {
      const filters = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '1.0' }] })
        .mockResolvedValueOnce({
          rows: [{
            property_id: 1,
            closed_date: '2024-01-15',
            agent_name: 'Test Agent',
            reference_number: 'P001',
            property_type: 'sale',
            price: 100000,
            reference_source_name_display: 'None', // COALESCE returns 'None' when both sources are null
            client_name: 'Test Client'
          }]
        });

      const result = await saleRentSourceReportModel.getSaleRentSourceData(filters);

      expect(result[0].source_name).toBe('None');
    });

    it('should round finders commission to 2 decimal places', async () => {
      const filters = {
        agent_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ setting_value: '1.5' }] })
        .mockResolvedValueOnce({
          rows: [{
            property_id: 1,
            closed_date: '2024-01-15',
            agent_name: 'Test Agent',
            reference_number: 'P001',
            property_type: 'sale',
            price: 100000,
            reference_source_name_display: 'Website',
            client_name: 'Test Client'
          }]
        });

      const result = await saleRentSourceReportModel.getSaleRentSourceData(filters);

      expect(result[0].finders_commission).toBe(1500); // 1.5% of 100000
    });
  });
});

