'use client'

import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsSelector } from '@/components/OperationsSelector'

interface CreateOperationsDailyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateOperationsDailyModal({
  isOpen,
  onClose,
  onSuccess
}: CreateOperationsDailyModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const today = new Date()
  const defaultDate = today.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    operations_id: undefined as number | undefined,
    report_date: defaultDate,
    preparing_contract: 0,
    tasks_efficiency_duty_time: 0,
    tasks_efficiency_uniform: 0,
    tasks_efficiency_after_duty: 0,
    leads_responded_out_of_duty_time: 0
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const operationsId = formData.operations_id
    if (!operationsId) {
      showError('Please select an operations user')
      return
    }

    try {
      setLoading(true)
      const response = await operationsDailyApi.create({
        operations_id: operationsId,
        report_date: formData.report_date,
        preparing_contract: formData.preparing_contract,
        tasks_efficiency_duty_time: formData.tasks_efficiency_duty_time,
        tasks_efficiency_uniform: formData.tasks_efficiency_uniform,
        tasks_efficiency_after_duty: formData.tasks_efficiency_after_duty,
        leads_responded_out_of_duty_time: formData.leads_responded_out_of_duty_time
      }, token)
      
      if (response.success) {
        showSuccess('Operations daily report created successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error creating operations daily report:', error)
      showError(error.message || 'Failed to create operations daily report')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200  sticky top-0 bg-white z-1 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-gray-900">Create Operations Daily Report</h2>
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
              Create a daily report for an operations user. Calculated fields (Properties Added, Leads Responded To, 
              Amending Previous Properties) will be automatically calculated from the database for the selected date.
            </p>
          </div>

          {/* Required Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operations User <span className="text-red-500">*</span>
              </label>
              <OperationsSelector
                selectedOperationsId={formData.operations_id}
                onOperationsChange={(id) => setFormData(prev => ({ ...prev, operations_id: id }))}
                placeholder="Select operations user..."
                onlyOperations={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData(prev => ({ ...prev, report_date: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>
          </div>

          {/* Manual Fields (Optional) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Manual Fields (Optional)</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preparing Contract
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.preparing_contract}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparing_contract: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks Efficiency - Duty Time (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_duty_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, tasks_efficiency_duty_time: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks Efficiency - Uniform (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_uniform}
                  onChange={(e) => setFormData(prev => ({ ...prev, tasks_efficiency_uniform: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks Efficiency - After Duty Performance (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_after_duty}
                  onChange={(e) => setFormData(prev => ({ ...prev, tasks_efficiency_after_duty: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leads Responded Out of Duty Time
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.leads_responded_out_of_duty_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, leads_responded_out_of_duty_time: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be subtracted from the &quot;Leads Responded To&quot; count
                </p>
              </div>
            </div>
          </div>

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

