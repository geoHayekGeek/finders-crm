'use client'

import { useState, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsDailyReport } from '@/types/reports'
import { ConfirmationModal } from '@/components/ConfirmationModal'

interface EditOperationsDailyModalProps {
  report: OperationsDailyReport
  onClose: () => void
  onSuccess: () => void
}

export default function EditOperationsDailyModal({
  report,
  onClose,
  onSuccess
}: EditOperationsDailyModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [showRecalculateModal, setShowRecalculateModal] = useState(false)

  const [formData, setFormData] = useState({
    preparing_contract: report.preparing_contract || 0,
    tasks_efficiency_duty_time: report.tasks_efficiency_duty_time || 0,
    tasks_efficiency_uniform: report.tasks_efficiency_uniform || 0,
    tasks_efficiency_after_duty: report.tasks_efficiency_after_duty || 0,
    leads_responded_out_of_duty_time: report.leads_responded_out_of_duty_time || 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFormData({
      preparing_contract: report.preparing_contract || 0,
      tasks_efficiency_duty_time: report.tasks_efficiency_duty_time || 0,
      tasks_efficiency_uniform: report.tasks_efficiency_uniform || 0,
      tasks_efficiency_after_duty: report.tasks_efficiency_after_duty || 0,
      leads_responded_out_of_duty_time: report.leads_responded_out_of_duty_time || 0
    })
  }, [report])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      const response = await operationsDailyApi.update(report.id, formData, token)
      
      if (response.success) {
        showSuccess('Operations daily report updated successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error updating operations daily report:', error)
      showError(error.message || 'Failed to update operations daily report')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    setShowRecalculateModal(true)
  }

  const confirmRecalculate = async () => {
    try {
      setLoading(true)
      const response = await operationsDailyApi.update(report.id, { recalculate: true }, token)
      
      if (response.success) {
        showSuccess('Report recalculated successfully')
        setShowRecalculateModal(false)
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error recalculating report:', error)
      showError(error.message || 'Failed to recalculate report')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-gray-900">Edit Operations Daily Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Report Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Operations</p>
                <p className="text-sm font-medium text-gray-900">{report.operations_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Report Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(report.report_date)}</p>
              </div>
            </div>
          </div>

          {/* Calculated Fields (Read-only) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Calculated Fields (Auto-updated from database)</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Properties Added</p>
                <p className="text-lg font-bold text-blue-900">{report.properties_added}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Leads Responded To</p>
                <p className="text-lg font-bold text-blue-900">
                  {Math.max(0, report.leads_responded_to - (report.leads_responded_out_of_duty_time || 0))}
                </p>
                {report.leads_responded_out_of_duty_time > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    ({report.leads_responded_to} total - {report.leads_responded_out_of_duty_time} out of duty)
                  </p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Amending Properties</p>
                <p className="text-lg font-bold text-blue-900">{report.amending_previous_properties}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecalculate}
              disabled={loading}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              Recalculate Calculated Fields
            </button>
          </div>

          {/* Manual Fields */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Manual Fields</h4>
            
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
              {loading ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Recalculate Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
        onConfirm={confirmRecalculate}
        title="Recalculate Report"
        message="Recalculate the calculated fields (Properties Added, Leads Responded To, Amending Previous Properties)?"
        confirmText="Recalculate"
        variant="warning"
        loading={loading}
      />
    </div>
  )
}

