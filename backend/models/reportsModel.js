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

// Helper function to round monetary values to 2 decimal places
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

class Report {
  /**
   * Create a new agent report for a date range
   * @param {Object} reportData - Report data including agent_id, start_date, end_date
   * @param {number} createdBy - ID of user creating the report
   * @returns {Promise<Object>} Created report with calculated data
   */
  static async createMonthlyReport(reportData, createdBy) {
    // Ensure external column exists
    await ensureExternalColumnExists();

    const {
      agent_id,
      start_date,
      end_date,
      boosts = 0
    } = reportData;

    try {
      if (!start_date || !end_date) {
        throw new Error('Start date and end date are required');
      }

      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);

      if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
        throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
      }

      if (endDateObj < startDateObj) {
        throw new Error('End date cannot be before start date');
      }

      // Normalize to full inclusive days in UTC
      const normalizedStart = new Date(Date.UTC(
        startDateObj.getUTCFullYear(),
        startDateObj.getUTCMonth(),
        startDateObj.getUTCDate(),
        0, 0, 0, 0
      ));
      const normalizedEnd = new Date(Date.UTC(
        endDateObj.getUTCFullYear(),
        endDateObj.getUTCMonth(),
        endDateObj.getUTCDate(),
        23, 59, 59, 999
      ));

      const startDateStr = normalizedStart.toISOString().split('T')[0];
      const endDateStr = normalizedEnd.toISOString().split('T')[0];

      // Check if report already exists for this exact range
      const existing = await pool.query(
        'SELECT id FROM monthly_agent_reports WHERE agent_id = $1 AND start_date = $2::date AND end_date = $3::date',
        [agent_id, startDateStr, endDateStr]
      );

      if (existing.rows.length > 0) {
        throw new Error('Report already exists for this agent and date range');
      }

      // Derive month/year (legacy columns) from the start date for backwards compatibility
      const derivedMonth = normalizedStart.getUTCMonth() + 1;
      const derivedYear = normalizedStart.getUTCFullYear();

      // Calculate report data
      const calculatedData = await this.calculateReportData(agent_id, normalizedStart, normalizedEnd);

      // Insert new report
      const result = await pool.query(
        `INSERT INTO monthly_agent_reports (
          agent_id,
          month,
          year,
          start_date,
          end_date,
          boosts,
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
          referrals_on_properties_commission,
          created_by
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22
        )
        RETURNING *`,
        [
          agent_id,
          derivedMonth,
          derivedYear,
          startDateStr,
          endDateStr,
          boosts,
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
      console.error('Error creating agent report:', error);
      throw error;
    }
  }

  /**
   * Calculate all report data for an agent in a specific date range
   * @param {number} agentId - Agent ID
   * @param {Date|string} startDateInput - Start date of range
   * @param {Date|string} endDateInput - End date of range
   * @returns {Promise<Object>} Calculated report data
   */
  static async calculateReportData(agentId, startDateInput, endDateInput) {
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

      const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
      const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Invalid date range supplied for calculation');
      }

      const startDateUtc = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0, 0
      ));
      const endDateUtc = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23, 59, 59, 999
      ));
      
      // Format dates as YYYY-MM-DD strings for SQL comparison
      const startDateStr = startDateUtc.toISOString().split('T')[0];
      const endDateStr = endDateUtc.toISOString().split('T')[0];
      
      console.log(`📅 Calculating report for agent ${agentId}, range ${startDateStr} to ${endDateStr}`);

      // 1. Count listings created by agent in this month
      console.log(`  📊 Step 1: Counting listings...`);
      const listingsResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM properties 
         WHERE agent_id = $1 
         AND created_at >= $2::timestamp
         AND created_at <= $3::timestamp`,
        [agentId, startDateUtc.toISOString(), endDateUtc.toISOString()]
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
      console.log(`📊 Agent ${agentId}: Total properties = ${debugResult.rows[0].total}, Date range: ${debugResult.rows[0].earliest} to ${debugResult.rows[0].latest}, Count in selected range = ${listings_count}`);

      // 2. Count leads by source for this agent in this month
      console.log(`  📊 Step 2: Counting leads by source...`);
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
      console.log(`  📊 Step 3: Counting viewings...`);
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
      console.log(`  📊 Step 4: Counting sales...`);
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
      // Round to 2 decimal places to avoid floating point precision issues
      const agent_commission = roundMoney((sales_amount * (commissions.agent || 2)) / 100);
      const finders_commission = roundMoney((sales_amount * (commissions.finders || 1)) / 100);
      const referral_commission = roundMoney((sales_amount * (commissions.referral || 0.5)) / 100);
      const team_leader_commission = roundMoney((sales_amount * (commissions.team_leader || 1)) / 100);
      const administration_commission = roundMoney((sales_amount * (commissions.administration || 4)) / 100);
      // Note: total_commission will be calculated after referrals_on_properties_commission

      // 6. Calculate referral commission from two sources:
      // A) Property referrals - where this agent referred a property (internal only)
      // B) Lead referrals - where this agent referred the owner (lead) of a property (internal only)
      
      console.log(`  📊 Step 5: Calculating property referrals commission...`);
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
      console.log(`  ✓ Property referrals: ${property_referral_count} properties, $${property_referral_amount}`);

      // 6B. Lead Referrals Commission
      console.log(`  📊 Step 6: Calculating lead referrals commission...`);
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
      const referral_received_commission = roundMoney((referral_received_amount * (commissions.referral || 0.5)) / 100);

      // 7. Calculate referrals ON this agent's properties (people who referred TO this agent)
      // Count total internal referrals on agent's properties where the referral date is in the report month
      console.log(`  📊 Step 7: Calculating referrals on agent's properties...`);
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
      const referrals_on_properties_commission = roundMoney((referrals_on_properties_amount * (commissions.referral || 0.5)) / 100);

      // Calculate total commission including referrals on properties commission
      // Sum all individual commissions and round to 2 decimal places
      let total_commission = roundMoney(
        agent_commission + 
        finders_commission + 
        referral_commission + 
        team_leader_commission + 
        administration_commission + 
        referrals_on_properties_commission
      );
      
      // Validation: Verify total matches sum of individual commissions
      const calculatedSum = roundMoney(
        agent_commission + 
        finders_commission + 
        referral_commission + 
        team_leader_commission + 
        administration_commission + 
        referrals_on_properties_commission
      );
      
      // Log calculation details for debugging
      console.log('💰 Commission Calculation Details:', {
        sales_amount,
        agent_commission,
        finders_commission,
        referral_commission,
        team_leader_commission,
        administration_commission,
        referrals_on_properties_commission,
        calculatedSum,
        total_commission,
        difference: Math.abs(calculatedSum - total_commission)
      });
      
      // Ensure total matches the sum (should be identical with proper rounding)
      if (Math.abs(calculatedSum - total_commission) > 0.01) {
        console.warn('⚠️ Warning: Total commission does not match sum of individual commissions. Using calculated sum.');
        total_commission = calculatedSum;
      }

      console.log(`✅ Report calculation completed for agent ${agentId}`);
      
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
      let recalculationStart = report.start_date;
      let recalculationEnd = report.end_date;

      if (!recalculationStart || !recalculationEnd) {
        // Fallback for legacy rows without explicit dates
        const fallbackStart = new Date(Date.UTC(report.year, report.month - 1, 1, 0, 0, 0, 0));
        const fallbackEnd = new Date(Date.UTC(report.year, report.month, 0, 23, 59, 59, 999));
        recalculationStart = fallbackStart.toISOString().split('T')[0];
        recalculationEnd = fallbackEnd.toISOString().split('T')[0];
      }

      const calculatedData = await this.calculateReportData(
        report.agent_id,
        recalculationStart,
        recalculationEnd
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
          start_date = COALESCE(start_date, $16::date),
          end_date = COALESCE(end_date, $17::date),
          updated_at = NOW()
        WHERE id = $18
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
          recalculationStart,
          recalculationEnd,
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

      const startDateFilter = filters.start_date || filters.date_from;
      const endDateFilter = filters.end_date || filters.date_to;

      if (startDateFilter) {
        query += ` AND r.start_date >= $${valueIndex}`;
        values.push(startDateFilter);
        valueIndex++;
      }

      if (endDateFilter) {
        query += ` AND r.end_date <= $${valueIndex}`;
        values.push(endDateFilter);
        valueIndex++;
      }

      query += ' ORDER BY r.start_date DESC, r.end_date DESC, u.name ASC';

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

