'use client'

import { useMemo, useState } from 'react'
import { X, AlertCircle, Save } from 'lucide-react'
import { DCSRMonthlyReport, UpdateDCSRData } from '@/types/reports'
import { dcsrApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface EditDCSRModalProps {
  report: DCSRMonthlyReport
  onClose: () => void
  onSuccess: () => void
}

export default function EditDCSRModal({ report, onClose, onSuccess }: EditDCSRModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<UpdateDCSRData>({
    listings_count: report.listings_count,
    leads_count: report.leads_count,
    sales_count: report.sales_count,
    rent_count: report.rent_count,
    viewings_count: report.viewings_count
  })

  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  const formatRangeDisplay = () => {
    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    return `${rangeFormatter.format(start)} → ${rangeFormatter.format(end)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      const response = await dcsrApi.update(report.id, formData, token)

      if (response.success) {
        showSuccess('DCSR report updated successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error updating DCSR report:', error)
      setError(error.message || 'Failed to update DCSR report')
      showError(error.message || 'Failed to update DCSR report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit DCSR Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatRangeDisplay()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              You can manually edit the values below. Use the <strong>Recalculate</strong> button 
              in the table to refresh values from the database.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data & Calls Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Data & Calls (Effort/Input)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listings
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.listings_count}
                    onChange={(e) => setFormData({ ...formData, listings_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of new listings added</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leads
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leads_count}
                    onChange={(e) => setFormData({ ...formData, leads_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of leads/calls handled</p>
                </div>
              </div>
            </div>

            {/* Closures Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Closures (Output/Results)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sales
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sales_count}
                    onChange={(e) => setFormData({ ...formData, sales_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of sale closures</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rent
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rent_count}
                    onChange={(e) => setFormData({ ...formData, rent_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of rent closures</p>
                </div>
              </div>
            </div>

            {/* Viewings Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Viewings
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Viewings Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.viewings_count}
                  onChange={(e) => setFormData({ ...formData, viewings_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Number of property viewings conducted</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

