// components/LeadSelectorForViewings.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, UserCircle2, RefreshCw, Phone } from 'lucide-react'
import { leadsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'
import { Lead } from '@/types/leads'

interface LeadSelectorProps {
  selectedLeadId?: number
  onSelect: (leadId: number) => void
  error?: string
}

export default function LeadSelectorForViewings({ selectedLeadId, onSelect, error }: LeadSelectorProps) {
  const { token, user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [allowedAgentIds, setAllowedAgentIds] = useState<number[] | null>(null)
  const [teamAgentsLoading, setTeamAgentsLoading] = useState(false)

  // Fetch leads from database
  const fetchLeads = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const response = await leadsApi.getAll(token)
      if (response.success) {
        setLeads(response.data)
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchLeads()
    }
  }, [token])

  useEffect(() => {
    if (!user?.id) {
      setAllowedAgentIds(null)
      return
    }

    if (isAgentRole(user.role)) {
      setAllowedAgentIds([user.id])
      return
    }

    if (isTeamLeaderRole(user.role)) {
      if (!token) {
        setAllowedAgentIds([user.id])
        return
      }

      setTeamAgentsLoading(true)
      ;(async () => {
        try {
          const response = await usersApi.getTeamLeaderAgents(user.id, token)
          if (response.success && Array.isArray(response.agents)) {
            const agentIds = response.agents.map((agent: any) => agent.id).filter((id: any) => typeof id === 'number')
            setAllowedAgentIds([user.id, ...agentIds])
          } else {
            setAllowedAgentIds([user.id])
          }
        } catch (error) {
          console.error('Error loading team leader agents:', error)
          setAllowedAgentIds([user.id])
        } finally {
          setTeamAgentsLoading(false)
        }
      })()
      return
    }

    setAllowedAgentIds(null)
  }, [user?.id, user?.role, token])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const shouldRestrictByAssignment = isAgentRole(user?.role) || isTeamLeaderRole(user?.role)

  const filteredLeads = leads.filter(lead => {
    if (shouldRestrictByAssignment && Array.isArray(allowedAgentIds)) {
      if (!lead.agent_id || !allowedAgentIds.includes(lead.agent_id)) {
        return false
      }
    }

    const searchLower = searchTerm.toLowerCase()
    return (
      lead.customer_name.toLowerCase().includes(searchLower) ||
      lead.status.toLowerCase().includes(searchLower) ||
      (lead.phone_number && lead.phone_number.toLowerCase().includes(searchLower))
    )
  })

  const handleSelect = (lead: Lead) => {
    onSelect(lead.id)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onSelect(0)
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-700'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-700'
      case 'qualified':
        return 'bg-purple-100 text-purple-700'
      case 'converted':
        return 'bg-green-100 text-green-700'
      case 'lost':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Lead <span className="text-red-500">*</span>
      </label>

      {/* Display selected lead */}
      {selectedLeadId && selectedLead && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <UserCircle2 className="h-4 w-4 text-purple-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-800">
                {selectedLead.customer_name}
              </span>
              <div className="flex items-center gap-2">
                {selectedLead.phone_number && (
                  <span className="text-xs text-purple-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedLead.phone_number}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedLead.status)}`}>
                  {selectedLead.status}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear lead"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropdown selector */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex-1 px-4 py-3 text-left border rounded-lg hover:border-purple-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            <div className="flex items-center justify-between">
              <span className={selectedLead ? "text-gray-900" : "text-gray-600"}>
                {loading ? 'Loading...' : (selectedLead ? selectedLead.customer_name : 'Select a lead...')}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchLeads}
            disabled={loading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh leads"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Leads list */}
            <div className="max-h-48 overflow-y-auto">
              {loading || teamAgentsLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                  Loading leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No leads found matching your search' : 'No leads available'}
                </div>
              ) : (
                <div>
                  {filteredLeads.map(lead => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => handleSelect(lead)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{lead.customer_name}</div>
                          {lead.phone_number && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone_number}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <UserCircle2 className="h-4 w-4 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

