'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, Download, FileSpreadsheet, Edit, Trash2 } from 'lucide-react'
import { MonthlyAgentReport, ReportFilters } from '@/types/reports'
import { reportsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import ReportsFilters from './ReportsFilters'
import CreateReportModal from './CreateReportModal'
import EditReportModal from './EditReportModal'
import { formatCurrency } from '@/utils/formatters'

export default function MonthlyAgentStatsTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  // State
  const [reports, setReports] = useState<MonthlyAgentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [filters, setFilters] = useState<ReportFilters>({})
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReport, setEditingReport] = useState<MonthlyAgentReport | null>(null)

  // Load data
  useEffect(() => {
    if (token) {
      loadReports()
      loadLeadSources()
    }
  }, [token, filters])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getAll(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      console.error('Error loading reports:', error)
      showError(error.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadLeadSources = async () => {
    try {
      const response = await reportsApi.getLeadSources(token)
      if (response.success) {
        setLeadSources(response.data)
      }
    } catch (error: any) {
      console.error('Error loading lead sources:', error)
    }
  }

  // Handle recalculate
  const handleRecalculate = async (reportId: number) => {
    try {
      const response = await reportsApi.recalculate(reportId, token)
      if (response.success) {
        showSuccess('Report recalculated successfully')
        loadReports()
      }
    } catch (error: any) {
      console.error('Error recalculating report:', error)
      showError(error.message || 'Failed to recalculate report')
    }
  }

  // Handle delete
  const handleDelete = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      const response = await reportsApi.delete(reportId, token)
      if (response.success) {
        showSuccess('Report deleted successfully')
        loadReports()
      }
    } catch (error: any) {
      console.error('Error deleting report:', error)
      showError(error.message || 'Failed to delete report')
    }
  }

  // Handle edit report
  const handleEditReport = (report: MonthlyAgentReport) => {
    setEditingReport(report)
    setShowEditModal(true)
  }

  // Get all unique lead sources from reports
  const allLeadSources = useMemo(() => {
    const sourcesSet = new Set<string>()
    reports.forEach(report => {
      Object.keys(report.lead_sources || {}).forEach(source => sourcesSet.add(source))
    })
    // Merge with available sources from settings
    leadSources.forEach(source => sourcesSet.add(source))
    return Array.from(sourcesSet).sort()
  }, [reports, leadSources])

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Agent',
      'Month',
      'Year',
      'Listings',
      ...allLeadSources.map(source => source),
      'Viewings',
      'Boosts',
      'Sales',
      'Sales Amount',
      'Agent Com',
      'Finders Com',
      'Ref Com',
      'TL Com',
      'Admin Com',
      'Total Com',
      'Ref Received'
    ]

    const rows = reports.map(report => [
      report.agent_name,
      report.month,
      report.year,
      report.listings_count,
      ...allLeadSources.map(source => report.lead_sources[source] || 0),
      report.viewings_count,
      report.boosts,
      report.sales_count,
      report.sales_amount,
      report.agent_commission,
      report.finders_commission,
      report.referral_commission,
      report.team_leader_commission,
      report.administration_commission,
      report.total_commission,
      report.referral_received_count
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `monthly_agent_reports_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportsFilters
        filters={filters}
        setFilters={setFilters}
        onClearFilters={() => setFilters({})}
      />

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Report
          </button>
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month/Year
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listings
                </th>
                {allLeadSources.map(source => (
                  <th key={source} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {source}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Viewings
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boosts
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent Com
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fin Com
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ref Com
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TL Com
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adm Com
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tot Com
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ref Rcvd
                </th>
                <th className="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={15 + allLeadSources.length} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={15 + allLeadSources.length} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.year, report.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.listings_count}
                    </td>
                    {allLeadSources.map(source => (
                      <td key={source} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        {report.lead_sources[source] || 0}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.viewings_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.boosts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.sales_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.sales_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.agent_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.finders_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.referral_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.team_leader_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.administration_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(report.total_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.referral_received_count}
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditReport(report)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRecalculate(report.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Recalculate"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadReports()
          }}
        />
      )}

      {showEditModal && editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={() => {
            setShowEditModal(false)
            setEditingReport(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingReport(null)
            loadReports()
          }}
        />
      )}
    </div>
  )
}

