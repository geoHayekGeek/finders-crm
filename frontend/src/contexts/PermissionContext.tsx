'use client'

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { normalizeRole } from '@/utils/roleUtils'

interface PermissionContextType {
  role: string | null
  canAccessHR: boolean
  canManageProperties: boolean
  canDeleteProperties: boolean
  canViewProperties: boolean
  canManageLeads: boolean
  canImportLeads: boolean
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

  // Memoize permission calculations based on user role
  // This prevents unnecessary recalculations on every render
  const permissions = useMemo(() => {
    // Permission logic based on user role
    // Normalize role to handle both 'operations_manager' and 'operations manager' formats
    const role = user?.role || null
    const normalizedRole = normalizeRole(role)
    
    // Calculate all permissions
    const canAccessHR = !!role // All authenticated users can access HR page
    const canManageProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
    const canDeleteProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager'
    // Accountant and HR should not have access to properties
    const canViewProperties = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'team leader' || normalizedRole === 'agent'
    // Agents and team leaders can add leads, but only admin/operations can edit/delete
    const canManageLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent' || normalizedRole === 'team leader'
    const canImportLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
    const canDeleteLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager'
    // HR and Accountant do not have access to leads
    const canViewLeads = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'
    const canManageViewings = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
    // Fix: Align with backend - agents and team leaders can view viewings
    const canViewViewings = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'
    const canViewClients = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'team leader'
    const canManageUsers = normalizedRole === 'admin' || normalizedRole === 'hr'
    const canViewFinancial = normalizedRole === 'admin' || normalizedRole === 'operations manager'
    const canViewAgentPerformance = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'agent manager' || normalizedRole === 'team leader'
    const canManageCategoriesAndStatuses = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager'
    const canViewCategoriesAndStatuses = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations' || normalizedRole === 'agent manager' || normalizedRole === 'agent' || normalizedRole === 'team leader'

    return {
      role,
      canAccessHR,
      canManageProperties,
      canDeleteProperties,
      canViewProperties,
      canManageLeads,
      canImportLeads,
      canDeleteLeads,
      canViewLeads,
      canManageViewings,
      canViewViewings,
      canViewClients,
      canManageUsers,
      canViewFinancial,
      canViewAgentPerformance,
      canManageCategoriesAndStatuses,
      canViewCategoriesAndStatuses
    }
  }, [user?.role])

  // Memoize hasPermission function
  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      switch (permission) {
        case 'canAccessHR':
          return permissions.canAccessHR
        case 'canManageProperties':
          return permissions.canManageProperties
        case 'canDeleteProperties':
          return permissions.canDeleteProperties
        case 'canViewProperties':
          return permissions.canViewProperties
        case 'canManageLeads':
          return permissions.canManageLeads
        case 'canImportLeads':
          return permissions.canImportLeads
        case 'canDeleteLeads':
          return permissions.canDeleteLeads
        case 'canViewLeads':
          return permissions.canViewLeads
        case 'canManageViewings':
          return permissions.canManageViewings
        case 'canViewViewings':
          return permissions.canViewViewings
        case 'canViewClients':
          return permissions.canViewClients
        case 'canManageUsers':
          return permissions.canManageUsers
        case 'canViewFinancial':
          return permissions.canViewFinancial
        case 'canViewAgentPerformance':
          return permissions.canViewAgentPerformance
        case 'canManageCategoriesAndStatuses':
          return permissions.canManageCategoriesAndStatuses
        case 'canViewCategoriesAndStatuses':
          return permissions.canViewCategoriesAndStatuses
        default:
          return false
      }
    }
  }, [permissions])

  // Memoize context value to prevent unnecessary re-renders
  const value: PermissionContextType = useMemo(() => ({
    ...permissions,
    hasPermission
  }), [permissions, hasPermission])

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
