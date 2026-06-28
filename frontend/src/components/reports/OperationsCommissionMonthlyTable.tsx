'use client'

import { Fragment, useMemo } from 'react'
import { OperationsCommissionProperty, OperationsCommissionReport } from '@/types/reports'

interface MonthGroup {
  key: string
  rows: OperationsCommissionProperty[]
  saleCount: number
  rentCount: number
  commissionTotal: number
}

interface OperationsCommissionMonthlyTableProps {
  report: OperationsCommissionReport
  className?: string
}

function parseIsoDateParts(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map((value) => Number.parseInt(value, 10))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return { year, month, day }
}

function formatDisplayDate(dateValue: string) {
  const parts = parseIsoDateParts(dateValue)
  if (!parts) return dateValue

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0)
}

function getAgentDisplayName(row: OperationsCommissionProperty) {
  return row.agent_name || row.agent_code || 'Unknown'
}

function groupReportRows(properties: OperationsCommissionProperty[]) {
  const sortedRows = [...properties].sort((left, right) => {
    const leftDate = left.closed_date || ''
    const rightDate = right.closed_date || ''

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    return (left.reference_number || '').localeCompare(right.reference_number || '')
  })

  const groups = new Map<string, MonthGroup>()

  sortedRows.forEach((row) => {
    const monthKey = row.closed_date?.slice(0, 7) || 'unknown'
    const existing = groups.get(monthKey)
    const commission = Number(row.commission) || 0
    const isSale = row.property_type === 'sale'

    if (existing) {
      existing.rows.push(row)
      existing.saleCount += isSale ? 1 : 0
      existing.rentCount += isSale ? 0 : 1
      existing.commissionTotal += commission
      return
    }

    groups.set(monthKey, {
      key: monthKey,
      rows: [row],
      saleCount: isSale ? 1 : 0,
      rentCount: isSale ? 0 : 1,
      commissionTotal: commission
    })
  })

  return Array.from(groups.values())
}

export default function OperationsCommissionMonthlyTable({
  report,
  className = ''
}: OperationsCommissionMonthlyTableProps) {
  const groups = useMemo(
    () => groupReportRows(report.properties || []),
    [report.properties]
  )

  if (!report.properties || report.properties.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 ${className}`}>
        No closed properties were found for this period.
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <h4 className="text-sm font-semibold text-slate-900">Monthly breakdown</h4>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          {report.properties.length} closings
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[820px] w-full border-collapse border border-black bg-white">
          <thead className="bg-white">
            <tr>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Date
              </th>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Reference
              </th>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Agent
              </th>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Sale
              </th>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Rent
              </th>
              <th className="border border-black px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-black">
                Total Commission Operation
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                {group.rows.map((row) => (
                  <tr key={`${group.key}-${row.id}`}>
                    <td className="border border-black px-3 py-2 text-center text-sm font-medium text-black">
                      {formatDisplayDate(row.closed_date)}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-sm font-medium text-black">
                      {row.reference_number || 'No Ref'}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-sm font-medium text-black">
                      {getAgentDisplayName(row)}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-sm text-black">
                      {row.property_type === 'sale' ? 1 : ''}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-sm text-black">
                      {row.property_type === 'rent' ? 1 : ''}
                    </td>
                    <td className="border border-black px-3 py-2 text-right text-sm font-semibold text-black">
                      {formatCurrency(row.commission)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-yellow-300">
                  <td
                    colSpan={3}
                    className="border border-black px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.12em] text-black"
                  >
                    TOTAL
                  </td>
                  <td className="border border-black px-3 py-2 text-center text-sm font-bold text-black">
                    {group.saleCount}
                  </td>
                  <td className="border border-black px-3 py-2 text-center text-sm font-bold text-black">
                    {group.rentCount}
                  </td>
                  <td className="border border-black px-3 py-2 text-right text-sm font-bold text-red-600">
                    {formatCurrency(group.commissionTotal)}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
