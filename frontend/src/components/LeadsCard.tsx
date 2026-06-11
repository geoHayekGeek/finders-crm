'use client'

import { useState } from 'react'
import { Lead } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User, Users, UserPlus } from 'lucide-react'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { ReferLeadModal } from './ReferLeadModal'
import { useAuth } from '@/contexts/AuthContext'
import { isTeamLeaderRole, normalizeRole } from '@/utils/roleUtils'
import { getLeadRoleBadgeClassName, getLeadRoleLabel } from '@/utils/leadRoles'

interface LeadsCardProps {
  lead: Lead
  onView: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  canManageLeads?: boolean
  canDeleteLeads?: boolean
  limitedAccess?: boolean
}

export function LeadsCard({
  lead,
  onView,
  onEdit,
  onDelete,
  canManageLeads = true,
  canDeleteLeads = false,
  limitedAccess = false
}: LeadsCardProps) {
  const [showReferModal, setShowReferModal] = useState(false)
  const { user } = useAuth()

  const normalizedUserRole = normalizeRole(user?.role)
  const canReferLead = ((['agent', 'consultant'].includes(normalizedUserRole) || normalizedUserRole === 'team leader')) &&
    lead.agent_id === user?.id

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {!limitedAccess && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                {formatDateForDisplay(lead.date)}
              </span>
            </div>
          )}
        </div>
        {canReferLead && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowReferModal(true)
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors border border-blue-300"
            title="Refer lead to another agent"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {lead.customer_name}
          </h3>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getLeadRoleBadgeClassName(lead)}`}>
          {getLeadRoleLabel(lead)}
        </span>
      </div>

      {lead.phone_number && (
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{lead.phone_number}</span>
        </div>
      )}

      {lead.price !== null && lead.price !== undefined && lead.price > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Price</div>
          <div className="text-sm font-medium text-gray-900">${Number(lead.price).toLocaleString()}</div>
        </div>
      )}

      {(!limitedAccess || isTeamLeaderRole(user?.role)) && (
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
      )}

      {!limitedAccess && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Viewings</div>
          <div className="text-sm font-medium text-gray-900">{Number(lead.total_viewings ?? 0)}</div>
        </div>
      )}

      {!limitedAccess && lead.added_by_name && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Added By</div>
          <div className="text-sm">
            <span className="text-gray-900 font-medium">{lead.added_by_name}</span>
            {lead.added_by_role && (
              <span className="text-gray-500 ml-1 capitalize">
                ({lead.added_by_role.replace('_', ' ')})
              </span>
            )}
          </div>
        </div>
      )}

      {!limitedAccess && lead.reference_source_name && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Reference Source</div>
          <div className="text-sm text-gray-700">{lead.reference_source_name}</div>
        </div>
      )}

      {!limitedAccess && (
        <div className="text-xs text-gray-400 mb-4">
          Created {formatDateForDisplay(lead.created_at)}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => onView(lead)}
          className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors text-sm"
          title="View lead"
        >
          <Eye className="h-4 w-4" />
          <span>View</span>
        </button>
        {canManageLeads && (
          <button
            onClick={() => onEdit(lead)}
            className="flex items-center gap-1 px-3 py-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors text-sm"
            title="Edit lead"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit</span>
          </button>
        )}
        {canDeleteLeads && (
          <button
            onClick={() => onDelete(lead)}
            className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors text-sm"
            title="Delete lead"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        )}
      </div>

      <ReferLeadModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        lead={lead}
        onSuccess={() => {
          // no-op
        }}
      />
    </div>
  )
}
