'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, FileSpreadsheet, Eye, Trash2, Users, Building2 } from 'lucide-react'
import { TeamMonthlyReport, TeamReportFilters } from '@/types/reports'
import { reportsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import ReportsFilters from './ReportsFilters'
import CreateTeamReportModal from './CreateTeamReportModal'
import { normalizeRole } from '@/utils/roleUtils'
import { formatCurrency } from '@/utils/formatters'
import ViewTeamReportModal from './ViewTeamReportModal'
import {
  reportIconActionBlueButton,
  reportIconActionGreenButton,
  reportIconActionRedButton,
  reportToolbarPrimaryButton,
  reportToolbarSecondaryButton
} from './reportStyles'

function sanitizeFilenamePart(value: string, fallback: string) {
  const safe = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return safe || fallback
}

export default function TeamReportsTab() {
  const { token, user } = useAuth()
  const { role } = usePermissions()
  const { showSuccess, showError } = useToast()

  const normalizedRole = normalizeRole(role)
  const canCreateReport = ['admin', 'operations manager', 'operations', 'agent manager', 'team leader'].includes(normalizedRole)
  const canDeleteReport = ['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizedRole) || normalizedRole === 'team leader'
  const lockedTeamLeaderId = normalizedRole === 'team leader' ? user?.id : undefined

  const [reports, setReports] = useState<TeamMonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TeamReportFilters>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingReport, setViewingReport] = useState<TeamMonthlyReport | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)

  const loadReports = useCallback(async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getAllTeam(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load team reports')
    } finally {
      setLoading(false)
    }
  }, [filters, token, showError])

  useEffect(() => {
    if (token) {
      loadReports()
    }
  }, [loadReports, token])

  useEffect(() => {
    if (normalizedRole === 'team leader' && user?.id) {
      setFilters(prev => prev.team_leader_id === user.id ? prev : { ...prev, team_leader_id: user.id })
    }
  }, [normalizedRole, user?.id])

  const setFiltersSafe = (next: TeamReportFilters) => {
    if (normalizedRole === 'team leader') {
      setFilters({ ...next, team_leader_id: user?.id ?? next.team_leader_id })
      return
    }
    setFilters(next)
  }

  const handleDelete = async (reportId: number) => {
    setReportToDelete(reportId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) return

    try {
      const response = await reportsApi.deleteTeam(reportToDelete, token)
      if (response.success) {
        showSuccess('Team report deleted successfully')
        setShowDeleteModal(false)
        setReportToDelete(null)
        loadReports()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to delete team report')
    }
  }

  const handleExportExcel = async (reportId: number) => {
    try {
      const blob = await reportsApi.exportTeamToExcel(reportId, token)
      const report = reports.find(r => r.id === reportId)
      const filename = `Team_Report_${formatRangeSlug(report)}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Team report exported to Excel successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to export team report to Excel')
    }
  }

  const formatRangeSlug = (report?: TeamMonthlyReport) => {
    if (!report) return 'team_report'

    const start = report.start_date ? new Date(report.start_date) : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date ? new Date(report.end_date) : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    const teamName = sanitizeFilenamePart(report.team_leader_code || report.team_leader_name || 'Team', 'Team')
    return `${teamName}_${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`
  }

  const formatRangeDisplay = (report: TeamMonthlyReport) => {
    const start = report.start_date ? new Date(report.start_date) : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date ? new Date(report.end_date) : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  const formatLeadersSummary = useMemo(() => {
    return reports.reduce((acc, report) => acc + (report.agent_count || 0), 0)
  }, [reports])

  const handleViewReport = (report: TeamMonthlyReport) => {
    setViewingReport(report)
    setShowViewModal(true)
  }

  const summaryCards = [
    { label: 'Team Reports', value: reports.length, icon: Users },
    { label: 'Agents Covered', value: formatLeadersSummary, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      <ReportsFilters
        mode="team"
        filters={filters}
        setFilters={setFiltersSafe}
        onClearFilters={() => setFilters({})}
        lockedTeamLeaderId={lockedTeamLeaderId}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {canCreateReport && (
            <button
              onClick={() => setShowCreateModal(true)}
              className={reportToolbarPrimaryButton}
            >
              <Plus className="h-4 w-4" />
              Create Team Report
            </button>
          )}
          <button
            onClick={loadReports}
            disabled={loading}
            className={reportToolbarSecondaryButton}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agents
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listings
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Viewings
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Commission
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading team reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No team reports found. {canCreateReport ? 'Create your first team report to get started.' : 'No team reports available.'}
                  </td>
                </tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.team_leader_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatRangeDisplay(report)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {report.agent_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {report.listings_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {report.viewings_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {report.sales_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(report.sales_amount ?? 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(report.total_commission ?? 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className={reportIconActionBlueButton}
                        title="View Details"
                        aria-label={`View team report for ${report.team_leader_name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleExportExcel(report.id)}
                        className={reportIconActionGreenButton}
                        title="Export to Excel"
                        aria-label={`Export team report for ${report.team_leader_name} to Excel`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>
                      {canDeleteReport && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          className={reportIconActionRedButton}
                          title="Delete"
                          aria-label={`Delete team report for ${report.team_leader_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && canCreateReport && (
        <CreateTeamReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadReports()
          }}
        />
      )}

      {showViewModal && viewingReport && (
        <ViewTeamReportModal
          report={viewingReport}
          onClose={() => {
            setShowViewModal(false)
            setViewingReport(null)
          }}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setReportToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Team Report"
        message="Are you sure you want to delete this team report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}
