'use client'

import { useMemo, useState, useEffect } from 'react'
import { Plus, RefreshCw, FileSpreadsheet, FileText, Eye, Filter, X } from 'lucide-react'
import { SaleRentSourceRow, SaleRentSourceFilters } from '@/types/reports'
import { saleRentSourceApi, usersApi } from '@/utils/api'
import type { User } from '@/types/user'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import ReportsFilters from './ReportsFilters'
import { formatDateForDisplay } from '@/utils/dateUtils'

interface GeneratedReport {
  id: number
  agent_id: number
  agent_name: string
  start_date: string
  end_date: string
}

export default function SaleRentSourceTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const { role } = usePermissions()
  
  const canManage = role === 'admin' || role === 'operations manager' || role === 'operations'

  const [filters, setFilters] = useState<SaleRentSourceFilters>({})
  const [loading, setLoading] = useState(false)
  
  // Load reports from localStorage on mount
  const loadReportsFromStorage = (): GeneratedReport[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('saleRentSourceReports')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const loadReportRowsFromStorage = (): Record<number, SaleRentSourceRow[]> => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('saleRentSourceReportRows')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const [reports, setReports] = useState<GeneratedReport[]>(loadReportsFromStorage())
  const [reportRows, setReportRows] = useState<Record<number, SaleRentSourceRow[]>>(loadReportRowsFromStorage())
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [agents, setAgents] = useState<User[]>([])

  // Auto-save reports to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && reports.length > 0) {
      try {
        localStorage.setItem('saleRentSourceReports', JSON.stringify(reports))
      } catch (error) {
        console.error('Error saving reports to localStorage:', error)
      }
    }
  }, [reports])

  // Auto-save report rows to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(reportRows).length > 0) {
      try {
        localStorage.setItem('saleRentSourceReportRows', JSON.stringify(reportRows))
      } catch (error) {
        console.error('Error saving report rows to localStorage:', error)
      }
    }
  }, [reportRows])

  // Default dates: previous month
  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  const [createForm, setCreateForm] = useState<{
    agent_id: number | undefined
    start_date: string
    end_date: string
  }>({
    agent_id: undefined,
    start_date: defaultStartDate,
    end_date: defaultEndDate,
  })
  const [previewData, setPreviewData] = useState<SaleRentSourceRow[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Load agents once for dropdown (same logic as ReportsFilters)
  useMemo(() => {
    const loadAgents = async () => {
      if (!token) return
      try {
        const response = await usersApi.getAll(token as string)
        if (response.success) {
          const agentsList = response.users.filter(
            (u: User) => u.role === 'agent' || u.role === 'team_leader'
          )
          setAgents(agentsList)
        }
      } catch (error) {
        console.error('Error loading agents for Sale & Rent Source modal:', error)
      }
    }
    loadAgents()
  }, [token])

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (filters.agent_id && report.agent_id !== filters.agent_id) return false
      if (filters.start_date && report.end_date < filters.start_date) return false
      if (filters.end_date && report.start_date > filters.end_date) return false
      return true
    })
  }, [reports, filters])

  // Filter current rows based on filters
  const currentRows: SaleRentSourceRow[] = useMemo(() => {
    const rows = selectedReportId !== null ? reportRows[selectedReportId] || [] : []
    return rows.filter(row => {
      if (filters.source && row.source_name !== filters.source) return false
      if (filters.sold_rented && row.sold_rented !== filters.sold_rented) return false
      return true
    })
  }, [selectedReportId, reportRows, filters.source, filters.sold_rented])

  // Auto-preview when agent and dates are set
  useEffect(() => {
    if (showCreateModal && createForm.agent_id && createForm.start_date && createForm.end_date && token && !previewLoading) {
      const timeoutId = setTimeout(async () => {
        try {
          setPreviewLoading(true)
          const response = await saleRentSourceApi.getAll(
            {
              agent_id: createForm.agent_id!,
              start_date: createForm.start_date,
              end_date: createForm.end_date,
            },
            token
          )
          if (response.success) {
            setPreviewData(response.data)
          } else {
            setPreviewData(null)
          }
        } catch (error) {
          console.error('Error loading preview:', error)
          setPreviewData(null)
        } finally {
          setPreviewLoading(false)
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setPreviewData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, createForm.agent_id, createForm.start_date, createForm.end_date, token])

  const handleGenerateReport = async () => {
    if (!token) {
      showError('You must be logged in to generate a report')
      return
    }
    if (!createForm.agent_id || !createForm.start_date || !createForm.end_date) {
      showError('Please select agent and date range before generating the report')
      return
    }

    try {
      setLoading(true)
      const response = await saleRentSourceApi.getAll(
        {
          agent_id: createForm.agent_id,
          start_date: createForm.start_date,
          end_date: createForm.end_date,
        },
        token
      )

      if (response.success) {
        const rows = response.data
        const id = Date.now()
        const firstRow = rows[0]

        // Get agent name: either from first row or users list fallback
        let agentName =
          firstRow?.agent_name || `Agent #${createForm.agent_id}`

        // Try to fetch agents to get proper name if not in rows
        if (!firstRow?.agent_name) {
          try {
            const usersResponse = await usersApi.getAll(token as string)
            if (usersResponse.success) {
              const agent = usersResponse.users.find(u => u.id === createForm.agent_id)
              if (agent?.name) {
                agentName = agent.name
              }
            }
          } catch {
            // ignore, fallback already set
          }
        }

        const newReport: GeneratedReport = {
          id,
          agent_id: createForm.agent_id,
          agent_name: agentName,
          start_date: createForm.start_date,
          end_date: createForm.end_date,
        }

        setReports(prev => [newReport, ...prev])
        setReportRows(prev => ({ ...prev, [id]: rows }))
        setSelectedReportId(id)
        setIsViewOpen(true)
        setShowCreateModal(false)

        showSuccess('Report generated successfully')
      }
    } catch (error: any) {
      console.error('Error generating Sale & Rent Source report:', error)
      showError(error.message || 'Failed to generate Sale & Rent Source report')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!token) {
      showError('You must be logged in to refresh reports')
      return
    }

    if (reports.length === 0) {
      showSuccess('No reports to refresh. Generate a report first.')
      return
    }

    try {
      setLoading(true)
      
      // Refresh all reports in the list
      const refreshPromises = reports.map(async (report) => {
        try {
          const response = await saleRentSourceApi.getAll(
            {
              agent_id: report.agent_id,
              start_date: report.start_date,
              end_date: report.end_date,
            },
            token
          )

          if (response.success) {
            return { reportId: report.id, rows: response.data }
          }
          return null
        } catch (error) {
          console.error(`Error refreshing report ${report.id}:`, error)
          return null
        }
      })

      const results = await Promise.all(refreshPromises)
      
      // Update all report rows
      const newRows: Record<number, SaleRentSourceRow[]> = {}
      results.forEach(result => {
        if (result) {
          newRows[result.reportId] = result.rows
        }
      })

      const updatedRows = { ...reportRows, ...newRows }
      setReportRows(updatedRows)
      showSuccess(`Refreshed ${results.filter(r => r !== null).length} report(s) successfully`)
    } catch (error: any) {
      console.error('Error refreshing reports:', error)
      showError(error.message || 'Failed to refresh reports')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async (report: GeneratedReport) => {
    if (!token) {
      showError('You must be logged in to export reports')
      return
    }
    try {
      const blob = await saleRentSourceApi.exportToExcel(
        {
          agent_id: report.agent_id,
          start_date: report.start_date,
          end_date: report.end_date,
        },
        token
      )

      const filename = `Sale_Rent_Source_${report.agent_name.replace(/\s+/g, '_')}_${report.start_date}_to_${report.end_date}.xlsx`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Sale & Rent Source report exported to Excel successfully')
    } catch (error: any) {
      console.error('Error exporting Sale & Rent Source report to Excel:', error)
      showError(error.message || 'Failed to export Sale & Rent Source report to Excel')
    }
  }

  const handleExportPDF = async (report: GeneratedReport) => {
    if (!token) {
      showError('You must be logged in to export reports')
      return
    }
    try {
      const blob = await saleRentSourceApi.exportToPDF(
        {
          agent_id: report.agent_id,
          start_date: report.start_date,
          end_date: report.end_date,
        },
        token
      )

      const filename = `Sale_Rent_Source_${report.agent_name.replace(/\s+/g, '_')}_${report.start_date}_to_${report.end_date}.pdf`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Sale & Rent Source report exported to PDF successfully')
    } catch (error: any) {
      console.error('Error exporting Sale & Rent Source report to PDF:', error)
      showError(error.message || 'Failed to export Sale & Rent Source report to PDF')
    }
  }

  const handleRecalculate = async (reportId: number) => {
    if (!token) {
      showError('You must be logged in to recalculate reports')
      return
    }

    const report = reports.find(r => r.id === reportId)
    if (!report) {
      showError('Report not found')
      return
    }

    try {
      setLoading(true)
      const response = await saleRentSourceApi.getAll(
        {
          agent_id: report.agent_id,
          start_date: report.start_date,
          end_date: report.end_date,
        },
        token
      )

      if (response.success) {
        const rows = response.data
        const updatedRows = { ...reportRows, [reportId]: rows }
        setReportRows(updatedRows)
        showSuccess('Report recalculated successfully')
        
        // If this is the currently viewed report, update the view
        if (selectedReportId === reportId) {
          // The currentRows will automatically update since it's derived from reportRows
        }
      }
    } catch (error: any) {
      console.error('Error recalculating report:', error)
      showError(error.message || 'Failed to recalculate report')
    } finally {
      setLoading(false)
    }
  }

  const openViewReport = (reportId: number) => {
    setSelectedReportId(reportId)
    setIsViewOpen(true)
  }

  const closeViewReport = () => {
    setIsViewOpen(false)
    setSelectedReportId(null)
  }

  // Get unique sources and sold_rented values from currently selected report rows for filter dropdowns
  const uniqueSources = useMemo(() => {
    const rows = selectedReportId !== null ? reportRows[selectedReportId] || [] : []
    const sources = new Set<string>()
    rows.forEach(row => {
      if (row.source_name) sources.add(row.source_name)
    })
    return Array.from(sources).sort()
  }, [selectedReportId, reportRows])

  const uniqueSoldRented = useMemo(() => {
    const rows = selectedReportId !== null ? reportRows[selectedReportId] || [] : []
    const soldRented = new Set<string>()
    rows.forEach(row => {
      if (row.sold_rented) soldRented.add(row.sold_rented)
    })
    return Array.from(soldRented).sort()
  }, [selectedReportId, reportRows])

  return (
    <div className="space-y-6">
      {/* Filters that filter existing report rows (like Monthly Agent Stats) */}
      <ReportsFilters
        filters={filters}
        setFilters={setFilters}
        onClearFilters={() => setFilters({})}
      />


      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Generate Report
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          {canManage ? (
            <>
              Use <span className="font-medium">Generate Report</span> to create a Sale &amp; Rent Source
              report for a specific agent and date range. The list below shows all generated reports; use a
              row&apos;s actions to view or export it as PDF or Excel.
            </>
          ) : (
            <>
              View Sale &amp; Rent Source reports below. Use a row&apos;s actions to view or export it as PDF or Excel.
            </>
          )}
        </p>
      </div>

      {/* Reports Table (one row per report) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closures
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Generate a report above.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.start_date} → {report.end_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {reportRows[report.id]?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => openViewReport(report.id)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="View"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleRecalculate(report.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Recalculate"
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleExportExcel(report)}
                          className="text-green-600 hover:text-green-900"
                          title="Export to Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(report)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Export to PDF"
                        >
                          <FileText className="h-4 w-4" />
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

      {/* View Report Modal */}
      {isViewOpen && selectedReportId !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Sale &amp; Rent Source Report
                </h3>
                <p className="text-sm text-gray-500">
                  {filteredReports.find(r => r.id === selectedReportId)?.agent_name} —{' '}
                  {filteredReports.find(r => r.id === selectedReportId)?.start_date} to{' '}
                  {filteredReports.find(r => r.id === selectedReportId)?.end_date}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => selectedReportId && handleRecalculate(selectedReportId)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || selectedReportId === null}
                  title="Recalculate"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Recalculate
                </button>
                <button
                  onClick={closeViewReport}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Filter Section inside the modal */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">Filter Rows</h4>
                  </div>
                  {(filters.source || filters.sold_rented) && (
                    <button
                      onClick={() => setFilters({ ...filters, source: undefined, sold_rented: undefined })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Source Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Source
                    </label>
                    <select
                      value={filters.source || ''}
                      onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">All Sources</option>
                      {uniqueSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sold/Rented Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sold/Rented
                    </label>
                    <select
                      value={filters.sold_rented || ''}
                      onChange={(e) => setFilters({ ...filters, sold_rented: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">All Types</option>
                      {uniqueSoldRented.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(filters.source || filters.sold_rented) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filters.source && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Source: {filters.source}
                        <button
                          onClick={() => setFilters({ ...filters, source: undefined })}
                          className="ml-1.5 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.sold_rented && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Sold/Rented: {filters.sold_rented}
                        <button
                          onClick={() => setFilters({ ...filters, sold_rented: undefined })}
                          className="ml-1.5 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {currentRows.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No closures found for this report.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ref#
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sold/Rented
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Find Com
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRows.map((row, idx) => (
                      <tr key={`${row.reference_number}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatDateForDisplay(row.closed_date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.reference_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.client_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-900">
                          {row.sold_rented}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.source_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.finders_commission.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Report Modal (agent + date range with presets) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Generate Sale &amp; Rent Source Report
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Choose an agent and reporting period. The report will contain all closed properties for
                that agent in the selected window.
              </p>

              {/* Agent selection note (agent dropdown reused from filters) */}
              <p className="text-xs text-gray-500">
                Use the <span className="font-medium">Focus on an agent</span> filter above to see only that
                agent&apos;s reports. This modal controls the agent and dates used when generating a new
                report.
              </p>

              {/* Agent dropdown (same data as ReportsFilters) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent
                </label>
                <select
                  value={createForm.agent_id ?? ''}
                  onChange={e =>
                    setCreateForm(prev => ({
                      ...prev,
                      agent_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select an agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range with presets (like Operations Commission) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={e => {
                      const value = e.target.value || defaultStartDate
                      setCreateForm(prev => {
                        if (value && prev.end_date && value > prev.end_date) {
                          return { ...prev, start_date: value, end_date: value }
                        }
                        return { ...prev, start_date: value }
                      })
                    }}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    max={createForm.end_date || undefined}
                  />
                  <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
                    —
                  </div>
                  <input
                    type="date"
                    value={createForm.end_date}
                    onChange={e => {
                      const value = e.target.value || defaultEndDate
                      setCreateForm(prev => {
                        if (value && prev.start_date && value < prev.start_date) {
                          return { ...prev, start_date: value, end_date: value }
                        }
                        return { ...prev, end_date: value }
                      })
                    }}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    min={createForm.start_date || undefined}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: 'Previous Month', start: defaultStartDate, end: defaultEndDate },
                    {
                      label: 'Month to Date',
                      start: (() => {
                        const today = new Date()
                        const year = today.getFullYear()
                        const month = String(today.getMonth() + 1).padStart(2, '0')
                        return `${year}-${month}-01`
                      })(),
                      end: new Date().toISOString().split('T')[0],
                    },
                    {
                      label: 'Last 30 Days',
                      start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      end: new Date().toISOString().split('T')[0],
                    },
                    {
                      label: 'Quarter to Date',
                      start: (() => {
                        const d = new Date()
                        const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3
                        return new Date(d.getFullYear(), quarterStartMonth, 1)
                          .toISOString()
                          .split('T')[0]
                      })(),
                      end: new Date().toISOString().split('T')[0],
                    },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setCreateForm(prev => ({
                          ...prev,
                          start_date: preset.start,
                          end_date: preset.end,
                        }))
                      }
                      className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Section */}
              {(previewLoading || previewData) && (
                <div className="border-t pt-4">
                  {previewLoading ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading preview...
                    </div>
                  ) : previewData && previewData.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900">Preview</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Found <span className="font-semibold">{previewData.length}</span> closure(s) for this period
                        </p>
                        <div className="text-xs text-gray-500">
                          Click &quot;Generate&quot; to create and view the full report
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        No closures found for this agent and date range
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


