'use client'

import { useEffect, useState } from 'react'
import { Calendar, Edit, FileSpreadsheet, FileText, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { OperationsDailyFilters, OperationsDailyReport } from '@/types/reports'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { downloadBlob, sanitizeFilenamePart } from '@/utils/fileDownload'
import { OperationsSelector } from '@/components/OperationsSelector'
import CreateOperationsDailyModal from './CreateOperationsDailyModal'
import EditOperationsDailyModal from './EditOperationsDailyModal'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { formatDateDisplay, formatDateInput } from '@/utils/formatters'
import { OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS } from './operationsDailyFields'

const DAILY_TABLE_COLUMNS = OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS

function normalizeCellValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getFieldTone(value: number, fieldKey: string) {
  if (fieldKey === 'tasks_efficiency' && value < 0) {
    return 'text-red-600'
  }

  return 'text-gray-900'
}

export default function OperationsDailyTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [reports, setReports] = useState<OperationsDailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<OperationsDailyFilters>({})

  const today = new Date()
  const defaultDate = formatDateInput(today)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<OperationsDailyReport | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)

  useEffect(() => {
    if (token) {
      loadReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await operationsDailyApi.getAll(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load operations daily reports')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (reportId: number) => {
    try {
      const response = await operationsDailyApi.getById(reportId, token)
      if (response.success) {
        setSelectedReport(response.data)
        setShowEditModal(true)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load report')
    }
  }

  const handleRecalculate = async (reportId: number) => {
    try {
      const response = await operationsDailyApi.recalculate(reportId, token)
      if (response.success) {
        showSuccess('Report recalculated successfully')
        loadReports()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to recalculate report')
    }
  }

  const handleDelete = async (reportId: number) => {
    setReportToDelete(reportId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) return

    try {
      const response = await operationsDailyApi.delete(reportToDelete, token)
      if (response.success) {
        showSuccess('Report deleted successfully')
        loadReports()
        setShowDeleteModal(false)
        setReportToDelete(null)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to delete report')
    }
  }

  const handleExportExcel = async (reportId: number) => {
    try {
      const blob = await operationsDailyApi.exportToExcel(reportId, token)

      const report = reports.find((item) => item.id === reportId)
      const dateStr = sanitizeFilenamePart(report?.report_date || 'report', 'report')
      const operationsName = sanitizeFilenamePart(report?.operations_name || 'report')
      const filename = `Operations_Daily_${operationsName}_${dateStr}.xlsx`
      downloadBlob(blob, filename)
      showSuccess('Report exported to Excel successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to export report to Excel')
    }
  }

  const handleExportPDF = async (reportId: number) => {
    try {
      const blob = await operationsDailyApi.exportToPDF(reportId, token)

      const report = reports.find((item) => item.id === reportId)
      const dateStr = sanitizeFilenamePart(report?.report_date || 'report', 'report')
      const operationsName = sanitizeFilenamePart(report?.operations_name || 'report')
      const filename = `Operations_Daily_${operationsName}_${dateStr}.pdf`
      downloadBlob(blob, filename)
      showSuccess('Report exported to PDF successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to export report to PDF')
    }
  }

  const formatDate = (dateStr: string) => {
    return formatDateDisplay(dateStr, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const SimpleFilters = () => {
    const hasActiveFilters = Boolean(filters.operations_id || filters.report_date || filters.start_date || filters.end_date)

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({})}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <X className="mr-1 h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Operations</label>
            <OperationsSelector
              selectedOperationsId={filters.operations_id}
              onOperationsChange={(id) => setFilters((prev) => ({ ...prev, operations_id: id }))}
              placeholder="All operations"
              onlyOperations={true}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Report Date</label>
            <input
              type="date"
              value={filters.report_date || ''}
              onChange={(event) => {
                const value = event.target.value || undefined
                setFilters((prev) => ({ ...prev, report_date: value, start_date: undefined, end_date: undefined }))
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(event) => {
                const value = event.target.value || undefined
                setFilters((prev) => {
                  if (value && prev?.end_date && value > prev.end_date) {
                    return { ...prev, start_date: value, end_date: value, report_date: undefined }
                  }

                  return { ...prev, start_date: value, report_date: undefined }
                })
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              max={filters.end_date || undefined}
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
                  if (value && prev?.start_date && value < prev.start_date) {
                    return { ...prev, start_date: value, end_date: value, report_date: undefined }
                  }

                  return { ...prev, end_date: value, report_date: undefined }
                })
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              min={filters.start_date || undefined}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Today', date: defaultDate },
            { label: 'Yesterday', date: formatDateInput(new Date(Date.now() - 24 * 60 * 60 * 1000)) },
            {
              label: 'Month to Date',
              start: (() => {
                const current = new Date()
                const year = current.getFullYear()
                const month = String(current.getMonth() + 1).padStart(2, '0')
                return `${year}-${month}-01`
              })(),
              end: defaultDate
            },
            { label: 'Last 7 Days', start: formatDateInput(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)), end: defaultDate },
            { label: 'Last 30 Days', start: formatDateInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)), end: defaultDate }
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                if ('date' in preset) {
                  setFilters({ report_date: preset.date })
                } else {
                  setFilters({ start_date: preset.start, end_date: preset.end })
                }
              }}
              className="rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const visibleFieldCount = DAILY_TABLE_COLUMNS.length
  const totalColumnCount = 3 + visibleFieldCount

  return (
    <div className="space-y-6">
      <SimpleFilters />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Report
          </button>
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start">
          <Calendar className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <h3 className="mb-1 text-sm font-medium text-blue-900">Operations Daily Reports</h3>
            <p className="text-sm text-blue-700">
              Review the workbook-style daily columns for each operations user. The calculated database values are
              visible in the same row layout as the Excel sheet, and you can edit them during create or update.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1600px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Admin and Operations
                </th>
                {DAILY_TABLE_COLUMNS.map((field) => (
                  <th
                    key={field.key}
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="whitespace-pre-line">{field.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        field.calculated ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {field.calculated ? 'Calculated' : 'Editable'}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={totalColumnCount} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={totalColumnCount} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(report.report_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{report.operations_name}</span>
                        <span className="text-xs text-gray-500">ID #{report.operations_id}</span>
                      </div>
                    </td>
                    {DAILY_TABLE_COLUMNS.map((field) => {
                      const value = normalizeCellValue(report[field.key as keyof OperationsDailyReport])
                      const tone = getFieldTone(value, field.key)

                      return (
                        <td key={field.key} className="px-4 py-4 text-center align-middle">
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-semibold ${tone}`}>{value}</span>
                            <span className="mt-0.5 text-[11px] text-gray-400">
                              {field.calculated ? 'database-driven' : 'editable'}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(report.id)}
                          className="text-indigo-600 hover:text-indigo-900"
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

      <CreateOperationsDailyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadReports()
        }}
      />

      {selectedReport && showEditModal && (
        <EditOperationsDailyModal
          report={selectedReport}
          onClose={() => {
            setShowEditModal(false)
            setSelectedReport(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedReport(null)
            loadReports()
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
        title="Delete Operations Daily Report"
        message="Are you sure you want to delete this operations daily report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}
