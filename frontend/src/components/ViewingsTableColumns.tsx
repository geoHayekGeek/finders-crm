// components/ViewingsTableColumns.tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Viewing, VIEWING_STATUSES } from '@/types/viewing'
import { Eye, Edit, Trash2 } from 'lucide-react'

export const getViewingsColumns = (
  canManageViewings: boolean,
  canDeleteViewings: boolean
): ColumnDef<Viewing>[] => {
  const columns: ColumnDef<Viewing>[] = [
    {
      accessorKey: 'viewing_date',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.original.viewing_date)
        return (
          <span className="font-medium">
            {date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        )
      }
    },
    {
      accessorKey: 'viewing_time',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-gray-900">{row.original.viewing_time}</span>
      )
    },
    {
      accessorKey: 'property_reference',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.property_reference}</p>
          <p className="text-sm text-gray-500">{row.original.property_location}</p>
          <p className="text-xs text-gray-400 capitalize">{row.original.property_type}</p>
        </div>
      )
    },
    {
      accessorKey: 'lead_name',
      header: 'Lead',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.lead_name}</p>
          {row.original.lead_phone && (
            <p className="text-sm text-gray-500">{row.original.lead_phone}</p>
          )}
        </div>
      )
    },
    {
      accessorKey: 'agent_name',
      header: 'Agent',
      cell: ({ row }) => (
        <div>
          <p className="text-gray-900">{row.original.agent_name}</p>
          {row.original.agent_role && (
            <p className="text-xs text-gray-500 capitalize">{row.original.agent_role.replace('_', ' ')}</p>
          )}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusInfo = VIEWING_STATUSES.find(s => s.value === row.original.status)
        const statusColors: Record<string, string> = {
          'Scheduled': 'bg-blue-100 text-blue-800',
          'Completed': 'bg-green-100 text-green-800',
          'Cancelled': 'bg-red-100 text-red-800',
          'No Show': 'bg-orange-100 text-orange-800',
          'Rescheduled': 'bg-purple-100 text-purple-800'
        }
        
        return (
          <span 
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.original.status] || 'bg-gray-100 text-gray-800'}`}
          >
            {row.original.status}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={() => row.original.onView?.(row.original)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </button>
          
          {canManageViewings && (
            <>
              <button
                onClick={() => row.original.onEdit?.(row.original)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Edit Viewing"
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
            </>
          )}
          {(canManageViewings || canDeleteViewings) && (
            <button
              onClick={() => row.original.onDelete?.(row.original)}
              className="p-1 hover:bg-red-50 rounded transition-colors"
              title="Delete Viewing"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      )
    }
  ]

  return columns
}

export const getViewingsDetailedColumns = (
  canManageViewings: boolean,
  canDeleteViewings: boolean
): ColumnDef<Viewing>[] => {
  return getViewingsColumns(canManageViewings, canDeleteViewings)
}

