'use client'

import React, { useState, useEffect } from 'react'
import { X, User, UserCircle } from 'lucide-react'
import { Lead } from '@/types/leads'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface Agent {
  id: number
  name: string
  email: string
  role: string
}

interface ReferLeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSuccess?: () => void
}

export function ReferLeadModal({
  isOpen,
  onClose,
  lead,
  onSuccess
}: ReferLeadModalProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [fetchingAgents, setFetchingAgents] = useState(false)
  const { token, user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen && lead) {
      fetchAgents()
    }
  }, [isOpen, lead])

  const fetchAgents = async () => {
    try {
      setFetchingAgents(true)
      const response = await usersApi.getAgents(token)
      if (response.success) {
        // Filter out the current user (can't refer to themselves)
        const filteredAgents = response.agents.filter(
          (agent: Agent) => agent.id !== user?.id
        )
        setAgents(filteredAgents)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      showToast('error', 'Unable to load the list of agents and team leaders. Please refresh the page and try again.')
    } finally {
      setFetchingAgents(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAgentId || !lead) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/leads/${lead.id}/refer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            referred_to_agent_id: selectedAgentId
          })
        }
      )

      const data = await response.json()

      if (response.ok && data.success) {
        const selectedAgent = agents.find(a => a.id === selectedAgentId)
        const agentName = selectedAgent?.name || 'the selected agent'
        showToast('success', `Lead ${lead.customer_name} has been successfully referred to ${agentName}. They will receive a notification and can confirm or reject the referral.`)
        setSelectedAgentId('')
        onSuccess?.()
        onClose()
      } else {
        const errorMessage = data.message || 'An unexpected error occurred while referring the lead. Please try again.'
        showToast('error', errorMessage)
      }
    } catch (error) {
      console.error('Error referring lead:', error)
      showToast('error', 'Failed to refer lead due to a network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !lead) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Refer Lead</h2>
                <p className="text-sm text-gray-500">Refer this lead to an agent or team leader</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Lead Info */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <UserCircle className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{lead.customer_name}</div>
                <div className="text-sm text-gray-500">{lead.phone_number}</div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent or Team Leader
              </label>
              {fetchingAgents ? (
                <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading agents...
                </div>
              ) : (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Choose an agent or team leader...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role === 'team_leader' ? 'Team Leader' : 'Agent'})
                    </option>
                  ))}
                </select>
              )}
              {agents.length === 0 && !fetchingAgents && (
                <p className="mt-2 text-sm text-gray-500">
                  No agents or team leaders available to refer to
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedAgentId || loading || fetchingAgents}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Referring...' : 'Refer Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

