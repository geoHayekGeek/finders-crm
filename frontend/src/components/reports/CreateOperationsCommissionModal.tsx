'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'
import { operationsCommissionApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsCommissionReport } from '@/types/reports'
import OperationsCommissionMonthlyTable from './OperationsCommissionMonthlyTable'

interface CreateOperationsCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateOperationsCommissionModal({
  isOpen,
  onClose,
  onSuccess
}: CreateOperationsCommissionModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    start_date: defaultStartDate,
    end_date: defaultEndDate,
    commission_percentage: 0
  })
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<OperationsCommissionReport | null>(null)

  const downloadExcel = async (reportId: number) => {
    const blob = await operationsCommissionApi.exportToExcel(reportId, token)
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const safeStart = formatter.format(start).replace(/[, ]/g, '-')
    const safeEnd = formatter.format(end).replace(/[, ]/g, '-')
    const filename = `Operations_Commission_${safeStart}_to_${safeEnd}.xlsx`

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Calculate preview when modal opens or month/year changes
  useEffect(() => {
    if (isOpen && formData.start_date && formData.end_date && token) {
      calculatePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.start_date, formData.end_date, formData.commission_percentage, isOpen])

  const calculatePreview = async () => {
    if (!token) return
    
    setPreviewLoading(true)
    try {
      const response = await operationsCommissionApi.preview(formData, token)
      if (response.success) {
        setPreview(response.data)
      } else {
        setPreview(null)
      }
    } catch (error: any) {
      console.error('Error calculating preview:', error)
      setPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const response = await operationsCommissionApi.create(formData, token)
      
      if (response.success) {
        try {
          await downloadExcel(response.data.id)
          showSuccess('Operations commission report created and downloaded successfully')
        } catch (downloadError) {
          console.error('Error exporting operations commission workbook:', downloadError)
          showError('Report was saved, but the Excel download failed. You can export it from the reports list.')
        }
        onSuccess()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to create operations commission report')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900">Create Operations Commission Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-96px)] overflow-y-auto">
          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              This will create a report showing the total operations commission from all closed properties 
              (sales and rentals) for the selected date range. Enter the commission percentage manually 
              and the report will calculate the total from that rate.
            </p>
          </div>

          {/* Commission Rate */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Commission Rate</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setFormData(prev => ({
                      ...prev,
                      commission_percentage: Number.isNaN(value) ? 0 : value
                    }))
                  }}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Report Period */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Report Period</h4>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => {
                  const value = e.target.value || defaultStartDate
                  setFormData(prev => {
                    if (value && prev.end_date && value > prev.end_date) {
                      return { ...prev, start_date: value, end_date: value }
                    }
                    return { ...prev, start_date: value }
                  })
                }}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                max={formData.end_date || undefined}
                required
              />
              <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
                —
              </div>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => {
                  const value = e.target.value || defaultEndDate
                  setFormData(prev => {
                    if (value && prev.start_date && value < prev.start_date) {
                      return { ...prev, start_date: value, end_date: value }
                    }
                    return { ...prev, end_date: value }
                  })
                }}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                min={formData.start_date || undefined}
                required
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => setFormData(prev => ({ ...prev, start_date: preset.start, end_date: preset.end }))}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Commission Rate:</span>
                    <p className="text-sm font-medium text-gray-900">{preview.commission_percentage}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Properties:</span>
                    <p className="text-sm font-medium text-gray-900">{preview.total_properties_count}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Sales Count:</span>
                    <p className="text-sm font-medium text-gray-900">{preview.total_sales_count}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Rent Count:</span>
                    <p className="text-sm font-medium text-gray-900">{preview.total_rent_count}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Sales Value:</span>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(preview.total_sales_value)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Rent Value:</span>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(preview.total_rent_value)}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Total Operations Commission:</span>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(preview.total_commission_amount)}</p>
                </div>

                <OperationsCommissionMonthlyTable report={preview} />
              </div>
            </div>
          )}

          {previewLoading && !preview && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Calculating values from database...
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save & Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
