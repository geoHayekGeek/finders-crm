'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { operationsDailyApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatDateInput } from '@/utils/formatters'
import { OperationsUser } from '@/types/leads'
import OperationsDailyMultiSelect from './OperationsDailyMultiSelect'
import OperationsDailyRowsTable from './OperationsDailyRowsTable'
import {
  createDefaultOperationsDailyRow,
  OperationsDailyRowDraft
} from './operationsDailyFields'

interface CreateOperationsDailyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function buildRowDraft(
  row: Partial<OperationsDailyRowDraft>,
  fallbackOperationsId: number
): OperationsDailyRowDraft {
  return createDefaultOperationsDailyRow({
    ...row,
    operations_id: row.operations_id ?? fallbackOperationsId,
    operations_name: row.operations_name || `Operations ${fallbackOperationsId}`
  })
}

export default function CreateOperationsDailyModal({
  isOpen,
  onClose,
  onSuccess
}: CreateOperationsDailyModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const previewRequestIdRef = useRef(0)
  const rowsRef = useRef<OperationsDailyRowDraft[]>([])

  const [reportDate, setReportDate] = useState(formatDateInput(new Date()))
  const [users, setUsers] = useState<OperationsUser[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [rows, setRows] = useState<OperationsDailyRowDraft[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const loadUsers = async () => {
    if (!token) {
      setPreviewError('Authentication required')
      return
    }

    setUsersLoading(true)
    try {
      const response = await operationsDailyApi.getOperationsUsers(token)
      if (response.success) {
        setUsers(response.data)
      } else {
        setPreviewError(response.message || 'Failed to load operations users')
      }
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to load operations users')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setReportDate(formatDateInput(new Date()))
    setSelectedIds([])
    setRows([])
    setPreviewError(null)
    setPreviewLoading(false)
    previewRequestIdRef.current += 1
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (!token) {
      previewRequestIdRef.current += 1
      setPreviewLoading(false)
      setPreviewError('Authentication required')
      setRows([])
      return
    }

    if (selectedIds.length === 0) {
      previewRequestIdRef.current += 1
      setPreviewLoading(false)
      setPreviewError(null)
      setRows([])
      return
    }

    const requestId = ++previewRequestIdRef.current

    const loadPreview = async () => {
      try {
        setPreviewLoading(true)
        setPreviewError(null)

        const response = await operationsDailyApi.previewBulk(
          {
            report_date: reportDate,
            operations_ids: selectedIds,
            rows: rowsRef.current.map((row) => ({
              operations_id: row.operations_id || 0,
              ...row
            }))
          },
          token
        )

        if (requestId !== previewRequestIdRef.current) {
          return
        }

        if (!response.success) {
          setRows([])
          setPreviewError(response.message || 'Failed to calculate operations daily preview')
          return
        }

        const existingRows = new Map(rowsRef.current.map((row) => [row.operations_id, row]))
        const nextRows = response.data.reports.map((previewRow) => {
          const existingRow = existingRows.get(previewRow.operations_id)
          return buildRowDraft(
            {
              ...previewRow,
              ...existingRow
            },
            previewRow.operations_id
          )
        })

        setRows(nextRows)
      } catch (error: any) {
        if (requestId !== previewRequestIdRef.current) {
          return
        }

        setRows([])
        setPreviewError(error.message || 'Failed to calculate operations daily preview')
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false)
        }
      }
    }

    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reportDate, selectedIds, token])

  const handleRowsChange = (nextRows: OperationsDailyRowDraft[]) => {
    setRows(nextRows)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (selectedIds.length === 0) {
      showError('Please select at least one operations user')
      return
    }

    if (!reportDate) {
      showError('Please select a report date')
      return
    }

    try {
      setSubmitLoading(true)

      const response = await operationsDailyApi.createBulk(
        {
          report_date: reportDate,
          operations_ids: selectedIds,
          all_operations: selectedIds.length === users.length && users.length > 0,
          rows: rows.map((row) => ({
            operations_id: row.operations_id || 0,
            ...row
          }))
        },
        token
      )

      if (response.success) {
        const createdCount = response.data.created.length
        const skippedCount = response.data.skipped.length
        showSuccess(
          skippedCount > 0
            ? `Created ${createdCount} report(s) and skipped ${skippedCount} existing report(s)`
            : `Created ${createdCount} operations daily report(s)`
        )
        onSuccess()
      }
    } catch (error: any) {
      showError(error.message || 'Failed to create operations daily reports')
    } finally {
      setSubmitLoading(false)
    }
  }

  const hasSelectedUsers = selectedIds.length > 0
  const hasPreviewRows = rows.length > 0

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-[96rem] rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Operations Daily Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              Select one, many, or all operations users, then edit the workbook-style values before saving.
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
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  The calculated fields auto-fill from the database for each selected operations user and date.
                </p>
                <p>
                  You can still edit every value before the report is saved, matching the workbook layout.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Operations Users <span className="text-red-500">*</span>
              </label>
              <OperationsDailyMultiSelect
                users={users}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                loading={usersLoading}
                error={previewError}
                onRefresh={loadUsers}
              />
            </div>
          </div>

          {previewLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading calculated values from the database...
            </div>
          )}

          {previewError && !previewLoading && hasSelectedUsers && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {previewError}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Workbook Daily Values</h3>
                <p className="text-xs text-gray-500">
                  {hasSelectedUsers
                    ? `${rows.length} row${rows.length === 1 ? '' : 's'} loaded from preview`
                    : 'Choose one or more operations users to load the workbook rows.'}
                </p>
              </div>
              {users.length > 0 && selectedIds.length === users.length && (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  All operations selected
                </span>
              )}
            </div>

            {hasPreviewRows ? (
              <OperationsDailyRowsTable rows={rows} onChange={handleRowsChange} />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
                Select at least one operations user to preview the daily workbook values.
              </div>
            )}
          </div>

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
              disabled={submitLoading || previewLoading || !hasSelectedUsers || rows.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLoading ? 'Creating...' : 'Create Reports'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
