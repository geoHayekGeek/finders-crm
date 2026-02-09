/**
 * Map Excel "Active" column (Active / Inactive / Rented / Sold / etc.) to property status_id.
 * All matching is case-insensitive: "rented", "Rented", "RENTED" all resolve to status "Rented".
 */

const STATUS_SYNONYMS = {
  active: ['active', 'actif'],
  inactive: ['inactive', 'inactif', 'archived'],
};

/** Normalize for comparison: trim and lowercase. */
function norm(v) {
  return (v == null ? '' : String(v)).trim().toLowerCase();
}

/**
 * @param {Array<{id: number, name: string, code: string}>} statuses - from statuses table
 * @param {string} value - Excel "Active" value (e.g. "Active", "rented", "Rented", "Inactive")
 * @returns {{ statusId: number | null, statusName: string | null, error?: string }}
 */
function resolveStatus(statuses, value) {
  if (!value || !String(value).trim()) {
    const active = statuses.find(s => norm(s.code) === 'active' || norm(s.name) === 'active');
    if (active) return { statusId: active.id, statusName: active.name };
    return { statusId: null, statusName: null, error: 'Active status missing and no default' };
  }
  const raw = norm(value);

  // First: case-insensitive match by status name or code (so "rented" matches "Rented", "Sold" matches "sold", etc.)
  const byNameOrCode = statuses.find(s => norm(s.name) === raw || norm(s.code) === raw);
  if (byNameOrCode) return { statusId: byNameOrCode.id, statusName: byNameOrCode.name };

  // Then: synonym mapping for active / inactive / archived
  if (STATUS_SYNONYMS.inactive.some(s => raw === s || raw.includes(s))) {
    const archived = statuses.find(x => norm(x.code) === 'archived');
    if (archived && (raw === 'archived' || raw.includes('archived'))) return { statusId: archived.id, statusName: archived.name };
    const s = statuses.find(x => norm(x.code) === 'inactive' || norm(x.name) === 'inactive');
    if (s) return { statusId: s.id, statusName: s.name };
    if (archived) return { statusId: archived.id, statusName: archived.name };
    return { statusId: null, statusName: null, error: 'Inactive/Archived status not found in system' };
  }
  if (STATUS_SYNONYMS.active.some(s => raw === s || raw.includes(s))) {
    const s = statuses.find(x => norm(x.code) === 'active' || norm(x.name) === 'active');
    if (s) return { statusId: s.id, statusName: s.name };
    return { statusId: null, statusName: null, error: 'Active status not found in system' };
  }

  return { statusId: null, statusName: null, error: `Unknown status "${value}"` };
}

module.exports = { resolveStatus, STATUS_SYNONYMS };
