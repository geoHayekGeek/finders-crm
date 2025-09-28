'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface PermissionContextType {
  role: string | null
  canManageProperties: boolean
  canViewProperties: boolean
  canManageLeads: boolean
  canViewLeads: boolean
  canViewClients: boolean
  canManageUsers: boolean
  canViewFinancial: boolean
  canViewAgentPerformance: boolean
  canManageCategoriesAndStatuses: boolean
  canViewCategoriesAndStatuses: boolean
  hasPermission: (permission: string) => boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Permission logic based on user role
  const role = user?.role || null
  
  const canManageProperties = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager'
  const canViewProperties = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager' || role === 'team_leader' || role === 'agent'
  const canManageLeads = role === 'admin' || role === 'operations manager' || role === 'operations'
  const canViewLeads = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager'
  const canViewClients = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager' || role === 'team_leader'
  const canManageUsers = role === 'admin' || role === 'operations manager'
  const canViewFinancial = role === 'admin' || role === 'operations manager'
  const canViewAgentPerformance = role === 'admin' || role === 'operations manager' || role === 'agent manager' || role === 'team_leader'
  const canManageCategoriesAndStatuses = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager'
  const canViewCategoriesAndStatuses = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager' || role === 'agent' || role === 'team_leader'

  const hasPermission = (permission: string): boolean => {
    switch (permission) {
      case 'canManageProperties':
        return canManageProperties
      case 'canViewProperties':
        return canViewProperties
      case 'canManageLeads':
        return canManageLeads
      case 'canViewLeads':
        return canViewLeads
      case 'canViewClients':
        return canViewClients
      case 'canManageUsers':
        return canManageUsers
      case 'canViewFinancial':
        return canViewFinancial
      case 'canViewAgentPerformance':
        return canViewAgentPerformance
      case 'canManageCategoriesAndStatuses':
        return canManageCategoriesAndStatuses
      case 'canViewCategoriesAndStatuses':
        return canViewCategoriesAndStatuses
      default:
        return false
    }
  }

  const value: PermissionContextType = {
    role,
    canManageProperties,
    canViewProperties,
    canManageLeads,
    canViewLeads,
    canViewClients,
    canManageUsers,
    canViewFinancial,
    canViewAgentPerformance,
    canManageCategoriesAndStatuses,
    canViewCategoriesAndStatuses,
    hasPermission
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

// Permission wrapper components
export function RequireFinancialAccess({ children }: { children: ReactNode }) {
  const { canViewFinancial } = usePermissions()
  return canViewFinancial ? <>{children}</> : null
}

export function RequirePropertyManagement({ children }: { children: ReactNode }) {
  const { canManageProperties } = usePermissions()
  return canManageProperties ? <>{children}</> : null
}

export function RequireAgentPerformanceAccess({ children }: { children: ReactNode }) {
  const { canViewAgentPerformance } = usePermissions()
  return canViewAgentPerformance ? <>{children}</> : null
}

export function RequireCategoryStatusManagement({ children }: { children: ReactNode }) {
  const { canManageCategoriesAndStatuses } = usePermissions()
  return canManageCategoriesAndStatuses ? <>{children}</> : null
}

export function RequireCategoryStatusAccess({ children }: { children: ReactNode }) {
  const { canViewCategoriesAndStatuses } = usePermissions()
  return canViewCategoriesAndStatuses ? <>{children}</> : null
}
