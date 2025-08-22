'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface PermissionContextType {
  role: string | null
  canManageProperties: boolean
  canManageUsers: boolean
  canViewFinancial: boolean
  canViewAgentPerformance: boolean
  hasPermission: (permission: string) => boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Permission logic based on user role
  const role = user?.role || null
  
  const canManageProperties = role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager'
  const canManageUsers = role === 'admin' || role === 'operations manager'
  const canViewFinancial = role === 'admin' || role === 'operations manager'
  const canViewAgentPerformance = role === 'admin' || role === 'operations manager' || role === 'agent manager'

  const hasPermission = (permission: string): boolean => {
    switch (permission) {
      case 'canManageProperties':
        return canManageProperties
      case 'canManageUsers':
        return canManageUsers
      case 'canViewFinancial':
        return canViewFinancial
      case 'canViewAgentPerformance':
        return canViewAgentPerformance
      default:
        return false
    }
  }

  const value: PermissionContextType = {
    role,
    canManageProperties,
    canManageUsers,
    canViewFinancial,
    canViewAgentPerformance,
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
