'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsSelector } from '@/components/OperationsSelector'
import { formatDateInput } from '@/utils/formatters'

interface CreateOperationsDailyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CreateOperationsDailyFormData {
  operations_id: number | undefined
  report_date: string
}

const defaultCalculatedFields = {
  properties_added: 0,
  leads_responded_to: 0,
  amending_previous_properties: 0
}

const defaultManualFields = {
  preparing_contract: 0,
  tasks_efficiency_duty_time: 0,
  tasks_efficiency_uniform: 0,
  tasks_efficiency_after_duty: 0,
  leads_responded_out_of_duty_time: 0
}

export default function CreateOperationsDailyModal({
  isOpen,
  onClose,
  onSuccess
}: CreateOperationsDailyModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const previewRequestIdRef = useRef(0)

  const [formData, setFormData] = useState<CreateOperationsDailyFormData>({
    operations_id: undefined as number | undefined,
    report_date: formatDateInput(new Date())
  })
  const [calculatedFields, setCalculatedFields] = useState(defaultCalculatedFields)
  const [manualFields, setManualFields] = useState(defaultManualFields)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setFormData({
      operations_id: undefined,
      report_date: formatDateInput(new Date())
    })
    setCalculatedFields(defaultCalculatedFields)
    setManualFields(defaultManualFields)
    setPreviewLoading(false)
    setPreviewLoaded(false)
    setPreviewError(null)
    previewRequestIdRef.current += 1
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (!formData.operations_id || !formData.report_date || !token) {
      previewRequestIdRef.current += 1
      setPreviewLoading(false)
      setPreviewLoaded(false)
      setPreviewError(null)
      setCalculatedFields(defaultCalculatedFields)
      return
    }

    const requestId = ++previewRequestIdRef.current
    const operationsId = formData.operations_id

    const loadPreview = async () => {
      try {
        setPreviewLoading(true)
        setPreviewError(null)

        const response = await operationsDailyApi.preview(
          {
            operations_id: operationsId,
            report_date: formData.report_date
          },
          token
        )

        if (requestId !== previewRequestIdRef.current) {
          return
        }

        if (response.success) {
          setCalculatedFields({
            properties_added: response.data.properties_added,
            leads_responded_to: response.data.leads_responded_to,
            amending_previous_properties: response.data.amending_previous_properties
          })
          setPreviewLoaded(true)
        } else {
          setCalculatedFields(defaultCalculatedFields)
          setPreviewLoaded(false)
          setPreviewError(response.message || 'Failed to calculate operations daily preview')
        }
      } catch (error: any) {
        if (requestId !== previewRequestIdRef.current) {
          return
        }

        setCalculatedFields(defaultCalculatedFields)
        setPreviewLoaded(false)
        setPreviewError(error.message || 'Failed to calculate operations daily preview')
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false)
        }
      }
    }

    loadPreview()
  }, [isOpen, formData.operations_id, formData.report_date, token])

  const effectiveLeadsResponded = Math.max(
    0,
    calculatedFields.leads_responded_to - (manualFields.leads_responded_out_of_duty_time || 0)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const operationsId = formData.operations_id
    if (!operationsId) {
      showError('Please select an operations user')
      return
    }

    try {
      setLoading(true)

      const payload = {
        operations_id: operationsId,
        report_date: formData.report_date,
        ...(previewLoaded ? calculatedFields : {}),
        ...manualFields
      }

      const response = await operationsDailyApi.create(payload, token)

      if (response.success) {
        showSuccess('Operations daily report created successfully')
        onSuccess()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to create operations daily report')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Operations Daily Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              Select an operations user to load the calculated values, then edit any field before saving.
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
              Calculated values are loaded from the database as soon as you pick an operations user and date.
              You can override those values here before the report is saved.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Operations User <span className="text-red-500">*</span>
              </label>
              <OperationsSelector
                selectedOperationsId={formData.operations_id}
                onOperationsChange={(id) => setFormData((prev) => ({ ...prev, operations_id: id }))}
                placeholder="Select operations user..."
                onlyOperations={true}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, report_date: e.target.value }))}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {previewLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Calculating values from database...
            </div>
          )}

          {previewError && !previewLoading && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {previewError}
            </div>
          )}

          {previewLoaded && !previewLoading && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Calculated Fields</h4>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  Loaded from database and editable
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Properties Added
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={calculatedFields.properties_added}
                    onChange={(e) =>
                      setCalculatedFields((prev) => ({
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
                    value={calculatedFields.leads_responded_to}
                    onChange={(e) =>
                      setCalculatedFields((prev) => ({
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
                    value={calculatedFields.amending_previous_properties}
                    onChange={(e) =>
                      setCalculatedFields((prev) => ({
                        ...prev,
                        amending_previous_properties: parseInt(e.target.value, 10) || 0
                      }))
                    }
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="mb-4 text-sm font-medium text-gray-900">Manual Fields (Optional)</h4>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preparing Contract
                </label>
                <input
                  type="number"
                  min="0"
                  value={manualFields.preparing_contract}
                  onChange={(e) =>
                    setManualFields((prev) => ({
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
                  value={manualFields.tasks_efficiency_duty_time}
                  onChange={(e) =>
                    setManualFields((prev) => ({
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
                  value={manualFields.tasks_efficiency_uniform}
                  onChange={(e) =>
                    setManualFields((prev) => ({
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
                  value={manualFields.tasks_efficiency_after_duty}
                  onChange={(e) =>
                    setManualFields((prev) => ({
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
                  value={manualFields.leads_responded_out_of_duty_time}
                  onChange={(e) =>
                    setManualFields((prev) => ({
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
              disabled={loading || previewLoading || !formData.operations_id}
              className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
