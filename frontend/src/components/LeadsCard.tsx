'use client'

import { useState } from 'react'
import { Lead, LEAD_STATUSES } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User, Users, Share2, UserPlus } from 'lucide-react'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { ReferLeadModal } from './ReferLeadModal'
import { useAuth } from '@/contexts/AuthContext'
import { isTeamLeaderRole } from '@/utils/roleUtils'

interface LeadsCardProps {
  lead: Lead
  onView: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  canManageLeads?: boolean
  limitedAccess?: boolean
}

export function LeadsCard({ lead, onView, onEdit, onDelete, canManageLeads = true, limitedAccess = false }: LeadsCardProps) {
  const [showReferModal, setShowReferModal] = useState(false)
  const { user } = useAuth()
  const statusConfig = LEAD_STATUSES.find(s => s.value === lead.status)
  const statusColor = statusConfig?.color || '#6B7280'
  const statusLabel = statusConfig?.label || lead.status
  
  // Check if lead is closed
  // Check if the lead's status allows referrals
  let canBeReferred = true
  if (lead.status_can_be_referred === false) {
    canBeReferred = false
    console.log('🚫 [LeadsCard] Lead cannot be referred - status_can_be_referred is false', {
      leadId: lead.id,
      status: lead.status,
      status_can_be_referred: lead.status_can_be_referred
    })
  } else if (lead.status_can_be_referred === undefined || lead.status_can_be_referred === null) {
    // For backward compatibility, if status_can_be_referred is undefined, 
    // fall back to checking status name (for old data)
    const isClosed = lead.status && ['closed', 'converted'].includes(lead.status.toLowerCase())
    if (isClosed) {
      canBeReferred = false
      console.log('🚫 [LeadsCard] Lead cannot be referred - status is closed/converted', {
        leadId: lead.id,
        status: lead.status
      })
    }
  }
  
  // Agents and team leaders can only refer leads that are assigned to them
  const canReferLead = (user?.role === 'agent' || user?.role === 'team_leader') && 
                      lead.agent_id === user?.id &&
                      canBeReferred
  
  // Debug logging
  if (lead.status_can_be_referred === false && canReferLead) {
    console.warn('⚠️ [LeadsCard] Inconsistency detected - status_can_be_referred is false but canReferLead is true', {
      leadId: lead.id,
      status: lead.status,
      status_can_be_referred: lead.status_can_be_referred,
      userRole: user?.role,
      leadAgentId: lead.agent_id,
      userId: user?.id
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with status, date, and refer button */}
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
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
        {/* Refer button in top right */}
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

      {/* Price - shown for all users including agents and team leaders */}
      {lead.price !== null && lead.price !== undefined && lead.price > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Price</div>
          <div className="text-sm font-medium text-gray-900">${Number(lead.price).toLocaleString()}</div>
        </div>
      )}

      {/* Agent Information - Show for team leaders, hide for agents */}
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

      {/* Added By - Only show for admin/operations, not for agents/team leaders */}
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

      {/* Reference Source */}
      {!limitedAccess && lead.reference_source_name && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Reference Source</div>
          <div className="text-sm text-gray-700">{lead.reference_source_name}</div>
        </div>
      )}

      {/* Created Date */}
      {!limitedAccess && (
        <div className="text-xs text-gray-400 mb-4">
          Created {formatDateForDisplay(lead.created_at)}
        </div>
      )}

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
        {canManageLeads && (
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

      {/* Refer Lead Modal */}
      <ReferLeadModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        lead={lead}
        onSuccess={() => {
          // Optionally refresh the lead list
        }}
      />
    </div>
  )
}
