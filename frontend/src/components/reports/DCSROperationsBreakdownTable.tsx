'use client'

import { useMemo, type ReactNode } from 'react'
import { ClipboardList, Users } from 'lucide-react'
import { DCSROperationsBreakdownRow } from '@/types/reports'

interface DCSROperationsBreakdownTableProps {
  title: string
  subtitle?: string
  rows: DCSROperationsBreakdownRow[]
  totalLeads?: number
}

function StatCard({
  label,
  value,
  icon
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="flex h-full min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {label}
        </p>
      </div>
      <div className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.04em] text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  )
}

export default function DCSROperationsBreakdownTable({
  title,
  subtitle,
  rows,
  totalLeads
}: DCSROperationsBreakdownTableProps) {
  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.userCount += 1
        acc.leads += row.leads_count || 0
        return acc
      },
      {
        userCount: 0,
        leads: 0
      }
    )
  }, [rows])

  const totalCalls = totalLeads ?? summary.leads

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 shadow-sm">
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Operations breakdown
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label="Operations users"
              value={summary.userCount}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Leads added"
              value={totalCalls}
              icon={<ClipboardList className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 table-fixed">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-16 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  #
                </th>
                <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Admin
                </th>
                <th className="w-28 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Calls
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No operations users were found for the selected range.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                      {index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-800">
                      <div className="leading-tight">
                        <div className="uppercase tracking-[0.04em]">{row.name}</div>
                        {row.user_code && (
                          <div className="mt-0.5 text-xs font-normal tracking-normal text-slate-500">
                            {row.user_code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-blue-700">
                      {row.leads_count.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}

              <tr className="bg-slate-50">
                <td className="border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700" />
                <td className="border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                  Total
                </td>
                <td className="border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                  {totalCalls.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
