// components/ViewingsCard.tsx
'use client'

import { Viewing, VIEWING_STATUSES } from '@/types/viewing'
import { Calendar, Clock, MapPin, User, Eye, Edit, Trash2, Building2, Phone, Star } from 'lucide-react'

interface ViewingsCardProps {
  viewing: Viewing
  onView: (viewing: Viewing) => void
  onEdit: (viewing: Viewing) => void
  onDelete: (viewing: Viewing) => void
  canManageViewings: boolean
  canDeleteViewings: boolean
}

export default function ViewingsCard({ 
  viewing, 
  onView, 
  onEdit, 
  onDelete, 
  canManageViewings,
  canDeleteViewings
}: ViewingsCardProps) {
  const statusInfo = VIEWING_STATUSES.find(s => s.value === viewing.status)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const containerClasses = viewing.is_serious
    ? 'bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-amber-300 ring-1 ring-amber-100 flex flex-col h-full'
    : 'bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 flex flex-col h-full'

  return (
    <div className={containerClasses}>
      {/* Header with Status */}
      <div className={`p-4 border-b ${viewing.is_serious ? 'border-amber-100 bg-amber-50/40' : 'border-gray-200'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {viewing.property_reference}
            </h3>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <p className="line-clamp-1">{viewing.property_location}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {viewing.is_serious && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                Serious
              </span>
            )}
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ 
                backgroundColor: statusInfo?.color ? statusInfo.color + '20' : '#E5E7EB', 
                color: statusInfo?.color || '#6B7280' 
              }}
            >
              {viewing.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1">
        {/* Property Type */}
        {viewing.property_type && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="capitalize">{viewing.property_type}</span>
          </div>
        )}

        {/* Lead Information */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Lead</p>
          <p className="font-medium text-gray-900">{viewing.lead_name}</p>
          {viewing.lead_phone && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Phone className="h-3 w-3 mr-1" />
              <span>{viewing.lead_phone}</span>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center text-sm text-gray-700">
            <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{formatDate(viewing.viewing_date)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <Clock className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{viewing.viewing_time}</span>
          </div>
        </div>

        {/* Agent Information */}
        <div className="flex items-center text-sm text-gray-600 pt-2 border-t border-gray-100">
          <User className="h-4 w-4 mr-2 flex-shrink-0" />
          <div>
            <span>{viewing.agent_name}</span>
            {viewing.agent_role && (
              <span className="text-xs text-gray-500 ml-2 capitalize">
                ({viewing.agent_role.replace('_', ' ')})
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Actions Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex space-x-2">
          <button
            onClick={() => onView(viewing)}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </button>
          
          {canManageViewings && (
            <>
              <button
                onClick={() => onEdit(viewing)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </>
          )}
          {(canManageViewings || canDeleteViewings) && (
            <>
              <button
                onClick={() => onDelete(viewing)}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

