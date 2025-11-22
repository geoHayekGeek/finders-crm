// __tests__/leads/leadsStatsController.test.js
const LeadsStatsController = require('../../controllers/leadsStatsController');
const pool = require('../../config/db');

// Mock dependencies
jest.mock('../../config/db');

describe('Leads Stats Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin User', role: 'admin' },
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getLeadsStats', () => {
    it('should get leads statistics for admin successfully', async () => {
      const mockTotal = { rows: [{ total: '100' }] };
      const mockStatus = { rows: [{ status: 'New', count: '50' }, { status: 'Contacted', count: '30' }] };
      const mockPrice = { rows: [{ with_price: '80', avg_price: '500000', total_value: '40000000', min_price: '100000', max_price: '1000000' }] };
      const mockSource = { rows: [{ source_name: 'Website', count: '40' }, { source_name: 'Referral', count: '30' }] };
      const mockRecent = { rows: [{ recent: '10' }] };
      const mockAgent = { rows: [{ name: 'John Doe', count: '25' }] };
      const mockMonthly = { rows: [{ month: '2024-01-01', count: '20' }, { month: '2024-02-01', count: '15' }] };

      pool.query
        .mockResolvedValueOnce(mockTotal)
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockPrice)
        .mockResolvedValueOnce(mockSource)
        .mockResolvedValueOnce(mockRecent)
        .mockResolvedValueOnce(mockAgent)
        .mockResolvedValueOnce(mockMonthly);

      await LeadsStatsController.getLeadsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 100,
          byStatus: expect.any(Array),
          pricing: expect.any(Object),
          topSources: expect.any(Array),
          recentActivity: expect.any(Object),
          topAgents: expect.any(Array),
          monthlyTrends: expect.any(Array)
        }),
        message: 'Statistics retrieved successfully'
      });
    });

    it('should get leads statistics for agent (filtered by agent)', async () => {
      req.user = { id: 2, name: 'Agent User', role: 'agent' };

      const mockTotal = { rows: [{ total: '25' }] };
      const mockStatus = { rows: [{ status: 'New', count: '15' }] };
      const mockPrice = { rows: [{ with_price: '20', avg_price: '400000', total_value: '8000000', min_price: '200000', max_price: '800000' }] };
      const mockSource = { rows: [{ source_name: 'Website', count: '10' }] };
      const mockRecent = { rows: [{ recent: '3' }] };
      const mockAgent = { rows: [{ name: 'Agent User', count: '25' }] };
      const mockMonthly = { rows: [{ month: '2024-01-01', count: '5' }] };

      pool.query
        .mockResolvedValueOnce(mockTotal)
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockPrice)
        .mockResolvedValueOnce(mockSource)
        .mockResolvedValueOnce(mockRecent)
        .mockResolvedValueOnce(mockAgent)
        .mockResolvedValueOnce(mockMonthly);

      await LeadsStatsController.getLeadsStats(req, res);

      // Verify that queries use agent_id filter
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE agent_id = $1'),
        [2]
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 25
        }),
        message: 'Statistics retrieved successfully'
      });
    });

    it('should get leads statistics for team leader (filtered by team)', async () => {
      req.user = { id: 3, name: 'Team Leader', role: 'team_leader' };

      const mockTotal = { rows: [{ total: '50' }] };
      const mockStatus = { rows: [{ status: 'New', count: '30' }] };
      const mockPrice = { rows: [{ with_price: '40', avg_price: '450000', total_value: '18000000', min_price: '150000', max_price: '900000' }] };
      const mockSource = { rows: [{ source_name: 'Website', count: '20' }] };
      const mockRecent = { rows: [{ recent: '5' }] };
      const mockAgent = { rows: [{ name: 'Team Leader', count: '50' }] };
      const mockMonthly = { rows: [{ month: '2024-01-01', count: '10' }] };

      pool.query
        .mockResolvedValueOnce(mockTotal)
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockPrice)
        .mockResolvedValueOnce(mockSource)
        .mockResolvedValueOnce(mockRecent)
        .mockResolvedValueOnce(mockAgent)
        .mockResolvedValueOnce(mockMonthly);

      await LeadsStatsController.getLeadsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 50
        }),
        message: 'Statistics retrieved successfully'
      });
    });

    it('should handle empty results', async () => {
      const mockTotal = { rows: [{ total: '0' }] };
      const mockStatus = { rows: [] };
      const mockPrice = { rows: [{ with_price: '0', avg_price: null, total_value: null, min_price: null, max_price: null }] };
      const mockSource = { rows: [] };
      const mockRecent = { rows: [{ recent: '0' }] };
      const mockAgent = { rows: [] };
      const mockMonthly = { rows: [] };

      pool.query
        .mockResolvedValueOnce(mockTotal)
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockPrice)
        .mockResolvedValueOnce(mockSource)
        .mockResolvedValueOnce(mockRecent)
        .mockResolvedValueOnce(mockAgent)
        .mockResolvedValueOnce(mockMonthly);

      await LeadsStatsController.getLeadsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 0,
          byStatus: [],
          pricing: expect.objectContaining({
            withPrice: 0,
            averagePrice: 0,
            totalValue: 0,
            minPrice: 0,
            maxPrice: 0
          }),
          topSources: [],
          recentActivity: { newLeads7Days: 0 },
          topAgents: [],
          monthlyTrends: []
        }),
        message: 'Statistics retrieved successfully'
      });
    });

    it('should handle errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await LeadsStatsController.getLeadsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch leads statistics',
        error: 'Database error'
      });
    });
  });
});


