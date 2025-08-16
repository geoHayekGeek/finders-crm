'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'

// Permission levels for different roles
const PERMISSIONS = {
  // Admin: Full access to everything
  admin: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access']
  },
  
  // Operations Manager: Same as admin
  'operations manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access']
  },
  
  // Operations: Everything except financial data and agent performance
  operations: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all'], // No financial or agent performance data
    users: ['read', 'view_all'], // Can view but not modify
    settings: ['read_only'],
    dashboard: ['full_access']
  },
  
  // Agent Manager: Can manage properties and view agent data
  'agent manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_agent_performance'], // Can see agent performance
    users: ['read', 'view_agents'], // Can view agents but not other roles
    settings: ['read_only'],
    dashboard: ['full_access']
  },
  
  // Agent: Limited access - only view assigned properties
  agent: {
    properties: ['read', 'view_assigned'], // Only view properties they're connected to
    clients: ['read', 'view_assigned'], // Only view their clients
    leads: ['read', 'view_assigned'], // Only view their leads
    analytics: ['view_basic'], // Only basic analytics, no financial data
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access']
  }
}

interface PermissionContextType {
  hasPermission: (resource: string, action: string) => boolean
  canViewFinancial: boolean
  canViewAgentPerformance: boolean
  canManageProperties: boolean
  canManageUsers: boolean
  canViewAllData: boolean
  role: string | null
  permissions: typeof PERMISSIONS[keyof typeof PERMISSIONS] | null
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  
  // Debug logging
  console.log('PermissionProvider - User:', user)
  console.log('PermissionProvider - User role:', user?.role)
  
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !user.role) {
      console.log('PermissionProvider - No user or role')
      return false
    }
    
    console.log('PermissionProvider - Checking permission:', resource, action, 'for role:', user.role)
    
    const rolePermissions = PERMISSIONS[user.role as keyof typeof PERMISSIONS]
    if (!rolePermissions) {
      console.log('PermissionProvider - No permissions found for role:', user.role)
      return false
    }
    
    // Type-safe access to resource permissions
    const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions]
    if (!resourcePermissions) {
      console.log('PermissionProvider - No resource permissions found for:', resource)
      return false
    }
    
    const hasAccess = resourcePermissions.includes(action)
    console.log('PermissionProvider - Permission result:', hasAccess)
    return hasAccess
  }

  const canViewFinancial = user ? ['admin', 'operations manager'].includes(user.role) : false
  const canViewAgentPerformance = user ? ['admin', 'operations manager', 'agent manager'].includes(user.role) : false
  const canManageProperties = user ? ['admin', 'operations manager', 'operations', 'agent manager'].includes(user.role) : false
  const canManageUsers = user ? ['admin', 'operations manager'].includes(user.role) : false
  const canViewAllData = user ? ['admin', 'operations manager', 'operations', 'agent manager'].includes(user.role) : false

  const value: PermissionContextType = {
    hasPermission,
    canViewFinancial,
    canViewAgentPerformance,
    canManageProperties,
    canManageUsers,
    canViewAllData,
    role: user?.role || null,
    permissions: user ? PERMISSIONS[user.role as keyof typeof PERMISSIONS] : null
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Helper components for conditional rendering
export function RequirePermission({ 
  children, 
  resource, 
  action 
}: { 
  children: ReactNode
  resource: string
  action: string 
}) {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(resource, action)) {
    return null
  }
  
  return <>{children}</>
}

export function RequireRole({ 
  children, 
  roles 
}: { 
  children: ReactNode
  roles: string[] 
}) {
  const { role } = usePermissions()
  
  if (!role || !roles.includes(role)) {
    return null
  }
  
  return <>{children}</>
}

export function RequireFinancialAccess({ children }: { children: ReactNode }) {
  const { canViewFinancial } = usePermissions()
  
  if (!canViewFinancial) {
    return null
  }
  
  return <>{children}</>
}

export function RequireAgentPerformanceAccess({ children }: { children: ReactNode }) {
  const { canViewAgentPerformance } = usePermissions()
  
  if (!canViewAgentPerformance) {
    return null
  }
  
  return <>{children}</>
}

export function RequirePropertyManagement({ children }: { children: ReactNode }) {
  const { canManageProperties } = usePermissions()
  
  if (!canManageProperties) {
    return null
  }
  
  return <>{children}</>
}

export function RequireUserManagement({ children }: { children: ReactNode }) {
  const { canManageUsers } = usePermissions()
  
  if (!canManageUsers) {
    return null
  }
  
  return <>{children}</>
}
