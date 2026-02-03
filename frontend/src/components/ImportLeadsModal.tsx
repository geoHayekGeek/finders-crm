'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download, Loader2 } from 'lucide-react'
import { leadsApi } from '@/utils/api'
import { LeadsImportResponse, LeadsImportRowPreview } from '@/types/leads'
import { useToast } from '@/contexts/ToastContext'

const SUPPORTED_COLUMNS = 'Date, Customer Name, Phone Number, Agent Name, Price, Source, Operations'
const ACCEPT_FILES = '.xlsx,.csv'
const PREVIEW_ROWS = 20

interface ImportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  token: string | null | undefined
}

export function ImportLeadsModal({ isOpen, onClose, onSuccess, token }: ImportLeadsModalProps) {
  const { showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<LeadsImportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<LeadsImportResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestFileKeyRef = useRef<string | null>(null)

  const reset = () => {
    requestFileKeyRef.current = null
    setFile(null)
    setPreview(null)
    setResult(null)
    setLoading(false)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = (f.name || '').toLowerCase()
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.csv')) {
      showToast('Please select a .xlsx or .csv file', 'error')
      e.target.value = ''
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('File must be under 10MB', 'error')
      e.target.value = ''
      return
    }
    requestFileKeyRef.current = null
    setFile(f)
    setPreview(null)
    setResult(null)
    setLoading(false)
    setImporting(false)
    e.target.value = ''
  }

  const getFileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`

  const handlePreview = async () => {
    if (!file || !token) return
    const fileKey = getFileKey(file)
    requestFileKeyRef.current = fileKey
    setLoading(true)
    setPreview(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await leadsApi.importLeads(formData, { dryRun: true }, token)
      if (requestFileKeyRef.current !== fileKey) return
      setPreview(data)
      if (data.sheetWarning) showToast(data.sheetWarning, 'info')
    } catch (err: unknown) {
      if (requestFileKeyRef.current !== fileKey) return
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Preview failed'
      showToast(message, 'error')
    } finally {
      if (requestFileKeyRef.current === fileKey) setLoading(false)
      requestFileKeyRef.current = null
    }
  }

  const validCount = preview?.summary?.valid ?? 0
  const invalidCount = preview?.summary?.invalid ?? 0
  const canImportClean = !!preview && validCount > 0 && invalidCount === 0
  const canImportSkipErrors = !!preview && validCount > 0 && invalidCount > 0

  const handleImport = async (opts?: { skipErrors?: boolean }) => {
    const skipErrors = !!opts?.skipErrors
    if (!file || !token) return
    if (skipErrors) {
      if (!canImportSkipErrors) return
    } else {
      if (!canImportClean) return
    }
    const fileKey = getFileKey(file)
    requestFileKeyRef.current = fileKey
    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await leadsApi.importLeads(formData, { dryRun: false, mode: 'skip' }, token)
      if (requestFileKeyRef.current !== fileKey) return
      setResult(data)
      if (skipErrors) {
        showToast(
          `Imported ${data.importedCount ?? 0} leads. Skipped ${data.skippedDuplicatesCount ?? 0} duplicates. Skipped ${data.errorCount ?? 0} error rows.`,
          'success'
        )
      } else {
        showToast(`Imported ${data.importedCount ?? 0} leads. Skipped ${data.skippedDuplicatesCount ?? 0} duplicates.`, 'success')
      }
      onSuccess?.()
    } catch (err: unknown) {
      if (requestFileKeyRef.current !== fileKey) return
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Import failed'
      showToast(message, 'error')
    } finally {
      if (requestFileKeyRef.current === fileKey) setImporting(false)
      requestFileKeyRef.current = null
    }
  }

  const downloadErrorsCsv = () => {
    if (!preview?.errors?.length) return
    const headers = ['Row', 'Customer', 'Phone', 'Errors', 'Warnings']
    const rows = preview.errors.map(e => [
      e.rowNumber,
      e.customer_name ?? '',
      e.phone_number ?? '',
      (e.errors || []).join('; '),
      (e.warnings || []).join('; '),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!isOpen) return null

  const displayRows = (preview?.parsedRows ?? []).slice(0, PREVIEW_ROWS)

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" style={{ margin: 0, minHeight: '100vh', minWidth: '100%' }}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Import Leads from Excel</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-gray-600">
            Supported columns: <strong>{SUPPORTED_COLUMNS}</strong>. Columns &quot;Code&quot; and &quot;Reference&quot; are ignored. Max file size: 10MB.
          </p>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_FILES}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {file ? file.name : 'Choose file (.xlsx or .csv)'}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || loading || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading & analyzing…
                </>
              ) : (
                <>Preview</>
              )}
            </button>
          </div>

          {(loading || importing) && (
            <div className="flex items-center justify-center gap-3 py-8 rounded-lg bg-gray-50 border border-gray-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600 font-medium">
                {loading ? 'Uploading and analyzing file…' : 'Importing leads…'}
              </p>
            </div>
          )}

          {preview?.sheetWarning && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              {preview.sheetWarning}
            </div>
          )}

          {!loading && !importing && preview?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-gray-500">Total</span>
                <p className="font-medium">{preview.summary.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <span className="text-green-700">Valid</span>
                <p className="font-medium text-green-800">{preview.summary.valid}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <span className="text-red-700">Errors</span>
                <p className="font-medium text-red-800">{preview.summary.invalid}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-gray-500">Duplicates</span>
                <p className="font-medium">{preview.summary.duplicate}</p>
              </div>
            </div>
          )}

          {!loading && !importing && preview && (preview.errors?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Rows with errors</span>
                <button
                  type="button"
                  onClick={downloadErrorsCsv}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" /> Download errors.csv
                </button>
              </div>
              {validCount > 0 && (
                <p className="text-xs text-gray-600 mb-2">
                  You can still import the <strong>{validCount}</strong> valid rows and skip the <strong>{invalidCount}</strong> error rows.
                </p>
              )}
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
                {preview.errors?.slice(0, 15).map((e, i) => (
                  <li key={i}>
                    Row {e.rowNumber}: {(e.errors || []).join(', ')}
                  </li>
                ))}
                {(preview.errors?.length ?? 0) > 15 && (
                  <li>… and {preview.errors!.length - 15} more (see downloaded CSV)</li>
                )}
              </ul>
            </div>
          )}

          {!loading && !importing && displayRows.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Agent</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Operations</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row: LeadsImportRowPreview) => (
                    <tr
                      key={row.rowNumber}
                      className={`border-b ${row.isError ? 'bg-red-50' : ''}`}
                    >
                      <td className="p-2">{row.rowNumber}</td>
                      <td className="p-2">{row.date ?? '—'}</td>
                      <td className="p-2">{row.customer_name ?? '—'}</td>
                      <td className="p-2">{row.phone_number ?? '—'}</td>
                      <td className="p-2">
                        {row.agent_id ? `#${row.agent_id}` : row.agent_name ?? '—'}
                      </td>
                      <td className="p-2">{row.reference_source_name ?? row.reference_source_id ?? '—'}</td>
                      <td className="p-2">{row.added_by_name ?? `#${row.added_by_id}`}</td>
                      <td className="p-2">{row.price != null ? row.price : '—'}</td>
                      <td className="p-2">{row.status ?? 'Active'}</td>
                      <td className="p-2 max-w-[180px]">
                        {(row.warnings || []).length > 0 ? (
                          <span className="text-amber-700" title={(row.warnings || []).join('; ')}>
                            {(row.warnings || []).join('; ').slice(0, 60)}
                            {(row.warnings || []).join('').length > 60 ? '…' : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(preview?.parsedRows?.length ?? 0) > PREVIEW_ROWS && (
                <p className="text-xs text-gray-500 p-2">
                  Showing first {PREVIEW_ROWS} of {preview?.parsedRows?.length} rows.
                </p>
              )}
            </div>
          )}

          {!loading && !importing && result && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-800 font-medium">
                <CheckCircle className="h-5 w-5" />
                Import complete
              </div>
              <p className="text-sm text-green-700">
                Imported: <strong>{result.importedCount ?? 0}</strong> · Skipped duplicates: <strong>{result.skippedDuplicatesCount ?? 0}</strong> · Errors: <strong>{result.errorCount ?? 0}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <>
              {canImportSkipErrors && (
                <button
                  type="button"
                  onClick={() => handleImport({ skipErrors: true })}
                  disabled={importing}
                  className="px-4 py-2 border border-blue-600 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Imports valid rows and skips rows with errors"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Import valid rows
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleImport({ skipErrors: false })}
                disabled={!canImportClean || importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={!canImportClean && invalidCount > 0 ? 'Fix errors or use “Import valid rows” to skip them.' : undefined}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Import
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined' && mounted) {
    return createPortal(modalContent, document.body)
  }
  return modalContent
}
