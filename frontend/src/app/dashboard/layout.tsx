'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { useSettings } from '@/contexts/SettingsContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  Building2, 
  FileText, 
  Settings, 
  Menu, 
  X,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Circle,
  Briefcase,
  Eye,
  BarChart3,
  LucideIcon
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { PendingReferralsBadge } from '@/components/PendingReferralsBadge'
import { PendingLeadReferralsBadge } from '@/components/PendingLeadReferralsBadge'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface NavigationSubmenuItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  alwaysVisible: boolean
  hasSubmenu?: boolean
  submenu?: NavigationSubmenuItem[]
}

const formatRole = (role?: string | null) => {
  if (!role) {
    return 'User'
  }

  return role
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [propertiesMenuOpen, setPropertiesMenuOpen] = useState(false)
  const [leadsMenuOpen, setLeadsMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { canAccessHR, canManageProperties, canViewProperties, canManageUsers, canViewFinancial, canViewAgentPerformance, canViewCategoriesAndStatuses, canManageCategoriesAndStatuses, canViewLeads, canManageLeads, canViewViewings, role } = usePermissions()
  const { settings } = useSettings()
  const router = useRouter()

  // Permission-based navigation
  const getNavigation = (): NavigationItem[] => {
    const baseNavigation: NavigationItem[] = []

    // For agents: show properties, leads, viewings, calendar, and HR
    if (role === 'agent') {
      baseNavigation.push({ 
        name: 'Properties', 
        href: '/properties', 
        icon: Building2, 
        alwaysVisible: true
      })
      baseNavigation.push({ 
        name: 'Leads', 
        href: '/dashboard/leads', 
        icon: FileText, 
        alwaysVisible: true
      })
      baseNavigation.push({ name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, alwaysVisible: true })
      baseNavigation.push({ name: 'HR', href: '/dashboard/hr', icon: Briefcase, alwaysVisible: true })
      return baseNavigation
    }

    // For all other roles (non-agents): show full navigation
    // Properties with submenu for management roles - only show if user can view properties
    if (canViewProperties) {
      const submenuItems = [
        { name: 'All Properties', href: '/properties', icon: Building2 }
      ]
      
      // Add categories and statuses to submenu only if user can manage them
      if (canManageCategoriesAndStatuses) {
        submenuItems.push(
          { name: 'Categories', href: '/properties/categories', icon: Tag },
          { name: 'Statuses', href: '/properties/statuses', icon: Circle }
        )
      }

      baseNavigation.push({ 
        name: 'Properties', 
        href: '/properties', 
        icon: Building2, 
        alwaysVisible: true,
        hasSubmenu: submenuItems.length > 1,
        submenu: submenuItems.length > 1 ? submenuItems : undefined
      })
    }

    // Leads with submenu for management roles only
    if (canViewLeads) {
      const leadsSubmenuItems = [
        { name: 'All Leads', href: '/dashboard/leads', icon: FileText }
      ]
      
      // Add lead statuses to submenu only if user can manage leads
      if (canManageLeads) {
        leadsSubmenuItems.push(
          { name: 'Lead Statuses', href: '/dashboard/leads/statuses', icon: Circle }
        )
      }

      baseNavigation.push({ 
        name: 'Leads', 
        href: '/dashboard/leads', 
        icon: FileText, 
        alwaysVisible: true,
        hasSubmenu: leadsSubmenuItems.length > 1,
        submenu: leadsSubmenuItems.length > 1 ? leadsSubmenuItems : undefined
      })
    }

    // Calendar - visible to all roles
    baseNavigation.push({ name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, alwaysVisible: true })

    // Reports - visible to roles with agent performance viewing permissions
    if (canViewAgentPerformance) {
      baseNavigation.push({ name: 'Reports', href: '/dashboard/reports', icon: BarChart3, alwaysVisible: true })
    }

    // HR - visible to everyone (all authenticated users can see their own profile)
    baseNavigation.push({ name: 'HR', href: '/dashboard/hr', icon: Briefcase, alwaysVisible: true })

    // Settings - only visible to admin
    if (role === 'admin') {
      baseNavigation.push({ name: 'Settings', href: '/dashboard/settings', icon: Settings, alwaysVisible: false })
    }

    return baseNavigation
  }

  const navigation = getNavigation()

  const handleLogout = () => {
    logout()
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-20 items-center justify-between px-4 border-b border-gray-200">
              <div className="flex items-center justify-center flex-1">
                {settings.company_logo ? (
                  <img 
                    src={settings.company_logo} 
                    alt={settings.company_name} 
                    className="h-12 w-auto max-w-[200px] object-contain"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-8 w-8" style={{ color: settings.primary_color }} />
                    <span className="text-xl font-bold text-gray-900">{settings.company_name}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.hasSubmenu ? (
                    <>
                      <button
                        onClick={() => {
                          if (item.name === 'Properties') {
                            setPropertiesMenuOpen(!propertiesMenuOpen)
                          } else if (item.name === 'Leads') {
                            setLeadsMenuOpen(!leadsMenuOpen)
                          }
                        }}
                        className="group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        {item.name}
                        {((item.name === 'Properties' && propertiesMenuOpen) || (item.name === 'Leads' && leadsMenuOpen)) ? (
                          <ChevronUp className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        )}
                      </button>
                      {((item.name === 'Properties' && propertiesMenuOpen) || (item.name === 'Leads' && leadsMenuOpen)) && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.submenu?.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              onClick={() => setSidebarOpen(false)}
                              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <subItem.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{formatRole(user?.role)}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'lg:w-64' : 'lg:w-16'
        }`}>
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            <div className={`flex items-center justify-center border-b border-gray-200 transition-all duration-300 ${
              sidebarExpanded ? 'h-20 px-4' : 'h-16 px-2'
            }`}>
              <div className="flex items-center justify-center w-full">
                {settings.company_logo ? (
                  <img 
                    src={settings.company_logo} 
                    alt={settings.company_name} 
                    className={`object-contain transition-all duration-300 ${
                      sidebarExpanded ? 'h-12 w-auto max-w-[200px]' : 'h-8 w-8'
                    }`}
                  />
                ) : (
                  <>
                    <Building2 className="h-8 w-8 flex-shrink-0" style={{ color: settings.primary_color }} />
                    {sidebarExpanded && (
                      <span className="text-xl font-bold text-gray-900 transition-opacity duration-300 ml-2">
                        {settings.company_name}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Toggle button */}
            <div className="px-2 py-2">
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="w-full flex items-center justify-center p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarExpanded ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const primaryHref = item.submenu?.[0]?.href ?? item.href
                const isPropertiesItem = item.name === 'Properties'
                const isLeadsItem = item.name === 'Leads'
                const isMenuOpen =
                  (isPropertiesItem && propertiesMenuOpen) || (isLeadsItem && leadsMenuOpen)

                return (
                <div key={item.name}>
                  {item.hasSubmenu ? (
                      sidebarExpanded ? (
                    <>
                      <button
                        onClick={() => {
                              if (isPropertiesItem) {
                            setPropertiesMenuOpen(!propertiesMenuOpen)
                              } else if (isLeadsItem) {
                            setLeadsMenuOpen(!leadsMenuOpen)
                          }
                        }}
                        className="group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                      >
                        <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                            <span className="ml-3 transition-opacity duration-300">{item.name}</span>
                            {isMenuOpen ? (
                              <ChevronUp className="ml-auto h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-auto h-4 w-4" />
                        )}
                      </button>
                          {isMenuOpen && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.submenu?.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                            >
                              <subItem.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                      ) : (
                        <Link
                          href={primaryHref}
                          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                          title={item.name}
                        >
                          <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                        </Link>
                      )
                  ) : (
                    <Link
                      href={item.href}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                      title={!sidebarExpanded ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                      {sidebarExpanded && (
                        <span className="ml-3 transition-opacity duration-300">{item.name}</span>
                      )}
                    </Link>
                  )}
                </div>
                )
              })}
            </nav>
            
            <div className="border-t border-gray-200 p-4">
              {sidebarExpanded ? (
                <>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{formatRole(user?.role)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors duration-200"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex justify-center p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors duration-200"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'lg:pl-64' : 'lg:pl-16'
        }`}>
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1"></div>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <PendingReferralsBadge />
                <PendingLeadReferralsBadge />
                <NotificationBell />
                <div className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user?.name}</span>
                </div>
              </div>
            </div>
          </div>

          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
