import { Property } from '@/types/property'
import { User } from '@/types/user'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'

/**
 * Check if a user can view viewings for a specific property
 * 
 * @param property - The property to check permissions for
 * @param user - The current user
 * @param canManageProperties - Whether the user can manage properties (admin, operations, etc.)
 * @param teamAgentIds - Array of agent IDs that belong to the team leader's team (including team leader's own ID)
 * @returns true if the user can view viewings for this property, false otherwise
 */
export function canViewViewingsForProperty(
  property: Property | null,
  user: User | null,
  canManageProperties: boolean,
  teamAgentIds: number[] = []
): boolean {
  if (!property || !user) {
    return false
  }
  
  // Admin, operations manager, operations, agent manager can always see viewings
  if (canManageProperties) {
    return true
  }
  
  // Agents can only see viewings for properties assigned to them
  if (isAgentRole(user.role)) {
    return property.agent_id === user.id
  }
  
  // Team leaders can see viewings for their own properties and their team's agents' properties
  if (isTeamLeaderRole(user.role)) {
    if (property.agent_id === user.id) return true
    return teamAgentIds.includes(property.agent_id || 0)
  }
  
  return false
}






