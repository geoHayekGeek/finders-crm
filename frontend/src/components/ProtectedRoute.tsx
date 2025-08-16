'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'

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
  const { canManageProperties, canManageUsers, canViewFinancial, canViewAgentPerformance } = usePermissions()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    console.log('ProtectedRoute - Loading:', loading)
    console.log('ProtectedRoute - User:', user)
    console.log('ProtectedRoute - Required permissions:', requiredPermissions)
    console.log('ProtectedRoute - Allowed roles:', allowedRoles)
    
    if (loading) return

    if (!user) {
      console.log('ProtectedRoute - No user, redirecting to login')
      router.push('/login')
      return
    }

    // Check role-based access
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      console.log('ProtectedRoute - Role not allowed, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    // Check permission-based access
    let hasRequiredPermissions = true
    if (requiredPermissions.canManageProperties && !canManageProperties) {
      console.log('ProtectedRoute - Missing canManageProperties permission')
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canManageUsers && !canManageUsers) {
      console.log('ProtectedRoute - Missing canManageUsers permission')
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canViewFinancial && !canViewFinancial) {
      console.log('ProtectedRoute - Missing canViewFinancial permission')
      hasRequiredPermissions = false
    }
    if (requiredPermissions.canViewAgentPerformance && !canViewAgentPerformance) {
      console.log('ProtectedRoute - Missing canViewAgentPerformance permission')
      hasRequiredPermissions = false
    }

    if (!hasRequiredPermissions) {
      console.log('ProtectedRoute - Missing required permissions, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    console.log('ProtectedRoute - Access granted')
    setIsAuthorized(true)
  }, [user, loading, router, allowedRoles, requiredPermissions, canManageProperties, canManageUsers, canViewFinancial, canViewAgentPerformance])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
