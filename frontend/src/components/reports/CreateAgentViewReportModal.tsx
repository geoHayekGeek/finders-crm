'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, AlertCircle, RefreshCw, Users, ChevronRight } from 'lucide-react'
import { AgentViewMonthSnapshot, AgentViewQuarterTarget, AgentViewReportPayload, AgentViewSummaryTargets, CreateAgentViewReportData } from '@/types/reports'
import { agentViewReportsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { User } from '@/types/user'
import { downloadBlob, sanitizeFilenamePart } from '@/utils/fileDownload'

interface CreateAgentViewReportModalProps {
  onClose: () => void
  onSuccess: () => void
}

function createQuarterTargets(count: number): AgentViewQuarterTarget[] {
  return Array.from({ length: count }, () => ({
    listings_target: 0,
    sales_amount_target: 0
  }))
}

function createSummaryTargets(): AgentViewSummaryTargets {
  return {
    dev_target: 0,
    new_join_target: 0,
    reviews_target: 0
  }
}

function createMonthOverrides(months: AgentViewMonthSnapshot[]) {
  return months.map((month) => ({
    month_start: month.start_date,
    sheet_name: month.sheet_name,
    dev_total: month.manual_totals?.dev_total ?? 0,
    new_join_total: month.manual_totals?.new_join_total ?? 0,
    reviews_total: month.manual_totals?.reviews_total ?? 0
  }))
}

export default function CreateAgentViewReportModal({ onClose, onSuccess }: CreateAgentViewReportModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [agents, setAgents] = useState<User[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<AgentViewReportPayload | null>(null)
  const [quarterTargets, setQuarterTargets] = useState<AgentViewQuarterTarget[]>([])
  const [summaryTargets, setSummaryTargets] = useState<AgentViewSummaryTargets>(createSummaryTargets())
  const [monthOverrides, setMonthOverrides] = useState<Array<{ month_start?: string; sheet_name?: string; dev_total: number; new_join_total: number; reviews_total: number }>>([])

  const previewRequestIdRef = useRef(0)

  const today = new Date()
  const defaultStartMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`

  const [formData, setFormData] = useState<{
    agent_id?: number
    start_date: string
    period_months: 3 | 6 | 9 | 12
  }>({
    agent_id: undefined,
    start_date: defaultStartMonth,
    period_months: 3
  })

  useEffect(() => {
    if (!token) {
      return
    }

    let isActive = true

    const loadAgents = async () => {
      try {
        setLoadingAgents(true)
        const response = await usersApi.getAgents(token)
        if (!isActive) return

        if (response.success) {
          setAgents(Array.isArray(response.agents) ? response.agents : [])
        } else {
          setAgents([])
        }
      } catch (fetchAgentsError) {
        try {
          const fallback = await usersApi.getByRole('agent', token)
          if (isActive && fallback.success) {
            setAgents(Array.isArray(fallback.data) ? fallback.data : [])
          }
        } catch {
          if (isActive) {
            setError('Unable to load the agent list.')
          }
        }
      } finally {
        if (isActive) {
          setLoadingAgents(false)
        }
      }
    }

    void loadAgents()

    return () => {
      isActive = false
    }
  }, [token])

  useEffect(() => {
    if (!token || !formData.agent_id || !formData.start_date || !formData.period_months) {
      return
    }

    let isActive = true
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId

    const calculatePreview = async () => {
      try {
        setCalculating(true)
        setError(null)

        const response = await agentViewReportsApi.preview(
          {
            agent_id: formData.agent_id!,
            start_date: `${formData.start_date}-01`,
            period_months: formData.period_months,
            quarter_targets: quarterTargets.length > 0 ? quarterTargets : createQuarterTargets(formData.period_months / 3),
            summary_targets: summaryTargets,
            month_overrides: monthOverrides
          },
          token
        )

        if (!isActive || previewRequestIdRef.current !== requestId) {
          return
        }

        if (response.success) {
          setPreviewData(response.data)
          setQuarterTargets(response.data.quarter_targets?.length
            ? response.data.quarter_targets
            : createQuarterTargets(response.data.period_months / 3))
          setSummaryTargets(response.data.summary_targets || createSummaryTargets())
          setMonthOverrides(createMonthOverrides(response.data.months || []))
        }
      } catch (previewError: any) {
        if (isActive && previewRequestIdRef.current === requestId) {
          setError(previewError.message || 'Failed to calculate preview')
        }
      } finally {
        if (isActive && previewRequestIdRef.current === requestId) {
          setCalculating(false)
        }
      }
    }

    void calculatePreview()

    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, formData.agent_id, formData.start_date, formData.period_months])

  const currentMonths = useMemo(() => {
    if (!previewData) {
      return []
    }

    return previewData.months.map((month, index) => {
      const override = monthOverrides[index] || month.manual_totals
      return {
        ...month,
        manual_totals: {
          dev_total: override?.dev_total ?? 0,
          new_join_total: override?.new_join_total ?? 0,
          reviews_total: override?.reviews_total ?? 0
        }
      }
    })
  }, [previewData, monthOverrides])

  const currentSummary = useMemo(() => {
    return currentMonths.reduce((summary, month) => {
      summary.listings_count += month.totals.listings_count || 0
      summary.leads_count += month.totals.leads_count || 0
      summary.viewings_count += month.totals.viewings_count || 0
      summary.sales_count += month.totals.sales_count || 0
      summary.sales_amount += month.totals.sales_amount || 0
      summary.dev_count += month.manual_totals.dev_total || 0
      summary.new_join_count += month.manual_totals.new_join_total || 0
      summary.reviews_count += month.manual_totals.reviews_total || 0
      summary.agent_commission += month.totals.agent_commission || 0
      summary.referral_received_commission += month.totals.referral_received_commission || 0
      summary.total_commission += (month.totals.agent_commission || 0) + (month.totals.referral_received_commission || 0)
      return summary
    }, {
      listings_count: 0,
      leads_count: 0,
      viewings_count: 0,
      sales_count: 0,
      sales_amount: 0,
      dev_count: 0,
      new_join_count: 0,
      reviews_count: 0,
      agent_commission: 0,
      referral_received_commission: 0,
      total_commission: 0
    })
  }, [currentMonths])

  const displayPayload = useMemo<AgentViewReportPayload | null>(() => {
    if (!previewData) {
      return null
    }

    return {
      ...previewData,
      quarter_targets: quarterTargets.length > 0
        ? quarterTargets
        : createQuarterTargets(previewData.period_months / 3),
      summary_targets: summaryTargets,
      months: currentMonths.length > 0 ? currentMonths : previewData.months,
      summary: currentSummary
    }
  }, [previewData, quarterTargets, summaryTargets, currentMonths, currentSummary])

  const setQuarterTarget = (index: number, field: keyof AgentViewQuarterTarget, value: number) => {
    setQuarterTargets((prev) => {
      const next = [...prev]
      next[index] = {
        ...(next[index] || { listings_target: 0, sales_amount_target: 0 }),
        [field]: value
      }
      return next
    })
  }

  const setSummaryTarget = (field: keyof AgentViewSummaryTargets, value: number) => {
    setSummaryTargets((prev) => ({ ...prev, [field]: value }))
  }

  const setMonthOverride = (index: number, field: 'dev_total' | 'new_join_total' | 'reviews_total', value: number) => {
    setMonthOverrides((prev) => {
      const next = [...prev]
      const existing = next[index] || { month_start: '', sheet_name: '', dev_total: 0, new_join_total: 0, reviews_total: 0 }
      next[index] = { ...existing, [field]: value }
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!formData.agent_id) {
      setError('Please select an agent')
      return
    }

    if (!formData.start_date) {
      setError('Please choose a starting month')
      return
    }

    if (!displayPayload) {
      setError('Please wait for the preview to finish calculating')
      return
    }

    try {
      setSaving(true)

      const payload: CreateAgentViewReportData = {
        agent_id: formData.agent_id,
        start_date: `${formData.start_date}-01`,
        period_months: formData.period_months,
        quarter_targets: quarterTargets,
        summary_targets: summaryTargets,
        month_overrides: monthOverrides.map((override, index) => ({
          ...override,
          month_start: displayPayload.months[index]?.start_date,
          sheet_name: displayPayload.months[index]?.sheet_name
        }))
      }

      const response = await agentViewReportsApi.create(payload, token)

      if (response.success) {
        try {
          const blob = await agentViewReportsApi.exportToExcel(response.data.id, token)
          const agentName = response.data.agent_name || displayPayload.agent.name || 'Agent'
          const filename = `Agent_View_${sanitizeFilenamePart(agentName, 'Agent')}_${sanitizeFilenamePart(response.data.start_date)}_to_${sanitizeFilenamePart(response.data.end_date)}.xlsx`
          downloadBlob(blob, filename)
          showSuccess('Agent view report created and downloaded successfully')
        } catch (downloadError: any) {
          showError('The report was saved, but the Excel download failed.')
        }

        onSuccess()
      }
    } catch (submitError: any) {
      if (submitError.message?.includes('already exists')) {
        setError('A report already exists for this agent and date range')
      } else {
        setError(submitError.message || 'Failed to create agent view report')
      }
    } finally {
      setSaving(false)
    }
  }

  const totalMonths = displayPayload?.months?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="my-8 w-full max-w-6xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Agent View Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              Build the workbook for a 3, 6, 9, or 12 month period using the agent view layout only.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-180px)] space-y-6 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Agent <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.agent_id || ''}
                  onChange={(event) => {
                    const value = event.target.value ? parseInt(event.target.value, 10) : undefined
                    setFormData((prev) => ({ ...prev, agent_id: value }))
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Pick the agent whose month snapshots and workbook totals will be calculated.
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-blue-900">
                  Starting Month <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formData.start_date}
                  onChange={(event) => {
                    setFormData((prev) => ({ ...prev, start_date: event.target.value }))
                  }}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  The workbook starts at the first day of this month and can extend into future months.
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-blue-900">
                  Period Length <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.period_months}
                  onChange={(event) => {
                    setFormData((prev) => ({ ...prev, period_months: parseInt(event.target.value, 10) as 3 | 6 | 9 | 12 }))
                    setQuarterTargets(createQuarterTargets(parseInt(event.target.value, 10) / 3))
                    setSummaryTargets(createSummaryTargets())
                  }}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Choose a 3, 6, 9, or 12 month window to match the workbook layout.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Users className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Workbook scope</p>
                <p className="text-sm text-blue-700">
                  The export will include month sheets and an <span className="font-semibold">AGENT VIEW</span> summary only. Finder view is intentionally omitted.
                </p>
              </div>
            </div>
          </div>

          {calculating && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="mr-3 h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-600">Calculating month totals from the database...</span>
            </div>
          )}

          {displayPayload && !calculating && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Quarter Targets</h3>
                    <p className="text-sm text-gray-500">Listings and sales amount targets are set per 3 month block.</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {totalMonths} months selected
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {quarterTargets.map((block, index) => (
                    <div key={`quarter-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-blue-900">
                          Block {index + 1}
                        </h4>
                        <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
                          {displayPayload.months.slice(index * 3, index * 3 + 3).map((month) => month.sheet_name).join(' / ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Listing Target</label>
                          <input
                            type="number"
                            min="0"
                            value={block.listings_target}
                            onChange={(event) => setQuarterTarget(index, 'listings_target', parseInt(event.target.value || '0', 10) || 0)}
                            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Sales Amount Target</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={block.sales_amount_target}
                            onChange={(event) => setQuarterTarget(index, 'sales_amount_target', parseFloat(event.target.value || '0') || 0)}
                            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Overall Targets</h3>
                <p className="mb-4 text-sm text-gray-500">These target values are shown once across the full report period.</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Dev Target</label>
                    <input
                      type="number"
                      min="0"
                      value={summaryTargets.dev_target}
                      onChange={(event) => setSummaryTarget('dev_target', parseInt(event.target.value || '0', 10) || 0)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">New Join Target</label>
                    <input
                      type="number"
                      min="0"
                      value={summaryTargets.new_join_target}
                      onChange={(event) => setSummaryTarget('new_join_target', parseInt(event.target.value || '0', 10) || 0)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Reviews Target</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={summaryTargets.reviews_target}
                      onChange={(event) => setSummaryTarget('reviews_target', parseFloat(event.target.value || '0') || 0)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Month Preview</h3>
                  <p className="text-sm text-gray-500">
                    Calculated values are shown for each month. The manual fields can be edited before saving.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Listings</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Leads</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Viewings</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Sales</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Sales Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Dev</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">New Join</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Reviews</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Agent Com</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ref Received</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {currentMonths.map((month, index) => (
                        <tr key={month.month_key} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-semibold text-gray-900">{month.sheet_name}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{month.totals.listings_count}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{month.totals.leads_count}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{month.totals.viewings_count}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{month.totals.sales_count}</td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(month.totals.sales_amount || 0)}</td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              value={month.manual_totals.dev_total}
                              onChange={(event) => setMonthOverride(index, 'dev_total', parseInt(event.target.value || '0', 10) || 0)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              value={month.manual_totals.new_join_total}
                              onChange={(event) => setMonthOverride(index, 'new_join_total', parseInt(event.target.value || '0', 10) || 0)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={month.manual_totals.reviews_total}
                              onChange={(event) => setMonthOverride(index, 'reviews_total', parseFloat(event.target.value || '0') || 0)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(month.totals.agent_commission || 0)}</td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(month.totals.referral_received_commission || 0)}</td>
                          <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((month.totals.agent_commission || 0) + (month.totals.referral_received_commission || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ChevronRight className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Ready to save</p>
                    <p className="text-sm text-blue-700">
                      The report will be saved with the current targets and manual month totals, then downloaded automatically as Excel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!displayPayload && !calculating && formData.agent_id && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-700">
                  Select an agent, a starting month, and a period length to calculate the workbook preview.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-w-[120px] items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || calculating || !formData.agent_id || !displayPayload}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
