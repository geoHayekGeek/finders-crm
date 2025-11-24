'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, Download, FileSpreadsheet, FileText, Edit, Trash2, Eye } from 'lucide-react'
import { MonthlyAgentReport, ReportFilters } from '@/types/reports'
import { reportsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { usePermissions } from '@/contexts/PermissionContext'
import ReportsFilters from './ReportsFilters'
import CreateReportModal from './CreateReportModal'
import EditReportModal from './EditReportModal'
import AgentEarningsModal from './AgentEarningsModal'
import { formatCurrency } from '@/utils/formatters'

export default function MonthlyAgentStatsTab() {
  const { token, user } = useAuth()
  const { role } = usePermissions()
  const { showSuccess, showError } = useToast()

  // State
  const [reports, setReports] = useState<MonthlyAgentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)
  const [filters, setFilters] = useState<ReportFilters>({})
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReport, setEditingReport] = useState<MonthlyAgentReport | null>(null)
  const [showEarningsModal, setShowEarningsModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MonthlyAgentReport | null>(null)

  const canCreateReport =
    role === 'admin' || role === 'operations manager' || role === 'operations'
  const isLimitedView = role === 'agent' || role === 'team_leader'
  const lockedAgentId = isLimitedView && user ? user.id : undefined

  // Load data
  useEffect(() => {
    if (token) {
      loadReports()
      loadLeadSources()
    }
  }, [token, filters])

  useEffect(() => {
    if (lockedAgentId) {
      setFilters(prev =>
        prev.agent_id === lockedAgentId ? prev : { ...prev, agent_id: lockedAgentId }
      )
    } else {
      setFilters(prev => {
        if (prev.agent_id === undefined) {
          return prev
        }
        const { agent_id, ...rest } = prev
        return rest
      })
    }
  }, [lockedAgentId])

  const setFiltersSafe = (next: ReportFilters) => {
    if (lockedAgentId) {
      setFilters({ ...next, agent_id: lockedAgentId })
    } else {
      setFilters(next)
    }
  }

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
    setReportToDelete(reportId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) return

    try {
      const response = await reportsApi.delete(reportToDelete, token)
      if (response.success) {
        showSuccess('Report deleted successfully')
        loadReports()
        setShowDeleteModal(false)
        setReportToDelete(null)
      }
    } catch (error: any) {
      console.error('Error deleting report:', error)
      showError(error.message || 'Failed to delete report')
    }
  }

  // Handle export to Excel
  const handleExportExcel = async (reportId: number) => {
    try {
      const blob = await reportsApi.exportToExcel(reportId, token)
      
      // Get filename from report data
      const report = reports.find(r => r.id === reportId)
      const filename = `Report_${formatRangeSlug(report)}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Report exported to Excel successfully')
    } catch (error: any) {
      console.error('Error exporting to Excel:', error)
      showError(error.message || 'Failed to export report to Excel')
    }
  }

  // Handle export to PDF
  const handleExportPDF = async (reportId: number) => {
    try {
      const blob = await reportsApi.exportToPDF(reportId, token)
      
      // Get filename from report data
      const report = reports.find(r => r.id === reportId)
      const filename = `Report_${formatRangeSlug(report)}.pdf`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Report exported to PDF successfully')
    } catch (error: any) {
      console.error('Error exporting to PDF:', error)
      showError(error.message || 'Failed to export report to PDF')
    }
  }

  // Handle edit report
  const handleEditReport = (report: MonthlyAgentReport) => {
    setEditingReport(report)
    setShowEditModal(true)
  }

  // Get all unique lead sources from reports
  const visibleReports = useMemo(() => {
    if (lockedAgentId) {
      return reports.filter(report => report.agent_id === lockedAgentId)
    }
    return reports
  }, [reports, lockedAgentId])

  const allLeadSources = useMemo(() => {
    const sourcesSet = new Set<string>()
    visibleReports.forEach(report => {
      Object.keys(report.lead_sources || {}).forEach(source => sourcesSet.add(source))
    })
    leadSources.forEach(source => sourcesSet.add(source))
    return Array.from(sourcesSet).sort()
  }, [visibleReports, leadSources])

  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  const formatRangeSlug = (report?: MonthlyAgentReport) => {
    if (!report) {
      return 'report'
    }

    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    const safeStart = rangeFormatter.format(start).replace(/[, ]/g, '-')
    const safeEnd = rangeFormatter.format(end).replace(/[, ]/g, '-')

    return `${report.agent_name.replace(/\s+/g, '_')}_${safeStart}_to_${safeEnd}`
  }

  const formatRangeDisplay = (report: MonthlyAgentReport) => {
    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    return `${rangeFormatter.format(start)} – ${rangeFormatter.format(end)}`
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Agent',
      'Start Date',
      'End Date',
      'Listings',
      ...allLeadSources.map(source => source),
      'Viewings',
      'Boosts',
      'Sales',
      'Sales Amount',
      'Agent Com',
      'Finders Com',
      // 'Ref Com' removed - use referrals_on_properties_commission instead
      'TL Com',
      'Admin Com',
      'Total Com',
      'Ref Received'
    ]

    const rows = visibleReports.map(report => {
      const start = report.start_date
        ? report.start_date
        : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
            .toISOString()
            .split('T')[0]
      const end = report.end_date
        ? report.end_date
        : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)
            .toISOString()
            .split('T')[0]

      return [
        report.agent_name,
        start,
        end,
        report.listings_count,
        ...allLeadSources.map(source => report.lead_sources?.[source] || 0),
        report.viewings_count,
        report.boosts,
        report.sales_count,
        report.sales_amount,
        report.agent_commission,
        report.finders_commission,
        // referral_commission removed - use referrals_on_properties_commission instead
        report.team_leader_commission,
        report.administration_commission,
        report.total_commission,
        report.referral_received_count
      ]
    })

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

  if (isLimitedView) {
    const handleViewEarnings = (report: MonthlyAgentReport) => {
      setSelectedReport(report)
      setShowEarningsModal(true)
    }

    return (
      <div className="space-y-6">
        <ReportsFilters
          filters={filters}
          setFilters={setFiltersSafe}
          onClearFilters={() =>
            lockedAgentId ? setFilters({ agent_id: lockedAgentId }) : setFilters({})
          }
          agentFilterDisabled
          lockedAgentId={lockedAgentId}
        />

        <div className="flex items-center justify-end">
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            Loading your reports...
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No reports found for the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleReports.map(report => {
              const toNumber = (value: unknown): number => {
                const numeric = Number(value)
                return Number.isFinite(numeric) ? numeric : 0
              }

              const closureCommission = toNumber(report.agent_commission)
              const referralCommission = toNumber(
                report.referral_received_commission ?? 0
              )
              const totalCommission = closureCommission + referralCommission

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Reporting Period</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatRangeDisplay(report)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <p className="text-sm text-blue-800 font-medium">
                          Commission from Closures
                        </p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(closureCommission)}
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                        <p className="text-sm text-purple-800 font-medium">
                          Commission from Referred Leads
                        </p>
                        <p className="text-2xl font-bold text-purple-900">
                          {formatCurrency(referralCommission)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Total Earnings
                      </p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(totalCommission)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewEarnings(report)}
                      className="inline-flex items-center px-3 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showEarningsModal && selectedReport && (
          <AgentEarningsModal
            report={selectedReport}
            onClose={() => {
              setShowEarningsModal(false)
              setSelectedReport(null)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ReportsFilters
        filters={filters}
        setFilters={setFiltersSafe}
        onClearFilters={() => setFilters({})}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {canCreateReport && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Report
            </button>
          )}
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
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
                {/* referral_commission removed - use referrals_on_properties_commission instead */}
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
              ) : visibleReports.length === 0 ? (
                <tr>
                  <td colSpan={15 + allLeadSources.length} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                visibleReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatRangeDisplay(report)}
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
                    {/* referral_commission removed - use referrals_on_properties_commission instead */}
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
                          onClick={() => handleExportExcel(report.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Export to Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(report.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Export to PDF"
                        >
                          <FileText className="h-4 w-4" />
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

      {showCreateModal && canCreateReport && (
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setReportToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}

