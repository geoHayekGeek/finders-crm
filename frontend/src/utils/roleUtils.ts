export const normalizeRole = (role?: string | null) =>
  role ? role.toLowerCase().replace(/_/g, ' ').trim() : ''

export const isAdminRole = (role?: string | null) =>
  normalizeRole(role) === 'admin'

export const isOperationsRole = (role?: string | null) =>
  ['operations', 'operations manager'].includes(normalizeRole(role))

export const isOperationsManagerRole = (role?: string | null) =>
  normalizeRole(role) === 'operations manager'

export const isAgentManagerRole = (role?: string | null) =>
  normalizeRole(role) === 'agent manager'

export const isTeamLeaderRole = (role?: string | null) =>
  normalizeRole(role) === 'team leader'

export const isAgentRole = (role?: string | null) =>
  normalizeRole(role) === 'agent'

