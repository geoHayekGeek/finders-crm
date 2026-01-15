'use client'

import React, { useState, useEffect } from 'react'
import { X, Check, XCircle, Building2, MapPin, User, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getFullImageUrl } from '@/utils/imageUpload'
import { normalizeRole } from '@/utils/roleUtils'

interface PendingReferral {
  id: number
  property_id: number
  status: string
  date: string
  created_at: string
  referred_by_user_id: number
  referred_by_name: string
  referred_by_role: string
  reference_number: string
  location: string
  property_type: string
  price: number
  status_id: number
  status_name: string
  status_color: string
  main_image?: string
  category_name: string
}

interface PendingReferralsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export function PendingReferralsModal({
  isOpen,
  onClose,
  onUpdate
}: PendingReferralsModalProps) {
  const [referrals, setReferrals] = useState<PendingReferral[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<number | null>(null)
  const { token } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchPendingReferrals()
    }
  }, [isOpen])

  const fetchPendingReferrals = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/properties/referrals/pending`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          }
        }
      )

      const data = await response.json()
      if (data.success) {
        setReferrals(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching pending referrals:', error)
      showToast('error', 'Unable to load your pending property referrals. Please refresh the page and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (referralId: number) => {
    try {
      setProcessing(referralId)
      const response = await fetch(
        `${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/properties/referrals/${referralId}/confirm`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          }
        }
      )

      const data = await response.json()
      if (response.ok && data.success) {
        const referral = referrals.find(r => r.id === referralId)
        const propertyRef = referral?.reference_number || 'the property'
        showToast('success', `Referral confirmed successfully! Property ${propertyRef} has been assigned to you. You can now manage this property.`)
        fetchPendingReferrals()
        onUpdate?.()
      } else {
        const errorMessage = data.message || 'An error occurred while confirming the referral. Please try again.'
        showToast('error', errorMessage)
      }
    } catch (error) {
      console.error('Error confirming referral:', error)
      showToast('error', 'Failed to confirm the referral due to a network error. Please check your connection and try again.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (referralId: number) => {
    try {
      setProcessing(referralId)
      const response = await fetch(
        `${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/properties/referrals/${referralId}/reject`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          }
        }
      )

      const data = await response.json()
      if (response.ok && data.success) {
        const referral = referrals.find(r => r.id === referralId)
        const propertyRef = referral?.reference_number || 'the property'
        showToast('success', `Referral rejected. The referrer has been notified that you declined the referral for property ${propertyRef}.`)
        fetchPendingReferrals()
        onUpdate?.()
      } else {
        const errorMessage = data.message || 'An error occurred while rejecting the referral. Please try again.'
        showToast('error', errorMessage)
      }
    } catch (error) {
      console.error('Error rejecting referral:', error)
      showToast('error', 'Failed to reject the referral due to a network error. Please check your connection and try again.')
    } finally {
      setProcessing(null)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pending Referrals</h2>
                <p className="text-sm text-gray-500">
                  {referrals.length} referral{referrals.length !== 1 ? 's' : ''} awaiting your confirmation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading referrals...</p>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending referrals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Property Image */}
                      <div className="flex-shrink-0">
                        {referral.main_image ? (
                          <img
                            src={getFullImageUrl(referral.main_image)}
                            alt={referral.reference_number}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {referral.reference_number}
                              </span>
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: referral.status_color }}
                              >
                                {referral.status_name}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              {referral.location}
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatPrice(referral.price)}
                            </div>
                          </div>
                        </div>

                        {/* Referred By */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-1" />
                            <span>
                              Referred by <span className="font-medium text-gray-900">{referral.referred_by_name}</span>
                              {' '}({normalizeRole(referral.referred_by_role) === 'team leader' ? 'Team Leader' : 'Agent'})
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(referral.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <button
                          onClick={() => handleConfirm(referral.id)}
                          disabled={processing === referral.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Check className="h-4 w-4" />
                          {processing === referral.id ? 'Confirming...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => handleReject(referral.id)}
                          disabled={processing === referral.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          {processing === referral.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

