'use client'

import { useMemo, useState } from 'react'
import { X, AlertCircle, Save } from 'lucide-react'
import { OperationsCommissionReport } from '@/types/reports'
import { operationsCommissionApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import OperationsCommissionMonthlyTable from './OperationsCommissionMonthlyTable'

interface EditOperationsCommissionModalProps {
  report: OperationsCommissionReport
  onClose: () => void
  onSuccess: () => void
}

export default function EditOperationsCommissionModal({ report, onClose, onSuccess }: EditOperationsCommissionModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    commission_percentage: report.commission_percentage,
    total_properties_count: report.total_properties_count,
    total_sales_count: report.total_sales_count,
    total_rent_count: report.total_rent_count,
    total_sales_value: report.total_sales_value,
    total_rent_value: report.total_rent_value,
    total_commission_amount: report.total_commission_amount
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

  // Auto-calculate commission when values change
  const handleValueChange = (field: string, value: number) => {
    const updated = { ...formData, [field]: value }
    
    // Recalculate total commission
    const totalValue = updated.total_sales_value + updated.total_rent_value
    updated.total_commission_amount = (totalValue * updated.commission_percentage) / 100
    
    setFormData(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      const response = await operationsCommissionApi.update(report.id, formData, token)

      if (response.success) {
        showSuccess('Operations commission report updated successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error updating operations commission report:', error)
      setError(error.message || 'Failed to update operations commission report')
      showError(error.message || 'Failed to update operations commission report')
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Operations Commission Report</h2>
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
        <div className="p-6 max-h-[calc(90vh-96px)] overflow-y-auto">
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
            {/* Commission Rate */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 mb-3">Commission Rate</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) => handleValueChange('commission_percentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Counts */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Property Counts</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Properties
                  </label>
                  <input
                    type="number"
                    value={formData.total_properties_count}
                    onChange={(e) => setFormData({ ...formData, total_properties_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sales Count
                  </label>
                  <input
                    type="number"
                    value={formData.total_sales_count}
                    onChange={(e) => setFormData({ ...formData, total_sales_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rent Count
                  </label>
                  <input
                    type="number"
                    value={formData.total_rent_count}
                    onChange={(e) => setFormData({ ...formData, total_rent_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 mb-3">Property Values</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Sales Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_sales_value}
                    onChange={(e) => handleValueChange('total_sales_value', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Rent Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_rent_value}
                    onChange={(e) => handleValueChange('total_rent_value', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Calculated Commission */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 mb-3">Total Commission</h3>
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(formData.total_commission_amount)}
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Calculated: ({formatCurrency(formData.total_sales_value)} + {formatCurrency(formData.total_rent_value)}) × {formData.commission_percentage}%
              </p>
            </div>

            <OperationsCommissionMonthlyTable report={report} className="border-t pt-4" />

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

