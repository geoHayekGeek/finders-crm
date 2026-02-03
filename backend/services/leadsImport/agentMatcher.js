/**
 * Fuzzy match "Agent Name" to users who can be assigned leads (agent, team_leader, etc.).
 * Threshold: only accept if similarity >= AGENT_MATCH_THRESHOLD (0.88).
 */

const { distance } = require('fastest-levenshtein');
const { normalizeNameForMatching } = require('./normalizers');

const AGENT_MATCH_THRESHOLD = 0.88;

function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const d = distance(s1, s2);
  return 1 - d / maxLen;
}

/**
 * @param {Array<{id: number, name: string, role: string}>} assignableUsers - users who can be assigned leads
 * @param {string} agentNameRaw - Excel "Agent Name"
 * @returns {{ userId: number | null, userName: string | null, fallbackName: string | null, warning?: string }}
 */
function matchAgent(assignableUsers, agentNameRaw) {
  if (!agentNameRaw || !String(agentNameRaw).trim()) {
    return { userId: null, userName: null, fallbackName: null };
  }
  const trimmed = String(agentNameRaw).trim().replace(/\s+/g, ' ');
  const normalizedInput = normalizeNameForMatching(agentNameRaw);

  let best = { user: null, score: 0 };
  for (const u of assignableUsers) {
    const name = u.name || '';
    const norm = normalizeNameForMatching(name);
    const score = similarity(normalizedInput, norm);
    if (score >= AGENT_MATCH_THRESHOLD && score > best.score) {
      best = { user: u, score };
    }
  }

  if (best.user) {
    return {
      userId: best.user.id,
      userName: best.user.name,
      fallbackName: null,
    };
  }

  const fallbackName = `${trimmed} (not in system)`;
  return {
    userId: null,
    userName: null,
    fallbackName,
    warning: `Agent "${trimmed}" not matched; stored as "${fallbackName}"`,
  };
}

module.exports = {
  matchAgent,
  similarity,
  AGENT_MATCH_THRESHOLD,
};
