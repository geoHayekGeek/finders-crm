'use client'

import { Lead } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User, UserPlus } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { isTeamLeaderRole } from '@/utils/roleUtils'
import { getLeadRoleBadgeClassName, getLeadRoleLabel } from '@/utils/leadRoles'

interface LeadsColumnOptions {
  limitedAccess?: boolean
  canReferLead?: (lead: Lead) => boolean
  userRole?: string | null
}

export const getLeadsColumns = (
  canManageLeads: boolean = true,
  canDeleteLeads: boolean = false,
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
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-900">{lead.customer_name || '-'}</div>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getLeadRoleBadgeClassName(lead)}`}>
                {getLeadRoleLabel(lead)}
              </span>
            </div>
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
      accessorKey: 'total_viewings',
      header: 'Total Viewings',
      cell: ({ row }) => {
        const lead = row.original
        const totalViewings = Number(lead.total_viewings ?? 0)
        return (
          <div className="text-sm">
            <span className="font-medium text-gray-900">{totalViewings}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'added_by_name',
      header: 'Added By',
      cell: ({ row }) => {
        const lead = row.original
        return (
          <div className="text-sm">
            {lead.added_by_name ? (
              <div>
                <div className="font-medium text-gray-900 text-xs">{lead.added_by_name}</div>
                {lead.added_by_role && (
                  <div className="text-xs text-gray-500 capitalize">
                    {lead.added_by_role.replace('_', ' ')}
                  </div>
                )}
              </div>
            ) : lead.added_by_id ? (
              <span className="text-gray-400">ID: {lead.added_by_id}</span>
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
        const canRefer = options.canReferLead ? options.canReferLead(lead) : false

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
                  lead.onRefer?.(lead)
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
            {canDeleteLeads && (
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
    const hiddenKeys = new Set([
      'date',
      'added_by_name',
      'reference_source_name',
      'created_at',
      'total_viewings',
      ...(isTeamLeader ? [] : ['assigned_agent_name'])
    ])

    return columns.filter((column) => {
      const key = 'accessorKey' in column ? (column.accessorKey as string | undefined) : undefined
      if (key && hiddenKeys.has(key)) {
        return false
      }
      return true
    })
  }

  return columns
}

export const getLeadsDetailedColumns = (
  canManageLeads: boolean = true,
  options: LeadsColumnOptions = {}
): ColumnDef<Lead>[] => {
  const columns = getLeadsColumns(canManageLeads, false, options)
  const actionColumn = columns.find((column) => column.id === 'actions')
  const baseColumns = columns.filter((column) => column.id !== 'actions')

  if (options.limitedAccess) {
    return [...baseColumns, ...(actionColumn ? [actionColumn] : [])]
  }

  return [...baseColumns, ...(actionColumn ? [actionColumn] : [])]
}

export const leadsColumns = getLeadsColumns(true)
export const leadsDetailedColumns = getLeadsDetailedColumns(true)
