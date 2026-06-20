const pool = require('../config/db');
const User = require('./userModel');
const Report = require('./reportsModel');

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

function toNumber(value, fallback = 0) {
  const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
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

function normalizeReportRow(row) {
  if (!row) return row;
  const agentReports = typeof row.agent_reports === 'string'
    ? JSON.parse(row.agent_reports)
    : (row.agent_reports || []);

  return {
    ...row,
    lead_sources: typeof row.lead_sources === 'string'
      ? JSON.parse(row.lead_sources)
      : (row.lead_sources || {}),
    agent_reports: Array.isArray(agentReports) ? agentReports : []
  };
}

function aggregateLeadSources(agentReports) {
  const aggregated = {};

  agentReports.forEach((report) => {
    const leadSources = report.lead_sources && typeof report.lead_sources === 'object'
      ? report.lead_sources
      : {};

    Object.entries(leadSources).forEach(([source, count]) => {
      aggregated[source] = (aggregated[source] || 0) + toNumber(count);
    });
  });

  return aggregated;
}

function sumField(agentReports, field) {
  return agentReports.reduce((total, report) => total + toNumber(report[field]), 0);
}

async function buildAgentSnapshot(agent, startDateInput, endDateInput) {
  const calculatedData = await Report.calculateReportData(agent.id, startDateInput, endDateInput);
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    agent_code: agent.user_code || null,
    agent_role: agent.role,
    month: startDateInput.getUTCMonth() + 1,
    year: startDateInput.getUTCFullYear(),
    start_date: startDateInput.toISOString().split('T')[0],
    end_date: endDateInput.toISOString().split('T')[0],
    boosts: 0,
    listings_count: calculatedData.listings_count,
    lead_sources: calculatedData.lead_sources,
    viewings_count: calculatedData.viewings_count,
    sales_count: calculatedData.sales_count,
    sales_amount: calculatedData.sales_amount,
    agent_commission: 0,
    finders_commission: 0,
    referral_commission: 0,
    team_leader_commission: 0,
    administration_commission: 0,
    total_commission: 0,
    referral_received_count: calculatedData.referral_received_count,
    referral_received_commission: 0,
    referrals_on_properties_count: calculatedData.referrals_on_properties_count,
    referrals_on_properties_commission: 0
  };
}

async function createTeamMonthlyReport(reportData, createdBy) {
  const {
    team_leader_id,
    start_date,
    end_date
  } = reportData;

  if (!team_leader_id) {
    throw new Error('team_leader_id is required');
  }

  const { startDateUtc, endDateUtc, startDateStr, endDateStr } = normalizeDateRange(start_date, end_date);

  const leaderResult = await pool.query(
    `SELECT id, name, user_code, role
     FROM users
     WHERE id = $1
       AND LOWER(REPLACE(role, '_', ' ')) = 'team leader'`,
    [team_leader_id]
  );

  if (leaderResult.rows.length === 0) {
    throw new Error('Team leader not found');
  }

  const teamMembers = await User.getTeamLeaderAgents(team_leader_id);
  if (!teamMembers || teamMembers.length === 0) {
    throw new Error('Team leader has no active agents');
  }

  const derivedMonth = startDateUtc.getUTCMonth() + 1;
  const derivedYear = startDateUtc.getUTCFullYear();

  if (derivedYear < 2000) {
    throw new Error(`Year must be 2000 or later. Selected date range results in year ${derivedYear}. Please select a date range starting from 2000 or later.`);
  }

  const existing = await pool.query(
    `SELECT id FROM team_monthly_reports
     WHERE team_leader_id = $1
       AND start_date = $2::date
       AND end_date = $3::date`,
    [team_leader_id, startDateStr, endDateStr]
  );

  if (existing.rows.length > 0) {
    throw new Error('Team report already exists for this team and date range');
  }

  const agentReports = [];
  for (const member of teamMembers) {
    const snapshot = await buildAgentSnapshot(member, startDateUtc, endDateUtc);
    agentReports.push(snapshot);
  }

  const leadSources = aggregateLeadSources(agentReports);

  const summary = {
    agent_count: agentReports.length,
    listings_count: sumField(agentReports, 'listings_count'),
    lead_sources: JSON.stringify(leadSources),
    viewings_count: sumField(agentReports, 'viewings_count'),
    boosts: roundMoney(sumField(agentReports, 'boosts')),
    sales_count: sumField(agentReports, 'sales_count'),
    sales_amount: roundMoney(sumField(agentReports, 'sales_amount')),
    agent_commission: roundMoney(sumField(agentReports, 'agent_commission')),
    finders_commission: roundMoney(sumField(agentReports, 'finders_commission')),
    referral_commission: roundMoney(sumField(agentReports, 'referral_commission')),
    team_leader_commission: roundMoney(sumField(agentReports, 'team_leader_commission')),
    administration_commission: roundMoney(sumField(agentReports, 'administration_commission')),
    total_commission: roundMoney(sumField(agentReports, 'total_commission')),
    referral_received_count: sumField(agentReports, 'referral_received_count'),
    referral_received_commission: roundMoney(sumField(agentReports, 'referral_received_commission')),
    referrals_on_properties_count: sumField(agentReports, 'referrals_on_properties_count'),
    referrals_on_properties_commission: roundMoney(sumField(agentReports, 'referrals_on_properties_commission'))
  };

  const result = await pool.query(
    `INSERT INTO team_monthly_reports (
      team_leader_id,
      month,
      year,
      start_date,
      end_date,
      agent_count,
      listings_count,
      lead_sources,
      viewings_count,
      boosts,
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
      agent_reports,
      created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24
    )
    RETURNING id`,
    [
      team_leader_id,
      derivedMonth,
      derivedYear,
      startDateStr,
      endDateStr,
      summary.agent_count,
      summary.listings_count,
      summary.lead_sources,
      summary.viewings_count,
      summary.boosts,
      summary.sales_count,
      summary.sales_amount,
      summary.agent_commission,
      summary.finders_commission,
      summary.referral_commission,
      summary.team_leader_commission,
      summary.administration_commission,
      summary.total_commission,
      summary.referral_received_count,
      summary.referral_received_commission,
      summary.referrals_on_properties_count,
      summary.referrals_on_properties_commission,
      JSON.stringify(agentReports),
      createdBy
    ]
  );

  return getTeamMonthlyReportById(result.rows[0].id);
}

async function getAllTeamMonthlyReports(filters = {}) {
  let query = `
    SELECT
      r.*,
      u.name AS team_leader_name,
      u.user_code AS team_leader_code,
      u.role AS team_leader_role
    FROM team_monthly_reports r
    LEFT JOIN users u ON r.team_leader_id = u.id
    WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (filters.team_leader_id) {
    query += ` AND r.team_leader_id = $${index}`;
    values.push(filters.team_leader_id);
    index++;
  }

  const startDateFilter = filters.start_date || filters.date_from;
  const endDateFilter = filters.end_date || filters.date_to;

  if (startDateFilter) {
    query += ` AND r.start_date >= $${index}`;
    values.push(startDateFilter);
    index++;
  }

  if (endDateFilter) {
    query += ` AND r.end_date <= $${index}`;
    values.push(endDateFilter);
    index++;
  }

  query += ' ORDER BY r.start_date DESC, r.end_date DESC, u.name ASC';

  const result = await pool.query(query, values);
  return result.rows.map(normalizeReportRow);
}

async function getTeamMonthlyReportById(id) {
  const result = await pool.query(
    `SELECT
      r.*,
      u.name AS team_leader_name,
      u.user_code AS team_leader_code,
      u.role AS team_leader_role
    FROM team_monthly_reports r
    LEFT JOIN users u ON r.team_leader_id = u.id
    WHERE r.id = $1`,
    [id]
  );

  return normalizeReportRow(result.rows[0]);
}

async function deleteTeamMonthlyReport(id) {
  const result = await pool.query(
    'DELETE FROM team_monthly_reports WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Team report not found');
  }

  return normalizeReportRow(result.rows[0]);
}

module.exports = {
  createTeamMonthlyReport,
  getAllTeamMonthlyReports,
  getTeamMonthlyReportById,
  deleteTeamMonthlyReport
};
