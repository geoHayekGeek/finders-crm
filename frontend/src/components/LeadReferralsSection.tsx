'use client'

import React, { useState } from 'react'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { LeadReferral } from '@/types/leads'
import { X, Plus, UserPlus } from 'lucide-react'

interface Agent {
  id: number
  name: string
}

interface LeadReferralsSectionProps {
  leadId?: number
  referrals?: LeadReferral[]
  isLoading?: boolean
  canEdit?: boolean
  agents?: Agent[]
  onAddReferral?: (agentId: number, referralDate: string) => Promise<void>
  onDeleteReferral?: (referralId: number) => Promise<void>
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`
  }
}

export function LeadReferralsSection({ 
  leadId,
  referrals, 
  isLoading, 
  canEdit = false,
  agents = [],
  onAddReferral,
  onDeleteReferral
}: LeadReferralsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<number | ''>('')
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0])
  const [isAdding, setIsAdding] = useState(false)

  const handleAddReferral = async () => {
    if (!selectedAgentId || !onAddReferral) return
    
    setIsAdding(true)
    try {
      await onAddReferral(selectedAgentId as number, referralDate)
      setShowAddForm(false)
      setSelectedAgentId('')
      setReferralDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      console.error('Error adding referral:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [referralToDelete, setReferralToDelete] = useState<number | null>(null)

  const handleDeleteReferral = async (referralId: number) => {
    if (!onDeleteReferral) return
    
    setReferralToDelete(referralId)
    setShowDeleteModal(true)
  }

  const confirmDeleteReferral = async () => {
    if (!onDeleteReferral || !referralToDelete) return
    
    try {
      await onDeleteReferral(referralToDelete)
      setShowDeleteModal(false)
      setReferralToDelete(null)
    } catch (error) {
      console.error('Error deleting referral:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Referral History</h4>
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">
          Referral History ({referrals?.length || 0})
        </h4>
        {canEdit && onAddReferral && agents.length > 0 && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Referral
          </button>
        )}
      </div>

      {/* Add Referral Form */}
      {showAddForm && canEdit && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Date
              </label>
              <input
                type="date"
                value={referralDate}
                onChange={(e) => setReferralDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddReferral}
                disabled={!selectedAgentId || isAdding}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedAgentId('')
                  setReferralDate(new Date().toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referrals List */}
      {(!referrals || referrals.length === 0) ? (
        <div className="text-sm text-gray-500 italic">
          No referral history available
        </div>
      ) : (
        <div className="space-y-2">
        {referrals.map((referral, index) => {
          const referralDate = new Date(referral.referral_date)
          // Only confirmed referrals (not pending/rejected) can be "current" and earn commission
          const isConfirmed = referral.status === 'confirmed' || (!referral.status && referral.external !== undefined)
          const isPending = referral.status === 'pending'
          const isRejected = referral.status === 'rejected'
          // Get the most recent confirmed referral to mark as "current"
          const confirmedReferrals = referrals.filter(r => r.status === 'confirmed' || (!r.status && r.external !== undefined))
          const mostRecentConfirmed = confirmedReferrals.length > 0 ? confirmedReferrals[0] : null
          const isCurrent = isConfirmed && mostRecentConfirmed && referral.id === mostRecentConfirmed.id
          
          return (
            <div
              key={referral.id || index}
              className={`p-3 rounded-lg border ${
                isCurrent
                  ? 'border-blue-200 bg-blue-50'
                  : isPending
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {referral.agent_name || referral.name}
                    </span>
                    {isPending && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Pending
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Current
                      </span>
                    )}
                    {referral.external && isConfirmed && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        External
                      </span>
                    )}
                    {!referral.external && isConfirmed && !isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Internal
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Referred {formatRelativeTime(referralDate)}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {referralDate.toLocaleDateString()} at {referralDate.toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Commission Status Indicator & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPending || isRejected || referral.external ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>No Commission</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Earns Commission</span>
                    </div>
                  )}
                  
                  {/* Delete Button */}
                  {canEdit && onDeleteReferral && (
                    <button
                      onClick={() => handleDeleteReferral(referral.id!)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete referral"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Additional info for external referrals */}
              {referral.external && isConfirmed && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This referral was marked as external because the lead was reassigned after 1 month.
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      )}
      
      {/* Summary */}
      {referrals && referrals.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-700">
            <strong>Commission Summary:</strong>
            {' '}
            {referrals.filter(r => {
              const isConfirmed = r.status === 'confirmed' || (!r.status && r.external !== undefined)
              return isConfirmed && !r.external
            }).length} agent(s) earning commission,
            {' '}
            {referrals.filter(r => {
              const isConfirmed = r.status === 'confirmed' || (!r.status && r.external !== undefined)
              return isConfirmed && r.external
            }).length} external referral(s)
            {referrals.filter(r => r.status === 'pending').length > 0 && (
              <>
                {', '}
                {referrals.filter(r => r.status === 'pending').length} pending referral(s)
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setReferralToDelete(null)
        }}
        onConfirm={confirmDeleteReferral}
        title="Delete Referral"
        message="Are you sure you want to delete this referral? This action cannot be undone."
        confirmText="Delete Referral"
        variant="danger"
      />
    </div>
  )
}

