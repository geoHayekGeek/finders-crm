'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Star,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Phone,
  User,
  Share2,
  MessageCircle,
  Link as LinkIcon,
  Instagram,
  Mail,
  Send
} from 'lucide-react'
import { Property } from '@/types/property'
import { getFullImageUrl } from '@/utils/imageUpload'
import { usePermissions } from '@/contexts/PermissionContext'

interface PropertyCardProps {
  property: Property
  onView: (property: Property) => void
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
}

export function PropertyCard({ property, onView, onEdit, onDelete }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const { canManageProperties } = usePermissions()
  const shareLink = property.property_url?.trim()
  const shareMessage = `Check out property ${property.reference_number} in ${property.location}`
  const canUseNativeShare = typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!isShareOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isShareOpen])

  useEffect(() => {
    if (!shareFeedback) return
    const timeout = setTimeout(() => setShareFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [shareFeedback])

  useEffect(() => {
    if (!isShareOpen) {
      setShareFeedback(null)
    }
  }, [isShareOpen])

  const handleCopyLink = async () => {
    if (!shareLink) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareLink}`)
        setShareFeedback('Link copied to clipboard')
      } else {
        setShareFeedback('Copy is unavailable in this browser')
      }
    } catch (error) {
      console.error('Failed to copy link', error)
      setShareFeedback('Unable to copy link')
    }
  }

  const handleNativeShare = async () => {
    if (!shareLink || !navigator.share) return
    try {
      await navigator.share({
        title: 'Property from Finders CRM',
        text: shareMessage,
        url: shareLink
      })
      setIsShareOpen(false)
    } catch (error) {
      console.error('Native share cancelled', error)
    }
  }

  const handleShareOption = async (option: 'whatsapp' | 'instagram' | 'email' | 'copy' | 'more') => {
    if (!shareLink) return
    const encodedMessage = encodeURIComponent(`${shareMessage}\n${shareLink}`)

    switch (option) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank', 'noopener')
        setIsShareOpen(false)
        return
      case 'instagram':
        await handleCopyLink()
        window.open('https://www.instagram.com/direct/new/', '_blank', 'noopener')
        setIsShareOpen(false)
        return
      case 'email':
        window.open(`mailto:?subject=Property%20${encodeURIComponent(property.reference_number)}&body=${encodedMessage}`, '_self')
        setIsShareOpen(false)
        return
      case 'copy':
        await handleCopyLink()
        return
      case 'more':
        await handleNativeShare()
        return
      default:
        return
    }
  }
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
        
        {/* Reference number + share */}
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-2">
          <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">
            {property.reference_number}
          </span>
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => shareLink && setIsShareOpen((prev) => !prev)}
              disabled={!shareLink}
              aria-label="Share property link"
              className={`inline-flex items-center justify-center rounded-full border transition-colors ${
                shareLink
                  ? 'border-purple-200 text-purple-600 hover:bg-purple-50 h-8 w-8 bg-white shadow-sm'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed h-8 w-8 bg-gray-50'
              }`}
            >
              <Share2 className="h-4 w-4" />
            </button>
            {isShareOpen && shareLink && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-100 bg-white shadow-xl p-3 space-y-1">
                <p className="text-xs text-gray-500 px-1">
                  Share <span className="font-semibold">{property.reference_number}</span> with clients
                </p>
                <button
                  onClick={() => handleShareOption('whatsapp')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 text-left"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">WhatsApp</div>
                    <div className="text-xs text-gray-500">Send via WhatsApp</div>
                  </div>
                </button>
                <button
                  onClick={() => handleShareOption('instagram')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-50 text-left"
                >
                  <Instagram className="h-4 w-4 text-pink-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Instagram</div>
                    <div className="text-xs text-gray-500">Copy link & open IG Direct</div>
                  </div>
                </button>
                <button
                  onClick={() => handleShareOption('email')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-left"
                >
                  <Mail className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Email</div>
                    <div className="text-xs text-gray-500">Send as email update</div>
                  </div>
                </button>
                <button
                  onClick={() => handleShareOption('copy')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                >
                  <LinkIcon className="h-4 w-4 text-gray-700" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Copy link</div>
                    <div className="text-xs text-gray-500">Perfect for Instagram or SMS</div>
                  </div>
                </button>
                {canUseNativeShare && (
                  <button
                    onClick={() => handleShareOption('more')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-left"
                  >
                    <Send className="h-4 w-4 text-indigo-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">More options</div>
                      <div className="text-xs text-gray-500">Open device share sheet</div>
                    </div>
                  </button>
                )}
                {shareFeedback && (
                  <div className="px-2 py-1 text-xs text-green-600 bg-green-50 rounded-lg">
                    {shareFeedback}
                  </div>
                )}
              </div>
            )}
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
    </div>
  )
}
