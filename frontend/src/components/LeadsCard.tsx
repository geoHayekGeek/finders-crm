'use client'

import { Lead, LEAD_STATUSES } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User, MessageSquare, Users } from 'lucide-react'
import { formatDateForDisplay } from '@/utils/dateUtils'

interface LeadsCardProps {
  lead: Lead
  onView: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
}

export function LeadsCard({ lead, onView, onEdit, onDelete }: LeadsCardProps) {
  const statusConfig = LEAD_STATUSES.find(s => s.value === lead.status)
  const statusColor = statusConfig?.color || '#6B7280'
  const statusLabel = statusConfig?.label || lead.status

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with status and date */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {formatDateForDisplay(lead.date)}
          </span>
        </div>
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Customer Name */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {lead.customer_name}
          </h3>
        </div>
      </div>

      {/* Phone Number */}
      {lead.phone_number && (
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{lead.phone_number}</span>
        </div>
      )}

      {/* Agent Information */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <div className="text-sm">
            {lead.assigned_agent_name || lead.agent_name ? (
              <div>
                <span className="font-medium text-gray-900">
                  {lead.assigned_agent_name || lead.agent_name}
                </span>
                {lead.agent_role && (
                  <span className="text-gray-500 ml-1 capitalize">
                    ({lead.agent_role.replace('_', ' ')})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Reference Source */}
      {lead.reference_source_name && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Reference Source</div>
          <div className="text-sm text-gray-700">{lead.reference_source_name}</div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div className="mb-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 line-clamp-3">{lead.notes}</p>
          </div>
        </div>
      )}

      {/* Created Date */}
      <div className="text-xs text-gray-400 mb-4">
        Created {formatDateForDisplay(lead.created_at)}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => onView(lead)}
          className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors text-sm"
          title="View lead"
        >
          <Eye className="h-4 w-4" />
          <span>View</span>
        </button>
        <button
          onClick={() => onEdit(lead)}
          className="flex items-center gap-1 px-3 py-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors text-sm"
          title="Edit lead"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => onDelete(lead)}
          className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors text-sm"
          title="Delete lead"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
}
