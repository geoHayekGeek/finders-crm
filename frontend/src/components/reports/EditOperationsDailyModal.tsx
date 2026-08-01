'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Save, X } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsDailyReport } from '@/types/reports'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { formatDateDisplay } from '@/utils/formatters'

interface EditOperationsDailyModalProps {
  report: OperationsDailyReport
  onClose: () => void
  onSuccess: () => void
}

const emptyCalculatedFields = {
  properties_added: 0,
  leads_responded_to: 0,
  amending_previous_properties: 0
}

const emptyManualFields = {
  preparing_contract: 0,
  tasks_efficiency_duty_time: 0,
  tasks_efficiency_uniform: 0,
  tasks_efficiency_after_duty: 0,
  leads_responded_out_of_duty_time: 0
}

export default function EditOperationsDailyModal({
  report,
  onClose,
  onSuccess
}: EditOperationsDailyModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [showRecalculateModal, setShowRecalculateModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    ...emptyCalculatedFields,
    ...emptyManualFields
  })

  useEffect(() => {
    setFormData({
      properties_added: report.properties_added || 0,
      leads_responded_to: report.leads_responded_to || 0,
      amending_previous_properties: report.amending_previous_properties || 0,
      preparing_contract: report.preparing_contract || 0,
      tasks_efficiency_duty_time: report.tasks_efficiency_duty_time || 0,
      tasks_efficiency_uniform: report.tasks_efficiency_uniform || 0,
      tasks_efficiency_after_duty: report.tasks_efficiency_after_duty || 0,
      leads_responded_out_of_duty_time: report.leads_responded_out_of_duty_time || 0
    })
  }, [report])

  const effectiveLeadsResponded = Math.max(
    0,
    formData.leads_responded_to - (formData.leads_responded_out_of_duty_time || 0)
  )

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
        setFormData({
          properties_added: response.data.properties_added,
          leads_responded_to: response.data.leads_responded_to,
          amending_previous_properties: response.data.amending_previous_properties,
          preparing_contract: response.data.preparing_contract,
          tasks_efficiency_duty_time: response.data.tasks_efficiency_duty_time,
          tasks_efficiency_uniform: response.data.tasks_efficiency_uniform,
          tasks_efficiency_after_duty: response.data.tasks_efficiency_after_duty,
          leads_responded_out_of_duty_time: response.data.leads_responded_out_of_duty_time
        })
        showSuccess('Report recalculated successfully')
        setShowRecalculateModal(false)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to recalculate report')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return formatDateDisplay(dateStr, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Operations Daily Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              {report.operations_name} | {formatDate(report.report_date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-200px)] space-y-6 overflow-y-auto p-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              All values are editable. Use recalculate to refresh the database-derived values for this report.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Operations</p>
              <p className="text-sm font-medium text-gray-900">{report.operations_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Report Date</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(report.report_date)}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Calculated Fields</h4>
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={loading}
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Properties Added
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.properties_added}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      properties_added: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Leads Responded To
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.leads_responded_to}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      leads_responded_to: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Effective total after out-of-duty subtraction: {effectiveLeadsResponded}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Amending Previous Properties
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.amending_previous_properties}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amending_previous_properties: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-4 text-sm font-medium text-gray-900">Manual Fields</h4>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preparing Contract
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.preparing_contract}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      preparing_contract: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tasks Efficiency - Duty Time (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_duty_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tasks_efficiency_duty_time: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tasks Efficiency - Uniform (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_uniform}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tasks_efficiency_uniform: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tasks Efficiency - After Duty Performance (points, can be negative)
                </label>
                <input
                  type="number"
                  value={formData.tasks_efficiency_after_duty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tasks_efficiency_after_duty: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Leads Responded Out of Duty Time
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.leads_responded_out_of_duty_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      leads_responded_out_of_duty_time: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be subtracted from the Leads Responded To total.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
        onConfirm={confirmRecalculate}
        title="Recalculate Report"
        message="Recalculate the calculated fields from the database and replace the current values?"
        confirmText="Recalculate"
        variant="warning"
        loading={loading}
      />
    </div>
  )
}
