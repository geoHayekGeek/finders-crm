// leadsStatsController.js - Controller for leads statistics
const pool = require('../config/db');

class LeadsStatsController {
  // Get comprehensive leads statistics
  static async getLeadsStats(req, res) {
    try {
      console.log('📊 Fetching leads statistics...');

      // Normalize role for comparison
      const normalizeRole = (role) => role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';
      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      // Determine if we need to filter by agent
      const isAgentOrTeamLeader = ['agent', 'team leader'].includes(userRole);
      
      // Build WHERE clause and params from filters
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Role-based filtering
      if (isAgentOrTeamLeader) {
        whereConditions.push(`l.agent_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      // Apply additional filters from query parameters
      const filters = req.query;
      
      if (filters.status && filters.status !== 'All') {
        whereConditions.push(`l.status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.agent_id) {
        const agentId = parseInt(filters.agent_id);
        if (!isNaN(agentId)) {
          // Override role-based filter if agent_id is specified
          whereConditions = whereConditions.filter(cond => !cond.includes('agent_id'));
          whereConditions.push(`l.agent_id = $${paramIndex}`);
          params.push(agentId);
          paramIndex++;
        }
      }

      if (filters.date_from && filters.date_from.trim() !== '') {
        whereConditions.push(`l.date >= $${paramIndex}::date`);
        params.push(filters.date_from.trim());
        paramIndex++;
      }

      if (filters.date_to && filters.date_to.trim() !== '') {
        whereConditions.push(`l.date < ($${paramIndex}::date + interval '1 day')`);
        params.push(filters.date_to.trim());
        paramIndex++;
      }

      if (filters.reference_source_id) {
        const refSourceId = parseInt(filters.reference_source_id);
        if (!isNaN(refSourceId)) {
          whereConditions.push(`l.reference_source_id = $${paramIndex}`);
          params.push(refSourceId);
          paramIndex++;
        }
      }

      if (filters.search) {
        whereConditions.push(`(l.customer_name ILIKE $${paramIndex} OR l.phone_number ILIKE $${paramIndex} OR l.agent_name ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Execute all queries in parallel for better performance
      const [
        totalResult,
        statusResult,
        priceResult,
        sourceResult,
        recentResult,
        agentResult,
        monthlyResult,
        seriousViewingsResult
      ] = await Promise.all([
        // Total leads
        pool.query(
          `SELECT COUNT(*) as total FROM leads l ${whereClause}`,
          params
        ),
        
        // By status
        pool.query(
          `SELECT status, COUNT(*) as count FROM leads l ${whereClause} GROUP BY status ORDER BY count DESC`,
          params
        ),
        
        // Price statistics
        pool.query(
          `SELECT COUNT(*) as with_price, AVG(price) as avg_price, SUM(price) as total_value, MIN(price) as min_price, MAX(price) as max_price FROM leads l ${whereClause} ${whereClause ? 'AND' : 'WHERE'} price IS NOT NULL`,
          params
        ),
        
        // Top reference sources
        pool.query(
          `SELECT rs.source_name, COUNT(*) as count FROM leads l LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id ${whereClause} GROUP BY rs.source_name, rs.id ORDER BY count DESC LIMIT 5`,
          params
        ),
        
        // Recent activity (last 7 days)
        pool.query(
          `SELECT COUNT(*) as recent FROM leads l ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= NOW() - INTERVAL '7 days'`,
          params
        ),
        
        // Top agents (skip for agents/team leaders, or show just themselves)
        pool.query(
          isAgentOrTeamLeader
            ? `SELECT u.name, COUNT(*) as count FROM leads l LEFT JOIN users u ON l.agent_id = u.id ${whereClause} ${whereClause ? 'AND' : 'WHERE'} u.name IS NOT NULL GROUP BY u.name, u.id ORDER BY count DESC LIMIT 1`
            : `SELECT u.name, COUNT(*) as count FROM leads l LEFT JOIN users u ON l.agent_id = u.id ${whereClause} ${whereClause ? 'AND' : 'WHERE'} u.name IS NOT NULL GROUP BY u.name, u.id ORDER BY count DESC LIMIT 5`,
          params
        ),

        // Monthly trends (last 6 months)
        pool.query(
          `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM leads l ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= NOW() - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC LIMIT 6`,
          params
        ),

        // Count of leads with serious viewings
        pool.query(
          `SELECT COUNT(DISTINCT l.id) as leads_with_serious_viewings
           FROM leads l
           INNER JOIN viewings v ON l.id = v.lead_id
           ${whereClause} ${whereClause ? 'AND' : 'WHERE'} v.is_serious = true`,
          params
        )
      ]);

      // Calculate percentage of leads with serious viewings
      const totalLeads = parseInt(totalResult.rows[0].total) || 0;
      const leadsWithSeriousViewings = parseInt(seriousViewingsResult.rows[0]?.leads_with_serious_viewings || 0);
      const seriousViewingsPercentage = totalLeads > 0 
        ? ((leadsWithSeriousViewings / totalLeads) * 100).toFixed(1)
        : '0.0';

      // Format the statistics data
      const stats = {
        total: totalLeads,
        
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
        })),
        
        seriousViewingsPercentage: parseFloat(seriousViewingsPercentage)
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
