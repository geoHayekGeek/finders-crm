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
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [allowedAgentIds, setAllowedAgentIds] = useState<number[] | null>(null)
  const [teamAgentsLoading, setTeamAgentsLoading] = useState(false)
  const shouldRestrictByAssignment = isAgentRole(user?.role) || isTeamLeaderRole(user?.role)

  // Fetch buyer leads from database using server-side search
  const fetchLeads = async (search = '') => {
    if (!token) return
    
    setLoading(true)
    try {
      const filters: Record<string, any> = {
        lead_role: 'buyer',
        search: search || undefined
      }

      if (isAgentRole(user?.role) && user?.id) {
        filters.agent_id = user.id
      } else if (isTeamLeaderRole(user?.role)) {
        filters.my_team = true
      }

      const response = await leadsApi.getWithFilters(
        filters,
        token,
        { page: 1, limit: 20 }
      )
      if (response.success) {
        setLeads(response.data)
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadById = async (leadId: number) => {
    if (!token || !leadId) return

    try {
      const response = await leadsApi.getById(leadId, token)
      if (response.success && response.data) {
        setSelectedLeadDetails(response.data)
      }
    } catch (error) {
      console.error('Error fetching selected lead:', error)
    }
  }

  useEffect(() => {
    if (!token || !isDropdownOpen) {
      return
    }

    if (shouldRestrictByAssignment && allowedAgentIds === null) {
      return
    }

    const timeout = setTimeout(() => {
      fetchLeads(searchTerm.trim())
    }, searchTerm.trim() ? 250 : 0)

    return () => clearTimeout(timeout)
  }, [token, isDropdownOpen, searchTerm, allowedAgentIds, shouldRestrictByAssignment])

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

  useEffect(() => {
    if (!token) {
      setSelectedLeadDetails(null)
      return
    }

    if (selectedLeadId === undefined || selectedLeadId === null || selectedLeadId === 0) {
      setSelectedLeadDetails(null)
      return
    }

    const leadInList = leads.find(lead => lead.id === selectedLeadId)
    if (leadInList) {
      setSelectedLeadDetails(leadInList)
      return
    }

    if (selectedLeadDetails?.id !== selectedLeadId) {
      setSelectedLeadDetails(null)
      fetchLeadById(selectedLeadId)
    }
  }, [token, selectedLeadId, leads, selectedLeadDetails?.id])

  const filteredLeads = leads.filter(lead => {
    if (shouldRestrictByAssignment && Array.isArray(allowedAgentIds)) {
      if (!lead.agent_id || !allowedAgentIds.includes(lead.agent_id)) {
        return false
      }
    }

    return true
  })

  const handleSelect = (lead: Lead) => {
    onSelect(lead.id)
    setSelectedLeadDetails(lead)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onSelect(0)
    setSelectedLeadDetails(null)
    setSearchTerm('')
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId) || (
    selectedLeadDetails && selectedLeadDetails.id === selectedLeadId ? selectedLeadDetails : null
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Buyer Lead <span className="text-red-500">*</span>
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
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear buyer lead"
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
            } ${teamAgentsLoading ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
            disabled={loading || teamAgentsLoading}
          >
            <div className="flex items-center justify-between">
              <span className={selectedLead ? "text-gray-900" : "text-gray-600"}>
                {loading ? 'Loading...' : (selectedLead ? selectedLead.customer_name : 'Select a buyer lead...')}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => fetchLeads(searchTerm.trim())}
            disabled={loading || teamAgentsLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh buyers"
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
                placeholder="Search buyers..."
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
                  Loading buyers...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No buyers found matching your search' : 'No buyers available'}
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
                        <div className="ml-3 flex items-center">
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

