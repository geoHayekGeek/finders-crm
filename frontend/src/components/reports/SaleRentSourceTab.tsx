'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, BadgeCheck, CalendarRange, Download, Eye, FileSpreadsheet, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { SaleRentSourceExportPayload, SaleRentSourceRow } from '@/types/reports'
import { saleRentSourceApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { normalizeRole } from '@/utils/roleUtils'
import { formatDateForDisplay } from '@/utils/dateUtils'

interface SavedSaleRentSourceReport {
  id: number
  start_date: string
  end_date: string
  row_count: number
  total_commission: number
  saved_at: string
}

interface TeamAccent {
  border: string
  soft: string
  chip: string
  chipText: string
  value: string
  iconBg: string
  iconText: string
}

interface TableRowState extends SaleRentSourceRow {
  __rowKey: string
}

interface TeamGroup {
  key: string
  label: string
  code: string | null
  accent: TeamAccent
  rows: TableRowState[]
}

const TEAM_ACCENTS: TeamAccent[] = [
  {
    border: 'border-l-blue-500',
    soft: 'bg-blue-50',
    chip: 'bg-blue-100',
    chipText: 'text-blue-900',
    value: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700'
  },
  {
    border: 'border-l-violet-500',
    soft: 'bg-violet-50',
    chip: 'bg-violet-100',
    chipText: 'text-violet-900',
    value: 'text-violet-900',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700'
  },
  {
    border: 'border-l-emerald-500',
    soft: 'bg-emerald-50',
    chip: 'bg-emerald-100',
    chipText: 'text-emerald-900',
    value: 'text-emerald-900',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700'
  },
  {
    border: 'border-l-amber-500',
    soft: 'bg-amber-50',
    chip: 'bg-amber-100',
    chipText: 'text-amber-900',
    value: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700'
  },
  {
    border: 'border-l-rose-500',
    soft: 'bg-rose-50',
    chip: 'bg-rose-100',
    chipText: 'text-rose-900',
    value: 'text-rose-900',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-700'
  },
  {
    border: 'border-l-cyan-500',
    soft: 'bg-cyan-50',
    chip: 'bg-cyan-100',
    chipText: 'text-cyan-900',
    value: 'text-cyan-900',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-700'
  },
  {
    border: 'border-l-orange-500',
    soft: 'bg-orange-50',
    chip: 'bg-orange-100',
    chipText: 'text-orange-900',
    value: 'text-orange-900',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-700'
  },
  {
    border: 'border-l-slate-500',
    soft: 'bg-slate-50',
    chip: 'bg-slate-100',
    chipText: 'text-slate-900',
    value: 'text-slate-900',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-700'
  }
]

function sanitizeFilenamePart(value: string, fallback: string) {
  const safe = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return safe || fallback
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

function hashString(value: string) {
  const text = value.toLowerCase()
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

function getTeamAccent(teamKey: string | number | null | undefined) {
  if (teamKey === null || teamKey === undefined || teamKey === '') {
    return TEAM_ACCENTS[TEAM_ACCENTS.length - 1]
  }

  const index = hashString(String(teamKey)) % TEAM_ACCENTS.length
  return TEAM_ACCENTS[index]
}

function normalizeText(value: unknown, fallback = '') {
  const text = value === null || value === undefined ? fallback : String(value)
  return text.trim()
}

function getRowKey(row: SaleRentSourceRow, index: number) {
  if (row.property_id) {
    return `property-${row.property_id}`
  }

  return `${normalizeText(row.reference_number, 'ref')}-${normalizeText(row.closed_date, 'date')}-${index}`
}

function getDefaultRange() {
  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))

  return {
    start_date: previousMonthStart.toISOString().split('T')[0],
    end_date: previousMonthEnd.toISOString().split('T')[0]
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)
}

function formatPlainMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)
}

function formatRangeDisplay(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`
}

function countUniqueTeams(rows: SaleRentSourceRow[]) {
  return new Set(rows.map(row => normalizeText(row.team_leader_name || 'Unassigned', 'Unassigned'))).size
}

function countUniqueAgents(rows: SaleRentSourceRow[]) {
  return new Set(rows.map(row => normalizeText(row.agent_name, 'Unknown'))).size
}

function groupRowsByTeam(rows: SaleRentSourceRow[]) {
  const groups: TeamGroup[] = []
  const groupMap = new Map<string, TeamGroup>()

  rows.forEach((row, index) => {
    const teamLabel = normalizeText(row.team_leader_name, 'Unassigned')
    const teamCode = row.team_leader_code || null
    const teamKey = String(row.team_leader_id || teamLabel || 'unassigned')

    if (!groupMap.has(teamKey)) {
      const group = {
        key: teamKey,
        label: teamLabel,
        code: teamCode,
        accent: getTeamAccent(teamKey),
        rows: []
      }
      groupMap.set(teamKey, group)
      groups.push(group)
    }

    groupMap.get(teamKey)!.rows.push({
      ...row,
      __rowKey: getRowKey(row, index)
    })
  })

  return groups
}

function SaleRentSourceSummaryCards({
  rows,
}: {
  rows: SaleRentSourceRow[]
}) {
  const summary = useMemo(() => {
    const totalCommission = rows.reduce((sum, row) => sum + (Number(row.finders_commission) || 0), 0)
    return {
      teams: countUniqueTeams(rows),
      agents: countUniqueAgents(rows),
      closures: rows.length,
      totalCommission
    }
  }, [rows])

  const cards = [
    { label: 'Teams', value: summary.teams, icon: Users, tone: TEAM_ACCENTS[1] },
    { label: 'Agents', value: summary.agents, icon: Users, tone: TEAM_ACCENTS[0] },
    { label: 'Closures', value: summary.closures, icon: BadgeCheck, tone: TEAM_ACCENTS[2] },
    { label: 'Finders Com', value: formatMoney(summary.totalCommission), icon: BadgeDollarSign, tone: TEAM_ACCENTS[3] }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`flex min-h-[108px] flex-col justify-between rounded-2xl border px-4 py-3 shadow-sm ring-1 ring-white/60 ${card.tone.soft} ${card.tone.border}`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${card.tone.iconBg} ${card.tone.iconText}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {card.label}
              </p>
            </div>
            <div className={`mt-4 text-[28px] font-semibold leading-none tracking-[-0.04em] ${card.tone.value}`}>
              {card.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SaleRentSourceRowsTable({
  rows,
  editable,
  onCommissionChange
}: {
  rows: SaleRentSourceRow[]
  editable: boolean
  onCommissionChange?: (rowKey: string, value: string) => void
}) {
  const groupedRows = useMemo(() => groupRowsByTeam(rows), [rows])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        No closures were found for this date range.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1280px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Date
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Agent name
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ref#
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sold/Rented
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Source
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Owner Name
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Phone Number
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Find Com
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group) => {
            const totalCommission = group.rows.reduce((sum, row) => sum + (Number(row.finders_commission) || 0), 0)
            const accent = group.accent
            const displayLabel = group.code ? `${group.label} (${group.code})` : group.label

            return (
              <Fragment key={group.key}>
                <tr>
                  <td
                    colSpan={9}
                    className={`border-b border-slate-200 border-l-4 ${accent.border} ${accent.soft} px-4 py-4`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {displayLabel}
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${accent.chip} ${accent.chipText}`}>
                            {group.rows.length} closures
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Rows are grouped by team and ordered the same way they will appear in Excel.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {group.rows.length} rows
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                          <BadgeDollarSign className="h-3.5 w-3.5" />
                          {formatMoney(totalCommission)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>

                {group.rows.map((row) => {
                  const isLeader = normalizeText(row.agent_role, '').replace(/_/g, ' ').toLowerCase() === 'team leader'
                    || (row.team_leader_id !== null && row.agent_id !== null && Number(row.team_leader_id) === Number(row.agent_id))

                  const commissionValue = Number.isFinite(Number(row.finders_commission))
                    ? Number(row.finders_commission)
                    : 0

                  return (
                    <tr key={row.__rowKey} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900">
                        {formatDateForDisplay(row.closed_date)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className={`inline-flex min-w-0 items-start gap-3 rounded-xl px-3 py-2 ${accent.soft}`}>
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                            {(normalizeText(row.agent_name, 'A').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'A').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {row.agent_name}
                              </span>
                              {row.agent_code && (
                                <span className="text-xs text-slate-500">
                                  ({row.agent_code})
                                </span>
                              )}
                              {isLeader && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.chip} ${accent.chipText}`}>
                                  Leader
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900">
                        {row.reference_number}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-900">
                        {row.sold_rented}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900">
                        {row.source_name}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900">
                        {row.owner_name || '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900">
                        {row.phone_number || '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm text-slate-900">
                        {editable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={Number.isFinite(commissionValue) ? String(commissionValue) : '0'}
                            onChange={(e) => onCommissionChange?.(row.__rowKey, e.target.value)}
                            className="w-28 rounded-lg border border-blue-200 px-3 py-2 text-right text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        ) : (
                          <span className="font-medium">
                            {formatPlainMoney(commissionValue)}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        <div className="max-w-[320px] truncate" title={row.notes || ''}>
                          {row.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function SaleRentSourceTab() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const { role } = usePermissions()

  const normalizedRole = normalizeRole(role)
  const canManage = normalizedRole === 'admin' || normalizedRole === 'operations manager' || normalizedRole === 'operations'

  const defaultRange = useMemo(() => getDefaultRange(), [])

  const [reports, setReports] = useState<SavedSaleRentSourceReport[]>([])
  const [reportRows, setReportRows] = useState<Record<number, SaleRentSourceRow[]>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [draftRows, setDraftRows] = useState<SaleRentSourceRow[]>([])
  const [formData, setFormData] = useState({
    start_date: defaultRange.start_date,
    end_date: defaultRange.end_date
  })

  const loadReportsFromStorage = useCallback((): SavedSaleRentSourceReport[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('saleRentSourceReports')
      const parsed = stored ? JSON.parse(stored) : []
      if (!Array.isArray(parsed)) return []

      return parsed
        .map((report: any) => {
          if (!report || typeof report !== 'object') return null
          return {
            id: Number(report.id),
            start_date: String(report.start_date || ''),
            end_date: String(report.end_date || ''),
            row_count: Number(report.row_count ?? report.count ?? 0),
            total_commission: Number(report.total_commission ?? 0),
            saved_at: String(report.saved_at || report.created_at || new Date().toISOString())
          } as SavedSaleRentSourceReport
        })
        .filter((report): report is SavedSaleRentSourceReport => Boolean(report && Number.isFinite(report.id)))
    } catch {
      return []
    }
  }, [])

  const loadReportRowsFromStorage = useCallback((): Record<number, SaleRentSourceRow[]> => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('saleRentSourceReportRows')
      const parsed = stored ? JSON.parse(stored) : {}
      if (!parsed || typeof parsed !== 'object') return {}

      return Object.entries(parsed).reduce<Record<number, SaleRentSourceRow[]>>((acc, [key, value]) => {
        const id = Number(key)
        if (Number.isFinite(id) && Array.isArray(value)) {
          acc[id] = value
        }
        return acc
      }, {})
    } catch {
      return {}
    }
  }, [])

  useEffect(() => {
    setReports(loadReportsFromStorage())
    setReportRows(loadReportRowsFromStorage())
  }, [loadReportRowsFromStorage, loadReportsFromStorage])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (reports.length > 0) {
      localStorage.setItem('saleRentSourceReports', JSON.stringify(reports))
    } else {
      localStorage.removeItem('saleRentSourceReports')
    }
  }, [reports])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (Object.keys(reportRows).length > 0) {
      localStorage.setItem('saleRentSourceReportRows', JSON.stringify(reportRows))
    } else {
      localStorage.removeItem('saleRentSourceReportRows')
    }
  }, [reportRows])

  const selectedReport = useMemo(
    () => reports.find(report => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  )

  const selectedReportRows = useMemo(
    () => (selectedReportId ? reportRows[selectedReportId] || [] : []),
    [reportRows, selectedReportId]
  )

  const resolveRowsForReport = useCallback(async (report: SavedSaleRentSourceReport) => {
    const hasCachedRows = Object.prototype.hasOwnProperty.call(reportRows, report.id)
    if (hasCachedRows) {
      return reportRows[report.id] || []
    }

    if (!token) {
      throw new Error('You must be logged in to export this report')
    }

    const response = await saleRentSourceApi.getAll({
      start_date: report.start_date,
      end_date: report.end_date
    }, token)

    if (!response.success) {
      throw new Error('Failed to reload report rows')
    }

    setReportRows(prev => ({ ...prev, [report.id]: response.data }))
    return response.data
  }, [reportRows, token])

  useEffect(() => {
    if (!showCreateModal) {
      setPreviewError(null)
      setPreviewLoading(false)
      setDraftRows([])
      return
    }

    if (!token || !formData.start_date || !formData.end_date) {
      setDraftRows([])
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        setPreviewLoading(true)
        setPreviewError(null)
        const response = await saleRentSourceApi.getAll({
          start_date: formData.start_date,
          end_date: formData.end_date
        }, token)

        if (response.success) {
          setDraftRows(response.data)
        } else {
          setDraftRows([])
          setPreviewError(response.message || 'Failed to load preview')
        }
      } catch (error: any) {
        setDraftRows([])
        setPreviewError(error.message || 'Failed to load preview')
      } finally {
        setPreviewLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [showCreateModal, formData.start_date, formData.end_date, token])

  const handleOpenCreateModal = () => {
    const range = getDefaultRange()
    setFormData(range)
    setDraftRows([])
    setPreviewError(null)
    setShowCreateModal(true)
  }

  const handleCommissionChange = (rowKey: string, value: string) => {
    setDraftRows(prev => prev.map((row, index) => {
      const currentKey = row.property_id ? `property-${row.property_id}` : getRowKey(row, index)
      if (currentKey !== rowKey) return row

      const numeric = Number.parseFloat(value)
      return {
        ...row,
        finders_commission: Number.isFinite(numeric) ? numeric : 0
      }
    }))
  }

  const handleSaveAndDownload = async () => {
    if (!token) {
      showError('You must be logged in to create a report')
      return
    }

    if (draftRows.length === 0) {
      showError('No closures were found for the selected date range')
      return
    }

    try {
      setLoading(true)

      const reportId = Date.now()
      const rowsToSave = draftRows.map((row, index) => ({
        ...row,
        finders_commission: Number.isFinite(Number(row.finders_commission)) ? Number(row.finders_commission) : 0,
        __rowKey: getRowKey(row, index)
      }))
      const cleanedRows = rowsToSave.map(({ __rowKey: _rowKey, ...row }) => row)

      const totalCommission = cleanedRows.reduce((sum, row) => sum + (Number(row.finders_commission) || 0), 0)
      const newReport: SavedSaleRentSourceReport = {
        id: reportId,
        start_date: formData.start_date,
        end_date: formData.end_date,
        row_count: cleanedRows.length,
        total_commission: totalCommission,
        saved_at: new Date().toISOString()
      }

      setReports(prev => [newReport, ...prev])
      setReportRows(prev => ({ ...prev, [reportId]: cleanedRows }))

      const payload: SaleRentSourceExportPayload = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        rows: cleanedRows
      }

      const blob = await saleRentSourceApi.exportToExcelFromData(payload, token)
      const filename = `Statistics_of_Sale_and_Rent_Source_${sanitizeFilenamePart(formData.start_date, 'start')}_to_${sanitizeFilenamePart(formData.end_date, 'end')}.xlsx`
      downloadBlob(blob, filename)

      showSuccess('Sale & Rent Source report saved and downloaded successfully')
      setShowCreateModal(false)
    } catch (error: any) {
      showError(error.message || 'Failed to export Sale & Rent Source report to Excel')
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = async (reportId: number) => {
    const report = reports.find(item => item.id === reportId)
    if (!report) {
      showError('Report not found')
      return
    }

    try {
      setLoading(true)
      await resolveRowsForReport(report)
      setSelectedReportId(reportId)
      setShowViewModal(true)
    } catch (error: any) {
      showError(error.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (reportId: number) => {
    const report = reports.find(item => item.id === reportId)
    if (!report) {
      showError('Report not found')
      return
    }

    if (!token) {
      showError('You must be logged in to export reports')
      return
    }

    try {
      setLoading(true)
      const rows = await resolveRowsForReport(report)
      const blob = await saleRentSourceApi.exportToExcelFromData({
        start_date: report.start_date,
        end_date: report.end_date,
        rows
      }, token)

      const filename = `Statistics_of_Sale_and_Rent_Source_${sanitizeFilenamePart(report.start_date, 'start')}_to_${sanitizeFilenamePart(report.end_date, 'end')}.xlsx`
      downloadBlob(blob, filename)
      showSuccess('Sale & Rent Source report exported to Excel successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to export Sale & Rent Source report to Excel')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = (reportId: number) => {
    setReports(prev => prev.filter(report => report.id !== reportId))
    setReportRows(prev => {
      const next = { ...prev }
      delete next[reportId]
      return next
    })

    if (selectedReportId === reportId) {
      setSelectedReportId(null)
      setShowViewModal(false)
    }

    showSuccess('Report deleted')
  }

  const activeReports = reports

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create report
            </button>
          )}
          <button
            onClick={() => {
              setReports(loadReportsFromStorage())
              setReportRows(loadReportRowsFromStorage())
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh saved
          </button>
        </div>

        <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          Company-wide source report with manual commission entry
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <CalendarRange className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              What gets created?
            </h3>
            <p className="mt-1 text-sm text-blue-800">
              One Excel workbook for the entire company. Each row is a closed sale or rental, grouped by team and colored by team in the sheet. Commission is entered manually before download.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Saved reports
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Reports are stored locally in this browser so they can be reopened or exported again.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Date range
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Closures
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Teams
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total commission
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    No saved reports yet. Create one to preview, edit commissions, and download the workbook.
                  </td>
                </tr>
              ) : (
                activeReports.map((report) => {
                  const rows = reportRows[report.id] || []
                  const teams = countUniqueTeams(rows)

                  return (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-900">
                        {formatRangeDisplay(report.start_date, report.end_date)}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-slate-900">
                        {report.row_count}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-slate-900">
                        {teams}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-900">
                        {formatMoney(report.total_commission)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleExportReport(report.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                            title="Export Excel"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="my-8 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Create Sale &amp; Rent Source Report
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Select a date range, review the rows, edit commission values, then save to download the workbook.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="grid gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5 shadow-sm lg:grid-cols-[1fr_auto_1fr]">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      From
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="hidden items-center justify-center text-blue-500 lg:flex">
                    -
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      To
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Previous Month', ...defaultRange },
                        {
                          label: 'Month to Date',
                          start_date: (() => {
                            const today = new Date()
                            const year = today.getFullYear()
                            const month = String(today.getMonth() + 1).padStart(2, '0')
                            return `${year}-${month}-01`
                          })(),
                          end_date: new Date().toISOString().split('T')[0]
                        },
                        {
                          label: 'Last 30 Days',
                          start_date: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          end_date: new Date().toISOString().split('T')[0]
                        },
                        {
                          label: 'Quarter to Date',
                          start_date: (() => {
                            const date = new Date()
                            const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
                            return new Date(date.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
                          })(),
                          end_date: new Date().toISOString().split('T')[0]
                        }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ start_date: preset.start_date, end_date: preset.end_date })}
                          className="rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        What you are editing
                      </p>
                      <p className="mt-1 text-sm text-blue-800">
                        Each row is a closed property from the selected period. The workbook mirrors the spreadsheet layout you sent, with team-colored agents and manual commission entry before Excel is generated.
                      </p>
                    </div>
                  </div>
                </div>

                {previewError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {previewError}
                  </div>
                )}

                {previewLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Loading preview...
                  </div>
                ) : (
                  <>
                    <SaleRentSourceSummaryCards rows={draftRows} />
                    <SaleRentSourceRowsTable
                      rows={draftRows}
                      editable
                      onCommissionChange={handleCommissionChange}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndDownload}
                disabled={loading || previewLoading || draftRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save & Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="my-8 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Sale &amp; Rent Source Report
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {formatRangeDisplay(selectedReport.start_date, selectedReport.end_date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedReportId(null)
                }}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <SaleRentSourceSummaryCards rows={selectedReportRows} />
                <SaleRentSourceRowsTable
                  rows={selectedReportRows}
                  editable={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedReport) return
                  await handleExportReport(selectedReport.id)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedReportId(null)
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
