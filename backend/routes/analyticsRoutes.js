// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { 
  authenticateToken, 
  filterDataByRole,
  canViewFinancialData,
  canViewAgentPerformance
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/analytics - Get analytics data (filtered by role)
router.get('/', analyticsController.getAnalytics);

// GET /api/analytics/dashboard - Get dashboard statistics (filtered by role)
router.get('/dashboard', analyticsController.getDashboardStats);

// GET /api/analytics/financial - Get financial data (admin and operations manager only)
router.get('/financial', canViewFinancialData, (req, res) => {
  // This endpoint would return detailed financial analytics
  res.json({
    success: true,
    message: 'Financial analytics endpoint - accessible to admin and operations manager only',
    data: {
      totalRevenue: 0,
      monthlyRevenue: [],
      profitMargins: [],
      expenses: []
    }
  });
});

// GET /api/analytics/agent-performance - Get agent performance data (admin, operations manager, agent manager)
router.get('/agent-performance', canViewAgentPerformance, (req, res) => {
  // This endpoint would return detailed agent performance analytics
  res.json({
    success: true,
    message: 'Agent performance analytics endpoint - accessible to admin, operations manager, and agent manager only',
    data: {
      topPerformers: [],
      performanceMetrics: [],
      commissionData: []
    }
  });
});

module.exports = router;
