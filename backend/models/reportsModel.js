// backend/models/reportsModel.js
const pool = require('../config/db');
const PropertyReferral = require('./propertyReferralModel');
const LeadReferral = require('./leadReferralModel');
const { CLOSURE_STATUS_ID_SUBQUERY } = require('../utils/propertyStatusUtils');

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

// Keep the agent report schema aligned with the fields the model writes.
async function ensureMonthlyAgentReportSchema() {
  try {
    await pool.query(`
      ALTER TABLE monthly_agent_reports
      ADD COLUMN IF NOT EXISTS referrals_on_properties_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS referrals_on_properties_commission DECIMAL(15,2) DEFAULT 0
    `);
  } catch (error) {
    // If the table is unavailable or already up to date, let the main flow continue.
  }
}

async function ensurePropertyClosingCommissionSchema() {
  try {
    await pool.query(`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS finders_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS team_leader_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS administration_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS latest_property_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS latest_lead_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS external_referral_commissions JSONB DEFAULT '[]'::JSONB,
      ADD COLUMN IF NOT EXISTS external_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS commission DECIMAL(15,2)
    `);
  } catch (error) {
    // If the table is unavailable or already up to date, let the main flow continue.
  }
}

// Helper function to round monetary values to 2 decimal places
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function normalizeNumericInput(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLeadSourcesInput(value, fallback = {}) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback || {});
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return JSON.stringify(fallback || {});
    }
  }

  return JSON.stringify(value);
}

const COMMISSION_BREAKDOWN_FIELDS = [
  'agent_commission',
  'finders_commission',
  'team_leader_commission',
  'administration_commission',
  'referrals_on_properties_commission'
];

function resolveCommissionValue(value, fallback = 0) {
  return normalizeNumericInput(value, fallback);
}

function resolveCommissionBreakdown(input = {}, fallback = {}) {
  const agent_commission = resolveCommissionValue(input.agent_commission, fallback.agent_commission ?? 0);
  const finders_commission = resolveCommissionValue(input.finders_commission, fallback.finders_commission ?? 0);
  const team_leader_commission = resolveCommissionValue(input.team_leader_commission, fallback.team_leader_commission ?? 0);
  const administration_commission = resolveCommissionValue(input.administration_commission, fallback.administration_commission ?? 0);
  const referrals_on_properties_commission = resolveCommissionValue(
    input.referrals_on_properties_commission,
    fallback.referrals_on_properties_commission ?? 0
  );

  const hasBreakdownInput = COMMISSION_BREAKDOWN_FIELDS.some(
    (field) => input[field] !== undefined && input[field] !== null && input[field] !== ''
  );

  const total_commission = hasBreakdownInput || input.total_commission === undefined
    ? roundMoney(
      agent_commission +
      finders_commission +
      team_leader_commission +
      administration_commission +
      referrals_on_properties_commission
    )
    : resolveCommissionValue(input.total_commission, fallback.total_commission ?? 0);

  return {
    agent_commission,
    finders_commission,
    team_leader_commission,
    administration_commission,
    referrals_on_properties_commission,
    total_commission
  };
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
    await ensureMonthlyAgentReportSchema();
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

      // Derive month/year (legacy columns) from the start date for backwards compatibility
      const derivedMonth = normalizedStart.getUTCMonth() + 1;
      const derivedYear = normalizedStart.getUTCFullYear();

      // Validate year constraint (must be >= 2000, no upper limit)
      if (derivedYear < 2000) {
        throw new Error(`Year must be 2000 or later. Selected date range results in year ${derivedYear}. Please select a date range starting from 2000 or later.`);
      }

      // Check if report already exists for this exact range
      const existing = await pool.query(
        'SELECT id FROM monthly_agent_reports WHERE agent_id = $1 AND start_date = $2::date AND end_date = $3::date',
        [agent_id, startDateStr, endDateStr]
      );

      if (existing.rows.length > 0) {
        throw new Error('Report already exists for this agent and date range');
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
             ${CLOSURE_STATUS_ID_SUBQUERY}
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
             ${CLOSURE_STATUS_ID_SUBQUERY}
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

      const commissionValues = resolveCommissionBreakdown(reportData, calculatedData);

      const resolvedValues = {
        listings_count: reportData.listings_count !== undefined
          ? parseInt(reportData.listings_count, 10) || 0
          : calculatedData.listings_count,
        lead_sources: normalizeLeadSourcesInput(reportData.lead_sources, calculatedData.lead_sources),
        viewings_count: reportData.viewings_count !== undefined
          ? parseInt(reportData.viewings_count, 10) || 0
          : calculatedData.viewings_count,
        sales_count: reportData.sales_count !== undefined
          ? parseInt(reportData.sales_count, 10) || 0
          : calculatedData.sales_count,
        sales_amount: reportData.sales_amount !== undefined
          ? normalizeNumericInput(reportData.sales_amount, calculatedData.sales_amount)
          : calculatedData.sales_amount,
        agent_commission: commissionValues.agent_commission,
        finders_commission: commissionValues.finders_commission,
        referral_commission: 0,
        team_leader_commission: commissionValues.team_leader_commission,
        administration_commission: commissionValues.administration_commission,
        total_commission: commissionValues.total_commission,
        referral_received_count: reportData.referral_received_count !== undefined
          ? parseInt(reportData.referral_received_count, 10) || 0
          : calculatedData.referral_received_count,
        referral_received_commission: reportData.referral_received_commission !== undefined
          ? normalizeNumericInput(reportData.referral_received_commission, calculatedData.referral_received_commission)
          : calculatedData.referral_received_commission ?? 0,
        referrals_on_properties_count: reportData.referrals_on_properties_count !== undefined
          ? parseInt(reportData.referrals_on_properties_count, 10) || 0
          : calculatedData.referrals_on_properties_count,
        referrals_on_properties_commission: commissionValues.referrals_on_properties_commission
      };

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
          normalizeNumericInput(boosts),
          resolvedValues.listings_count,
          resolvedValues.lead_sources,
          resolvedValues.viewings_count,
          resolvedValues.sales_count,
          resolvedValues.sales_amount,
          resolvedValues.agent_commission,
          resolvedValues.finders_commission,
          resolvedValues.referral_commission,
          resolvedValues.team_leader_commission,
          resolvedValues.administration_commission,
          resolvedValues.total_commission,
          resolvedValues.referral_received_count,
          resolvedValues.referral_received_commission,
          resolvedValues.referrals_on_properties_count,
          resolvedValues.referrals_on_properties_commission,
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
      await ensurePropertyClosingCommissionSchema();

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
           ${CLOSURE_STATUS_ID_SUBQUERY}
         )`,
        [agentId, startDateStr, endDateStr]
      );
      const sales_count = parseInt(salesResult.rows[0].count) || 0;
      const sales_amount = parseFloat(salesResult.rows[0].total_amount) || 0;

      // 5. Count referrals given by this agent and referrals on this agent's properties.
      // Closure commission amounts are summed from the closed property rows, including
      // the latest property/lead referral commissions and optional external referral splits.
      console.log(`  📊 Step 5: Counting property referrals...`);
      const propertyReferralsResult = await pool.query(
        `SELECT 
           COUNT(DISTINCT r.id) as referral_count,
           COUNT(DISTINCT p.id) as property_count
         FROM properties p
         INNER JOIN referrals r ON p.id = r.property_id
         WHERE r.employee_id = $1 
         AND p.closed_date >= $2::date 
         AND p.closed_date <= $3::date
         AND p.status_id IN (
           ${CLOSURE_STATUS_ID_SUBQUERY}
         )`,
        [agentId, startDateStr, endDateStr]
      );
      const property_referral_count = parseInt(propertyReferralsResult.rows[0].property_count) || 0;
      const property_referral_referral_count = parseInt(propertyReferralsResult.rows[0].referral_count) || 0;
      console.log(`  ✓ Property referrals: ${property_referral_referral_count} referral(s) on ${property_referral_count} property/properties`);

      console.log(`  📊 Step 6: Counting lead referrals...`);
      let leadReferralsResult;
      try {
        leadReferralsResult = await pool.query(
          `SELECT 
             COUNT(DISTINCT lr.id) as referral_count,
             COUNT(DISTINCT p.id) as property_count
           FROM properties p
           INNER JOIN leads l ON p.owner_id = l.id
           INNER JOIN lead_referrals lr ON l.id = lr.lead_id
           WHERE lr.agent_id = $1 
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             ${CLOSURE_STATUS_ID_SUBQUERY}
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        if (error.code === '42703' || error.code === '42P01' || error.message?.includes('lead_referrals')) {
          leadReferralsResult = { rows: [{ referral_count: 0, property_count: 0 }] };
        } else {
          throw error;
        }
      }
      const lead_referral_count = parseInt(leadReferralsResult.rows[0].property_count) || 0;
      const lead_referral_referral_count = parseInt(leadReferralsResult.rows[0].referral_count) || 0;
      console.log(`  ✓ Lead referrals: ${lead_referral_referral_count} referral(s) on ${lead_referral_count} property/properties`);

      // Total referral count from both sources
      const referral_received_count = property_referral_referral_count + lead_referral_referral_count;

      // 7. Count referrals ON this agent's properties (people who referred TO this agent)
      // Count ALL referrals (internal and external) on agent's properties that closed in the date range
      // Use p.closed_date, not r.date, because we want referrals on properties that closed in the period
      console.log(`  📊 Step 7: Counting referrals on agent's properties...`);
      let referralsCountResult;
      try {
        referralsCountResult = await pool.query(
          `SELECT COUNT(r.id) as count
           FROM referrals r
           INNER JOIN properties p ON r.property_id = p.id
           LEFT JOIN statuses s ON p.status_id = s.id
           WHERE p.agent_id = $1
           AND p.closed_date >= $2::date 
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             ${CLOSURE_STATUS_ID_SUBQUERY}
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        // If date column doesn't exist, fallback to old behavior
        if (error.code === '42703' || error.message?.includes('date')) {
          referralsCountResult = await pool.query(
            `SELECT COUNT(r.id) as count
             FROM referrals r
             INNER JOIN properties p ON r.property_id = p.id
             LEFT JOIN statuses s ON p.status_id = s.id
             WHERE p.agent_id = $1
             AND p.closed_date >= $2::date 
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               ${CLOSURE_STATUS_ID_SUBQUERY}
             )`,
            [agentId, startDateStr, endDateStr]
          );
        } else {
          throw error;
        }
      }
      
      const referrals_on_properties_count = parseInt(referralsCountResult.rows[0].count) || 0;
      console.log(`  📊 Step 8: Summing closing commissions...`);
      let closingCommissionResult;
      try {
        closingCommissionResult = await pool.query(
          `WITH latest_property_referrals AS (
             SELECT DISTINCT ON (r.property_id)
               r.property_id,
               r.employee_id
             FROM referrals r
             WHERE r.external = FALSE
             ORDER BY r.property_id, r.date DESC, r.created_at DESC, r.id DESC
           ),
           latest_lead_referrals AS (
             SELECT DISTINCT ON (lr.lead_id)
               lr.lead_id,
               lr.agent_id
             FROM lead_referrals lr
             WHERE lr.external = FALSE
             ORDER BY lr.lead_id, lr.referral_date DESC, lr.created_at DESC, lr.id DESC
           ),
           referral_earnings AS (
             SELECT
               COALESCE((
                 SELECT SUM(COALESCE(referred_property.latest_property_referral_commission, 0))
                 FROM properties referred_property
                 INNER JOIN latest_property_referrals latest_property_referral
                   ON latest_property_referral.property_id = referred_property.id
                  AND latest_property_referral.employee_id = $1
                 WHERE referred_property.closed_date >= $2::date
                   AND referred_property.closed_date <= $3::date
                   AND referred_property.status_id IN (
                     ${CLOSURE_STATUS_ID_SUBQUERY}
                   )
               ), 0) +
               COALESCE((
                 SELECT SUM(COALESCE(referred_lead_property.latest_lead_referral_commission, 0))
                 FROM properties referred_lead_property
                 INNER JOIN latest_lead_referrals latest_lead_referral
                   ON latest_lead_referral.lead_id = referred_lead_property.owner_id
                  AND latest_lead_referral.agent_id = $1
                 WHERE referred_lead_property.closed_date >= $2::date
                   AND referred_lead_property.closed_date <= $3::date
                   AND referred_lead_property.status_id IN (
                     ${CLOSURE_STATUS_ID_SUBQUERY}
                   )
               ), 0) AS commission
           )
           SELECT
             COALESCE(SUM(COALESCE(p.agent_commission, p.commission, 0)), 0) as agent_commission,
             COALESCE(SUM(COALESCE(p.finders_commission, 0)), 0) as finders_commission,
             COALESCE(SUM(COALESCE(p.team_leader_commission, 0)), 0) as team_leader_commission,
             COALESCE(SUM(COALESCE(p.administration_commission, 0)), 0) as administration_commission,
             COALESCE(SUM(
               COALESCE(p.latest_property_referral_commission, 0) +
               COALESCE(p.latest_lead_referral_commission, 0) +
               COALESCE(p.external_referral_commission, 0)
             ), 0) as referrals_on_properties_commission,
             (SELECT commission FROM referral_earnings) as referral_received_commission
           FROM properties p
           WHERE p.agent_id = $1
           AND p.closed_date >= $2::date
           AND p.closed_date <= $3::date
           AND p.status_id IN (
             ${CLOSURE_STATUS_ID_SUBQUERY}
           )`,
          [agentId, startDateStr, endDateStr]
        );
      } catch (error) {
        if (error.code === '42703') {
        closingCommissionResult = await pool.query(
            `SELECT
               COALESCE(SUM(COALESCE(p.commission, 0)), 0) as agent_commission,
               0 as finders_commission,
               0 as team_leader_commission,
               0 as administration_commission,
               0 as referrals_on_properties_commission,
               0 as referral_received_commission
             FROM properties p
             WHERE p.agent_id = $1
             AND p.closed_date >= $2::date
             AND p.closed_date <= $3::date
             AND p.status_id IN (
               ${CLOSURE_STATUS_ID_SUBQUERY}
             )`,
            [agentId, startDateStr, endDateStr]
          );
        } else {
          throw error;
        }
      }
      const agent_commission = parseFloat(closingCommissionResult.rows[0].agent_commission) || 0;
      const finders_commission = parseFloat(closingCommissionResult.rows[0].finders_commission) || 0;
      const team_leader_commission = parseFloat(closingCommissionResult.rows[0].team_leader_commission) || 0;
      const administration_commission = parseFloat(closingCommissionResult.rows[0].administration_commission) || 0;
      const referral_received_commission = parseFloat(closingCommissionResult.rows[0].referral_received_commission) || 0;
      const referrals_on_properties_commission = parseFloat(closingCommissionResult.rows[0].referrals_on_properties_commission) || 0;
      const referral_commission = 0;
      const total_commission = roundMoney(
        agent_commission +
        finders_commission +
        referral_commission +
        team_leader_commission +
        administration_commission +
        referrals_on_properties_commission
      );

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
             ${CLOSURE_STATUS_ID_SUBQUERY}
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
             ${CLOSURE_STATUS_ID_SUBQUERY}
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

      // Update report with the fresh calculated fields while preserving the manual inputs
      // that are intentionally user-editable elsewhere in the report workflow.
      const result = await pool.query(
        `UPDATE monthly_agent_reports SET
          listings_count = $1,
          lead_sources = $2,
          viewings_count = $3,
          sales_count = $4,
          sales_amount = $5,
          agent_commission = $6,
          finders_commission = $7,
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
        query += ` AND u.role IN ('agent', 'consultant')`;
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
      let normalizedUpdates = { ...(updates || {}) };
      const commissionFieldsChanged = COMMISSION_BREAKDOWN_FIELDS.some((field) =>
        Object.prototype.hasOwnProperty.call(normalizedUpdates, field)
      );

      if (commissionFieldsChanged) {
        const existingReportResult = await pool.query(
          `SELECT
            agent_commission,
            finders_commission,
            team_leader_commission,
            administration_commission,
            referrals_on_properties_commission
           FROM monthly_agent_reports
           WHERE id = $1`,
          [id]
        );

        if (existingReportResult.rows.length === 0) {
          throw new Error('Report not found');
        }

        const resolvedCommissionData = resolveCommissionBreakdown(
          normalizedUpdates,
          existingReportResult.rows[0]
        );

        normalizedUpdates = {
          ...normalizedUpdates,
          agent_commission: resolvedCommissionData.agent_commission,
          finders_commission: resolvedCommissionData.finders_commission,
          team_leader_commission: resolvedCommissionData.team_leader_commission,
          administration_commission: resolvedCommissionData.administration_commission,
          referrals_on_properties_commission: resolvedCommissionData.referrals_on_properties_commission,
          total_commission: resolvedCommissionData.total_commission
        };
      }

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
      Object.keys(normalizedUpdates).forEach(key => {
        const dbField = allowedFields[key];
        if (dbField && Object.prototype.hasOwnProperty.call(normalizedUpdates, key)) {
          let value = normalizedUpdates[key];
          
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
      console.log('📊 Updated fields:', Object.keys(normalizedUpdates).join(', '));
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
