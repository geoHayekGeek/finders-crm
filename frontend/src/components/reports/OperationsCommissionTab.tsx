'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, Download, FileSpreadsheet, FileText, Trash2, DollarSign, Edit, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react'
import { OperationsCommissionReport, OperationsCommissionFilters } from '@/types/reports'
import { operationsCommissionApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import CreateOperationsCommissionModal from './CreateOperationsCommissionModal'
import EditOperationsCommissionModal from './EditOperationsCommissionModal'

export default function OperationsCommissionTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const { role } = usePermissions()
  
  const canManage = role === 'admin' || role === 'operations manager' || role === 'hr'

  // State
  const [reports, setReports] = useState<OperationsCommissionReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<OperationsCommissionFilters>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)
  
  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<OperationsCommissionReport | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null)

  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  const formatRangeDisplay = (report: OperationsCommissionReport) => {
    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    return `${rangeFormatter.format(start)} → ${rangeFormatter.format(end)}`
  }

  const formatRangeSlug = (report?: OperationsCommissionReport) => {
    if (!report) return 'operations_commission'

    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    const slugFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    return `${slugFormatter.format(start).replace(/[, ]/g, '-')}_to_${slugFormatter.format(end).replace(/[, ]/g, '-')}`
  }

  // Load data
  useEffect(() => {
    if (token) {
      loadReports()
    }
  }, [token, filters])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await operationsCommissionApi.getAll(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      console.error('Error loading operations commission reports:', error)
      showError(error.message || 'Failed to load operations commission reports')
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = async (reportId: number) => {
    try {
      const response = await operationsCommissionApi.getById(reportId, token)
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
      const response = await operationsCommissionApi.recalculate(reportId, token)
      if (response.success) {
        showSuccess('Report recalculated successfully')
        loadReports()
      }
    } catch (error: any) {
      console.error('Error recalculating report:', error)
      showError(error.message || 'Failed to recalculate report')
    }
  }

  // Handle toggle expanded view
  const handleToggleExpanded = async (reportId: number) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null)
    } else {
      setExpandedReportId(reportId)
      // Load full report details if not already loaded
      const report = reports.find(r => r.id === reportId)
      if (report && !report.properties) {
        try {
          const response = await operationsCommissionApi.getById(reportId, token)
          if (response.success) {
            setReports(reports.map(r => r.id === reportId ? response.data : r))
          }
        } catch (error: any) {
          console.error('Error loading report details:', error)
        }
      }
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
      const response = await operationsCommissionApi.delete(reportToDelete, token)
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
      const blob = await operationsCommissionApi.exportToExcel(reportId, token)
      
      const report = reports.find(r => r.id === reportId)
      const filename = `Operations_Commission_${formatRangeSlug(report)}.xlsx`

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
      const blob = await operationsCommissionApi.exportToPDF(reportId, token)
      
      const report = reports.find(r => r.id === reportId)
      const filename = `Operations_Commission_${formatRangeSlug(report)}.pdf`

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

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Start Date',
      'End Date',
      'Commission %',
      'Total Properties',
      'Sales Count',
      'Rent Count',
      'Total Sales Value',
      'Total Rent Value',
      'Total Commission'
    ]

    const rows = reports.map((report) => [
      report.start_date || '',
      report.end_date || '',
      report.commission_percentage || 0,
      report.total_properties_count || 0,
      report.total_sales_count || 0,
      report.total_rent_count || 0,
      typeof report.total_sales_value === 'number' ? report.total_sales_value.toFixed(2) : (parseFloat(report.total_sales_value || 0)).toFixed(2),
      typeof report.total_rent_value === 'number' ? report.total_rent_value.toFixed(2) : (parseFloat(report.total_rent_value || 0)).toFixed(2),
      typeof report.total_commission_amount === 'number' ? report.total_commission_amount.toFixed(2) : (parseFloat(report.total_commission_amount || 0)).toFixed(2)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Operations_Commission_Reports_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showSuccess('Report exported to CSV successfully')
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Simple filters component
  const SimpleFilters = () => {
    const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.date_from || filters.date_to)

    const applyPreset = (start: string, end: string) => {
      setFilters({ start_date: start, end_date: end })
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => {
              const value = e.target.value || undefined
              setFilters(prev => {
                if (value && prev?.end_date && value > prev.end_date) {
                  return { ...prev, start_date: value, end_date: value }
                }
                return { ...prev, start_date: value }
              })
            }}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            max={filters.end_date || "9999-12-31"}
          />
          <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
            —
          </div>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => {
              const value = e.target.value || undefined
              setFilters(prev => {
                if (value && prev?.start_date && value < prev.start_date) {
                  return { ...prev, start_date: value, end_date: value }
                }
                return { ...prev, end_date: value }
              })
            }}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            min={filters.start_date || undefined}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Previous Month', start: defaultStartDate, end: defaultEndDate },
            { label: 'Month to Date', start: (() => {
              const today = new Date()
              const year = today.getFullYear()
              const month = String(today.getMonth() + 1).padStart(2, '0')
              return `${year}-${month}-01`
            })(), end: new Date().toISOString().split('T')[0] },
            { label: 'Last 30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
            { label: 'Quarter to Date', start: (() => {
              const d = new Date()
              const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3
              return new Date(d.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
            })(), end: new Date().toISOString().split('T')[0] }
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.start, preset.end)}
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
          {canManage && (
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

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <DollarSign className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Total Operations Commission Reports
            </h3>
            <p className="text-sm text-blue-700">
              Reports show operations commission from all closed properties (sales and rentals) inside the selected window. 
              Commission percentage is automatically fetched from system settings.
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
                  Date Range
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission %
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rent Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Commission
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  Details
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <>
                    <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatRangeDisplay(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.commission_percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.total_properties_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.total_sales_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {report.total_rent_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.total_sales_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(report.total_rent_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      {formatCurrency(report.total_commission_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleToggleExpanded(report.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title={expandedReportId === report.id ? "Hide Details" : "Show Details"}
                      >
                        {expandedReportId === report.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {canManage && (
                          <>
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
                          </>
                        )}
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
                        {canManage && (
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Properties Table */}
                  {expandedReportId === report.id && report.properties && (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Closed Properties</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Reference #</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Type</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Price</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Commission ({report.commission_percentage}%)</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Closed Date</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {report.properties.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                                      No properties found for this period
                                    </td>
                                  </tr>
                                ) : (
                                  report.properties.map((property) => (
                                    <tr key={property.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 text-sm">
                                        <button
                                          onClick={() => window.open(`/dashboard/properties?view=${property.id}`, '_blank')}
                                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                                          title="View property details"
                                        >
                                          {property.reference_number}
                                          <ExternalLink className="h-3 w-3" />
                                        </button>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          property.property_type === 'sale' 
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}>
                                          {property.property_type === 'sale' ? 'Sale' : 'Rent'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-right text-gray-900">{formatCurrency(property.price)}</td>
                                      <td className="px-4 py-2 text-sm text-right font-medium text-green-600">{formatCurrency(property.commission)}</td>
                                      <td className="px-4 py-2 text-sm text-center text-gray-500">
                                        {new Date(property.closed_date).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <CreateOperationsCommissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadReports()
        }}
      />

      {/* Edit Modal */}
      {selectedReport && showEditModal && (
        <EditOperationsCommissionModal
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
        title="Delete Operations Commission Report"
        message="Are you sure you want to delete this operations commission report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}

