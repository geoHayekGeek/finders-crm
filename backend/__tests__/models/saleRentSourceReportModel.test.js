const saleRentSourceReportModel = require('../../models/saleRentSourceReportModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Sale Rent Source Report Model', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSaleRentSourceData', () => {
    it('should get company-wide sale and rent source data for a date range', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            property_id: 1,
            closed_date: '2024-01-15',
            reference_number: 'P001',
            property_type: 'sale',
            notes: 'Longer note for the workbook',
            price: 100000,
            agent_id: 10,
            agent_name: 'Alice Agent',
            agent_code: 'A-10',
            agent_role: 'agent',
            team_leader_id: 2,
            team_leader_name: 'Alpha Team',
            team_leader_code: 'TL-A',
            owner_name: 'Owner One',
            phone_number: '03/111111',
            source_name: 'Website'
          },
          {
            property_id: 2,
            closed_date: '2024-01-20',
            reference_number: 'P002',
            property_type: 'rent',
            notes: '',
            price: 50000,
            agent_id: 11,
            agent_name: 'Bob Agent',
            agent_code: 'B-11',
            agent_role: 'consultant',
            team_leader_id: 3,
            team_leader_name: 'Beta Team',
            team_leader_code: 'TL-B',
            owner_name: 'Owner Two',
            phone_number: '03/222222',
            source_name: 'Referral'
          }
        ]
      });

      const result = await saleRentSourceReportModel.getSaleRentSourceData({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockClient.query.mock.calls[0];
      expect(sql).toContain('COALESCE(p.closed_date::date, p.created_at::date) AS closed_date');
      expect(sql).toContain('COALESCE(p.closed_date::date, p.created_at::date) >= $1::date');
      expect(sql).toContain('COALESCE(p.closed_date::date, p.created_at::date) <= $2::date');
      expect(sql).toContain('COALESCE(p.closed_date::date, p.created_at::date) ASC');
      expect(params).toEqual(['2024-01-01', '2024-01-31']);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sold_rented: 'SOLD',
        source_name: 'Website',
        finders_commission: 0,
        team_leader_name: 'Alpha Team',
        agent_name: 'Alice Agent'
      });
      expect(result[1]).toMatchObject({
        sold_rented: 'Rented',
        source_name: 'Referral',
        finders_commission: 0,
        team_leader_name: 'Beta Team',
        agent_name: 'Bob Agent'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should keep optional agent filter for backwards compatibility', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await saleRentSourceReportModel.getSaleRentSourceData({
        agent_id: 42,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockClient.query.mock.calls[0];
      expect(sql).toContain('p.agent_id = $3');
      expect(params).toEqual(['2024-01-01', '2024-01-31', 42]);
    });

    it('should throw error if start date is missing', async () => {
      await expect(
        saleRentSourceReportModel.getSaleRentSourceData({
          end_date: '2024-01-31'
        })
      ).rejects.toThrow('start_date and end_date are required');
    });

    it('should throw error if end date is missing', async () => {
      await expect(
        saleRentSourceReportModel.getSaleRentSourceData({
          start_date: '2024-01-01'
        })
      ).rejects.toThrow('start_date and end_date are required');
    });

    it('should throw error for invalid date format', async () => {
      await expect(
        saleRentSourceReportModel.getSaleRentSourceData({
          start_date: 'invalid-date',
          end_date: '2024-01-31'
        })
      ).rejects.toThrow('Invalid start_date');
    });

    it('should throw error if end date is before start date', async () => {
      await expect(
        saleRentSourceReportModel.getSaleRentSourceData({
          start_date: '2024-01-31',
          end_date: '2024-01-01'
        })
      ).rejects.toThrow('End date cannot be before start date');
    });

    it('should use None when no source is found and still release the client', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            property_id: 1,
            closed_date: '2024-01-15',
            reference_number: 'P001',
            property_type: 'sale',
            notes: null,
            price: 100000,
            agent_id: 10,
            agent_name: 'Alice Agent',
            agent_code: 'A-10',
            agent_role: 'agent',
            team_leader_id: null,
            team_leader_name: null,
            team_leader_code: null,
            owner_name: 'Owner One',
            phone_number: '03/111111',
            source_name: null
          }
        ]
      });

      const result = await saleRentSourceReportModel.getSaleRentSourceData({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(result[0].source_name).toBe('None');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
