'use client'

import { Lead, LEAD_STATUSES } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User, Share2, UserPlus } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { isTeamLeaderRole } from '@/utils/roleUtils'

interface LeadsColumnOptions {
  limitedAccess?: boolean
  canReferLead?: (lead: Lead) => boolean
  userRole?: string | null
}

// Function to generate columns with permission-based actions
export const getLeadsColumns = (
  canManageLeads: boolean = true,
  options: LeadsColumnOptions = {}
): ColumnDef<Lead>[] => {
  const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">
            {formatDateForDisplay(lead.date)}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer Name',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{lead.customer_name || '-'}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'phone_number',
    header: 'Phone Number',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="flex items-center gap-2">
          {lead.phone_number ? (
            <>
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{lead.phone_number}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="text-sm">
          {lead.price ? (
            <span className="font-medium text-gray-900">${lead.price.toLocaleString()}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'assigned_agent_name',
    header: 'Agent',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="text-sm">
          {lead.assigned_agent_name || lead.agent_name ? (
            <div>
              <div className="font-medium text-gray-900">
                {lead.assigned_agent_name || lead.agent_name}
              </div>
              {lead.agent_role && (
                <div className="text-xs text-gray-500 capitalize">
                  {lead.agent_role.replace('_', ' ')}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const lead = row.original
      const statusConfig = LEAD_STATUSES.find(s => s.value === lead.status)
      const color = statusConfig?.color || '#6B7280'
      const label = statusConfig?.label || lead.status
      
      return (
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {label || '-'}
        </span>
      )
    }
  },
  {
    accessorKey: 'operations_name',
    header: 'Operations',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="text-sm">
          {lead.operations_name ? (
            <div>
              <div className="font-medium text-gray-900 text-xs">{lead.operations_name}</div>
              {lead.operations_role && (
                <div className="text-xs text-gray-500 capitalize">
                  {lead.operations_role.replace('_', ' ')}
                </div>
              )}
            </div>
          ) : lead.operations_id ? (
            <span className="text-gray-400">ID: {lead.operations_id}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'reference_source_name',
    header: 'Reference Source',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="text-sm">
          {lead.reference_source_name ? (
            <span className="text-gray-900 text-xs">{lead.reference_source_name}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <span className="text-sm text-gray-500">
          {formatDateForDisplay(lead.created_at)}
        </span>
      )
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const lead = row.original
      // Check if lead can be referred (using status_can_be_referred or fallback to status name)
      const canRefer = options.canReferLead ? options.canReferLead(lead) : false
      
      // Debug logging
      if (lead.status_can_be_referred === false) {
        console.log('🚫 [LeadsTableColumns] Refer button should be hidden', {
          leadId: lead.id,
          status: lead.status,
          status_can_be_referred: lead.status_can_be_referred,
          canRefer
        })
      }
      
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => lead.onView?.(lead)}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="View lead"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canRefer && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (lead.onRefer) {
                  lead.onRefer(lead)
                }
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-300"
              title="Refer lead"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          )}
          {canManageLeads && (
            <button
              onClick={() => lead.onEdit?.(lead)}
              className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
              title="Edit lead"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          {canManageLeads && (
            <button
              onClick={() => lead.onDelete?.(lead)}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete lead"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  }
  ]

  if (options.limitedAccess) {
    const isTeamLeader = isTeamLeaderRole(options.userRole)
    
    // For agents: only show Status, Customer Name, Phone Number, Price
    // For team leaders: show Status, Customer Name, Phone Number, Price, Agent (to see which agent the lead is assigned to)
    // Hide: Date, Operations, Reference Source, Created
    const hiddenKeys = new Set([
      'date',
      'operations_name',
      'reference_source_name',
      'created_at',
      // Hide agent column only for agents, not for team leaders
      ...(isTeamLeader ? [] : ['assigned_agent_name'])
    ])
    return columns.filter(column => {
      const key = 'accessorKey' in column ? (column.accessorKey as string | undefined) : undefined
      if (key && hiddenKeys.has(key)) {
        return false
      }
      // Keep: customer_name, phone_number, price, status, actions, and agent (for team leaders)
      return true
    })
  }

  return columns
}

export const getLeadsDetailedColumns = (
  canManageLeads: boolean = true,
  options: LeadsColumnOptions = {}
): ColumnDef<Lead>[] => {
  const columns = getLeadsColumns(canManageLeads, options)
  const actionColumn = columns.find(column => column.id === 'actions')
  const baseColumns = columns.filter(column => column.id !== 'actions')

  if (options.limitedAccess) {
    return [...baseColumns, ...(actionColumn ? [actionColumn] : [])]
  }

  return [
    ...baseColumns,
    ...(actionColumn ? [actionColumn] : [])
  ]
}

// Export default columns for backward compatibility
export const leadsColumns = getLeadsColumns(true)
export const leadsDetailedColumns = getLeadsDetailedColumns(true)
