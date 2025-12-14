'use client'

import { useState } from 'react'
import {
  Building2,
  MapPin,
  Square,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Share2,
  UserPlus
} from 'lucide-react'
import { Property } from '@/types/property'
import { getFullImageUrl } from '@/utils/imageUpload'
import { usePermissions } from '@/contexts/PermissionContext'
import { PropertyShareMenu } from './PropertyShareMenu'
import { ReferPropertyModal } from './ReferPropertyModal'
import { useAuth } from '@/contexts/AuthContext'

interface PropertyCardProps {
  property: Property
  onView: (property: Property) => void
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
}

export function PropertyCard({ property, onView, onEdit, onDelete }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showReferModal, setShowReferModal] = useState(false)
  const { canManageProperties } = usePermissions()
  const { user } = useAuth()
  
  // Check if property is closed (Sold, Rented, or Closed status)
  const isClosed = property.status_name && 
    ['sold', 'rented', 'closed'].includes(property.status_name.toLowerCase())
  
  // Agents and team leaders can only refer properties that are assigned to them (and not closed)
  const canReferProperty = (user?.role === 'agent' || user?.role === 'team_leader') && 
                           property.agent_id === user?.id &&
                           !isClosed
  const formatPrice = (price?: number) => {
    if (!price) return 'Price on request'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Property header with status */}
      <div className="relative">
        <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">
          {property.main_image && !imageError ? (
            <img
              src={getFullImageUrl(property.main_image)}
              alt={`Property ${property.reference_number}`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center">
              <Building2 className="h-16 w-16 text-blue-400 mx-auto mb-2" />
              <div className="text-sm text-blue-600 font-medium">{property.category_name}</div>
            </div>
          )}
        </div>
        
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: property.status_color }}
          >
            {property.status_name}
          </span>
        </div>
        
        {/* Reference number + share + refer */}
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-2">
          <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">
            {property.reference_number}
          </span>
          <div className="flex items-center gap-2">
            {canReferProperty && (
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setShowReferModal(true)
                }}
                className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors text-blue-600 hover:text-blue-700"
                title="Refer property to another agent"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
            <PropertyShareMenu property={property} variant="icon" className="mt-0" />
          </div>
        </div>
      </div>

      {/* Property details */}
      <div className="p-6">
        {/* Location */}
        <div className="flex items-center text-gray-500 mb-3">
          <MapPin className="h-4 w-4 mr-2 text-blue-500" />
          <span className="text-sm font-medium">{property.location}</span>
        </div>
        
        {/* Building name if available */}
        {property.building_name && (
          <div className="text-sm text-gray-600 mb-3">
            <Building2 className="h-4 w-4 inline mr-1" />
            {property.building_name}
          </div>
        )}
        
        {/* Price */}
        <div className="text-2xl font-bold text-green-600 mb-4">
          {formatPrice(property.price)}
        </div>
        
        {/* Property specs */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
          {property.surface && (
            <div className="flex items-center">
              <Square className="h-4 w-4 mr-2 text-blue-500" />
              <span>{property.surface}m²</span>
            </div>
          )}
          {property.built_year && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
              <span>{property.built_year}</span>
            </div>
          )}
          {property.view_type && (
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2 text-blue-500" />
              <span className="capitalize">{property.view_type}</span>
            </div>
          )}
          <div className="flex items-center">
            <div className={`h-4 w-4 mr-2 rounded-full ${property.concierge ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>{property.concierge ? 'Concierge' : 'No Concierge'}</span>
          </div>
        </div>
        
        {/* Created date */}
        <div className="text-xs text-gray-400 mb-4">
          Listed: {formatDate(property.created_at)}
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-2 items-center">
          <button 
            onClick={() => onView(property)}
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </button>
          {canReferProperty && (
            <button 
              onClick={() => setShowReferModal(true)}
              className="px-3 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700 flex items-center gap-2"
              title="Refer property to another agent"
            >
              <UserPlus className="h-4 w-4" />
              <span>Refer</span>
            </button>
          )}
          {canManageProperties && (
            <>
              <button 
                onClick={() => onEdit(property)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onDelete(property)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-red-600 hover:text-red-900"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Refer Property Modal */}
      <ReferPropertyModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        property={property}
        onSuccess={() => {
          // Optionally refresh the property list
        }}
      />
    </div>
  )
}
