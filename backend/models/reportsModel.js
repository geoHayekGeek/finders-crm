// backend/models/reportsModel.js
const pool = require('../config/db');

// Helper function to ensure external column exists
async function ensureExternalColumnExists() {
  try {
    await pool.query(`
      ALTER TABLE referrals 
      ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL
    `);
  } catch (error) {
    // Column might already exist, ignore
  }
}

class Report {
  /**
   * Create a new monthly agent report
   * @param {Object} reportData - Report data including agent_id, month, year
   * @param {number} createdBy - ID of user creating the report
   * @returns {Promise<Object>} Created report with calculated data
   */
  static async createMonthlyReport(reportData, createdBy) {
    // Ensure external column exists
    await ensureExternalColumnExists();
    
    const {
      agent_id,
      month,
      year,
      boosts = 0
    } = reportData;

    try {
      // Check if report already exists
      const existing = await pool.query(
        'SELECT id FROM monthly_agent_reports WHERE agent_id = $1 AND month = $2 AND year = $3',
        [agent_id, month, year]
      );

      if (existing.rows.length > 0) {
        throw new Error('Report already exists for this agent and month');
      }

      // Calculate report data
      const calculatedData = await this.calculateReportData(agent_id, month, year);

      // Insert new report
      const result = await pool.query(
        `INSERT INTO monthly_agent_reports (
          agent_id, month, year, boosts, 
          listings_count, lead_sources, viewings_count,
          sales_count, sales_amount,
          agent_commission, finders_commission, referral_commission,
          team_leader_commission, administration_commission, total_commission,
          referral_received_count, referral_received_commission,
          referrals_on_properties_count, referrals_on_properties_commission,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          agent_id, month, year, boosts,
          calculatedData.listings_count,
          JSON.stringify(calculatedData.lead_sources),
          calculatedData.viewings_count,
          calculatedData.sales_count,
          calculatedData.sales_amount,
          calculatedData.agent_commission,
          calculatedData.finders_commission,
          calculatedData.referral_commission,
          calculatedData.team_leader_commission,
          calculatedData.administration_commission,
          calculatedData.total_commission,
          calculatedData.referral_received_count,
          calculatedData.referral_received_commission,
          calculatedData.referrals_on_properties_count,
          calculatedData.referrals_on_properties_commission,
          createdBy
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating monthly report:', error);
      throw error;
    }
  }

  /**
   * Calculate all report data for an agent in a specific month/year
   * @param {number} agentId - Agent ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Calculated report data
   */
  static async calculateReportData(agentId, month, year) {
    try {
      // Get commission settings
      const commissionsResult = await pool.query(
        `SELECT setting_key, setting_value FROM system_settings 
         WHERE setting_key IN ('commission_agent', 'commission_finders', 'commission_referral', 
                               'commission_team_leader', 'commission_administration')`
      );
      
      const commissions = {};
      commissionsResult.rows.forEach(row => {
        const key = row.setting_key.replace('commission_', '');
        commissions[key] = parseFloat(row.setting_value) || 0;
      });

      // Calculate date range for the month
      // month is 1-12, JavaScript months are 0-11
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      // Get last day of the month by going to first day of next month and subtracting 1 day
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      
      // Format dates as YYYY-MM-DD strings for SQL comparison
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`📅 Calculating report for agent ${agentId}, month ${month}, year ${year}`);
      console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

      // 1. Count listings created by agent in this month
      const listingsResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM properties 
         WHERE agent_id = $1 
         AND created_at >= $2::timestamp
         AND created_at <= $3::timestamp`,
        [agentId, startDate.toISOString(), endDate.toISOString()]
      );
      const listings_count = parseInt(listingsResult.rows[0].count) || 0;
      
      // Debug: Also get total properties for this agent to verify
      const debugResult = await pool.query(
        `SELECT COUNT(*) as total, 
                MIN(DATE(created_at)) as earliest, 
                MAX(DATE(created_at)) as latest
         FROM properties 
         WHERE agent_id = $1`,
        [agentId]
      );
      console.log(`📊 Agent ${agentId}: Total properties = ${debugResult.rows[0].total}, Date range: ${debugResult.rows[0].earliest} to ${debugResult.rows[0].latest}, Count in ${month}/${year} = ${listings_count}`);

      // 2. Count leads by source for this agent in this month
      const leadsResult = await pool.query(
        `SELECT rs.source_name, COUNT(*) as count
         FROM leads l
         LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
         WHERE l.agent_id = $1 
         AND DATE(l.date) >= $2::date 
         AND DATE(l.date) <= $3::date
         GROUP BY rs.source_name`,
        [agentId, startDateStr, endDateStr]
      );
      
      const lead_sources = {};
      leadsResult.rows.forEach(row => {
        const sourceName = row.source_name || 'Unknown';
        lead_sources[sourceName] = parseInt(row.count) || 0;
      });

      // 3. Count viewings conducted by agent in this month
      const viewingsResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM viewings 
         WHERE agent_id = $1 
         AND viewing_date >= $2::date 
         AND viewing_date <= $3::date`,
        [agentId, startDateStr, endDateStr]
      );
      const viewings_count = parseInt(viewingsResult.rows[0].count) || 0;

      // 4. Count sales and sales amount (based on closed_date in this month)
      const salesResult = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total_amount
         FROM properties 
         WHERE agent_id = $1 
         AND closed_date >= $2::date 
         AND closed_date <= $3::date
         AND status_id IN (
           SELECT id FROM statuses 
           WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
           OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
           OR LOWER(name) IN ('sold', 'rented', 'closed')
         )`,
        [agentId, startDateStr, endDateStr]
      );
      const sales_count = parseInt(salesResult.rows[0].count) || 0;
      const sales_amount = parseFloat(salesResult.rows[0].total_amount) || 0;

      // 5. Calculate commissions based on sales amount
      const agent_commission = (sales_amount * (commissions.agent || 2)) / 100;
      const finders_commission = (sales_amount * (commissions.finders || 1)) / 100;
      const referral_commission = (sales_amount * (commissions.referral || 0.5)) / 100;
      const team_leader_commission = (sales_amount * (commissions.team_leader || 1)) / 100;
      const administration_commission = (sales_amount * (commissions.administration || 4)) / 100;
      // Note: total_commission will be calculated after referrals_on_properties_commission

      // 6. Calculate referral commission from two sources:
      // A) Property referrals - where this agent referred a property (internal only)
      // B) Lead referrals - where this agent referred the owner (lead) of a property (internal only)
      
      // 6A. Property Referrals Commission
      // Count closed properties where this agent referred the property (via referrals table)
      let propertyReferralsResult;
      try {
        propertyReferralsResult = await pool.query(
          `SELECT COUNT(DISTINCT p.id) as count, COALESCE(SUM(p.price), 0) as total_amount
           FROM properties p
           INNER JOIN referrals r ON p.id = r.property_id
           WHERE r.employee_id = $1 
           AND (r.external = FALSE OR r.external IS NULL)
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        // If external column doesn't exist, query without it
        if (error.code === '42703' || error.message.includes('external')) {
          propertyReferralsResult = await pool.query(
            `SELECT COUNT(DISTINCT p.id) as count, COALESCE(SUM(p.price), 0) as total_amount
             FROM properties p
             INNER JOIN referrals r ON p.id = r.property_id
             WHERE r.employee_id = $1 
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               SELECT id FROM statuses 
               WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
               OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
             )`,
            [agentId, startDateStr, endDateStr]
          );
        } else {
          throw error;
        }
      }
      const property_referral_count = parseInt(propertyReferralsResult.rows[0].count) || 0;
      const property_referral_amount = parseFloat(propertyReferralsResult.rows[0].total_amount) || 0;

      // 6B. Lead Referrals Commission
      // Count closed properties where this agent referred the owner (lead) of the property
      let leadReferralsResult;
      try {
        leadReferralsResult = await pool.query(
          `SELECT COUNT(DISTINCT p.id) as count, COALESCE(SUM(p.price), 0) as total_amount
           FROM properties p
           INNER JOIN leads l ON p.owner_id = l.id
           INNER JOIN lead_referrals lr ON l.id = lr.lead_id
           WHERE lr.agent_id = $1 
           AND (lr.external = FALSE OR lr.external IS NULL)
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        // If external column doesn't exist or lead_referrals table doesn't exist, set to 0
        if (error.code === '42703' || error.code === '42P01' || error.message.includes('external') || error.message.includes('lead_referrals')) {
          leadReferralsResult = { rows: [{ count: 0, total_amount: 0 }] };
        } else {
          throw error;
        }
      }
      const lead_referral_count = parseInt(leadReferralsResult.rows[0].count) || 0;
      const lead_referral_amount = parseFloat(leadReferralsResult.rows[0].total_amount) || 0;

      // Total referral commission from both sources
      const referral_received_count = property_referral_count + lead_referral_count;
      const referral_received_amount = property_referral_amount + lead_referral_amount;
      const referral_received_commission = (referral_received_amount * (commissions.referral || 0.5)) / 100;

      // 7. Calculate referrals ON this agent's properties (people who referred TO this agent)
      // Count total internal referrals on agent's properties where the referral date is in the report month
      let referralsCountResult;
      try {
        referralsCountResult = await pool.query(
          `SELECT COUNT(r.id) as count
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE p.agent_id = $1
           AND (r.external = FALSE OR r.external IS NULL)
           AND r.date >= $2::date 
           AND r.date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        // If date column doesn't exist, fallback to old behavior
        if (error.code === '42703' || error.message.includes('date')) {
          referralsCountResult = await pool.query(
            `SELECT COUNT(r.id) as count
             FROM referrals r
             INNER JOIN properties p ON r.property_id = p.id
             LEFT JOIN statuses s ON p.status_id = s.id
             WHERE p.agent_id = $1
             AND (r.external = FALSE OR r.external IS NULL)
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               SELECT id FROM statuses 
               WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
               OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
             )`,
            [agentId, startDateStr, endDateStr]
          );
        } else {
          throw error;
        }
      }
      
      const referrals_on_properties_count = parseInt(referralsCountResult.rows[0].count) || 0;
      
      // Calculate commission for referrals on agent's properties
      let referralsAmountResult;
      try {
        referralsAmountResult = await pool.query(
          `SELECT COALESCE(SUM(p.price), 0) as total_amount
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE p.agent_id = $1
           AND (r.external = FALSE OR r.external IS NULL)
           AND r.date >= $2::date 
           AND r.date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        // If date column doesn't exist, fallback to old behavior
        if (error.code === '42703' || error.message.includes('date')) {
          referralsAmountResult = await pool.query(
            `SELECT COALESCE(SUM(p.price), 0) as total_amount
             FROM referrals r
             INNER JOIN properties p ON r.property_id = p.id
             LEFT JOIN statuses s ON p.status_id = s.id
             WHERE p.agent_id = $1
             AND (r.external = FALSE OR r.external IS NULL)
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               SELECT id FROM statuses 
               WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
               OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
             )`,
            [agentId, startDateStr, endDateStr]
          );
        } else {
          throw error;
        }
      }
      
      const referrals_on_properties_amount = parseFloat(referralsAmountResult.rows[0].total_amount) || 0;
      const referrals_on_properties_commission = (referrals_on_properties_amount * (commissions.referral || 0.5)) / 100;

      // Calculate total commission including referrals on properties commission
      const total_commission = agent_commission + finders_commission + referral_commission + 
                              team_leader_commission + administration_commission + referrals_on_properties_commission;

      return {
        listings_count,
        lead_sources,
        viewings_count,
        sales_count,
        sales_amount,
        agent_commission,
        finders_commission,
        referral_commission,
        team_leader_commission,
        administration_commission,
        total_commission,
        referral_received_count,
        referral_received_commission,
        referrals_on_properties_count,
        referrals_on_properties_commission
      };
    } catch (error) {
      console.error('Error calculating report data:', error);
      throw error;
    }
  }

  /**
   * Recalculate existing report (keeping manual fields like boosts)
   * @param {number} reportId - Report ID to recalculate
   * @returns {Promise<Object>} Updated report
   */
  static async recalculateReport(reportId) {
    // Ensure external column exists
    await ensureExternalColumnExists();
    
    try {
      // Get existing report
      const existing = await pool.query(
        'SELECT * FROM monthly_agent_reports WHERE id = $1',
        [reportId]
      );

      if (existing.rows.length === 0) {
        throw new Error('Report not found');
      }

      const report = existing.rows[0];
      
      // Recalculate data (preserving manual fields)
      const calculatedData = await this.calculateReportData(
        report.agent_id,
        report.month,
        report.year
      );

      // Update report with new calculations, keeping manual fields
      const result = await pool.query(
        `UPDATE monthly_agent_reports SET
          listings_count = $1,
          lead_sources = $2,
          viewings_count = $3,
          sales_count = $4,
          sales_amount = $5,
          agent_commission = $6,
          finders_commission = $7,
          referral_commission = $8,
          team_leader_commission = $9,
          administration_commission = $10,
          total_commission = $11,
          referral_received_count = $12,
          referral_received_commission = $13,
          referrals_on_properties_count = $14,
          referrals_on_properties_commission = $15,
          updated_at = NOW()
        WHERE id = $16
        RETURNING *`,
        [
          calculatedData.listings_count,
          JSON.stringify(calculatedData.lead_sources),
          calculatedData.viewings_count,
          calculatedData.sales_count,
          calculatedData.sales_amount,
          calculatedData.agent_commission,
          calculatedData.finders_commission,
          calculatedData.referral_commission,
          calculatedData.team_leader_commission,
          calculatedData.administration_commission,
          calculatedData.total_commission,
          calculatedData.referral_received_count,
          calculatedData.referral_received_commission,
          calculatedData.referrals_on_properties_count,
          calculatedData.referrals_on_properties_commission,
          reportId
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recalculating report:', error);
      throw error;
    }
  }

  /**
   * Get all monthly reports with optional filters
   * @param {Object} filters - Optional filters (agent_id, month, year)
   * @returns {Promise<Array>} Array of reports with agent names
   */
  static async getAllReports(filters = {}) {
    try {
      let query = `
        SELECT 
          r.*,
          u.name as agent_name,
          u.user_code as agent_code,
          u.role as agent_role
        FROM monthly_agent_reports r
        LEFT JOIN users u ON r.agent_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let valueIndex = 1;

      if (filters.agent_id) {
        query += ` AND r.agent_id = $${valueIndex}`;
        values.push(filters.agent_id);
        valueIndex++;
      }

      if (filters.month) {
        query += ` AND r.month = $${valueIndex}`;
        values.push(filters.month);
        valueIndex++;
      }

      if (filters.year) {
        query += ` AND r.year = $${valueIndex}`;
        values.push(filters.year);
        valueIndex++;
      }

      query += ' ORDER BY r.year DESC, r.month DESC, u.name ASC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }

  /**
   * Get a single report by ID
   * @param {number} id - Report ID
   * @returns {Promise<Object>} Report with agent details
   */
  static async getReportById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          r.*,
          u.name as agent_name,
          u.user_code as agent_code,
          u.role as agent_role
        FROM monthly_agent_reports r
        LEFT JOIN users u ON r.agent_id = u.id
        WHERE r.id = $1`,
        [id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting report by ID:', error);
      throw error;
    }
  }

  /**
   * Update a report (mainly for manual fields like boosts)
   * @param {number} id - Report ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated report
   */
  static async updateReport(id, updates) {
    try {
      const { boosts } = updates;
      
      const result = await pool.query(
        `UPDATE monthly_agent_reports SET
          boosts = COALESCE($1, boosts),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
        [boosts, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  }

  /**
   * Delete a report
   * @param {number} id - Report ID
   * @returns {Promise<Object>} Deleted report
   */
  static async deleteReport(id) {
    try {
      const result = await pool.query(
        'DELETE FROM monthly_agent_reports WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  /**
   * Get available lead sources from reference_sources table
   * @returns {Promise<Array>} Array of source names
   */
  static async getAvailableLeadSources() {
    try {
      const result = await pool.query(
        'SELECT source_name FROM reference_sources ORDER BY source_name'
      );
      return result.rows.map(row => row.source_name);
    } catch (error) {
      console.error('Error getting lead sources:', error);
      throw error;
    }
  }
}

module.exports = Report;

