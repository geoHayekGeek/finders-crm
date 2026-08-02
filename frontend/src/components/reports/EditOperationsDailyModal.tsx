'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Save, X } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { OperationsDailyReport } from '@/types/reports'
import { downloadBlob, sanitizeFilenamePart } from '@/utils/fileDownload'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { formatDateDisplay } from '@/utils/formatters'
import OperationsDailyRowsTable from './OperationsDailyRowsTable'
import { OperationsDailyRowDraft, toOperationsDailyRowDraft } from './operationsDailyFields'

interface EditOperationsDailyModalProps {
  report: OperationsDailyReport
  onClose: () => void
  onSuccess: () => void
}

function buildInitialRows(report: OperationsDailyReport): OperationsDailyRowDraft[] {
  if (Array.isArray(report.operations_rows) && report.operations_rows.length > 0) {
    return report.operations_rows.map((row) =>
      toOperationsDailyRowDraft({
        ...row,
        operations_id: row.operations_id,
        operations_name: row.operations_name
      })
    )
  }

  return [
    toOperationsDailyRowDraft({
      ...report,
      operations_id: report.operations_id,
      operations_name: report.operations_name
    })
  ]
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
  const [rows, setRows] = useState<OperationsDailyRowDraft[]>(buildInitialRows(report))

  useEffect(() => {
    setRows(buildInitialRows(report))
  }, [report])
  const hasMultipleRows = rows.length > 1

  const downloadUpdatedReport = async (reportToDownload: OperationsDailyReport) => {
    const blob = await operationsDailyApi.exportToExcel(reportToDownload.id, token)
    const safeOperationsName = sanitizeFilenamePart(reportToDownload.operations_name || 'report')
    const safeDate = sanitizeFilenamePart(reportToDownload.report_date || 'report', 'report')
    downloadBlob(blob, `Operations_Daily_${safeOperationsName}_${safeDate}.xlsx`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setLoading(true)
      const updatePayload = hasMultipleRows
        ? {
            operations_rows: rows.map((row) => ({
              ...row,
              operations_id: row.operations_id || report.operations_id,
              operations_name: row.operations_name || report.operations_name,
              report_date: report.report_date
            }))
          }
        : rows[0]

      const response = await operationsDailyApi.update(report.id, updatePayload, token)

      if (response.success) {
        showSuccess('Operations daily report updated successfully')
        try {
          await downloadUpdatedReport(response.data)
        } catch (downloadError: any) {
          showError(downloadError.message || 'Report was saved, but the automatic download failed')
        }
        onSuccess()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to update operations daily report')
    } finally {
      setLoading(false)
    }
  }

  const confirmRecalculate = async () => {
    try {
      setLoading(true)
      const response = await operationsDailyApi.update(report.id, { recalculate: true }, token)

      if (response.success) {
        setRows(buildInitialRows(response.data))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-[96rem] rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Operations Daily Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              {report.operations_name} | {formatDate(report.report_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-200px)] space-y-6 overflow-y-auto p-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              The workbook values are fully editable. Recalculate will refresh the database-driven values for this row.
              If this is a combined report, every selected operations row stays inside the same saved report.
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

          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Workbook Daily Values</h4>
              <p className="text-xs text-gray-500">
                Edit the row{hasMultipleRows ? 's' : ''} below using the same workbook column order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecalculateModal(true)}
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
          </div>

          <OperationsDailyRowsTable rows={rows} onChange={setRows} showReportExists={false} />

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        message="Recalculate the database-driven values for this report and replace the current values?"
        confirmText="Recalculate"
        variant="warning"
        loading={loading}
      />
    </div>
  )
}
