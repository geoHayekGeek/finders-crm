'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, Download, FileSpreadsheet, FileText, Edit, Trash2, CalendarRange, X, BarChart2 } from 'lucide-react'
import { DCSRMonthlyReport, DCSRReportFilters } from '@/types/reports'
import { dcsrApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import CreateDCSRModal from './CreateDCSRModal'
import EditDCSRModal from './EditDCSRModal'

export default function DCSRTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  // State
  const [reports, setReports] = useState<DCSRMonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DCSRReportFilters>({})
  
  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)
  const [editingReport, setEditingReport] = useState<DCSRMonthlyReport | null>(null)

  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  const formatRangeDisplay = (report: DCSRMonthlyReport) => {
    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    return `${rangeFormatter.format(start)} → ${rangeFormatter.format(end)}`
  }

  const formatRangeSlug = (report?: DCSRMonthlyReport) => {
    if (!report) return 'dcsr_report'

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
      const response = await dcsrApi.getAll(filters, token)
      if (response.success) {
        setReports(response.data)
      }
    } catch (error: any) {
      console.error('Error loading DCSR reports:', error)
      showError(error.message || 'Failed to load DCSR reports')
    } finally {
      setLoading(false)
    }
  }

  // Handle recalculate
  const handleRecalculate = async (reportId: number) => {
    try {
      const response = await dcsrApi.recalculate(reportId, token)
      if (response.success) {
        showSuccess('DCSR report recalculated successfully')
        loadReports()
      }
    } catch (error: any) {
      console.error('Error recalculating DCSR report:', error)
      showError(error.message || 'Failed to recalculate DCSR report')
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
      const response = await dcsrApi.delete(reportToDelete, token)
      if (response.success) {
        showSuccess('DCSR report deleted successfully')
        loadReports()
        setShowDeleteModal(false)
        setReportToDelete(null)
      }
    } catch (error: any) {
      console.error('Error deleting DCSR report:', error)
      showError(error.message || 'Failed to delete DCSR report')
    }
  }

  // Handle edit report
  const handleEditReport = (report: DCSRMonthlyReport) => {
    setEditingReport(report)
    setShowEditModal(true)
  }

  // Handle export to Excel
  const handleExportExcel = async (reportId: number) => {
    try {
      const blob = await dcsrApi.exportToExcel(reportId, token)
      
      // Get filename from report data
      const report = reports.find(r => r.id === reportId)
      const filename = `DCSR_Report_${formatRangeSlug(report)}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('DCSR report exported to Excel successfully')
    } catch (error: any) {
      console.error('Error exporting to Excel:', error)
      showError(error.message || 'Failed to export DCSR report to Excel')
    }
  }

  // Handle export to PDF
  const handleExportPDF = async (reportId: number) => {
    try {
      const blob = await dcsrApi.exportToPDF(reportId, token)
      
      // Get filename from report data
      const report = reports.find(r => r.id === reportId)
      const filename = `DCSR_Report_${formatRangeSlug(report)}.pdf`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('DCSR report exported to PDF successfully')
    } catch (error: any) {
      console.error('Error exporting to PDF:', error)
      showError(error.message || 'Failed to export DCSR report to PDF')
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Start Date',
      'End Date',
      'Listings',
      'Leads',
      'Sales',
      'Rent',
      'Viewings'
    ]

    const rows = reports.map((report) => [
      report.start_date,
      report.end_date,
      report.listings_count,
      report.leads_count,
      report.sales_count,
      report.rent_count,
      report.viewings_count
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
    link.setAttribute('download', `DCSR_Company_Reports_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showSuccess('Report exported to CSV successfully')
  }

  // Simple filters component (date range only)
  const SimpleFilters = () => {
    const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.date_from || filters.date_to)

    const applyPreset = (start: string, end: string) => {
      setFilters({ start_date: start, end_date: end })
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CalendarRange className="h-5 w-5 text-gray-400 mr-2" />
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
            max={filters.end_date || undefined}
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
            { label: 'Last 30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
            { label: 'Quarter to Date', start: (() => {
              const d = new Date()
              const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3
              return new Date(d.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
            })(), end: new Date().toISOString().split('T')[0] }
          ].map(preset => (
            <button
              type="button"
              key={preset.label}
              onClick={() => applyPreset(preset.start, preset.end)}
              className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.start_date && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                From: {filters.start_date}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, start_date: undefined }))}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.end_date && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                To: {filters.end_date}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, end_date: undefined }))}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
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
            Create DCSR Report
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

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <BarChart2 className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              About DCSR Reports
            </h3>
            <p className="text-sm text-blue-700">
              DCSR (Daily Client/Sales Report) tracks <strong>company-wide</strong> activity and results across the selected window. 
              <span className="font-medium"> Description</span> shows total listings and leads, 
              <span className="font-medium"> Closures</span> show total sales and rentals, and 
              <span className="font-medium"> Viewings</span> track total client appointments across all agents.
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                  Listings
                  <div className="text-[10px] font-normal text-gray-500 normal-case">Description</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                  Leads
                  <div className="text-[10px] font-normal text-gray-500 normal-case">Description</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                  Sale
                  <div className="text-[10px] font-normal text-gray-500 normal-case">Closures</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                  Rent
                  <div className="text-[10px] font-normal text-gray-500 normal-case">Closures</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                  Viewings
                </th>
                <th className="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading DCSR reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No DCSR reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">
                      {formatRangeDisplay(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 bg-blue-50">
                      {report.listings_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 bg-blue-50">
                      {report.leads_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 bg-green-50">
                      {report.sales_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 bg-green-50">
                      {report.rent_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 bg-purple-50">
                      {report.viewings_count}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateDCSRModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadReports()
          }}
        />
      )}

      {showEditModal && editingReport && (
        <EditDCSRModal
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
        title="Delete DCSR Report"
        message="Are you sure you want to delete this DCSR report? This action cannot be undone."
        confirmText="Delete Report"
        variant="danger"
      />
    </div>
  )
}

