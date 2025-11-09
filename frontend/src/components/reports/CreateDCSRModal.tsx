'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { DCSRFormData, DCSRMonthlyReport } from '@/types/reports'
import { dcsrApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface CreateDCSRModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateDCSRModal({ onClose, onSuccess }: CreateDCSRModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<Partial<DCSRMonthlyReport> | null>(null)

  // Default to previous month range
  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  const [formData, setFormData] = useState<DCSRFormData>({
    start_date: defaultStartDate,
    end_date: defaultEndDate,
    listings_count: 0,
    leads_count: 0,
    sales_count: 0,
    rent_count: 0,
    viewings_count: 0
  })

  // Calculate preview when month/year changes
  useEffect(() => {
    if (formData.start_date && formData.end_date && token) {
      calculatePreview()
    }
  }, [formData.start_date, formData.end_date, token])

  const calculatePreview = async () => {
    try {
      setCalculating(true)
      setError(null)
      
      // Create a temporary report to get calculated values
      const tempReport = await dcsrApi.create(
        {
          start_date: formData.start_date,
          end_date: formData.end_date
        },
        token
      )

      if (tempReport.success) {
        setPreviewData(tempReport.data)
        setFormData(prev => ({
          ...prev,
          listings_count: tempReport.data.listings_count,
          leads_count: tempReport.data.leads_count,
          sales_count: tempReport.data.sales_count,
          rent_count: tempReport.data.rent_count,
          viewings_count: tempReport.data.viewings_count
        }))
        
        // Delete the temporary report
        await dcsrApi.delete(tempReport.data.id, token)
      }
    } catch (error: any) {
      // If report already exists, show specific message
      if (error.message?.includes('already exists')) {
        setError('A report already exists for this date range. Please select a different window.')
      } else {
        console.error('Error calculating preview:', error)
      }
    } finally {
      setCalculating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      
      // Create the report with the values
      const response = await dcsrApi.create(
        {
          start_date: formData.start_date,
          end_date: formData.end_date
        },
        token
      )

      if (response.success) {
        // Update with edited values if any fields were changed
        const hasManualEdits = previewData && (
          formData.listings_count !== previewData.listings_count ||
          formData.leads_count !== previewData.leads_count ||
          formData.sales_count !== previewData.sales_count ||
          formData.rent_count !== previewData.rent_count ||
          formData.viewings_count !== previewData.viewings_count
        )

        if (hasManualEdits) {
          // Update the report with custom values
          await dcsrApi.update(
            response.data.id,
            {
              listings_count: formData.listings_count,
              leads_count: formData.leads_count,
              sales_count: formData.sales_count,
              rent_count: formData.rent_count,
              viewings_count: formData.viewings_count
            },
            token
          )
          showSuccess('DCSR report created successfully with custom values')
        } else {
          showSuccess('DCSR report created successfully')
        }
        
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error creating DCSR report:', error)
      
      if (error.message?.includes('already exists')) {
        setError('A report already exists for this date range. Please select a different window.')
      } else {
        setError(error.message || 'Failed to create DCSR report')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof DCSRFormData, value: any) => {
    setFormData(prev => {
      if (field === 'start_date') {
        if (value && prev.end_date && value > prev.end_date) {
          return { ...prev, start_date: value, end_date: value }
        }
        return { ...prev, start_date: value }
      }

      if (field === 'end_date') {
        if (value && prev.start_date && value < prev.start_date) {
          return { ...prev, start_date: value, end_date: value }
        }
        return { ...prev, end_date: value }
      }

      return { ...prev, [field]: value }
    })
    setError(null)
    if (field === 'start_date' || field === 'end_date') {
      setPreviewData(null) // Clear preview when changing selection
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-gray-900">Create DCSR Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Selection Section */}
          <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wider">Reporting window (company-wide)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value || undefined)}
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
                onChange={(e) => handleChange('end_date', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                min={formData.start_date || undefined}
                required
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Previous Month', start: defaultStartDate, end: defaultEndDate },
                { label: 'Last 30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
                { label: 'Quarter to Date', start: (() => {
                  const d = new Date();
                  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
                  return new Date(d.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0];
                })(), end: new Date().toISOString().split('T')[0] }
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => {
                    handleChange('start_date', preset.start)
                    handleChange('end_date', preset.end)
                  }}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-blue-700 leading-relaxed">
              We automatically prevent overlapping duplicates. Pick the exact days you want to analyse—even multi-month windows are allowed.
            </p>
          </div>

          {/* Calculating Indicator */}
          {calculating && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Calculating values from database...</span>
            </div>
          )}

          {/* Editable Fields Section */}
          {previewData && !calculating && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Calculated Values (All Editable)
                </h3>

                {/* Description (Data & Calls) */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Description</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Listings
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.listings_count}
                        onChange={(e) => handleChange('listings_count', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Leads
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.leads_count}
                        onChange={(e) => handleChange('leads_count', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Closures */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Closures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sales
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sales_count}
                        onChange={(e) => handleChange('sales_count', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rent
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.rent_count}
                        onChange={(e) => handleChange('rent_count', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Viewings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viewings
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.viewings_count}
                    onChange={(e) => handleChange('viewings_count', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          {!previewData && !calculating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Select a reporting window to see company-wide calculated values. All fields will be editable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || calculating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

