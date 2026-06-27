// backend/models/saleRentSourceReportModel.js
// Company-wide "Statistics of Sale and Rent Source" report

const pool = require('../config/db');
const { isClosureStatusSql } = require('../utils/propertyStatusUtils');

function roundMoney(value) {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function toUtcDateString(dateValue) {
  return new Date(Date.UTC(
    dateValue.getUTCFullYear(),
    dateValue.getUTCMonth(),
    dateValue.getUTCDate()
  ))
    .toISOString()
    .split('T')[0];
}

function parseRequiredDate(input, label) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label}. Please use ISO date strings (YYYY-MM-DD).`);
  }
  return parsed;
}

function normalizeRoleLabel(role) {
  return role ? String(role).toLowerCase().replace(/_/g, ' ').trim() : '';
}

async function getSaleRentSourceData({ agent_id, start_date, end_date } = {}) {
  if (!start_date || !end_date) {
    throw new Error('start_date and end_date are required for Sale & Rent Source report');
  }

  const startDateObj = parseRequiredDate(start_date, 'start_date');
  const endDateObj = parseRequiredDate(end_date, 'end_date');

  if (endDateObj < startDateObj) {
    throw new Error('End date cannot be before start date');
  }

  const startDateStr = toUtcDateString(startDateObj);
  const endDateStr = toUtcDateString(endDateObj);

  const params = [startDateStr, endDateStr];
  const clauses = [
    'p.closed_date IS NOT NULL',
    'p.closed_date >= $1::date',
    'p.closed_date <= $2::date',
    isClosureStatusSql('s')
  ];

  if (agent_id !== undefined && agent_id !== null && agent_id !== '') {
    const parsedAgentId = Number.parseInt(agent_id, 10);
    if (!Number.isFinite(parsedAgentId)) {
      throw new Error('agent_id must be a valid number');
    }

    params.push(parsedAgentId);
    clauses.push(`p.agent_id = $3`);
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        p.id AS property_id,
        p.closed_date::date AS closed_date,
        p.reference_number,
        p.property_type,
        p.notes,
        p.price,
        COALESCE(p.commission, 0) AS property_commission,
        p.agent_id,
        a.name AS agent_name,
        a.user_code AS agent_code,
        a.role AS agent_role,
        COALESCE(
          a.assigned_to,
          ta.team_leader_id,
          CASE WHEN a.role IN ('team_leader', 'team leader') THEN a.id END
        ) AS team_leader_id,
        tl.name AS team_leader_name,
        tl.user_code AS team_leader_code,
        tl.role AS team_leader_role,
        COALESCE(
          owner_lead.customer_name,
          fallback_lead.customer_name,
          p.owner_name
        ) AS owner_name,
        COALESCE(
          owner_lead.phone_number,
          fallback_lead.phone_number,
          p.phone_number
        ) AS phone_number,
        COALESCE(owner_rs.source_name, fallback_rs.source_name, 'None') AS source_name
       FROM properties p
       LEFT JOIN users a ON a.id = p.agent_id
       LEFT JOIN team_agents ta
         ON ta.agent_id = a.id
        AND ta.is_active = TRUE
       LEFT JOIN users tl
         ON tl.id = COALESCE(
           a.assigned_to,
           ta.team_leader_id,
           CASE WHEN a.role IN ('team_leader', 'team leader') THEN a.id END
         )
       LEFT JOIN leads owner_lead
         ON owner_lead.id = p.owner_id
       LEFT JOIN reference_sources owner_rs
         ON owner_rs.id = owner_lead.reference_source_id
       LEFT JOIN leads fallback_lead
         ON (
           p.owner_id IS NULL
           AND LOWER(TRIM(COALESCE(p.owner_name, ''))) = LOWER(TRIM(COALESCE(fallback_lead.customer_name, '')))
           AND LOWER(TRIM(COALESCE(p.phone_number, ''))) = LOWER(TRIM(COALESCE(fallback_lead.phone_number, '')))
           AND fallback_lead.agent_id = p.agent_id
         )
       LEFT JOIN reference_sources fallback_rs
         ON fallback_rs.id = fallback_lead.reference_source_id
       LEFT JOIN statuses s
         ON p.status_id = s.id
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE WHEN COALESCE(tl.name, '') = '' THEN 1 ELSE 0 END,
         COALESCE(tl.name, 'Unassigned'),
         COALESCE(a.name, 'Unknown'),
         p.closed_date ASC,
         p.reference_number ASC`,
      params
    );

    return (result.rows || []).map((row) => {
      const propertyType = String(row.property_type || '').trim().toLowerCase();
      const soldRented = propertyType === 'sale'
        ? 'SOLD'
        : propertyType === 'rent'
          ? 'Rented'
          : (row.property_type || '');

      const teamLeaderId = row.team_leader_id !== null && row.team_leader_id !== undefined
        ? Number(row.team_leader_id)
        : null;
      const agentId = row.agent_id !== null && row.agent_id !== undefined
        ? Number(row.agent_id)
        : null;
      const normalizedAgentRole = normalizeRoleLabel(row.agent_role);

      return {
        property_id: row.property_id,
        closed_date: row.closed_date,
        team_leader_id: teamLeaderId,
        team_leader_name: row.team_leader_name || 'Unassigned',
        team_leader_code: row.team_leader_code || null,
        team_leader_role: row.team_leader_role || null,
        agent_id: agentId,
        agent_name: row.agent_name || 'Unknown',
        agent_code: row.agent_code || null,
        agent_role: row.agent_role || null,
        team_role: normalizedAgentRole === 'team leader' ? 'team leader' : normalizedAgentRole,
        reference_number: row.reference_number || 'No Ref',
        sold_rented: soldRented,
        source_name: row.source_name || 'None',
        owner_name: row.owner_name || '',
        phone_number: row.phone_number || '',
        finders_commission: roundMoney(row.property_commission),
        price: roundMoney(row.price),
        notes: row.notes || ''
      };
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getSaleRentSourceData
};
