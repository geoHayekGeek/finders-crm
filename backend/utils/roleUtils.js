// utils/roleUtils.js
// Shared role normalization utility for backend

/**
 * Normalize role to handle both 'operations_manager' and 'operations manager' formats
 * Converts to space format for consistent comparisons
 * @param {string|null|undefined} role - The role to normalize
 * @returns {string} - Normalized role (lowercase, space-separated, trimmed)
 */
const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';

const isAgentLikeRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'agent' || normalized === 'consultant';
};

module.exports = {
  normalizeRole,
  isAgentLikeRole
};
