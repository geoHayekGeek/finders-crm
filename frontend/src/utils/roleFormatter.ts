/**
 * Formats user roles for display in the UI
 * Converts database role names to proper display names
 */
export function formatRole(role: string): string {
  if (!role || typeof role !== 'string') return 'Unknown'
  
  const roleMap: Record<string, string> = {
    'admin': 'Administrator',
    'agent': 'Real Estate Agent',
    'agent manager': 'Agent Manager',
    'operations': 'Operations Staff',
    'operations manager': 'Operations Manager',
    'team leader': 'Team Leader',
    'team_leader': 'Team Leader',
    'accountant': 'Accountant',
    'hr': 'HR'
  }

  // Normalize role (handle both underscore and space formats)
  const normalizedRole = role.toLowerCase().replace(/_/g, ' ')
  
  // Return mapped role if exists, otherwise format the role
  return roleMap[normalizedRole] || role
    .split(/[_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Gets the color class for a role badge
 */
export function getRoleColor(role: string): string {
  if (!role || typeof role !== 'string') return 'bg-gray-100 text-gray-800'
  
  const colorMap: Record<string, string> = {
    'admin': 'bg-red-100 text-red-800',
    'agent': 'bg-blue-100 text-blue-800',
    'agent manager': 'bg-purple-100 text-purple-800',
    'operations': 'bg-green-100 text-green-800',
    'operations manager': 'bg-green-100 text-green-800',
    'team leader': 'bg-orange-100 text-orange-800',
    'team_leader': 'bg-orange-100 text-orange-800',
    'accountant': 'bg-yellow-100 text-yellow-800',
    'hr': 'bg-indigo-100 text-indigo-800'
  }

  // Normalize role (handle both underscore and space formats)
  const normalizedRole = role.toLowerCase().replace(/_/g, ' ')
  
  return colorMap[normalizedRole] || 'bg-gray-100 text-gray-800'
}
