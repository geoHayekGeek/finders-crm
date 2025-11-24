'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, Download, FileSpreadsheet, FileText, Trash2, Calendar, Edit, X } from 'lucide-react'
import { OperationsDailyReport, OperationsDailyFilters } from '@/types/reports'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsSelector } from '@/components/OperationsSelector'
import CreateOperationsDailyModal from './CreateOperationsDailyModal'
import EditOperationsDailyModal from './EditOperationsDailyModal'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function OperationsDailyTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  // State
  const [reports, setReports] = useState<OperationsDailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<OperationsDailyFilters>({})
  
  const today = new Date()
  const defaultDate = today.toISOString().split('T')[0]

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<OperationsDailyReport | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)

  // Load data
  useEffect(() => {
    if (token) {
      loadReports()
    }
  }, [token, filters])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await operationsDailyApi.getAll(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      console.error('Error loading operations daily reports:', error)
      showError(error.message || 'Failed to load operations daily reports')
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = async (reportId: number) => {
    try {
      const response = await operationsDailyApi.getById(reportId, token)
      if (response.success) {
        setSelectedReport(response.data)
        setShowEditModal(true)
      }
    } catch (error: any) {
      console.error('Error loading report:', error)
      showError(error.message || 'Failed to load report')
    }
  }

  // Handle recalculate
  const handleRecalculate = async (reportId: number) => {
    try {
      const response = await operationsDailyApi.recalculate(reportId, token)
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
      const response = await operationsDailyApi.delete(reportToDelete, token)
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
      const blob = await operationsDailyApi.exportToExcel(reportId, token)
      
      const report = reports.find(r => r.id === reportId)
      const dateStr = report ? new Date(report.report_date).toISOString().split('T')[0] : 'report'
      const filename = `Operations_Daily_${report?.operations_name.replace(/\s+/g, '_')}_${dateStr}.xlsx`

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
      const blob = await operationsDailyApi.exportToPDF(reportId, token)
      
      const report = reports.find(r => r.id === reportId)
      const dateStr = report ? new Date(report.report_date).toISOString().split('T')[0] : 'report'
      const filename = `Operations_Daily_${report?.operations_name.replace(/\s+/g, '_')}_${dateStr}.pdf`

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

  // Calculate effective leads responded to (subtract out of duty time)
  const getEffectiveLeadsResponded = (report: OperationsDailyReport) => {
    return Math.max(0, report.leads_responded_to - (report.leads_responded_out_of_duty_time || 0))
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Simple filters component
  const SimpleFilters = () => {
    const hasActiveFilters = Boolean(filters.operations_id || filters.report_date || filters.start_date || filters.end_date)

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({})}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operations
            </label>
            <OperationsSelector
              selectedOperationsId={filters.operations_id}
              onOperationsChange={(id) => setFilters(prev => ({ ...prev, operations_id: id }))}
              placeholder="All operations"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Date
            </label>
            <input
              type="date"
              value={filters.report_date || ''}
              onChange={(e) => {
                const value = e.target.value || undefined
                setFilters(prev => ({ ...prev, report_date: value, start_date: undefined, end_date: undefined }))
              }}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => {
                const value = e.target.value || undefined
                setFilters(prev => {
                  if (value && prev?.end_date && value > prev.end_date) {
                    return { ...prev, start_date: value, end_date: value, report_date: undefined }
                  }
                  return { ...prev, start_date: value, report_date: undefined }
                })
              }}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              max={filters.end_date || undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => {
                const value = e.target.value || undefined
                setFilters(prev => {
                  if (value && prev?.start_date && value < prev.start_date) {
                    return { ...prev, start_date: value, end_date: value, report_date: undefined }
                  }
                  return { ...prev, end_date: value, report_date: undefined }
                })
              }}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              min={filters.start_date || undefined}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Today', date: defaultDate },
            { label: 'Yesterday', date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
            { label: 'Last 7 Days', start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: defaultDate },
            { label: 'Last 30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: defaultDate }
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
              className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <SimpleFilters />

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
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Operations Daily Reports
            </h3>
            <p className="text-sm text-blue-700">
              Track daily operations activities including properties added, leads responded to, and task efficiency metrics.
              Calculated fields are automatically updated from the database.
            </p>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operations
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col items-center">
                    <span>Properties Added</span>
                    <span className="text-blue-500 font-normal normal-case mt-0.5">(Calculated)</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col items-center">
                    <span>Leads Responded</span>
                    <span className="text-blue-500 font-normal normal-case mt-0.5">(Calculated)</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col items-center">
                    <span>Amending Properties</span>
                    <span className="text-blue-500 font-normal normal-case mt-0.5">(Calculated)</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preparing Contract
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks Efficiency
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                      {report.operations_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-blue-600">{report.properties_added}</span>
                        <span className="text-xs text-blue-500 font-medium">Properties Added</span>
                        <span className="text-xs text-gray-400 mt-0.5">(calculated)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-blue-600">{getEffectiveLeadsResponded(report)}</span>
                        <span className="text-xs text-blue-500 font-medium">Leads Responded</span>
                        {report.leads_responded_out_of_duty_time > 0 && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            ({report.leads_responded_to} total - {report.leads_responded_out_of_duty_time} out of duty)
                          </span>
                        )}
                        <span className="text-xs text-gray-400 mt-0.5">(calculated)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-blue-600">{report.amending_previous_properties}</span>
                        <span className="text-xs text-blue-500 font-medium">Amending Properties</span>
                        <span className="text-xs text-gray-400 mt-0.5">(calculated)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.preparing_contract || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs">
                          Duty: <span className={report.tasks_efficiency_duty_time < 0 ? 'text-red-600 font-semibold' : ''}>{report.tasks_efficiency_duty_time || 0}</span>
                        </span>
                        <span className="text-xs">
                          Uniform: <span className={report.tasks_efficiency_uniform < 0 ? 'text-red-600 font-semibold' : ''}>{report.tasks_efficiency_uniform || 0}</span>
                        </span>
                        <span className="text-xs">
                          After Duty: <span className={report.tasks_efficiency_after_duty < 0 ? 'text-red-600 font-semibold' : ''}>{report.tasks_efficiency_after_duty || 0}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
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

      {/* Create Modal */}
      <CreateOperationsDailyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadReports()
        }}
      />

      {/* Edit Modal */}
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

      {/* Delete Confirmation Modal */}
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

