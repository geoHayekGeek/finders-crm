'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'
import { operationsCommissionApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

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
    end_date: defaultEndDate
  })
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)

  // Calculate preview when modal opens or month/year changes
  useEffect(() => {
    if (isOpen && formData.start_date && formData.end_date && token) {
      calculatePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.start_date, formData.end_date, isOpen])

  const calculatePreview = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      // Try to fetch existing report first to avoid creating duplicates
      const allReports = await operationsCommissionApi.getAll({ 
        start_date: formData.start_date, 
        end_date: formData.end_date 
      }, token)
      
      if (allReports.success && allReports.data.length > 0) {
        // Report exists, fetch full details for preview
        const existingReport = await operationsCommissionApi.getById(allReports.data[0].id, token)
        if (existingReport.success) {
          setPreview(existingReport.data)
        }
      } else {
        // No existing report, create temp one for preview
        try {
          const response = await operationsCommissionApi.create(formData, token)
          if (response.success) {
            setPreview(response.data)
            // Delete the temporary report
            await operationsCommissionApi.delete(response.data.id, token)
          }
        } catch (createError: any) {
          console.error('Error creating preview:', createError)
          setPreview(null)
        }
      }
    } catch (error: any) {
      console.error('Error calculating preview:', error)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const response = await operationsCommissionApi.create(formData, token)
      
      if (response.success) {
        showSuccess('Operations commission report created successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error creating operations commission report:', error)
      showError(error.message || 'Failed to create operations commission report')
    } finally {
      setLoading(false)
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
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200  sticky top-0 bg-white z-1 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-gray-900">Create Operations Commission Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              This will create a report showing the total operations commission from all closed properties 
              (sales and rentals) for the selected date range. The commission percentage is automatically 
              fetched from system settings.
            </p>
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
                      return { start_date: value, end_date: value }
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
                      return { start_date: value, end_date: value }
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
                  onClick={() => setFormData({ start_date: preset.start, end_date: preset.end })}
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
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
              </div>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

