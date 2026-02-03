/**
 * Map Excel "Active" column (Active / Inactive) to property status_id.
 */

const STATUS_SYNONYMS = {
  active: ['active', 'actif'],
  inactive: ['inactive', 'inactif', 'archived', 'archived'],
};

/**
 * @param {Array<{id: number, name: string, code: string}>} statuses - from statuses table
 * @param {string} value - Excel "Active" value
 * @returns {{ statusId: number | null, statusName: string | null, error?: string }}
 */
function resolveStatus(statuses, value) {
  if (!value || !String(value).trim()) {
    const active = statuses.find(s => (s.code || '').toLowerCase() === 'active' || (s.name || '').toLowerCase() === 'active');
    if (active) return { statusId: active.id, statusName: active.name };
    return { statusId: null, statusName: null, error: 'Active status missing and no default' };
  }
  const raw = String(value).trim().toLowerCase();
  // Check inactive first so "inactive" is not matched by active (substring)
  if (STATUS_SYNONYMS.inactive.some(s => raw === s || raw.includes(s))) {
    const archived = statuses.find(x => (x.code || '').toLowerCase() === 'archived');
    if (archived && (raw === 'archived' || raw.includes('archived'))) return { statusId: archived.id, statusName: archived.name };
    const s = statuses.find(x => (x.code || '').toLowerCase() === 'inactive' || (x.name || '').toLowerCase() === 'inactive');
    if (s) return { statusId: s.id, statusName: s.name };
    if (archived) return { statusId: archived.id, statusName: archived.name };
    return { statusId: null, statusName: null, error: 'Inactive/Archived status not found in system' };
  }
  if (STATUS_SYNONYMS.active.some(s => raw === s || raw.includes(s))) {
    const s = statuses.find(x => (x.code || '').toLowerCase() === 'active' || (x.name || '').toLowerCase() === 'active');
    if (s) return { statusId: s.id, statusName: s.name };
    return { statusId: null, statusName: null, error: 'Active status not found in system' };
  }
  const byName = statuses.find(x => (x.name || '').toLowerCase() === raw || (x.code || '').toLowerCase() === raw);
  if (byName) return { statusId: byName.id, statusName: byName.name };
  return { statusId: null, statusName: null, error: `Unknown status "${value}"` };
}

module.exports = { resolveStatus, STATUS_SYNONYMS };
