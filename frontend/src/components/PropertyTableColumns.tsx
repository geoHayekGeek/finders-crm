'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Property } from '@/types/property'
import { Eye, Edit, Trash2, Building2, MapPin, User, Calendar, DollarSign } from 'lucide-react'

export const propertyColumns: ColumnDef<Property>[] = [
  {
    accessorKey: 'reference_number',
    header: 'Reference',
    cell: ({ row }) => (
      <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
        {row.getValue('reference_number')}
      </div>
    ),
  },
  {
    accessorKey: 'status_name',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status_name') as string
      const statusColor = row.original.status_color
      return (
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: statusColor }}
        >
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: 'category_name',
    header: 'Category',
    cell: ({ row }) => (
      <div className="flex items-center">
        <Building2 className="h-4 w-4 mr-2 text-blue-500" />
        <span className="text-sm font-medium">{row.getValue('category_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <div className="flex items-center max-w-xs">
        <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
        <span className="text-sm truncate" title={row.getValue('location')}>
          {row.getValue('location')}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'owner_name',
    header: 'Owner',
    cell: ({ row }) => (
      <div className="flex items-center">
        <User className="h-4 w-4 mr-2 text-blue-500" />
        <span className="text-sm font-medium">{row.getValue('owner_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const price = row.getValue('price') as number
      if (!price) return <span className="text-gray-400">On request</span>
      return (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 mr-1 text-green-500" />
          <span className="font-semibold text-green-600">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(price)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'surface',
    header: 'Surface',
    cell: ({ row }) => {
      const surface = row.getValue('surface') as number
      if (!surface) return <span className="text-gray-400">-</span>
      return (
        <div className="text-sm">
          {surface} m²
        </div>
      )
    },
  },
  {
    accessorKey: 'view_type',
    header: 'View',
    cell: ({ row }) => {
      const viewType = row.getValue('view_type') as string
      if (!viewType) return <span className="text-gray-400">-</span>
      return (
        <span className="capitalize text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
          {viewType}
        </span>
      )
    },
  },
  {
    accessorKey: 'concierge',
    header: 'Concierge',
    cell: ({ row }) => {
      const concierge = row.getValue('concierge') as boolean
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          concierge 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {concierge ? 'Yes' : 'No'}
        </span>
      )
    },
  },
  {
    accessorKey: 'agent_name',
    header: 'Agent',
    cell: ({ row }) => {
      const agentName = row.getValue('agent_name') as string
      if (!agentName) return <span className="text-gray-400">Unassigned</span>
      return (
        <div className="text-sm font-medium text-green-700">
          {agentName}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Listed',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-sm text-gray-600">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const property = row.original
      return (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => row.original.onView?.(property)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Property"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => row.original.onEdit?.(property)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Edit Property"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => row.original.onDelete?.(property)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Property"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    },
  },
]

// Extended columns for detailed view
export const propertyDetailedColumns: ColumnDef<Property>[] = [
  ...propertyColumns.slice(0, -1), // All columns except actions
  {
    accessorKey: 'building_name',
    header: 'Building',
    cell: ({ row }) => {
      const buildingName = row.getValue('building_name') as string
      if (!buildingName) return <span className="text-gray-400">-</span>
      return (
        <div className="text-sm font-medium">
          {buildingName}
        </div>
      )
    },
  },
  {
    accessorKey: 'phone_number',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone_number') as string
      if (!phone) return <span className="text-gray-400">-</span>
      return (
        <div className="text-sm text-blue-600">
          {phone}
        </div>
      )
    },
  },
  {
    accessorKey: 'built_year',
    header: 'Built Year',
    cell: ({ row }) => {
      const year = row.getValue('built_year') as number
      if (!year) return <span className="text-gray-400">-</span>
      return (
        <div className="text-sm">
          {year}
        </div>
      )
    },
  },
  {
    accessorKey: 'details',
    header: 'Details',
    cell: ({ row }) => {
      const details = row.getValue('details') as any
      if (!details) return <span className="text-gray-400">-</span>
      return (
        <div className="text-xs space-y-1">
          {details.floor && <div>Floor: {details.floor}</div>}
          {details.balcony !== undefined && <div>Balcony: {details.balcony ? 'Yes' : 'No'}</div>}
          {details.parking !== undefined && <div>Parking: {details.parking}</div>}
          {details.cave !== undefined && <div>Cave: {details.cave ? 'Yes' : 'No'}</div>}
        </div>
      )
    },
  },
  {
    accessorKey: 'referral_source',
    header: 'Referral',
    cell: ({ row }) => {
      const referral = row.getValue('referral_source') as string
      if (!referral) return <span className="text-gray-400">-</span>
      return (
        <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
          {referral}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const property = row.original
      return (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => property.onView?.(property)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Property"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => property.onEdit?.(property)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Edit Property"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => property.onDelete?.(property)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Property"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    },
  },
]
