'use client'

import { CalendarDays, FileText, Users, X } from 'lucide-react'
import { Complaint } from '@/types/complaints'
import { formatRole, getRoleColor } from '@/utils/roleFormatter'
import { normalizeRole } from '@/utils/roleUtils'

interface ComplaintDetailsModalProps {
  complaint: Complaint | null
  isOpen: boolean
  onClose: () => void
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function ComplaintDetailsModal({ complaint, isOpen, onClose }: ComplaintDetailsModalProps) {
  if (!isOpen || !complaint) {
    return null
  }

  const targetRole = normalizeRole(complaint.target_user_role)
  const creatorRole = normalizeRole(complaint.created_by_role)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Complaint #{complaint.id}
              </p>
              <h3 className="text-xl font-semibold text-gray-900">Complaint details</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-700">Complaint title</p>
                  <h4 className="mt-1 text-2xl font-semibold text-gray-900">{complaint.title}</h4>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{complaint.description}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(targetRole)}`}
                >
                  {formatRole(complaint.target_user_role || '')}
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4" />
                  <h5 className="text-sm font-semibold">Lead</h5>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gray-900">{complaint.lead_name || 'Unknown Lead'}</p>
                  <p className="text-sm text-gray-600">{complaint.lead_phone || 'No phone provided'}</p>
                  <p className="text-xs text-gray-500">Lead #{complaint.lead_id}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4" />
                  <h5 className="text-sm font-semibold">Target user</h5>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{complaint.target_user_name || 'Unknown User'}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleColor(targetRole)}`}>
                    {formatRole(complaint.target_user_role || '')}
                  </span>
                  <p className="text-xs text-gray-500">User ID #{complaint.target_user_id}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4" />
                  <h5 className="text-sm font-semibold">Created by</h5>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{complaint.created_by_name || 'Unknown User'}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleColor(creatorRole)}`}>
                    {formatRole(complaint.created_by_role || '')}
                  </span>
                  <p className="text-xs text-gray-500">User ID #{complaint.created_by}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-gray-700">
                  <CalendarDays className="h-4 w-4" />
                  <h5 className="text-sm font-semibold">Timeline</h5>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Created at</p>
                    <p className="font-medium text-gray-900">{formatDateTime(complaint.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Updated at</p>
                    <p className="font-medium text-gray-900">{formatDateTime(complaint.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
