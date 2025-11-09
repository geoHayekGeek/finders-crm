'use client'

import { useState } from 'react'
import { BarChart3, FileText, TrendingUp, DollarSign, ClipboardList } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import MonthlyAgentStatsTab from '@/components/reports/MonthlyAgentStatsTab'
import DCSRTab from '@/components/reports/DCSRTab'
import OperationsCommissionTab from '@/components/reports/OperationsCommissionTab'

// Tab configuration
type TabId = 'monthly-agent-stats' | 'dcsr-report' | 'operations-commission' | 'leads-report' | 'revenue-report' | 'performance-report'

interface Tab {
  id: TabId
  name: string
  icon: any
  description: string
  comingSoon?: boolean
}

const TABS: Tab[] = [
  {
    id: 'monthly-agent-stats',
    name: 'Monthly Agent Statistics',
    icon: BarChart3,
    description: 'View and manage monthly performance reports for each agent'
  },
  {
    id: 'dcsr-report',
    name: 'DCSR Report',
    icon: ClipboardList,
    description: 'Daily Client/Sales Report - Track listings, leads, closures, and viewings'
  },
  {
    id: 'operations-commission',
    name: 'Operations Commission',
    icon: DollarSign,
    description: 'Total operations commission from all closed properties (sales and rentals)'
  }
]

function ReportsPageContent() {
  const { user } = useAuth()
  const { role } = usePermissions()
  const [activeTab, setActiveTab] = useState<TabId>('monthly-agent-stats')

  // Get active tab configuration
  const activeTabConfig = TABS.find(tab => tab.id === activeTab)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">
          {activeTabConfig?.description || 'Comprehensive reporting and analytics for your real estate business'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const isDisabled = tab.comingSoon

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : isDisabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`
                      mr-2 h-5 w-5
                      ${isActive
                        ? 'text-blue-500'
                        : isDisabled
                        ? 'text-gray-400'
                        : 'text-gray-400 group-hover:text-gray-500'
                      }
                    `}
                  />
                  <span className="whitespace-nowrap">
                    {tab.name}
                    {tab.comingSoon && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Coming Soon
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'monthly-agent-stats' && <MonthlyAgentStatsTab />}
          
          {activeTab === 'dcsr-report' && <DCSRTab />}
          
          {activeTab === 'operations-commission' && <OperationsCommissionTab />}
          
          {activeTab === 'leads-report' && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Leads Report</h3>
              <p className="mt-1 text-sm text-gray-500">
                This feature is coming soon. You'll be able to analyze lead conversion rates and sources.
              </p>
            </div>
          )}

          {activeTab === 'revenue-report' && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Revenue Report</h3>
              <p className="mt-1 text-sm text-gray-500">
                This feature is coming soon. You'll be able to track revenue trends and sales performance.
              </p>
            </div>
          )}

          {activeTab === 'performance-report' && (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Performance Report</h3>
              <p className="mt-1 text-sm text-gray-500">
                This feature is coming soon. You'll be able to evaluate team and individual performance metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute requiredPermissions={{ canViewAgentPerformance: true }}>
      <ReportsPageContent />
    </ProtectedRoute>
  )
}

