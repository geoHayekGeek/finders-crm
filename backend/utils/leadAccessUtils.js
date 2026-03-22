// Sensitive lead fields: full detail for own / team assignments only (agents & team leaders).
const User = require('../models/userModel');

/**
 * @param {number} userId
 * @param {string} normalizedRole - space-normalized role
 * @param {object} lead - row from Lead model
 * @param {number[]|null} teamScopeIds - from getTeamPropertyAgentScopeIds for team leader; unused for agents
 */
function canViewSensitiveLeadDetails(userId, normalizedRole, lead, teamScopeIds) {
  if (lead.agent_id == null || lead.agent_id === '') return false;
  const aid = Number(lead.agent_id);
  if (Number.isNaN(aid)) return false;

  if (normalizedRole === 'agent') {
    return aid === Number(userId);
  }
  if (normalizedRole === 'team leader') {
    return Array.isArray(teamScopeIds) && teamScopeIds.includes(aid);
  }
  return true;
}

function maskSensitiveLeadFields(lead) {
  const out = { ...lead };
  out.phone_number = 'Hidden';
  out.price = null;
  out.agent_id = null;
  out.agent_name = 'Hidden';
  out.assigned_agent_name = 'Hidden';
  if (out.agent_role !== undefined) out.agent_role = null;
  return out;
}

async function getTeamScopeIdsForLeadAccess(userId, normalizedRole) {
  if (normalizedRole !== 'team leader') return null;
  return User.getTeamPropertyAgentScopeIds(userId, 'team leader');
}

/**
 * List / table responses for agents and team leaders (all leads, masked where needed).
 */
async function applySensitiveMaskingForLeadsList(leads, userId, normalizedRole) {
  let teamScopeIds = null;
  if (normalizedRole === 'team leader') {
    teamScopeIds = await getTeamScopeIdsForLeadAccess(userId, normalizedRole);
  }

  return leads.map((lead) => {
    const full = canViewSensitiveLeadDetails(userId, normalizedRole, lead, teamScopeIds);
    const row = {
      id: lead.id,
      date: lead.date,
      customer_name: lead.customer_name,
      phone_number: lead.phone_number,
      agent_id: lead.agent_id,
      assigned_agent_name: lead.assigned_agent_name,
      added_by_id: lead.added_by_id,
      added_by_name: lead.added_by_name,
      added_by_role: lead.added_by_role,
      reference_source_id: lead.reference_source_id,
      reference_source_name: lead.reference_source_name,
      price: lead.price,
      status: lead.status,
      status_can_be_referred: lead.status_can_be_referred,
      created_at: lead.created_at,
      updated_at: lead.updated_at
    };
    if (lead.agent_name !== undefined) row.agent_name = lead.agent_name;
    return full ? row : maskSensitiveLeadFields(row);
  });
}

/**
 * Single lead (detail); preserves referrals and other fields when masking.
 */
async function applySensitiveMaskingForLeadDetail(lead, userId, normalizedRole) {
  let teamScopeIds = null;
  if (normalizedRole === 'team leader') {
    teamScopeIds = await getTeamScopeIdsForLeadAccess(userId, normalizedRole);
  }
  if (normalizedRole !== 'agent' && normalizedRole !== 'team leader') {
    return lead;
  }
  const full = canViewSensitiveLeadDetails(userId, normalizedRole, lead, teamScopeIds);
  if (full) return lead;
  return maskSensitiveLeadFields(lead);
}

const MANAGEMENT_ROLES = ['admin', 'operations manager', 'operations', 'agent manager'];

/**
 * Drops or keeps filterQuery.agent_id based on role (prevents filtering by agents outside allowed scope).
 * Mutates filterQuery in place.
 */
async function sanitizeAgentIdFilterQuery(filterQuery, userId, normalizedRole) {
  if (filterQuery.agent_id == null || filterQuery.agent_id === '') return;
  const aid = parseInt(String(filterQuery.agent_id), 10);
  if (Number.isNaN(aid)) {
    delete filterQuery.agent_id;
    return;
  }
  if (MANAGEMENT_ROLES.includes(normalizedRole)) return;
  if (normalizedRole === 'agent') {
    if (aid !== Number(userId)) delete filterQuery.agent_id;
    return;
  }
  if (normalizedRole === 'team leader') {
    const scopeIds = await User.getTeamPropertyAgentScopeIds(userId, 'team leader');
    if (!scopeIds.includes(aid)) delete filterQuery.agent_id;
    return;
  }
  delete filterQuery.agent_id;
}

module.exports = {
  canViewSensitiveLeadDetails,
  maskSensitiveLeadFields,
  getTeamScopeIdsForLeadAccess,
  applySensitiveMaskingForLeadsList,
  applySensitiveMaskingForLeadDetail,
  sanitizeAgentIdFilterQuery
};
