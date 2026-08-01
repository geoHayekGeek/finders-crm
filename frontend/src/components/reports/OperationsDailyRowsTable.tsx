'use client'

import { OperationsDailyRowDraft, OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS } from './operationsDailyFields'

interface OperationsDailyRowsTableProps {
  rows: OperationsDailyRowDraft[]
  onChange: (rows: OperationsDailyRowDraft[]) => void
  showReportExists?: boolean
}

function parseNumber(value: string): number {
  if (value === '') {
    return 0
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function OperationsDailyRowsTable({
  rows,
  onChange,
  showReportExists = true
}: OperationsDailyRowsTableProps) {
  const updateRow = (rowIndex: number, field: keyof OperationsDailyRowDraft, value: string) => {
    const nextRows = rows.map((row, index) => {
      if (index !== rowIndex) {
        return row
      }

      return {
        ...row,
        [field]: parseNumber(value)
      }
    })

    onChange(nextRows)
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Admin and Operations
            </th>
            {OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS.map((field) => (
              <th
                key={field.key}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                <div className="whitespace-pre-line">{field.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={row.operations_id ?? rowIndex} className="hover:bg-gray-50">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 align-top">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">
                    {row.operations_name || `Operations ${row.operations_id ?? rowIndex + 1}`}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {showReportExists && row.report_exists && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        Already exists
                      </span>
                    )}
                    {row.existing_report_id ? (
                      <span>Report #{row.existing_report_id}</span>
                    ) : null}
                  </div>
                </div>
              </td>
              {OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS.map((field) => {
                const isNegativeAllowed = field.key === 'tasks_efficiency'
                const rawValue = row[field.key]
                const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0)

                return (
                  <td key={field.key} className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={isNegativeAllowed ? undefined : 0}
                      value={Number.isFinite(numericValue) ? numericValue : 0}
                      onChange={(event) => updateRow(rowIndex, field.key, event.target.value)}
                      className="w-28 rounded-md border border-gray-300 bg-white px-2 py-2 text-center text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
