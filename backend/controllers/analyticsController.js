// controllers/analyticsController.js
const pool = require('../config/db');

// Get analytics data with role-based filtering
const getAnalytics = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { timeRange = '6M' } = req.query;

    // Basic analytics that all roles can see
    const basicAnalytics = await getBasicAnalytics(timeRange);
    
    let response = {
      success: true,
      data: {
        ...basicAnalytics,
        role: roleFilters.role,
        permissions: {
          canViewFinancial: roleFilters.canViewFinancial,
          canViewAgentPerformance: roleFilters.canViewAgentPerformance
        }
      }
    };

    // Add financial data for admin and operations manager only
    if (roleFilters.canViewFinancial) {
      const financialData = await getFinancialAnalytics(timeRange);
      response.data.financial = financialData;
    }

    // Add agent performance data for admin, operations manager, and agent manager
    if (roleFilters.canViewAgentPerformance) {
      const agentPerformance = await getAgentPerformanceAnalytics(timeRange);
      response.data.agentPerformance = agentPerformance;
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get basic analytics (available to all roles)
const getBasicAnalytics = async (timeRange) => {
  const timeFilter = getTimeFilter(timeRange);
  
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_properties,
      COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale,
      COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent,
      COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold,
      COUNT(CASE WHEN status = 'Rented' THEN 1 END) as rented,
      COUNT(CASE WHEN featured = true THEN 1 END) as featured
    FROM properties
    WHERE created_at >= $1
  `, [timeFilter]);

  const propertyTypes = await pool.query(`
    SELECT 
      type,
      COUNT(*) as count
    FROM properties
    WHERE created_at >= $1
    GROUP BY type
    ORDER BY count DESC
  `, [timeFilter]);

  const locationStats = await pool.query(`
    SELECT 
      SPLIT_PART(address, ', ', 2) as location,
      COUNT(*) as count
    FROM properties
    WHERE created_at >= $1 AND SPLIT_PART(address, ', ', 2) IS NOT NULL
    GROUP BY SPLIT_PART(address, ', ', 2)
    ORDER BY count DESC
    LIMIT 10
  `, [timeFilter]);

  return {
    overview: result.rows[0],
    propertyTypes: propertyTypes.rows,
    locations: locationStats.rows
  };
};

// Get financial analytics (admin and operations manager only)
const getFinancialAnalytics = async (timeRange) => {
  const timeFilter = getTimeFilter(timeRange);
  
  // This would typically come from actual transaction data
  // For now, we'll simulate with property data
  const revenueData = await pool.query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as properties_sold,
      SUM(CASE 
        WHEN status = 'Sold' THEN CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS INTEGER)
        ELSE 0 
      END) as total_revenue
    FROM properties
    WHERE created_at >= $1 AND status = 'Sold'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `, [timeFilter]);

  const monthlyTrends = await pool.query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as properties,
      COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold,
      COUNT(CASE WHEN status = 'Rented' THEN 1 END) as rented
    FROM properties
    WHERE created_at >= $1
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `, [timeFilter]);

  return {
    revenue: revenueData.rows,
    monthlyTrends: monthlyTrends.rows
  };
};

// Get agent performance analytics (admin, operations manager, agent manager)
const getAgentPerformanceAnalytics = async (timeRange) => {
  const timeFilter = getTimeFilter(timeRange);
  
  const topAgents = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.role,
      COUNT(p.id) as total_properties,
      COUNT(CASE WHEN p.status = 'Sold' THEN 1 END) as properties_sold,
      COUNT(CASE WHEN p.status = 'Rented' THEN 1 END) as properties_rented,
      AVG(CASE 
        WHEN p.status = 'Sold' THEN CAST(REPLACE(REPLACE(p.price, '$', ''), ',', '') AS INTEGER)
        ELSE NULL 
      END) as avg_sale_price
    FROM users u
    LEFT JOIN properties p ON u.id = p.agent_id AND p.created_at >= $1
    WHERE u.role = 'agent'
    GROUP BY u.id, u.name, u.role
    ORDER BY properties_sold DESC, total_properties DESC
    LIMIT 10
  `, [timeFilter]);

  const agentStats = await pool.query(`
    SELECT 
      u.id,
      u.name,
      COUNT(p.id) as total_properties,
      COUNT(CASE WHEN p.status = 'Sold' THEN 1 END) as sold,
      COUNT(CASE WHEN p.status = 'Rented' THEN 1 END) as rented,
      COUNT(CASE WHEN p.status = 'For Sale' THEN 1 END) as active_listings
    FROM users u
    LEFT JOIN properties p ON u.id = p.agent_id AND p.created_at >= $1
    WHERE u.role = 'agent'
    GROUP BY u.id, u.name
    ORDER BY total_properties DESC
  `, [timeFilter]);

  return {
    topAgents: topAgents.rows,
    agentStats: agentStats.rows
  };
};

// Get dashboard statistics with role-based filtering
const getDashboardStats = async (req, res) => {
  try {
    const { roleFilters } = req;
    
    let stats = {
      totalProperties: 0,
      activeClients: 0,
      monthlyRevenue: 0,
      conversionRate: 0
    };

    // Basic stats available to all roles
    const propertiesResult = await pool.query(`
      SELECT COUNT(*) as count FROM properties
    `);
    stats.totalProperties = parseInt(propertiesResult.rows[0].count);

    // Financial stats only for admin and operations manager
    if (roleFilters.canViewFinancial) {
      const revenueResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold_count,
          SUM(CASE 
            WHEN status = 'Sold' THEN CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS INTEGER)
            ELSE 0 
          END) as total_revenue
        FROM properties
        WHERE status = 'Sold' AND created_at >= DATE_TRUNC('month', NOW())
      `);
      
      stats.monthlyRevenue = parseInt(revenueResult.rows[0].total_revenue || 0);
      stats.conversionRate = propertiesResult.rows[0].count > 0 ? 
        ((parseInt(revenueResult.rows[0].sold_count) / parseInt(propertiesResult.rows[0].count)) * 100).toFixed(1) : 0;
    }

    // Client stats (simplified for demo)
    stats.activeClients = Math.floor(Math.random() * 200) + 100; // Mock data

    res.json({
      success: true,
      data: stats,
      role: roleFilters.role
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to get time filter based on timeRange
const getTimeFilter = (timeRange) => {
  const now = new Date();
  switch (timeRange) {
    case '1M':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case '3M':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6M':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1Y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  }
};

module.exports = {
  getAnalytics,
  getDashboardStats
};
