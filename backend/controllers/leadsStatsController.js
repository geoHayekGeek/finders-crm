// leadsStatsController.js - Controller for leads statistics
const pool = require('../config/db');

class LeadsStatsController {
  // Get comprehensive leads statistics
  static async getLeadsStats(req, res) {
    try {
      console.log('📊 Fetching leads statistics...');

      // Execute all queries in parallel for better performance
      const [
        totalResult,
        statusResult,
        priceResult,
        sourceResult,
        recentResult,
        agentResult,
        monthlyResult
      ] = await Promise.all([
        // Total leads
        pool.query('SELECT COUNT(*) as total FROM leads'),
        
        // By status
        pool.query(`
          SELECT status, COUNT(*) as count 
          FROM leads 
          GROUP BY status 
          ORDER BY count DESC
        `),
        
        // Price statistics
        pool.query(`
          SELECT 
            COUNT(*) as with_price, 
            AVG(price) as avg_price, 
            SUM(price) as total_value,
            MIN(price) as min_price,
            MAX(price) as max_price
          FROM leads 
          WHERE price IS NOT NULL
        `),
        
        // Top reference sources
        pool.query(`
          SELECT rs.source_name, COUNT(*) as count 
          FROM leads l 
          LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id 
          GROUP BY rs.source_name, rs.id 
          ORDER BY count DESC 
          LIMIT 5
        `),
        
        // Recent activity (last 7 days)
        pool.query(`
          SELECT COUNT(*) as recent 
          FROM leads 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `),
        
        // Top agents
        pool.query(`
          SELECT u.name, COUNT(*) as count 
          FROM leads l 
          LEFT JOIN users u ON l.agent_id = u.id 
          WHERE u.name IS NOT NULL
          GROUP BY u.name, u.id 
          ORDER BY count DESC 
          LIMIT 5
        `),

        // Monthly trends (last 6 months)
        pool.query(`
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
          FROM leads 
          WHERE created_at >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month DESC
          LIMIT 6
        `)
      ]);

      // Format the statistics data
      const stats = {
        total: parseInt(totalResult.rows[0].total),
        
        byStatus: statusResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count)
        })),
        
        pricing: {
          withPrice: parseInt(priceResult.rows[0].with_price),
          averagePrice: priceResult.rows[0].avg_price ? parseFloat(priceResult.rows[0].avg_price) : 0,
          totalValue: priceResult.rows[0].total_value ? parseFloat(priceResult.rows[0].total_value) : 0,
          minPrice: priceResult.rows[0].min_price ? parseFloat(priceResult.rows[0].min_price) : 0,
          maxPrice: priceResult.rows[0].max_price ? parseFloat(priceResult.rows[0].max_price) : 0
        },
        
        topSources: sourceResult.rows.map(row => ({
          name: row.source_name || 'Unassigned',
          count: parseInt(row.count)
        })),
        
        recentActivity: {
          newLeads7Days: parseInt(recentResult.rows[0].recent)
        },
        
        topAgents: agentResult.rows.map(row => ({
          name: row.name,
          count: parseInt(row.count)
        })),
        
        monthlyTrends: monthlyResult.rows.map(row => ({
          month: row.month,
          count: parseInt(row.count)
        }))
      };

      console.log('✅ Statistics fetched successfully');
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching leads statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leads statistics',
        error: error.message
      });
    }
  }
}

module.exports = LeadsStatsController;
