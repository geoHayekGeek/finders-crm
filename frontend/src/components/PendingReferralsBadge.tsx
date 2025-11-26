'use client'

import { useState, useEffect } from 'react'
import { UserPlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PendingReferralsModal } from './PendingReferralsModal'

export function PendingReferralsBadge() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const { token, user } = useAuth()

  // Only show for agents and team leaders
  const shouldShow = user?.role === 'agent' || user?.role === 'team_leader'

  useEffect(() => {
    if (!shouldShow) return

    const fetchPendingCount = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/properties/referrals/pending/count`,
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
          setPendingCount(data.count || 0)
        }
      } catch (error) {
        console.error('Error fetching pending referrals count:', error)
      }
    }

    fetchPendingCount()

    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [shouldShow, token])

  if (!shouldShow || pendingCount === 0) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none"
        aria-label="Pending Referrals"
        title={`${pendingCount} pending referral${pendingCount !== 1 ? 's' : ''}`}
      >
        <UserPlus className="h-6 w-6" />
        {/* Badge with count */}
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      </button>

      <PendingReferralsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpdate={() => {
          // Refresh count when referrals are updated
          const fetchPendingCount = async () => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/properties/referrals/pending/count`,
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
                setPendingCount(data.count || 0)
              }
            } catch (error) {
              console.error('Error fetching pending referrals count:', error)
            }
          }
          fetchPendingCount()
        }}
      />
    </>
  )
}

