'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, FileSpreadsheet, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { AgentViewReport, AgentViewReportFilters, AgentViewReportPayload } from '@/types/reports'
import { agentViewReportsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import CreateAgentViewReportModal from './CreateAgentViewReportModal'
import { downloadBlob, sanitizeFilenamePart } from '@/utils/fileDownload'
import { normalizeRole } from '@/utils/roleUtils'
import { User } from '@/types/user'
import {
  reportIconActionBlueButton,
  reportIconActionGreenButton,
  reportIconActionRedButton,
  reportToolbarPrimaryButton,
  reportToolbarSecondaryButton
} from './reportStyles'

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)
}

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`
}

function formatMonthLabel(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  })

  return `${formatter.format(start)} to ${formatter.format(end)}`
}

function getAgentLabel(report: AgentViewReport) {
  return report.agent_name || report.report_payload?.agent?.name || 'Agent'
}

function getQuarterBlocks(report: AgentViewReportPayload) {
  return Array.isArray(report.quarter_targets) ? report.quarter_targets : []
}

export default function AgentViewReportsTab() {
  const { token } = useAuth()
  const { role } = usePermissions()
  const { showSuccess, showError } = useToast()

  const normalizedRole = normalizeRole(role)
  const canCreateReport = ['admin', 'operations manager', 'operations'].includes(normalizedRole)
  const canDeleteReport = ['admin', 'operations manager', 'operations'].includes(normalizedRole)

  const [reports, setReports] = useState<AgentViewReport[]>([])
  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [filters, setFilters] = useState<AgentViewReportFilters>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)
  const [viewingReport, setViewingReport] = useState<AgentViewReport | null>(null)

  const loadAgents = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      setLoadingAgents(true)
      const response = await usersApi.getAgents(token)

      if (response.success) {
        setAgents(Array.isArray(response.agents) ? response.agents : [])
        return
      }

      setAgents([])
    } catch {
      try {
        const fallback = await usersApi.getByRole('agent', token)
        if (fallback.success) {
          setAgents(Array.isArray(fallback.data) ? fallback.data : [])
        }
      } catch {
        setAgents([])
      }
    } finally {
      setLoadingAgents(false)
    }
  }, [token])

  const loadReports = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      setLoading(true)
      const response = await agentViewReportsApi.getAll(filters, token)

      if (response.success) {
        setReports(Array.isArray(response.data) ? response.data : [])
      } else {
        setReports([])
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load agent view reports')
    } finally {
      setLoading(false)
    }
  }, [filters, showError, token])

  useEffect(() => {
    void loadAgents()
  }, [loadAgents])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const summary = useMemo(() => {
    const totals = reports.reduce(
      (acc, report) => {
        acc.listings += Number(report.listings_count) || 0
        acc.leads += Number(report.leads_count) || 0
        acc.viewings += Number(report.viewings_count) || 0
        acc.sales += Number(report.sales_count) || 0
        acc.salesAmount += Number(report.sales_amount) || 0
        acc.commission += Number(report.total_commission) || 0
        acc.months += Number(report.period_months) || 0
        return acc
      },
      {
        listings: 0,
        leads: 0,
        viewings: 0,
        sales: 0,
        salesAmount: 0,
        commission: 0,
        months: 0
      }
    )

    return {
      reports: reports.length,
      agents: new Set(reports.map((report) => report.agent_id)).size,
      listings: totals.listings,
      leads: totals.leads,
      viewings: totals.viewings,
      sales: totals.sales,
      salesAmount: totals.salesAmount,
      commission: totals.commission,
      months: totals.months
    }
  }, [reports])

  const handleExportExcel = async (report: AgentViewReport) => {
    if (!token) {
      showError('You must be logged in to export reports')
      return
    }

    try {
      const blob = await agentViewReportsApi.exportToExcel(report.id, token)
      const agentName = sanitizeFilenamePart(getAgentLabel(report), 'Agent')
      const filename = `Agent_View_${agentName}_${sanitizeFilenamePart(report.start_date, 'start')}_to_${sanitizeFilenamePart(report.end_date, 'end')}.xlsx`
      downloadBlob(blob, filename)
      showSuccess('Agent view report exported to Excel successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to export agent view report to Excel')
    }
  }

  const handleDelete = (reportId: number) => {
    setReportToDelete(reportId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) {
      return
    }

    try {
      const response = await agentViewReportsApi.delete(reportToDelete, token)
      if (response.success) {
        showSuccess('Agent view report deleted successfully')
        setShowDeleteModal(false)
        setReportToDelete(null)
        void loadReports()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to delete agent view report')
    }
  }

  const selectedPayload = viewingReport?.report_payload || null
  const quarterBlocks = selectedPayload ? getQuarterBlocks(selectedPayload) : []
  const monthSnapshots = selectedPayload?.months || []

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Agent View Reports</h2>
                <p className="text-sm text-gray-600">
                  Multi-month workbook reports with editable targets, live preview values, and direct Excel download.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.reports}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Agents</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.agents}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Listings</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.listings}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Commission</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(summary.commission)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canCreateReport && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={reportToolbarPrimaryButton}
              >
                <Plus className="h-4 w-4" />
                Create Agent View
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={loading}
              className={reportToolbarSecondaryButton}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Agent</label>
            <select
              value={filters.agent_id || ''}
              onChange={(event) => {
                const value = event.target.value ? Number(event.target.value) : undefined
                setFilters((prev) => ({ ...prev, agent_id: value }))
              }}
              disabled={loadingAgents}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">All agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(event) => {
                const value = event.target.value || undefined
                setFilters((prev) => {
                  if (value && prev.end_date && value > prev.end_date) {
                    return { ...prev, start_date: value, end_date: value }
                  }

                  return { ...prev, start_date: value }
                })
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(event) => {
                const value = event.target.value || undefined
                setFilters((prev) => {
                  if (value && prev.start_date && value < prev.start_date) {
                    return { ...prev, start_date: value, end_date: value }
                  }

                  return { ...prev, end_date: value }
                })
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setFilters({})}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Users className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Workbook scope</p>
            <p className="text-sm text-blue-700">
              Each saved report includes the month sheets plus the AGENT VIEW summary sheet, matching the workbook you shared.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Period</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Months</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Listings</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Leads</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Viewings</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Sales</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Sales Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Dev</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">New Join</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Reviews</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Commission</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
                    Loading agent view reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                    No agent view reports found. Create one to generate the workbook and download it immediately.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>{getAgentLabel(report)}</span>
                        <span className="text-xs text-gray-500">ID #{report.agent_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDateRange(report.start_date, report.end_date)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {report.period_months}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.listings_count}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.leads_count}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.viewings_count}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.sales_count}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{formatMoney(report.sales_amount)}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.dev_count}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.new_join_count}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{report.reviews_count}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatMoney(report.total_commission)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingReport(report)}
                          className={reportIconActionBlueButton}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleExportExcel(report)}
                          className={reportIconActionGreenButton}
                          title="Export Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        {canDeleteReport && (
                          <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            className={reportIconActionRedButton}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingReport && selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-7xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Agent View Report
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {getAgentLabel(viewingReport)} - {formatDateRange(viewingReport.start_date, viewingReport.end_date)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatMonthLabel(viewingReport.start_date, viewingReport.end_date)} - {viewingReport.period_months} months
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Listings</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{viewingReport.listings_count}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Leads</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{viewingReport.leads_count}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Viewings</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{viewingReport.viewings_count}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Commission</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(viewingReport.total_commission)}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-blue-900">Summary Targets</h4>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">Dev Target</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{selectedPayload.summary_targets.dev_target}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">New Join Target</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{selectedPayload.summary_targets.new_join_target}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">Reviews Target</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{selectedPayload.summary_targets.reviews_target}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-blue-900">Quarter Targets</h4>
                  <div className="mt-4 space-y-3">
                    {quarterBlocks.map((block, index) => (
                      <div key={`${index}-${block.listings_target}-${block.sales_amount_target}`} className="rounded-lg bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">Block {index + 1}</p>
                          <p className="text-xs text-gray-500">
                            Listings target: {block.listings_target}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          Sales amount target: {formatMoney(block.sales_amount_target)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Monthly Breakdown</h4>
                  <p className="text-sm text-gray-500">
                    The saved workbook stores one row per month so the Excel export can be recreated exactly.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Listings</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Leads</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Viewings</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Sales</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Sales Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Dev</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">New Join</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Reviews</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Agent Com</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ref Received</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthSnapshots.map((month) => (
                        <tr key={month.month_key}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{month.sheet_name}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.totals.listings_count}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.totals.leads_count}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.totals.viewings_count}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.totals.sales_count}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatMoney(month.totals.sales_amount)}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.manual_totals.dev_total}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.manual_totals.new_join_total}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{month.manual_totals.reviews_total}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatMoney(month.totals.agent_commission)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatMoney(month.totals.referral_received_commission)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatMoney(month.totals.total_commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => void handleExportExcel(viewingReport)}
                className={reportToolbarSecondaryButton}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className={reportToolbarPrimaryButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && canCreateReport && (
        <CreateAgentViewReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            void loadReports()
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
        title="Delete Agent View Report"
        message="Are you sure you want to delete this agent view report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}
