'use client'

import { useMemo, useState } from 'react'
import { X, CalendarRange, Building2, Eye, TrendingUp, DollarSign, Sparkles, Users } from 'lucide-react'
import { TeamMonthlyReport, MonthlyAgentReport } from '@/types/reports'
import { formatCurrency } from '@/utils/formatters'

interface ViewTeamReportModalProps {
  report: TeamMonthlyReport
  onClose: () => void
}

function formatDateLabel(value: string | Date, formatter: Intl.DateTimeFormat) {
  return formatter.format(typeof value === 'string' ? new Date(value) : value)
}

function AgentReportPanel({ report, isCompact = false }: { report: MonthlyAgentReport, isCompact?: boolean }) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  )

  const leadSources = report.lead_sources && typeof report.lead_sources === 'object'
    ? Object.entries(report.lead_sources)
    : []

  return (
    <div className={`space-y-4 ${isCompact ? '' : 'pt-2'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Listings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{report.listings_count ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Viewings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{report.viewings_count ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{report.sales_count ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales Amount</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(report.sales_amount ?? 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Referrals Received</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{report.referral_received_count ?? 0}</p>
        </div>
      </div>

      {leadSources.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {leadSources.map(([source, count]) => (
              <div key={source} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{source}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Commissions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Agent Commission</p>
            <p className="mt-2 text-2xl font-bold text-blue-900">{formatCurrency(report.agent_commission ?? 0)}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Finders Commission</p>
            <p className="mt-2 text-2xl font-bold text-purple-900">{formatCurrency(report.finders_commission ?? 0)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Team Leader Commission</p>
            <p className="mt-2 text-2xl font-bold text-indigo-900">{formatCurrency(report.team_leader_commission ?? 0)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Administration Commission</p>
            <p className="mt-2 text-2xl font-bold text-orange-900">{formatCurrency(report.administration_commission ?? 0)}</p>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Referral Commission Earned</p>
            <p className="mt-2 text-2xl font-bold text-teal-900">{formatCurrency(report.referral_received_commission ?? 0)}</p>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Referrals on Properties Commission</p>
            <p className="mt-2 text-2xl font-bold text-cyan-900">{formatCurrency(report.referrals_on_properties_commission ?? 0)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-green-900 uppercase tracking-wide">Total Commission</p>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(report.total_commission ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Created At</p>
          <p className="font-medium text-gray-900">{report.created_at ? formatDateLabel(report.created_at, formatter) : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Updated At</p>
          <p className="font-medium text-gray-900">{report.updated_at ? formatDateLabel(report.updated_at, formatter) : 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}

export default function ViewTeamReportModal({ report, onClose }: ViewTeamReportModalProps) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  )
  const agentReports = Array.isArray(report.agent_reports) ? report.agent_reports : []
  const [activeTab, setActiveTab] = useState<string>('summary')

  const startDate = report.start_date ? new Date(report.start_date) : new Date()
  const endDate = report.end_date ? new Date(report.end_date) : new Date()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full my-auto overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <p className="text-sm text-gray-600">Team Monthly Report</p>
            <h2 className="text-xl font-semibold text-gray-900">
              {report.team_leader_name} {report.team_leader_code ? `(${report.team_leader_code})` : ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close team report modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center gap-3 text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Reporting Period</p>
              <p className="text-sm font-medium">
                {formatter.format(startDate)} - {formatter.format(endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Agents</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{report.agent_count ?? agentReports.length}</p>
                </div>
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Listings</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{report.listings_count ?? 0}</p>
                </div>
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Viewings</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{report.viewings_count ?? 0}</p>
                </div>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{report.sales_count ?? 0}</p>
                </div>
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales Amount</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(report.sales_amount ?? 0)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Commission</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(report.total_commission ?? 0)}</p>
            </div>
          </div>

          {report.lead_sources && Object.keys(report.lead_sources).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(report.lead_sources).map(([source, count]) => (
                  <div key={source} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{source}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{count as number}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Team Summary
                </button>
                {agentReports.map((agentReport, index) => (
                  <button
                    key={agentReport.agent_id ?? `${agentReport.agent_name}-${index}`}
                    type="button"
                    onClick={() => setActiveTab(String(agentReport.agent_id ?? index))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === String(agentReport.agent_id ?? index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {agentReport.agent_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'summary' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Agent Commission</p>
                      <p className="mt-2 text-xl font-bold text-blue-900">{formatCurrency(report.agent_commission ?? 0)}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Finders Commission</p>
                      <p className="mt-2 text-xl font-bold text-purple-900">{formatCurrency(report.finders_commission ?? 0)}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Team Leader Commission</p>
                      <p className="mt-2 text-xl font-bold text-indigo-900">{formatCurrency(report.team_leader_commission ?? 0)}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Administration Commission</p>
                      <p className="mt-2 text-xl font-bold text-orange-900">{formatCurrency(report.administration_commission ?? 0)}</p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Referral Commission Earned</p>
                      <p className="mt-2 text-xl font-bold text-teal-900">{formatCurrency(report.referral_received_commission ?? 0)}</p>
                    </div>
                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Referrals on Properties Commission</p>
                      <p className="mt-2 text-xl font-bold text-cyan-900">{formatCurrency(report.referrals_on_properties_commission ?? 0)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Referrals Given</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{report.referral_received_count ?? 0}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Referrals on Properties</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{report.referrals_on_properties_count ?? 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <AgentReportPanel
                  report={agentReports.find(agent => String(agent.agent_id ?? '') === activeTab) || agentReports[0]}
                />
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
