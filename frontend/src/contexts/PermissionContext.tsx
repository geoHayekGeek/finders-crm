'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { normalizeRole } from '@/utils/roleUtils'

interface PermissionContextType {
  role: string | null
  canAccessHR: boolean
  canManageProperties: boolean
  canDeleteProperties: boolean
  canViewProperties: boolean
  canManageLeads: boolean
  canDeleteLeads: boolean
  canViewLeads: boolean
  canManageViewings: boolean
  canViewViewings: boolean
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
  // Normalize role to handle both 'operations_manager' and 'operations manager' formats
  const role = user?.role || null
  const normalizedRole = normalizeRole(role)
  
  // Everyone can access HR page, but only admin and HR can manage all users
  const canAccessHR = !!role // All authenticated users can access HR page
  const canManageProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
  // Only admin and operations manager can delete properties
  const canDeleteProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager'
  // Accountant and HR (if it exists as a role) should not have access to properties
  const canViewProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'team leader' || normalizedRole === 'agent'
  // Agents and team leaders can add leads, but only admin/operations can edit/delete
  const canManageLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent' || normalizedRole === 'team leader'
  // Only admin and operations manager can delete leads
  const canDeleteLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager'
  // HR and Accountant do not have access to leads
  const canViewLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'
  const canManageViewings = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
  const canViewViewings = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'
  const canViewClients = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'team leader'
  const canManageUsers = normalizedRole === 'admin' || normalizedRole === 'hr'
  const canViewFinancial = normalizedRole === 'admin' || normalizedRole === 'operations manager'
  const canViewAgentPerformance = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'agent manager' || normalizedRole === 'team leader'
  const canManageCategoriesAndStatuses = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
  const canViewCategoriesAndStatuses = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'

  const hasPermission = (permission: string): boolean => {
    switch (permission) {
      case 'canAccessHR':
        return canAccessHR
      case 'canManageProperties':
        return canManageProperties
      case 'canDeleteProperties':
        return canDeleteProperties
      case 'canViewProperties':
        return canViewProperties
      case 'canManageLeads':
        return canManageLeads
      case 'canDeleteLeads':
        return canDeleteLeads
      case 'canViewLeads':
        return canViewLeads
      case 'canManageViewings':
        return canManageViewings
      case 'canViewViewings':
        return canViewViewings
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
    canAccessHR,
    canManageProperties,
    canDeleteProperties,
    canViewProperties,
    canManageLeads,
    canDeleteLeads,
    canViewLeads,
    canManageViewings,
    canViewViewings,
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
