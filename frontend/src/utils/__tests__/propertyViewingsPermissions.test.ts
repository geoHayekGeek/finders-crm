import { canViewViewingsForProperty } from '../propertyViewingsPermissions'
import { Property } from '@/types/property'
import { User } from '@/types/user'

describe('canViewViewingsForProperty', () => {
  const mockProperty: Property = {
    id: 1,
    reference_number: 'TEST001',
    status_id: 1,
    status_name: 'Active',
    status_color: '#000000',
    property_type: 'apartment',
    location: 'Test Location',
    category_id: 1,
    category_name: 'Test Category',
    category_code: 'TEST',
    agent_id: 2,
    price: 100000,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }

  describe('when property or user is null', () => {
    it('should return false when property is null', () => {
      const user: User = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'agent',
        user_code: 'TEST001',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
      expect(canViewViewingsForProperty(null, user, false)).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(canViewViewingsForProperty(mockProperty, null, false)).toBe(false)
    })

    it('should return false when both are null', () => {
      expect(canViewViewingsForProperty(null, null, false)).toBe(false)
    })
  })

  describe('when user can manage properties', () => {
    const adminUser: User = {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      user_code: 'ADMIN001',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    it('should return true for admin', () => {
      expect(canViewViewingsForProperty(mockProperty, adminUser, true)).toBe(true)
    })

    it('should return true even for properties not assigned to them', () => {
      const otherProperty: Property = {
        ...mockProperty,
        agent_id: 999
      }
      expect(canViewViewingsForProperty(otherProperty, adminUser, true)).toBe(true)
    })
  })

  describe('when user is an agent', () => {
    const agentUser: User = {
      id: 2,
      name: 'Agent User',
      email: 'agent@test.com',
      role: 'agent',
      user_code: 'AGENT001',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    it('should return true for properties assigned to the agent', () => {
      const assignedProperty: Property = {
        ...mockProperty,
        agent_id: 2
      }
      expect(canViewViewingsForProperty(assignedProperty, agentUser, false)).toBe(true)
    })

    it('should return false for properties assigned to other agents', () => {
      const otherProperty: Property = {
        ...mockProperty,
        agent_id: 3
      }
      expect(canViewViewingsForProperty(otherProperty, agentUser, false)).toBe(false)
    })

    it('should return false for properties with no agent assigned', () => {
      const unassignedProperty: Property = {
        ...mockProperty,
        agent_id: undefined
      }
      expect(canViewViewingsForProperty(unassignedProperty, agentUser, false)).toBe(false)
    })
  })

  describe('when user is a team leader', () => {
    const teamLeaderUser: User = {
      id: 10,
      name: 'Team Leader User',
      email: 'teamleader@test.com',
      role: 'team_leader',
      user_code: 'TL001',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    it('should return true for properties assigned to the team leader', () => {
      const ownProperty: Property = {
        ...mockProperty,
        agent_id: 10
      }
      expect(canViewViewingsForProperty(ownProperty, teamLeaderUser, false, [10, 20, 21])).toBe(true)
    })

    it('should return true for properties assigned to team agents', () => {
      const teamAgentProperty: Property = {
        ...mockProperty,
        agent_id: 20
      }
      expect(canViewViewingsForProperty(teamAgentProperty, teamLeaderUser, false, [10, 20, 21])).toBe(true)
    })

    it('should return false for properties assigned to agents outside the team', () => {
      const outsideProperty: Property = {
        ...mockProperty,
        agent_id: 99
      }
      expect(canViewViewingsForProperty(outsideProperty, teamLeaderUser, false, [10, 20, 21])).toBe(false)
    })

    it('should return false when teamAgentIds is empty', () => {
      const teamAgentProperty: Property = {
        ...mockProperty,
        agent_id: 20
      }
      expect(canViewViewingsForProperty(teamAgentProperty, teamLeaderUser, false, [])).toBe(false)
    })

    it('should handle properties with undefined agent_id', () => {
      const unassignedProperty: Property = {
        ...mockProperty,
        agent_id: undefined
      }
      expect(canViewViewingsForProperty(unassignedProperty, teamLeaderUser, false, [10, 20, 21])).toBe(false)
    })
  })

  describe('when user has other roles', () => {
    const accountantUser: User = {
      id: 5,
      name: 'Accountant User',
      email: 'accountant@test.com',
      role: 'accountant',
      user_code: 'ACC001',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    it('should return false for roles without permission', () => {
      expect(canViewViewingsForProperty(mockProperty, accountantUser, false)).toBe(false)
    })
  })
})












