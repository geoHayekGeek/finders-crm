// backend/models/dcsrReportsModel.js
// Model for DCSR (Daily Client/Sales Report) Monthly Reports - Company-wide totals

const pool = require('../config/db');
const { isClosureStatusSql } = require('../utils/propertyStatusUtils');

/**
 * Calculate DCSR report data for a specific date range (company-wide totals)
 * @param {Date|string} startDateInput - Inclusive start date
 * @param {Date|string} endDateInput - Inclusive end date
 * @returns {object} Calculated report data
 */
async function calculateDCSRData(startDateInput, endDateInput) {
  const client = await pool.connect();
  
  try {
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

    const startDateStr = startDateUtc.toISOString().split('T')[0];
    const endDateStr = endDateUtc.toISOString().split('T')[0];

    // Count ALL listings created in the range (across all agents)
    const listingsResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM properties 
       WHERE created_at >= $1::timestamp
       AND created_at <= $2::timestamp`,
      [startDateUtc.toISOString(), endDateUtc.toISOString()]
    );
    const listingsCount = parseInt(listingsResult.rows[0].count) || 0;
    
    // Count ALL leads in the range (across all agents)
    // Use EXTRACT for date columns
    const leadsResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM leads 
       WHERE DATE(date) >= $1::date
       AND DATE(date) <= $2::date`,
      [startDateStr, endDateStr]
    );
    const leadsCount = parseInt(leadsResult.rows[0].count) || 0;
    
    // Count ALL sales closures (properties closed in range with property_type = 'sale')
    const salesResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM properties p
       INNER JOIN statuses s ON p.status_id = s.id
       WHERE p.closed_date IS NOT NULL
       AND p.closed_date >= $1::date
       AND p.closed_date <= $2::date
       AND ${isClosureStatusSql('s')}
       AND p.property_type = 'sale'`,
      [startDateStr, endDateStr]
    );
    const salesCount = parseInt(salesResult.rows[0].count) || 0;
    
    // Count ALL rent closures (properties closed in range with property_type = 'rent')
    const rentResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM properties p
       INNER JOIN statuses s ON p.status_id = s.id
       WHERE p.closed_date IS NOT NULL
       AND p.closed_date >= $1::date
       AND p.closed_date <= $2::date
       AND ${isClosureStatusSql('s')}
       AND p.property_type = 'rent'`,
      [startDateStr, endDateStr]
    );
    const rentCount = parseInt(rentResult.rows[0].count) || 0;
    
    // Count ALL viewings conducted in the range (across all agents)
    const viewingsResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM viewings 
       WHERE viewing_date >= $1::date
       AND viewing_date <= $2::date`,
      [startDateStr, endDateStr]
    );
    const viewingsCount = parseInt(viewingsResult.rows[0].count) || 0;
    
    return {
      listings_count: listingsCount,
      leads_count: leadsCount,
      sales_count: salesCount,
      rent_count: rentCount,
      viewings_count: viewingsCount
    };
    
  } finally {
    client.release();
  }
}

/**
 * Calculate DCSR operations breakdown for a specific date range.
 * Counts leads added by operations staff, grouped by user.
 * @param {Date|string} startDateInput
 * @param {Date|string} endDateInput
 * @returns {Promise<object>}
 */
async function calculateOperationsDCSRData(startDateInput, endDateInput) {
  const client = await pool.connect();

  try {
    const { startDateStr, endDateStr } = normalizeDateRange(startDateInput, endDateInput);

    const operationsUsersResult = await client.query(
      `SELECT id, name, user_code, role
       FROM users
       WHERE role IN ('operations', 'operations_manager', 'operations manager')
       ORDER BY name ASC`
    );

    const operationsUsers = operationsUsersResult.rows;

    if (operationsUsers.length === 0) {
      return {
        start_date: startDateStr,
        end_date: endDateStr,
        operations_breakdown: [],
        total_leads_count: 0,
        total_operations_users: 0
      };
    }

    const operationsUserIds = operationsUsers.map(user => user.id);

    const leadsResult = await client.query(
      `SELECT l.added_by_id, COUNT(*)::integer AS count
       FROM leads l
       WHERE l.added_by_id = ANY($1::int[])
       AND DATE(l.date) >= $2::date
       AND DATE(l.date) <= $3::date
       GROUP BY l.added_by_id`,
      [operationsUserIds, startDateStr, endDateStr]
    );

    const countsByUserId = leadsResult.rows.reduce((lookup, row) => {
      lookup.set(row.added_by_id, parseInt(row.count, 10) || 0);
      return lookup;
    }, new Map());

    const operationsBreakdown = operationsUsers.map(user => ({
      id: user.id,
      name: user.name,
      user_code: user.user_code,
      role: user.role,
      leads_count: countsByUserId.get(user.id) || 0
    }));

    const totalLeadsCount = operationsBreakdown.reduce(
      (sum, row) => sum + (row.leads_count || 0),
      0
    );

    return {
      start_date: startDateStr,
      end_date: endDateStr,
      operations_breakdown: operationsBreakdown,
      total_leads_count: totalLeadsCount,
      total_operations_users: operationsUsers.length
    };
  } finally {
    client.release();
  }
}

/**
 * Normalize and validate a provided date range
 * @param {Date|string} startDateInput 
 * @param {Date|string} endDateInput 
 * @returns {{ startDateUtc: Date, endDateUtc: Date, startDateStr: string, endDateStr: string }}
 */
function normalizeDateRange(startDateInput, endDateInput) {
  if (!startDateInput || !endDateInput) {
    throw new Error('Start date and end date are required');
  }

  const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
  const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
  }

  if (endDate < startDate) {
    throw new Error('End date cannot be before start date');
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

  return {
    startDateUtc,
    endDateUtc,
    startDateStr: startDateUtc.toISOString().split('T')[0],
    endDateStr: endDateUtc.toISOString().split('T')[0]
  };
}

/**
 * Create a new DCSR report (company-wide)
 * @param {object} reportData - Report data with start_date, end_date
 * @param {number} createdBy - ID of user creating the report
 * @returns {object} Created report
 */
async function createDCSRReport(reportData, createdBy) {
  const { start_date, end_date } = reportData;

  const { startDateUtc, endDateUtc, startDateStr, endDateStr } = normalizeDateRange(start_date, end_date);

  // Calculate the report data
  const calculatedData = await calculateDCSRData(startDateUtc, endDateUtc);

  const month = startDateUtc.getUTCMonth() + 1;
  const year = startDateUtc.getUTCFullYear();

  // Validate year constraint (must be >= 2020, no upper limit)
  if (year < 2020) {
    throw new Error(`Year must be 2020 or later. Selected date range results in year ${year}. Please select a date range starting from 2020 or later.`);
  }

  const client = await pool.connect();
  
  try {
    // Ensure no overlapping report for exact range
    const existing = await client.query(
      `SELECT id FROM dcsr_monthly_reports WHERE start_date = $1::date AND end_date = $2::date`,
      [startDateStr, endDateStr]
    );

    if (existing.rows.length > 0) {
      throw new Error('A DCSR report already exists for this date range');
    }

    const result = await client.query(
      `INSERT INTO dcsr_monthly_reports 
       (month, year, start_date, end_date, listings_count, leads_count, 
        sales_count, rent_count, viewings_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        month,
        year,
        startDateStr,
        endDateStr,
        calculatedData.listings_count,
        calculatedData.leads_count,
        calculatedData.sales_count,
        calculatedData.rent_count,
        calculatedData.viewings_count,
        createdBy
      ]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get all DCSR reports with optional filters
 * @param {object} filters - Optional filters (start_date, end_date)
 * @returns {array} Array of reports
 */
async function getAllDCSRReports(filters = {}) {
  const {
    start_date,
    end_date,
    date_from,
    date_to,
    month,
    year
  } = filters;
  
  let query = 'SELECT * FROM dcsr_monthly_reports WHERE 1=1';
  const params = [];
  let paramCount = 1;
  
  const startFilter = start_date || date_from;
  const endFilter = end_date || date_to;

  if (startFilter) {
    query += ` AND start_date >= $${paramCount}`;
    params.push(startFilter);
    paramCount++;
  }
  
  if (endFilter) {
    query += ` AND end_date <= $${paramCount}`;
    params.push(endFilter);
    paramCount++;
  }

  if (month && !startFilter) {
    query += ` AND month = $${paramCount}`;
    params.push(month);
    paramCount++;
  }
  
  if (year && !startFilter && !endFilter) {
    query += ` AND year = $${paramCount}`;
    params.push(year);
    paramCount++;
  }
  
  query += ' ORDER BY start_date DESC, end_date DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single DCSR report by ID
 * @param {number} id - Report ID
 * @returns {object} Report
 */
async function getDCSRReportById(id) {
  const result = await pool.query(
    'SELECT * FROM dcsr_monthly_reports WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

/**
 * Update a DCSR report
 * @param {number} id - Report ID
 * @param {object} updateData - Data to update
 * @returns {object} Updated report
 */
async function updateDCSRReport(id, updateData) {
  const { listings_count, leads_count, sales_count, rent_count, viewings_count } = updateData;
  
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `UPDATE dcsr_monthly_reports 
       SET listings_count = COALESCE($1, listings_count),
           leads_count = COALESCE($2, leads_count),
           sales_count = COALESCE($3, sales_count),
           rent_count = COALESCE($4, rent_count),
           viewings_count = COALESCE($5, viewings_count)
       WHERE id = $6
       RETURNING *`,
      [listings_count, leads_count, sales_count, rent_count, viewings_count, id]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Recalculate a DCSR report (refresh all calculated fields)
 * @param {number} id - Report ID
 * @returns {object} Updated report
 */
async function recalculateDCSRReport(id) {
  const client = await pool.connect();
  
  try {
    // Get existing report
    const existingResult = await client.query(
      'SELECT start_date, end_date, month, year FROM dcsr_monthly_reports WHERE id = $1',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      throw new Error('Report not found');
    }
    
    let { start_date, end_date, month, year } = existingResult.rows[0];

    if (!start_date || !end_date) {
      // Fallback for legacy rows: derive month boundaries
      const derivedStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const derivedEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      start_date = derivedStart.toISOString().split('T')[0];
      end_date = derivedEnd.toISOString().split('T')[0];
    }

    const { startDateUtc, endDateUtc, startDateStr, endDateStr } = normalizeDateRange(start_date, end_date);
    
    // Recalculate data
    const calculatedData = await calculateDCSRData(startDateUtc, endDateUtc);
    
    // Update the report with recalculated data
    const result = await client.query(
      `UPDATE dcsr_monthly_reports 
       SET listings_count = $1,
           leads_count = $2,
           sales_count = $3,
           rent_count = $4,
           viewings_count = $5,
           start_date = $6,
           end_date = $7
       WHERE id = $8
       RETURNING *`,
      [
        calculatedData.listings_count,
        calculatedData.leads_count,
        calculatedData.sales_count,
        calculatedData.rent_count,
        calculatedData.viewings_count,
        startDateStr,
        endDateStr,
        id
      ]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Delete a DCSR report
 * @param {number} id - Report ID
 * @returns {boolean} Success
 */
async function deleteDCSRReport(id) {
  const result = await pool.query(
    'DELETE FROM dcsr_monthly_reports WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Get all team leaders with their assigned agents
 * @returns {array} Array of team leaders with their team members
 */
async function getAllTeams() {
  const client = await pool.connect();
  
  try {
    // Get all team leaders
    const teamLeadersResult = await client.query(
      `SELECT id, name, user_code, role
       FROM users
       WHERE role = 'team_leader'
       ORDER BY name ASC`
    );
    
    const teams = [];
    
    for (const leader of teamLeadersResult.rows) {
      // Get team members (agents assigned to this team leader)
      const membersResult = await client.query(
        `SELECT DISTINCT u.id, u.name, u.user_code, u.role
         FROM users u
         WHERE u.id = $1 
         OR u.id IN (
           SELECT ta.agent_id 
           FROM team_agents ta 
           WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
         )
         OR (u.assigned_to = $1 AND u.role IN ('agent', 'consultant'))
         ORDER BY u.role DESC, u.name ASC`,
        [leader.id]
      );
      
      teams.push({
        team_leader_id: leader.id,
        team_leader_name: leader.name,
        team_leader_code: leader.user_code,
        team_members: membersResult.rows
      });
    }
    
    return teams;
  } finally {
    client.release();
  }
}

/**
 * Calculate DCSR data for a specific team (team leader + all assigned agents)
 * @param {number} teamLeaderId - ID of the team leader
 * @param {Date|string} startDateInput - Inclusive start date
 * @param {Date|string} endDateInput - Inclusive end date
 * @returns {object} Calculated report data for the team
 */
async function calculateTeamDCSRData(teamLeaderId, startDateInput, endDateInput) {
  const client = await pool.connect();
  
  try {
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

    const startDateStr = startDateUtc.toISOString().split('T')[0];
    const endDateStr = endDateUtc.toISOString().split('T')[0];

    const teamMembersResult = await client.query(
      `SELECT DISTINCT u.id, u.name, u.user_code, u.role
       FROM users u
       WHERE u.id = $1 
       OR u.id IN (
         SELECT ta.agent_id 
         FROM team_agents ta 
         WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       )
         OR (u.assigned_to = $1 AND u.role IN ('agent', 'consultant'))`,
      [teamLeaderId]
    );

    const teamMembers = teamMembersResult.rows;
    const teamMemberIds = teamMembers.map(row => row.id);

    if (teamMemberIds.length === 0) {
      throw new Error('Team not found or has no members');
    }

    const teamMemberIdsArray = teamMemberIds;

    const buildLookup = (rows, keyField = 'agent_id', valueField = 'count') => {
      return rows.reduce((lookup, row) => {
        lookup.set(row[keyField], parseInt(row[valueField], 10) || 0);
        return lookup;
      }, new Map());
    };

    const listingsResult = await client.query(
      `SELECT p.agent_id, COUNT(*)::integer AS count
       FROM properties p
       WHERE p.agent_id = ANY($1::int[])
       AND p.created_at >= $2::timestamp
       AND p.created_at <= $3::timestamp
       GROUP BY p.agent_id`,
      [teamMemberIdsArray, startDateUtc.toISOString(), endDateUtc.toISOString()]
    );

    const leadsResult = await client.query(
      `SELECT l.agent_id, COUNT(*)::integer AS count
       FROM leads l
       WHERE l.agent_id = ANY($1::int[])
       AND DATE(l.date) >= $2::date
       AND DATE(l.date) <= $3::date
       GROUP BY l.agent_id`,
      [teamMemberIdsArray, startDateStr, endDateStr]
    );

    const salesResult = await client.query(
      `SELECT p.agent_id, COUNT(*)::integer AS count
       FROM properties p
       INNER JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = ANY($1::int[])
       AND p.closed_date IS NOT NULL
       AND p.closed_date >= $2::date
       AND p.closed_date <= $3::date
       AND ${isClosureStatusSql('s')}
       AND p.property_type = 'sale'
       GROUP BY p.agent_id`,
      [teamMemberIdsArray, startDateStr, endDateStr]
    );

    const rentResult = await client.query(
      `SELECT p.agent_id, COUNT(*)::integer AS count
       FROM properties p
       INNER JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = ANY($1::int[])
       AND p.closed_date IS NOT NULL
       AND p.closed_date >= $2::date
       AND p.closed_date <= $3::date
       AND ${isClosureStatusSql('s')}
       AND p.property_type = 'rent'
       GROUP BY p.agent_id`,
      [teamMemberIdsArray, startDateStr, endDateStr]
    );

    const viewingsResult = await client.query(
      `SELECT v.agent_id, COUNT(*)::integer AS count
       FROM viewings v
       WHERE v.agent_id = ANY($1::int[])
       AND v.viewing_date >= $2::date
       AND v.viewing_date <= $3::date
       GROUP BY v.agent_id`,
      [teamMemberIdsArray, startDateStr, endDateStr]
    );

    const listingsLookup = buildLookup(listingsResult.rows);
    const leadsLookup = buildLookup(leadsResult.rows);
    const salesLookup = buildLookup(salesResult.rows);
    const rentLookup = buildLookup(rentResult.rows);
    const viewingsLookup = buildLookup(viewingsResult.rows);

    const agentBreakdown = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      user_code: member.user_code,
      role: member.role,
      listings_count: listingsLookup.get(member.id) || 0,
      leads_count: leadsLookup.get(member.id) || 0,
      sales_count: salesLookup.get(member.id) || 0,
      rent_count: rentLookup.get(member.id) || 0,
      viewings_count: viewingsLookup.get(member.id) || 0
    }));

    const totals = agentBreakdown.reduce((acc, row) => {
      acc.listings_count += row.listings_count;
      acc.leads_count += row.leads_count;
      acc.sales_count += row.sales_count;
      acc.rent_count += row.rent_count;
      acc.viewings_count += row.viewings_count;
      return acc;
    }, {
      listings_count: 0,
      leads_count: 0,
      sales_count: 0,
      rent_count: 0,
      viewings_count: 0
    });

    const teamLeader = teamMembers.find(member => member.id === teamLeaderId) || teamMembers[0];

    return {
      team_leader_id: teamLeaderId,
      team_leader_name: teamLeader?.name || 'Unknown',
      team_leader_code: teamLeader?.user_code || null,
      team_members: teamMembers.map(row => ({
        id: row.id,
        name: row.name,
        user_code: row.user_code,
        role: row.role
      })),
      agent_breakdown: agentBreakdown,
      listings_count: totals.listings_count,
      leads_count: totals.leads_count,
      sales_count: totals.sales_count,
      rent_count: totals.rent_count,
      viewings_count: totals.viewings_count
    };
    
  } finally {
    client.release();
  }
}

/**
 * Get detailed properties list for a team with filters
 * @param {number} teamLeaderId - ID of the team leader
 * @param {Date|string} startDateInput - Inclusive start date
 * @param {Date|string} endDateInput - Inclusive end date
 * @param {object} filters - Optional filters (property_type, status_id, category_id)
 * @returns {array} Array of properties with details
 */
async function getTeamProperties(teamLeaderId, startDateInput, endDateInput, filters = {}) {
  const client = await pool.connect();
  
  try {
    const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
    const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Invalid date range supplied');
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

    // Get all agent IDs in this team
    const teamMembersResult = await client.query(
      `SELECT DISTINCT u.id
       FROM users u
       WHERE u.id = $1 
       OR u.id IN (
         SELECT ta.agent_id 
         FROM team_agents ta 
         WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       )
       OR (u.assigned_to = $1 AND u.role IN ('agent', 'consultant'))`,
      [teamLeaderId]
    );
    
    const teamMemberIds = teamMembersResult.rows.map(row => row.id);
    
    if (teamMemberIds.length === 0) {
      return [];
    }

    const teamMemberIdsArray = teamMemberIds;

    // Build query with filters
    let query = `
      SELECT 
        p.id,
        p.reference_number,
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        p.price,
        p.agent_id,
        u.name as agent_name,
        u.user_code as agent_code,
        u.role as agent_role,
        p.closed_date,
        p.sold_amount,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.agent_id = ANY($1::int[])
      AND p.created_at >= $2::timestamp
      AND p.created_at <= $3::timestamp
    `;
    
    const params = [teamMemberIdsArray, startDateUtc.toISOString(), endDateUtc.toISOString()];
    let paramCount = 3;

    // Add filters
    if (filters.property_type) {
      paramCount++;
      query += ` AND p.property_type = $${paramCount}`;
      params.push(filters.property_type);
    }

    if (filters.status_id) {
      paramCount++;
      query += ` AND p.status_id = $${paramCount}`;
      params.push(parseInt(filters.status_id));
    }

    if (filters.category_id) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(parseInt(filters.category_id));
    }

    if (filters.agent_id) {
      paramCount++;
      query += ` AND p.agent_id = $${paramCount}`;
      params.push(parseInt(filters.agent_id));
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Get detailed leads list for a team with filters
 * @param {number} teamLeaderId - ID of the team leader
 * @param {Date|string} startDateInput - Inclusive start date
 * @param {Date|string} endDateInput - Inclusive end date
 * @param {object} filters - Optional filters (agent_id)
 * @returns {array} Array of leads with details
 */
async function getTeamLeads(teamLeaderId, startDateInput, endDateInput, filters = {}) {
  const client = await pool.connect();
  
  try {
    const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
    const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Invalid date range supplied');
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all agent IDs in this team
    const teamMembersResult = await client.query(
      `SELECT DISTINCT u.id
       FROM users u
       WHERE u.id = $1 
       OR u.id IN (
         SELECT ta.agent_id 
         FROM team_agents ta 
         WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       )
       OR (u.assigned_to = $1 AND u.role IN ('agent', 'consultant'))`,
      [teamLeaderId]
    );
    
    const teamMemberIds = teamMembersResult.rows.map(row => row.id);
    
    if (teamMemberIds.length === 0) {
      return [];
    }

    const teamMemberIdsArray = teamMemberIds;

    // Build query with filters
    let query = `
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        u.name as agent_name,
        u.user_code as agent_code,
        u.role as agent_role,
        l.notes,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      WHERE l.agent_id = ANY($1::int[])
      AND DATE(l.date) >= $2::date
      AND DATE(l.date) <= $3::date
    `;
    
    const params = [teamMemberIdsArray, startDateStr, endDateStr];
    let paramCount = 3;

    // Add filters
    if (filters.agent_id) {
      paramCount++;
      query += ` AND l.agent_id = $${paramCount}`;
      params.push(parseInt(filters.agent_id));
    }

    query += ` ORDER BY l.date DESC, l.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Get detailed viewings list for a team with filters
 * @param {number} teamLeaderId - ID of the team leader
 * @param {Date|string} startDateInput - Inclusive start date
 * @param {Date|string} endDateInput - Inclusive end date
 * @param {object} filters - Optional filters (status, agent_id)
 * @returns {array} Array of viewings with details
 */
async function getTeamViewings(teamLeaderId, startDateInput, endDateInput, filters = {}) {
  const client = await pool.connect();
  
  try {
    const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
    const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Invalid date range supplied');
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all agent IDs in this team
    const teamMembersResult = await client.query(
      `SELECT DISTINCT u.id
       FROM users u
       WHERE u.id = $1 
       OR u.id IN (
         SELECT ta.agent_id 
         FROM team_agents ta 
         WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       )
       OR (u.assigned_to = $1 AND u.role IN ('agent', 'consultant'))`,
      [teamLeaderId]
    );
    
    const teamMemberIds = teamMembersResult.rows.map(row => row.id);
    
    if (teamMemberIds.length === 0) {
      return [];
    }

    const teamMemberIdsArray = teamMemberIds;

    // Build query with filters
    let query = `
      SELECT 
        v.id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.agent_id,
        u.name as agent_name,
        u.user_code as agent_code,
        v.property_id,
        p.reference_number as property_reference,
        p.location as property_location,
        v.lead_id,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        v.created_at,
        v.updated_at
      FROM viewings v
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      WHERE v.agent_id = ANY($1::int[])
      AND v.viewing_date >= $2::date
      AND v.viewing_date <= $3::date
    `;
    
    const params = [teamMemberIdsArray, startDateStr, endDateStr];
    let paramCount = 3;

    // Add filters
    if (filters.status) {
      paramCount++;
      query += ` AND v.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.agent_id) {
      paramCount++;
      query += ` AND v.agent_id = $${paramCount}`;
      params.push(parseInt(filters.agent_id));
    }

    query += ` ORDER BY v.viewing_date DESC, v.viewing_time DESC`;

    const result = await client.query(query, params);
    return result.rows;
    
  } finally {
    client.release();
  }
}

module.exports = {
  calculateDCSRData,
  calculateTeamDCSRData,
  getAllTeams,
  getTeamProperties,
  getTeamLeads,
  getTeamViewings,
  normalizeDateRange,
  calculateOperationsDCSRData,
  createDCSRReport,
  getAllDCSRReports,
  getDCSRReportById,
  updateDCSRReport,
  recalculateDCSRReport,
  deleteDCSRReport
};
