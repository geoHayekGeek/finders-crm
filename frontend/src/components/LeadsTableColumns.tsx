'use client'

import { Lead, LEAD_STATUSES } from '@/types/leads'
import { Eye, Edit3, Trash2, Phone, Calendar, User } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { formatDateForDisplay } from '@/utils/dateUtils'

export const leadsColumns: ColumnDef<Lead>[] = [
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
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => lead.onView?.(lead)}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="View lead"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => lead.onEdit?.(lead)}
            className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
            title="Edit lead"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => lead.onDelete?.(lead)}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            title="Delete lead"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  }
]

export const leadsDetailedColumns: ColumnDef<Lead>[] = [
  ...leadsColumns.slice(0, -1), // All columns except actions
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => {
      const lead = row.original
      return (
        <div className="text-sm text-gray-600 max-w-xs">
          {lead.notes ? (
            <span className="line-clamp-2">{lead.notes}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    }
  },
  leadsColumns[leadsColumns.length - 1] // Actions column
]
