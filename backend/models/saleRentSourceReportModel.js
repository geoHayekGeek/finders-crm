// backend/models/saleRentSourceReportModel.js
// Model for "Statistics of Sale and Rent Source" report

const pool = require('../config/db');

// Helper function to round monetary values to 2 decimal places
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Get sale & rent source statistics for closures in a given range and agent
 * @param {Object} filters
 * @param {number} filters.agent_id - Agent ID (required)
 * @param {string} filters.start_date - Inclusive start date (YYYY-MM-DD)
 * @param {string} filters.end_date - Inclusive end date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of rows for the report
 */
async function getSaleRentSourceData({ agent_id, start_date, end_date }) {
  if (!agent_id) {
    throw new Error('agent_id is required for Sale & Rent Source report');
  }
  if (!start_date || !end_date) {
    throw new Error('start_date and end_date are required for Sale & Rent Source report');
  }

  const client = await pool.connect();

  try {
    // Normalize dates to strings (YYYY-MM-DD)
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
    }

    if (endDateObj < startDateObj) {
      throw new Error('End date cannot be before start date');
    }

    const startDateUtc = new Date(Date.UTC(
      startDateObj.getUTCFullYear(),
      startDateObj.getUTCMonth(),
      startDateObj.getUTCDate(),
      0, 0, 0, 0
    ));
    const endDateUtc = new Date(Date.UTC(
      endDateObj.getUTCFullYear(),
      endDateObj.getUTCMonth(),
      endDateObj.getUTCDate(),
      23, 59, 59, 999
    ));

    const startDateStr = startDateUtc.toISOString().split('T')[0];
    const endDateStr = endDateUtc.toISOString().split('T')[0];

    // Get Finders commission percentage from settings
    const settingsResult = await client.query(
      `SELECT setting_value 
       FROM system_settings 
       WHERE setting_key = 'commission_finders'`
    );

    const findersPercentage = settingsResult.rows[0]?.setting_value
      ? parseFloat(settingsResult.rows[0].setting_value)
      : 1.0; // Default 1%

    // Fetch all closed properties for this agent in the period
    // IMPORTANT: "Source" must come from the owner lead's reference_source_id,
    // NOT from contact_source or viewing leads. The source represents where the 
    // property listing originated (i.e., how the agent got the property owner as a lead).
    
    const result = await client.query(
      `SELECT 
        p.id AS property_id,
        p.closed_date::date AS closed_date,
        u.name AS agent_name,
        p.reference_number,
        p.property_type,
        p.owner_id,
        p.owner_name AS property_owner_name,
        p.phone_number AS property_phone,
        -- First try direct owner_id link
        l.id AS lead_id,
        l.customer_name AS lead_customer_name,
        l.reference_source_id,
        owner_rs.source_name AS reference_source_name,
        -- If owner_id is NULL, try to find lead by matching name AND phone
        l_fallback.id AS fallback_lead_id,
        l_fallback.customer_name AS fallback_customer_name,
        l_fallback.reference_source_id AS fallback_reference_source_id,
        fallback_rs.source_name AS fallback_source_name,
        COALESCE(
          owner_rs.source_name,
          fallback_rs.source_name,
          'None'
        ) AS reference_source_name_display,
        p.price,
        COALESCE(l.customer_name, l_fallback.customer_name, p.owner_name) AS client_name
       FROM properties p
       LEFT JOIN users u ON p.agent_id = u.id
       -- Owner lead (property owner) - this is where we get the source from (PREFERRED)
       LEFT JOIN leads l ON p.owner_id = l.id
       LEFT JOIN reference_sources owner_rs ON l.reference_source_id = owner_rs.id
       -- FALLBACK: If no owner_id, try to match by name AND phone for the same agent
       LEFT JOIN leads l_fallback ON (
         p.owner_id IS NULL 
         AND LOWER(TRIM(p.owner_name)) = LOWER(TRIM(l_fallback.customer_name))
         AND LOWER(TRIM(p.phone_number)) = LOWER(TRIM(l_fallback.phone_number))
         AND l_fallback.agent_id = p.agent_id
       )
       LEFT JOIN reference_sources fallback_rs ON l_fallback.reference_source_id = fallback_rs.id
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = $1
         AND p.closed_date IS NOT NULL
         AND p.closed_date >= $2::date
         AND p.closed_date <= $3::date
         AND (
           s.id IS NULL
           OR LOWER(s.code) IN ('sold', 'rented', 'closed')
           OR LOWER(s.name) IN ('sold', 'rented', 'closed')
         )
       ORDER BY p.closed_date DESC, p.reference_number ASC`,
      [agent_id, startDateStr, endDateStr]
    );
    
    const rows = result.rows || [];

    // Enrich rows with Sold/Rented label and Finders commission
    const enriched = rows.map(row => {
      const price = parseFloat(row.price) || 0;
      const finders_commission = roundMoney((price * (findersPercentage || 0)) / 100);

      let sold_rented = '';
      if (row.property_type) {
        const typeLower = String(row.property_type).toLowerCase();
        sold_rented = typeLower === 'sale' ? 'Sold' : typeLower === 'rent' ? 'Rented' : row.property_type;
      }

      return {
        closed_date: row.closed_date,
        agent_name: row.agent_name,
        reference_number: row.reference_number,
        sold_rented,
        source_name: row.reference_source_name_display,
        price,
        finders_commission,
        client_name: row.client_name
      };
    });

    return enriched;
  } finally {
    client.release();
  }
}

module.exports = {
  getSaleRentSourceData
};


