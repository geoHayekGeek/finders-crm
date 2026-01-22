'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { getDefaultPage } from '@/utils/getDefaultPage'
import { normalizeRole } from '@/utils/roleUtils'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: {
    canManageProperties?: boolean
    canManageUsers?: boolean
    canViewFinancial?: boolean
    canViewAgentPerformance?: boolean
  }
  allowedRoles?: string[]
}

export default function ProtectedRoute({ 
  children, 
  requiredPermissions = {},
  allowedRoles = []
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { canManageProperties, canManageUsers, canViewFinancial, canViewAgentPerformance, canViewProperties, canViewLeads, canAccessHR } = usePermissions()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/')
      return
    }

    // Check role-based access (normalize roles for comparison)
    if (allowedRoles.length > 0) {
      const normalizedUserRole = normalizeRole(user.role);
      const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role));
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        const defaultPage = getDefaultPage(user, { canViewProperties, canViewLeads, canAccessHR })
        router.push(defaultPage)
        return
      }
    }

    // Check permission-based access
    let hasRequiredPermissions = true
    if (requiredPermissions.canManageProperties && !canManageProperties) {
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canManageUsers && !canManageUsers) {
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canViewFinancial && !canViewFinancial) {
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canViewAgentPerformance && !canViewAgentPerformance) {
      hasRequiredPermissions = false
    }

    if (!hasRequiredPermissions) {
      const defaultPage = getDefaultPage(user, { canViewProperties, canViewLeads, canAccessHR })
      router.push(defaultPage)
      return
    }

    setIsAuthorized(true)
  }, [user, loading, router, allowedRoles, requiredPermissions, canManageProperties, canManageUsers, canViewFinancial, canViewAgentPerformance, canViewProperties, canViewLeads, canAccessHR])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
