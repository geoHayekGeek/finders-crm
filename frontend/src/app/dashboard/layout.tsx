'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  Home, 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
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
  LucideIcon
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

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
  const { canManageProperties, canManageUsers, canViewFinancial, canViewAgentPerformance, canViewCategoriesAndStatuses, canManageCategoriesAndStatuses, canViewLeads, canManageLeads, canViewViewings, canViewClients, role } = usePermissions()

  // Permission-based navigation
  const getNavigation = (): NavigationItem[] => {
    const baseNavigation: NavigationItem[] = []

    // For agents: show dashboard, properties, leads, viewings, and calendar
    if (role === 'agent') {
      baseNavigation.push({ name: 'Dashboard', href: '/dashboard', icon: Home, alwaysVisible: true })
      baseNavigation.push({ 
        name: 'Properties', 
        href: '/dashboard/properties', 
        icon: Building2, 
        alwaysVisible: true
      })
      baseNavigation.push({ 
        name: 'Leads', 
        href: '/dashboard/leads', 
        icon: FileText, 
        alwaysVisible: true
      })
      baseNavigation.push({ 
        name: 'Viewings', 
        href: '/dashboard/viewings', 
        icon: Eye, 
        alwaysVisible: true
      })
      baseNavigation.push({ name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, alwaysVisible: true })
      return baseNavigation
    }

    // For all other roles (non-agents): show full navigation
    baseNavigation.push({ name: 'Dashboard', href: '/dashboard', icon: Home, alwaysVisible: true })

    // Properties with submenu for management roles
    const submenuItems = [
      { name: 'All Properties', href: '/dashboard/properties', icon: Building2 }
    ]
    
    // Add categories and statuses to submenu only if user can manage them
    if (canManageCategoriesAndStatuses) {
      submenuItems.push(
        { name: 'Categories', href: '/dashboard/properties/categories', icon: Tag },
        { name: 'Statuses', href: '/dashboard/properties/statuses', icon: Circle }
      )
    }

    baseNavigation.push({ 
      name: 'Properties', 
      href: '/dashboard/properties', 
      icon: Building2, 
      alwaysVisible: true,
      hasSubmenu: submenuItems.length > 1,
      submenu: submenuItems.length > 1 ? submenuItems : undefined
    })

    // Clients - visible to management roles and team leaders
    if (canViewClients) {
      baseNavigation.push({ name: 'Clients', href: '/dashboard/clients', icon: Users, alwaysVisible: true })
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

    // Viewings - visible to agents, team leaders, and management roles
    if (canViewViewings) {
      baseNavigation.push({ 
        name: 'Viewings', 
        href: '/dashboard/viewings', 
        icon: Eye, 
        alwaysVisible: true
      })
    }

    // Calendar - visible to all roles
    baseNavigation.push({ name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, alwaysVisible: true })

    // Analytics - visible to management roles and team leaders
    if (canViewAgentPerformance) {
      baseNavigation.push({ name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, alwaysVisible: true })
    }

    // HR - only visible to admin and operations manager
    if (canManageUsers) {
      baseNavigation.push({ name: 'HR', href: '/dashboard/hr', icon: Briefcase, alwaysVisible: true })
    }

    // Settings - only visible to admin and operations manager
    if (canManageUsers) {
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
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Finders CRM</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
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
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <subItem.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                              {subItem.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <a
                      href={item.href}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                      {item.name}
                    </a>
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
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
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
            <div className="flex h-16 items-center px-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600 flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="text-xl font-bold text-gray-900 transition-opacity duration-300">
                    Finders CRM
                  </span>
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
                        className="group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                        title={!sidebarExpanded ? item.name : undefined}
                      >
                        <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                        {sidebarExpanded && (
                          <>
                            <span className="ml-3 transition-opacity duration-300">{item.name}</span>
                            {((item.name === 'Properties' && propertiesMenuOpen) || (item.name === 'Leads' && leadsMenuOpen)) ? (
                              <ChevronUp className="ml-auto h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-auto h-4 w-4" />
                            )}
                          </>
                        )}
                      </button>
                      {((item.name === 'Properties' && propertiesMenuOpen) || (item.name === 'Leads' && leadsMenuOpen)) && sidebarExpanded && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.submenu?.map((subItem) => (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                            >
                              <subItem.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                              {subItem.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <a
                      href={item.href}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                      title={!sidebarExpanded ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                      {sidebarExpanded && (
                        <span className="ml-3 transition-opacity duration-300">{item.name}</span>
                      )}
                    </a>
                  )}
                </div>
              ))}
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
                      <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
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
                <NotificationBell />
                <div className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user?.name}</span>
                </div>
                <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  Help
                </button>
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
