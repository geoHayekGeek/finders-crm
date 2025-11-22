// __tests__/analytics/analyticsController.test.js
const analyticsController = require('../../controllers/analyticsController');
const pool = require('../../config/db');

// Mock dependencies
jest.mock('../../config/db');

describe('Analytics Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin User', role: 'admin' },
      query: {},
      roleFilters: {
        role: 'admin',
        canViewFinancial: true,
        canViewAgentPerformance: true,
        canViewAll: true
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAnalytics', () => {
    it('should get analytics with all data for admin', async () => {
      req.query = { timeRange: '6M' };

      const mockBasicAnalytics = {
        overview: { total_properties: 100, for_sale: 50, for_rent: 30, sold: 15, rented: 5 },
        propertyTypes: [{ type: 'Apartment', count: 60 }],
        locations: [{ location: 'Beirut', count: 40 }],
        imageStats: { properties_with_main_image: 80 }
      };

      const mockFinancialData = {
        revenue: [{ month: '2024-01', properties_sold: 5, total_revenue: 500000 }],
        monthlyTrends: [{ month: '2024-01', properties: 10, sold: 5, rented: 2 }]
      };

      const mockAgentPerformance = {
        topAgents: [{ id: 1, name: 'John Doe', total_properties: 20, properties_sold: 10 }],
        agentStats: [{ id: 1, name: 'John Doe', total_properties: 20 }]
      };

      // Mock pool.query for basic analytics
      pool.query
        .mockResolvedValueOnce({ rows: [mockBasicAnalytics.overview] })
        .mockResolvedValueOnce({ rows: mockBasicAnalytics.propertyTypes })
        .mockResolvedValueOnce({ rows: mockBasicAnalytics.locations })
        .mockResolvedValueOnce({ rows: [mockBasicAnalytics.imageStats] })
        // Mock financial analytics
        .mockResolvedValueOnce({ rows: mockFinancialData.revenue })
        .mockResolvedValueOnce({ rows: mockFinancialData.monthlyTrends })
        // Mock agent performance
        .mockResolvedValueOnce({ rows: mockAgentPerformance.topAgents })
        .mockResolvedValueOnce({ rows: mockAgentPerformance.agentStats });

      await analyticsController.getAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overview: expect.any(Object),
          propertyTypes: expect.any(Array),
          locations: expect.any(Array),
          imageStats: expect.any(Object),
          role: 'admin',
          permissions: {
            canViewFinancial: true,
            canViewAgentPerformance: true
          },
          financial: expect.any(Object),
          agentPerformance: expect.any(Object)
        })
      });
    });

    it('should get analytics without financial data for operations role', async () => {
      req.roleFilters = {
        role: 'operations',
        canViewFinancial: false,
        canViewAgentPerformance: false,
        canViewAll: false
      };
      req.query = { timeRange: '3M' };

      const mockBasicAnalytics = {
        overview: { total_properties: 100 },
        propertyTypes: [],
        locations: [],
        imageStats: {}
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockBasicAnalytics.overview] })
        .mockResolvedValueOnce({ rows: mockBasicAnalytics.propertyTypes })
        .mockResolvedValueOnce({ rows: mockBasicAnalytics.locations })
        .mockResolvedValueOnce({ rows: [mockBasicAnalytics.imageStats] });

      await analyticsController.getAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overview: expect.any(Object),
          role: 'operations',
          permissions: {
            canViewFinancial: false,
            canViewAgentPerformance: false
          }
        })
      });
      expect(res.json.mock.calls[0][0].data.financial).toBeUndefined();
      expect(res.json.mock.calls[0][0].data.agentPerformance).toBeUndefined();
    });

    it('should handle errors', async () => {
      req.query = { timeRange: '6M' };
      pool.query.mockRejectedValue(new Error('Database error'));

      await analyticsController.getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getDashboardStats', () => {
    it('should get dashboard stats with financial data for admin', async () => {
      req.roleFilters = {
        role: 'admin',
        canViewFinancial: true,
        canViewAgentPerformance: true,
        canViewAll: true
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ with_images: '80', without_images: '20' }] })
        .mockResolvedValueOnce({ rows: [{ sold_count: '15', total_revenue: '500000' }] });

      await analyticsController.getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalProperties: 100,
          propertiesWithImages: 80,
          propertiesWithoutImages: 20,
          monthlyRevenue: 500000,
          conversionRate: expect.any(String),
          activeClients: expect.any(Number)
        }),
        role: 'admin'
      });
    });

    it('should get dashboard stats without financial data for operations role', async () => {
      req.roleFilters = {
        role: 'operations',
        canViewFinancial: false,
        canViewAgentPerformance: false,
        canViewAll: false
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ with_images: '80', without_images: '20' }] });

      await analyticsController.getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalProperties: 100,
          propertiesWithImages: 80,
          propertiesWithoutImages: 20,
          monthlyRevenue: 0,
          conversionRate: expect.any(Number),
          activeClients: expect.any(Number)
        }),
        role: 'operations'
      });
    });

    it('should handle errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await analyticsController.getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getImageAnalytics', () => {
    it('should get image analytics for admin', async () => {
      req.roleFilters = {
        role: 'admin',
        canViewAll: true
      };

      const mockImageStats = {
        total_properties: 100,
        with_main_image: 80,
        with_gallery: 60,
        with_both: 50,
        without_images: 20,
        avg_gallery_size: 5.5
      };

      const mockByImageStatus = [
        { image_status: 'Complete', count: 50 },
        { image_status: 'No Images', count: 20 }
      ];

      const mockPropertiesWithoutImages = [
        { id: 1, reference_number: 'PROP001', location: 'Beirut', created_at: '2024-01-01' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [mockImageStats] })
        .mockResolvedValueOnce({ rows: mockByImageStatus })
        .mockResolvedValueOnce({ rows: mockPropertiesWithoutImages });

      await analyticsController.getImageAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overview: mockImageStats,
          byImageStatus: mockByImageStatus,
          propertiesWithoutImages: mockPropertiesWithoutImages
        }
      });
    });

    it('should return 403 for unauthorized access', async () => {
      req.roleFilters = {
        role: 'agent',
        canViewAll: false
      };

      await analyticsController.getImageAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to view image analytics.'
      });
    });

    it('should handle errors', async () => {
      req.roleFilters = {
        role: 'admin',
        canViewAll: true
      };
      pool.query.mockRejectedValue(new Error('Database error'));

      await analyticsController.getImageAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});

