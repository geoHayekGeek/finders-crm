// backend/models/reportsModel.js
const pool = require('../config/db');
const PropertyReferral = require('./propertyReferralModel');
const LeadReferral = require('./leadReferralModel');

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

      // Validate year constraint (must be >= 2000, no upper limit)
      if (derivedYear < 2000) {
        throw new Error(`Year must be 2000 or later. Selected date range results in year ${derivedYear}. Please select a date range starting from 2000 or later.`);
      }

      // Apply external rule to all properties and leads for this agent before calculating
      // This ensures referral external flags are correctly set
      console.log(`🔄 Applying external rule to referrals for agent ${agent_id}...`);
      try {
        // Get all properties that have referrals FROM this agent (where r.employee_id = agent_id)
        // These are properties that this agent referred, not properties owned by this agent
        const propertiesWithReferralsResult = await pool.query(
          `SELECT DISTINCT p.id 
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
          [agent_id, startDateStr, endDateStr]
        );
        
        // Apply external rule to each property that has referrals from this agent
        for (const prop of propertiesWithReferralsResult.rows) {
          try {
            await PropertyReferral.applyExternalRuleToPropertyReferrals(prop.id);
          } catch (err) {
            console.warn(`⚠️ Could not apply external rule to property ${prop.id}:`, err.message);
          }
        }

        // Get all leads that have referrals FROM this agent (where lr.agent_id = agent_id)
        const leadsWithReferralsResult = await pool.query(
          `SELECT DISTINCT l.id 
           FROM leads l
           INNER JOIN lead_referrals lr ON l.id = lr.lead_id
           INNER JOIN properties p ON p.owner_id = l.id
           WHERE lr.agent_id = $1 
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agent_id, startDateStr, endDateStr]
        );
        
        // Apply external rule to each lead that has referrals from this agent
        for (const lead of leadsWithReferralsResult.rows) {
          try {
            await LeadReferral.applyExternalRuleToLeadReferrals(lead.id);
          } catch (err) {
            console.warn(`⚠️ Could not apply external rule to lead ${lead.id}:`, err.message);
          }
        }
        console.log(`✅ External rule applied to ${propertiesWithReferralsResult.rows.length} properties and ${leadsWithReferralsResult.rows.length} leads`);
      } catch (error) {
        console.warn(`⚠️ Error applying external rule (continuing with calculation):`, error.message);
      }

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
          0, // referral_commission - set to 0 (removed, use referrals_on_properties_commission instead)
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
         WHERE setting_key IN ('commission_agent_percentage', 'commission_finders_percentage', 'commission_referral_internal_percentage', 
                               'commission_referral_external_percentage', 'commission_team_leader_percentage', 'commission_administration_percentage')`
      );
      
      const commissions = {};
      commissionsResult.rows.forEach(row => {
        const key = row.setting_key.replace('commission_', '').replace('_percentage', '');
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
      // Note: referral_commission removed - use referrals_on_properties_commission instead (calculated from actual referrals)
      const team_leader_commission = roundMoney((sales_amount * (commissions.team_leader || 1)) / 100);
      const administration_commission = roundMoney((sales_amount * (commissions.administration || 4)) / 100);
      // Note: total_commission will be calculated after referrals_on_properties_commission

      // 6. Calculate referral commission from two sources:
      // A) Property referrals - where this agent referred a property
      // B) Lead referrals - where this agent referred the owner (lead) of a property
      //
      // Referral Commission Logic (30-day rule):
      // - If X refers to Y: X is internal (gets internal commission rate)
      // - If within 30 days, Y refers to Z: X stays internal, Y becomes internal (both get internal rate)
      // - If after 30 days, Y refers to Z: Y becomes internal, X becomes external (Y gets internal rate, X gets external rate)
      // The external flag is set by applyExternalRuleToPropertyReferrals/applyExternalRuleToLeadReferrals
      // which marks referrals as external if they're more than 30 days older than the most recent referral
      
      console.log(`  📊 Step 5: Calculating property referrals commission...`);
      // 6A. Property Referrals Commission
      // Calculate commission with internal/external rates:
      // - external = TRUE → uses external commission rate (commission_referral_external_percentage, default 2%)
      // - external = FALSE or NULL → uses internal commission rate (commission_referral_internal_percentage, default 0.5%)
      let propertyReferralsResult;
      try {
        propertyReferralsResult = await pool.query(
          `WITH referral_commissions AS (
             SELECT 
               r.id as referral_id,
               r.external,
               p.id as property_id,
               p.price,
               CASE 
                 WHEN (r.external = TRUE) THEN p.price * $4 / 100
                 ELSE p.price * $5 / 100
               END as commission
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
             )
           )
           SELECT 
             COUNT(DISTINCT referral_id) as referral_count,
             COUNT(DISTINCT property_id) as property_count,
             COALESCE(SUM(commission), 0) as total_commission,
             (SELECT COALESCE(SUM(price), 0) FROM (SELECT DISTINCT property_id, price FROM referral_commissions) AS distinct_properties) as total_amount
           FROM referral_commissions`,
          [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
        );
      } catch (error) {
        // If external column doesn't exist, query without it
        if (error.code === '42703' || error.message.includes('external')) {
          propertyReferralsResult = await pool.query(
            `WITH referral_commissions AS (
               SELECT 
                 r.id as referral_id,
                 r.external,
                 p.id as property_id,
                 p.price,
                 CASE 
                   WHEN (r.external = TRUE) THEN p.price * $4 / 100
                   ELSE p.price * $5 / 100
                 END as commission
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
               )
             )
             SELECT 
               COUNT(DISTINCT referral_id) as referral_count,
               COUNT(DISTINCT property_id) as property_count,
               COALESCE(SUM(commission), 0) as total_commission,
               (SELECT COALESCE(SUM(price), 0) FROM (SELECT DISTINCT property_id, price FROM referral_commissions) AS distinct_properties) as total_amount
             FROM referral_commissions`,
            [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
          );
        } else {
          throw error;
        }
      }
      const property_referral_count = parseInt(propertyReferralsResult.rows[0].property_count) || 0;
      const property_referral_commission = roundMoney(parseFloat(propertyReferralsResult.rows[0].total_commission) || 0);
      const property_referral_amount = parseFloat(propertyReferralsResult.rows[0].total_amount) || 0;
      const property_referral_referral_count = parseInt(propertyReferralsResult.rows[0].referral_count) || 0;
      console.log(`  ✓ Property referrals: ${property_referral_referral_count} referral(s) on ${property_referral_count} property/properties, $${property_referral_amount}, commission: $${property_referral_commission}`);
      
      // Debug: Log individual referral details
      const referralDetails = await pool.query(
        `SELECT 
           r.id,
           r.external,
           r.employee_id,
           r.name as referral_name,
           r.type as referral_type,
           p.id as property_id,
           p.price,
           p.closed_date,
           p.status_id,
           s.code as status_code,
           s.name as status_name,
           CASE 
             WHEN (r.external = TRUE) THEN p.price * $4 / 100
             ELSE p.price * $5 / 100
           END as commission
         FROM properties p
         INNER JOIN referrals r ON p.id = r.property_id
         LEFT JOIN statuses s ON p.status_id = s.id
         WHERE r.employee_id = $1 
         AND p.closed_date >= $2::date 
         AND p.closed_date <= $3::date
         AND p.status_id IN (
           SELECT id FROM statuses 
           WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
           OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
           OR LOWER(name) IN ('sold', 'rented', 'closed')
         )
         ORDER BY r.id`,
        [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
      );
      console.log(`  📋 Referral details (${referralDetails.rows.length} found):`, referralDetails.rows.map(r => ({
        referral_id: r.id,
        referral_name: r.referral_name,
        referral_type: r.referral_type,
        external: r.external,
        employee_id: r.employee_id,
        property_id: r.property_id,
        property_price: r.price,
        closed_date: r.closed_date,
        status_code: r.status_code,
        status_name: r.status_name,
        commission: r.commission
      })));
      
      // Additional debug: Check if there are any referrals for this agent that might not match the criteria
      if (referralDetails.rows.length === 0 && property_referral_referral_count === 0) {
        const allReferralsDebug = await pool.query(
          `SELECT 
             r.id,
             r.employee_id,
             r.external,
             r.name,
             p.id as property_id,
             p.agent_id as property_agent_id,
             p.closed_date,
             p.status_id,
             s.code as status_code
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE r.employee_id = $1
           ORDER BY p.closed_date DESC
           LIMIT 10`,
          [agentId]
        );
        console.log(`  🔍 Debug: Found ${allReferralsDebug.rows.length} total referrals for agent ${agentId} (regardless of date/status):`, allReferralsDebug.rows.map(r => ({
          referral_id: r.id,
          employee_id: r.employee_id,
          property_id: r.property_id,
          property_agent_id: r.property_agent_id,
          closed_date: r.closed_date,
          status_code: r.status_code,
          external: r.external
        })));
      }

      // 6B. Lead Referrals Commission
      console.log(`  📊 Step 6: Calculating lead referrals commission...`);
      // Calculate commission with internal/external rates:
      // - external = TRUE → uses external commission rate (commission_referral_external_percentage, default 2%)
      // - external = FALSE or NULL → uses internal commission rate (commission_referral_internal_percentage, default 0.5%)
      // Same 30-day rule applies: referrals more than 30 days older than the most recent referral are marked as external
      let leadReferralsResult;
      try {
        leadReferralsResult = await pool.query(
          `WITH lead_referral_commissions AS (
             SELECT 
               lr.id as referral_id,
               lr.external,
               p.id as property_id,
               p.price,
               CASE 
                 WHEN (lr.external = TRUE) THEN p.price * $4 / 100
                 ELSE p.price * $5 / 100
               END as commission
             FROM properties p
             INNER JOIN leads l ON p.owner_id = l.id
             INNER JOIN lead_referrals lr ON l.id = lr.lead_id
             WHERE lr.agent_id = $1 
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               SELECT id FROM statuses 
               WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
               OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
             )
           )
           SELECT 
             COUNT(DISTINCT referral_id) as referral_count,
             COUNT(DISTINCT property_id) as property_count,
             COALESCE(SUM(commission), 0) as total_commission,
             (SELECT COALESCE(SUM(price), 0) FROM (SELECT DISTINCT property_id, price FROM lead_referral_commissions) AS distinct_properties) as total_amount
           FROM lead_referral_commissions`,
          [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
        );
      } catch (error) {
        // If external column doesn't exist or lead_referrals table doesn't exist, set to 0
        if (error.code === '42703' || error.code === '42P01' || error.message.includes('external') || error.message.includes('lead_referrals')) {
          leadReferralsResult = { rows: [{ referral_count: 0, property_count: 0, total_commission: 0, total_amount: 0 }] };
        } else {
          throw error;
        }
      }
      const lead_referral_count = parseInt(leadReferralsResult.rows[0].property_count) || 0;
      const lead_referral_commission = roundMoney(parseFloat(leadReferralsResult.rows[0].total_commission) || 0);
      const lead_referral_amount = parseFloat(leadReferralsResult.rows[0].total_amount) || 0;
      const lead_referral_referral_count = parseInt(leadReferralsResult.rows[0].referral_count) || 0;
      console.log(`  ✓ Lead referrals: ${lead_referral_referral_count} referral(s) on ${lead_referral_count} property/properties, $${lead_referral_amount}, commission: $${lead_referral_commission}`);

      // Total referral commission from both sources
      // Count the actual number of referrals, not the number of properties
      const referral_received_count = property_referral_referral_count + lead_referral_referral_count;
      const referral_received_amount = property_referral_amount + lead_referral_amount;
      const referral_received_commission = roundMoney(property_referral_commission + lead_referral_commission);

      // 7. Calculate referrals ON this agent's properties (people who referred TO this agent)
      // Count ALL referrals (internal and external) on agent's properties that closed in the date range
      // Use p.closed_date, not r.date, because we want referrals on properties that closed in the period
      console.log(`  📊 Step 7: Calculating referrals on agent's properties...`);
      let referralsCountResult;
      try {
        // Try using r.date first, but if it filters out valid referrals, fall back to p.closed_date
        referralsCountResult = await pool.query(
          `SELECT COUNT(r.id) as count
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE p.agent_id = $1
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
        // If date column doesn't exist, fallback to old behavior
        if (error.code === '42703' || error.message.includes('date')) {
          referralsCountResult = await pool.query(
            `SELECT COUNT(r.id) as count
             FROM referrals r
             INNER JOIN properties p ON r.property_id = p.id
             LEFT JOIN statuses s ON p.status_id = s.id
             WHERE p.agent_id = $1
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
      
      // Calculate commission for referrals on agent's properties with internal/external rates
      // This is commission paid TO referrers of this agent's properties
      // - external = TRUE → uses external commission rate (commission_referral_external_percentage, default 2%)
      // - external = FALSE or NULL → uses internal commission rate (commission_referral_internal_percentage, default 0.5%)
      // Use p.closed_date, not r.date, because we want referrals on properties that closed in the period
      let referralsAmountResult;
      try {
        referralsAmountResult = await pool.query(
          `SELECT 
             COALESCE(SUM(
               CASE 
                 WHEN (r.external = TRUE) THEN p.price * $4 / 100
                 ELSE p.price * $5 / 100
               END
             ), 0) as total_commission,
             COALESCE(SUM(p.price), 0) as total_amount
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE p.agent_id = $1
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
        );
      } catch (error) {
        // If date column doesn't exist, fallback to old behavior
        if (error.code === '42703' || error.message.includes('date')) {
          referralsAmountResult = await pool.query(
            `SELECT 
               COALESCE(SUM(
                 CASE 
                   WHEN (r.external = TRUE) THEN p.price * $4 / 100
                   ELSE p.price * $5 / 100
                 END
               ), 0) as total_commission,
               COALESCE(SUM(p.price), 0) as total_amount
             FROM referrals r
             INNER JOIN properties p ON r.property_id = p.id
             LEFT JOIN statuses s ON p.status_id = s.id
             WHERE p.agent_id = $1
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               SELECT id FROM statuses 
               WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
               OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
             )`,
            [agentId, startDateStr, endDateStr, commissions.referral_external || 2, commissions.referral_internal || 0.5]
          );
        } else {
          // If error is not date-related, set default empty result
          referralsAmountResult = { rows: [{ total_commission: 0, total_amount: 0 }] };
        }
      }
      
      // Ensure referralsAmountResult is defined
      if (!referralsAmountResult || !referralsAmountResult.rows || referralsAmountResult.rows.length === 0) {
        referralsAmountResult = { rows: [{ total_commission: 0, total_amount: 0 }] };
      }
      
      const referrals_on_properties_amount = parseFloat(referralsAmountResult.rows[0].total_amount) || 0;
      const referrals_on_properties_commission = roundMoney(parseFloat(referralsAmountResult.rows[0].total_commission) || 0);

      // Calculate total commission including referrals on properties commission
      // Sum all individual commissions and round to 2 decimal places
      // Note: referral_commission removed - referrals_on_properties_commission handles all referral commissions
      let total_commission = roundMoney(
        agent_commission + 
        finders_commission + 
        team_leader_commission + 
        administration_commission + 
        referrals_on_properties_commission
      );
      
      // Validation: Verify total matches sum of individual commissions
      const calculatedSum = roundMoney(
        agent_commission + 
        finders_commission + 
        team_leader_commission + 
        administration_commission + 
        referrals_on_properties_commission
      );
      
      // Log calculation details for debugging
      console.log('💰 Commission Calculation Details:', {
        sales_amount,
        agent_commission,
        finders_commission,
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
      // Handle both string dates and Date objects from PostgreSQL
      // Check if dates exist and are not null/undefined
      // Properly format dates to YYYY-MM-DD format for PostgreSQL
      let recalculationStart = null;
      let recalculationEnd = null;
      
      if (report.start_date !== null && report.start_date !== undefined) {
        if (report.start_date instanceof Date) {
          // If it's a Date object, convert to YYYY-MM-DD string
          recalculationStart = report.start_date.toISOString().split('T')[0];
        } else {
          // If it's already a string, extract just the date part (YYYY-MM-DD)
          const dateStr = String(report.start_date).trim();
          // Extract YYYY-MM-DD from various formats
          const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            recalculationStart = dateMatch[1];
          } else {
            // Try parsing as Date and converting
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              recalculationStart = parsed.toISOString().split('T')[0];
            }
          }
        }
      }
      
      if (report.end_date !== null && report.end_date !== undefined) {
        if (report.end_date instanceof Date) {
          // If it's a Date object, convert to YYYY-MM-DD string
          recalculationEnd = report.end_date.toISOString().split('T')[0];
        } else {
          // If it's already a string, extract just the date part (YYYY-MM-DD)
          const dateStr = String(report.end_date).trim();
          // Extract YYYY-MM-DD from various formats
          const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            recalculationEnd = dateMatch[1];
          } else {
            // Try parsing as Date and converting
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              recalculationEnd = parsed.toISOString().split('T')[0];
            }
          }
        }
      }

      if (!recalculationStart || !recalculationEnd) {
        // Fallback for legacy rows without explicit dates
        // Ensure year and month are valid numbers before using them
        if (report.year && report.month && !isNaN(report.year) && !isNaN(report.month)) {
          const fallbackStart = new Date(Date.UTC(report.year, report.month - 1, 1, 0, 0, 0, 0));
          const fallbackEnd = new Date(Date.UTC(report.year, report.month, 0, 23, 59, 59, 999));
          if (!isNaN(fallbackStart.getTime()) && !isNaN(fallbackEnd.getTime())) {
            recalculationStart = fallbackStart.toISOString().split('T')[0];
            recalculationEnd = fallbackEnd.toISOString().split('T')[0];
          } else {
            throw new Error('Invalid date range: Cannot calculate fallback dates from year/month');
          }
        } else {
          throw new Error('Invalid date range: Missing start_date, end_date, or valid year/month');
        }
      }

      // Validate date format before proceeding
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (recalculationStart && !dateRegex.test(recalculationStart)) {
        throw new Error(`Invalid start_date format: ${recalculationStart}. Expected YYYY-MM-DD format.`);
      }
      if (recalculationEnd && !dateRegex.test(recalculationEnd)) {
        throw new Error(`Invalid end_date format: ${recalculationEnd}. Expected YYYY-MM-DD format.`);
      }

      // Apply external rule to all properties and leads for this agent before recalculating
      console.log(`🔄 Applying external rule to referrals for agent ${report.agent_id} before recalculating...`);
      try {
        // Get all properties that have referrals FROM this agent (where r.employee_id = agent_id)
        const propertiesWithReferralsResult = await pool.query(
          `SELECT DISTINCT p.id 
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
          [report.agent_id, recalculationStart, recalculationEnd]
        );
        
        // Apply external rule to each property that has referrals from this agent
        for (const prop of propertiesWithReferralsResult.rows) {
          try {
            await PropertyReferral.applyExternalRuleToPropertyReferrals(prop.id);
          } catch (err) {
            console.warn(`⚠️ Could not apply external rule to property ${prop.id}:`, err.message);
          }
        }

        // Get all leads that have referrals FROM this agent (where lr.agent_id = agent_id)
        const leadsWithReferralsResult = await pool.query(
          `SELECT DISTINCT l.id 
           FROM leads l
           INNER JOIN lead_referrals lr ON l.id = lr.lead_id
           INNER JOIN properties p ON p.owner_id = l.id
           WHERE lr.agent_id = $1 
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             SELECT id FROM statuses 
             WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
             OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
             OR LOWER(name) IN ('sold', 'rented', 'closed')
           )`,
          [report.agent_id, recalculationStart, recalculationEnd]
        );
        
        // Apply external rule to each lead that has referrals from this agent
        for (const lead of leadsWithReferralsResult.rows) {
          try {
            await LeadReferral.applyExternalRuleToLeadReferrals(lead.id);
          } catch (err) {
            console.warn(`⚠️ Could not apply external rule to lead ${lead.id}:`, err.message);
          }
        }
        console.log(`✅ External rule applied to ${propertiesWithReferralsResult.rows.length} properties and ${leadsWithReferralsResult.rows.length} leads`);
      } catch (error) {
        console.warn(`⚠️ Error applying external rule (continuing with recalculation):`, error.message);
      }

      const calculatedData = await this.calculateReportData(
        report.agent_id,
        recalculationStart,
        recalculationEnd
      );

      // Update report with new calculations, keeping manual fields
      // Only update start_date and end_date if they are null (COALESCE will keep existing values if they exist)
      const result = await pool.query(
        `UPDATE monthly_agent_reports SET
          listings_count = $1,
          lead_sources = $2,
          viewings_count = $3,
          sales_count = $4,
          sales_amount = $5,
          agent_commission = $6,
          finders_commission = $7,
          referral_commission = 0,
          team_leader_commission = $8,
          administration_commission = $9,
          total_commission = $10,
          referral_received_count = $11,
          referral_received_commission = $12,
          referrals_on_properties_count = $13,
          referrals_on_properties_commission = $14,
          start_date = COALESCE(start_date, $15::date),
          end_date = COALESCE(end_date, $16::date),
          updated_at = NOW()
        WHERE id = $17
        RETURNING *`,
        [
          calculatedData.listings_count,
          JSON.stringify(calculatedData.lead_sources),
          calculatedData.viewings_count,
          calculatedData.sales_count,
          calculatedData.sales_amount,
          calculatedData.agent_commission,
          calculatedData.finders_commission,
          calculatedData.team_leader_commission,
          calculatedData.administration_commission,
          calculatedData.total_commission,
          calculatedData.referral_received_count,
          calculatedData.referral_received_commission,
          calculatedData.referrals_on_properties_count,
          calculatedData.referrals_on_properties_commission,
          recalculationStart || null,
          recalculationEnd || null,
          reportId
        ]
      );

      if (!result || !result.rows || result.rows.length === 0) {
        throw new Error('Report not found');
      }

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

      // Filter by multiple agent IDs (for team leaders)
      if (filters.agent_ids && Array.isArray(filters.agent_ids) && filters.agent_ids.length > 0) {
        query += ` AND r.agent_id = ANY($${valueIndex})`;
        values.push(filters.agent_ids);
        valueIndex++;
      }

      // Filter by agent role only (for agent manager)
      if (filters.agent_role_only) {
        query += ` AND u.role = 'agent'`;
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
      // Build dynamic update query to handle any field updates
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      // Map of allowed fields that can be manually updated
      const allowedFields = {
        'listings': 'listings_count',
        'listings_count': 'listings_count',
        'viewings': 'viewings_count',
        'viewings_count': 'viewings_count',
        'boosts': 'boosts',
        'lead_sources': 'lead_sources',
        'sales_count': 'sales_count',
        'sales_amount': 'sales_amount',
        'agent_commission': 'agent_commission',
        'finders_commission': 'finders_commission',
        'team_leader_commission': 'team_leader_commission',
        'administration_commission': 'administration_commission',
        'total_commission': 'total_commission',
        'referral_received_count': 'referral_received_count',
        'referral_received_commission': 'referral_received_commission',
        'referrals_on_properties_count': 'referrals_on_properties_count',
        'referrals_on_properties_commission': 'referrals_on_properties_commission'
      };
      
      // Handle each field that exists in updates
      Object.keys(updates).forEach(key => {
        const dbField = allowedFields[key];
        if (dbField && updates.hasOwnProperty(key)) {
          let value = updates[key];
          
          // Special handling for lead_sources (JSON field)
          if (dbField === 'lead_sources') {
            // If it's already a string, use it; otherwise stringify
            if (typeof value === 'string') {
              try {
                // Validate it's valid JSON
                JSON.parse(value);
                updateFields.push(`${dbField} = $${paramIndex++}::jsonb`);
                values.push(value);
              } catch (e) {
                // If not valid JSON, stringify it
                updateFields.push(`${dbField} = $${paramIndex++}::jsonb`);
                values.push(JSON.stringify(value));
              }
            } else {
              // Object or other type - stringify it
              updateFields.push(`${dbField} = $${paramIndex++}::jsonb`);
              values.push(JSON.stringify(value));
            }
          } else {
            // For numeric fields, ensure they're numbers (including 0)
            if (value !== null && value !== undefined) {
              // Commission fields and sales_amount are floats, others are integers
              const floatFields = ['sales_amount', 'agent_commission', 'finders_commission', 
                                   'team_leader_commission', 'administration_commission', 'total_commission',
                                   'referral_received_commission', 'referrals_on_properties_commission'];
              if (floatFields.includes(dbField)) {
                value = parseFloat(value) || 0;
              } else {
                value = parseInt(value, 10) || 0;
              }
            }
            updateFields.push(`${dbField} = $${paramIndex++}`);
            values.push(value);
          }
        }
      });
      
      // Add updated_at
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length === 1) {
        // Only updated_at, no actual field updates
        // Still update to refresh the timestamp, but return current report
        const result = await pool.query(
          'UPDATE monthly_agent_reports SET updated_at = NOW() WHERE id = $1 RETURNING *',
          [id]
        );
        return result.rows[0];
      }
      
      // Add id parameter
      values.push(id);
      
      const query = `
        UPDATE monthly_agent_reports 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      console.log('📝 Update query:', query);
      console.log('📝 Update values:', values);
      
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      console.log('✅ Report updated successfully');
      console.log('📊 Updated fields:', Object.keys(updates).join(', '));
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

