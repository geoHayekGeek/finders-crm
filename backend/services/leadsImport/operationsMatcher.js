/**
 * Resolve Excel "Operations" (initials MA/EW/GC or full name) to user id.
 * Strategy: initials match user_code or derived initials from name; full name => fuzzy match.
 * Prefer role order: operations_manager > operations > admin > agent_manager > team_leader > agent.
 * If multiple, prefer most recent activity (updated_at desc) or lowest id.
 */

const { getInitialsFromName } = require('./normalizers');
const { normalizeRole } = require('../../utils/roleUtils');

const ROLE_PRIORITY = {
  'operations manager': 1,
  'operations': 2,
  'admin': 3,
  'agent manager': 4,
  'team leader': 5,
  'agent': 6,
};

/**
 * @param {Array<{id: number, name: string, role: string, user_code: string|null, updated_at: Date|null}>} users
 * @param {string} operationsValue - e.g. "MA" or "Melissa Atallah"
 * @returns {{ userId: number | null, userName: string | null, warning?: string, multiple?: boolean }}
 */
function matchOperationsUser(users, operationsValue) {
  if (!operationsValue || !String(operationsValue).trim()) {
    return { userId: null, userName: null, warning: 'Operations value missing' };
  }
  const raw = String(operationsValue).trim();
  const hasSpace = raw.includes(' ');
  const candidates = [];

  if (hasSpace) {
    const normalizedInput = raw.toLowerCase().replace(/\s+/g, ' ');
    for (const u of users) {
      const name = (u.name || '').toLowerCase().replace(/\s+/g, ' ');
      if (name === normalizedInput || name.includes(normalizedInput) || normalizedInput.includes(name)) {
        candidates.push(u);
      }
    }
    if (candidates.length === 0) {
      for (const u of users) {
        if ((u.name || '').toLowerCase().includes(normalizedInput.split(' ')[0])) candidates.push(u);
      }
    }
  } else {
    const initials = raw.toUpperCase().replace(/\s/g, '');
    for (const u of users) {
      const code = (u.user_code || '').toUpperCase();
      const nameInitials = getInitialsFromName(u.name || '');
      if (code === initials || nameInitials === initials) {
        candidates.push(u);
      }
    }
  }

  if (candidates.length === 0) {
    return { userId: null, userName: null, warning: `Ops: ${raw} (not in system)` };
  }

  candidates.sort((a, b) => {
    const roleA = normalizeRole(a.role);
    const roleB = normalizeRole(b.role);
    const prioA = ROLE_PRIORITY[roleA] ?? 99;
    const prioB = ROLE_PRIORITY[roleB] ?? 99;
    if (prioA !== prioB) return prioA - prioB;
    const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    if (updatedB !== updatedA) return updatedB - updatedA;
    return a.id - b.id;
  });

  const chosen = candidates[0];
  const warning = candidates.length > 1 ? `Multiple matches for Ops "${raw}"; used ${chosen.name}` : undefined;
  return {
    userId: chosen.id,
    userName: chosen.name,
    warning,
    multiple: candidates.length > 1,
  };
}

module.exports = {
  matchOperationsUser,
  ROLE_PRIORITY,
};
