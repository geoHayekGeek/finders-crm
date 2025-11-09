'use client'

import { X, CalendarRange, DollarSign, Gift } from 'lucide-react'
import { MonthlyAgentReport } from '@/types/reports'
import { formatCurrency } from '@/utils/formatters'
import { useMemo } from 'react'

interface AgentEarningsModalProps {
  report: MonthlyAgentReport
  onClose: () => void
}

export default function AgentEarningsModal({ report, onClose }: AgentEarningsModalProps) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  )

  const formatDate = (value: string | Date) =>
    formatter.format(typeof value === 'string' ? new Date(value) : value)

  const toNumber = (value: unknown): number => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
  }

  const closureCommission = toNumber(report.agent_commission)
  const referralCommission = toNumber(
    report.referral_received_commission ?? report.referral_commission
  )
  const totalCommission = closureCommission + referralCommission

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <p className="text-sm text-gray-600">Agent Earnings</p>
            <h2 className="text-xl font-semibold text-gray-900">{report.agent_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close earnings modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3 text-gray-700">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Reporting Period</p>
              <p className="text-sm font-medium">
                {formatDate(report.start_date)} – {formatDate(report.end_date)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Commission from Closures</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">
                    {formatCurrency(closureCommission)}
                  </p>
                </div>
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-800">
                Earnings from closed deals where you were the primary agent.
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    Commission from Referred Leads
                  </p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">
                    {formatCurrency(referralCommission)}
                  </p>
                </div>
                <div className="p-3 bg-purple-600 text-white rounded-xl shadow">
                  <Gift className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-purple-800">
                Rewards for deals closed from the leads you referred to the team.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total Earnings for this period
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalCommission)}
              </span>
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

