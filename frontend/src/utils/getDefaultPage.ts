// utils/getDefaultPage.ts

import { normalizeRole } from './roleUtils'

/**
 * Determines the default page a user should be redirected to based on their role and permissions
 * @param user - The user object with role information
 * @param permissions - Permission context values
 * @returns The default page path for the user
 */
export function getDefaultPage(
  user: { role?: string | null } | null,
  permissions: {
    canViewProperties?: boolean
    canViewLeads?: boolean
    canAccessHR?: boolean
  } = {}
): string {
  if (!user || !user.role) {
    return '/dashboard/calendar' // Safe default for all users
  }

  const normalizedRole = normalizeRole(user.role)

  // HR role: redirect to HR page if they have access, otherwise leads or calendar
  if (normalizedRole === 'hr') {
    if (permissions.canAccessHR) {
      return '/dashboard/hr'
    }
    // HR can view leads according to backend permissions
    if (permissions.canViewLeads) {
      return '/dashboard/leads'
    }
    return '/dashboard/calendar'
  }

  // Accountant role: redirect to leads or calendar (they don't have access to properties)
  if (normalizedRole === 'accountant') {
    // Accountant can view leads according to backend permissions
    if (permissions.canViewLeads) {
      return '/dashboard/leads'
    }
    return '/dashboard/calendar'
  }

  // For other roles, check permissions in order of priority
  // 1. Properties (if they can view)
  if (permissions.canViewProperties) {
    return '/properties'
  }

  // 2. Leads (if they can view)
  if (permissions.canViewLeads) {
    return '/dashboard/leads'
  }

  // 3. Calendar (always accessible)
  return '/dashboard/calendar'
}

