'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, X, Check, ChevronDown, RefreshCw, User } from 'lucide-react'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'

interface Agent {
  id: number
  name: string
  email: string
  user_code: string
  role: string
  location?: string
  is_assigned: boolean
}

interface AgentMultiSelectProps {
  selectedAgentIds: number[]
  onChange: (agentIds: number[]) => void
  label?: string
  className?: string
  teamLeaderId?: number // Optional: Filter to show only available agents for this team leader
}

export function AgentMultiSelect({ 
  selectedAgentIds, 
  onChange, 
  label = "Assigned Agents",
  className = "",
  teamLeaderId
}: AgentMultiSelectProps) {
  const { token } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load agents
  useEffect(() => {
    if (token) {
      loadAgents()
    }
  }, [token, teamLeaderId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadAgents = async () => {
    if (!token) {
      console.error('No authentication token available for loading agents')
      return
    }
    
    try {
      setLoading(true)
      console.log('🔍 Loading agents with token...', teamLeaderId ? `for team leader ${teamLeaderId}` : 'for new team leader')
      const response = await usersApi.getByRole('agent', token, teamLeaderId, true) // forAssignment=true
      console.log('👥 Agents response:', response)
      
      if (response.success && response.data) {
        setAgents(response.data)
        console.log('✅ Loaded agents:', response.data.length)
        if (teamLeaderId) {
          console.log('✅ Filtered for team leader:', teamLeaderId, '- showing unassigned agents + agents assigned to this team leader')
        } else {
          console.log('✅ Showing only unassigned agents (new team leader)')
        }
      }
    } catch (error) {
      console.error('❌ Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.user_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedAgents = agents.filter(agent => 
    selectedAgentIds.includes(agent.id)
  )

  const toggleAgent = (agentId: number) => {
    if (selectedAgentIds.includes(agentId)) {
      onChange(selectedAgentIds.filter(id => id !== agentId))
    } else {
      onChange([...selectedAgentIds, agentId])
    }
  }

  const removeAgent = (agentId: number) => {
    onChange(selectedAgentIds.filter(id => id !== agentId))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      case 'operations manager':
        return 'bg-red-100 text-red-700'
      case 'agent manager':
        return 'bg-indigo-100 text-indigo-700'
      case 'team_leader':
        return 'bg-blue-100 text-blue-700'
      case 'agent':
        return 'bg-green-100 text-green-700'
      case 'operations':
        return 'bg-orange-100 text-orange-700'
      case 'accountant':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{label}</span>
        </div>
      </label>

      {/* Display selected agents as badges */}
      {selectedAgents.length > 0 && (
        <div className="space-y-2 mb-2">
          {selectedAgents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-800">
                    {agent.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600">{agent.email}</span>
                    {agent.role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(agent.role)}`}>
                        {agent.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAgent(agent.id)}
                className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove agent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown selector */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            disabled={loading}
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {loading ? 'Loading...' : (
                  selectedAgents.length > 0
                    ? `${selectedAgents.length} agent${selectedAgents.length !== 1 ? 's' : ''} selected`
                    : 'Select agents...'
                )}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={loadAgents}
            disabled={loading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh agents"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Agents list */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading agents...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No agents found matching your search' : 'No agents available'}
                </div>
              ) : (
                <div>
                  {filteredAgents.map(agent => {
                    const isSelected = selectedAgentIds.includes(agent.id)
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAgent(agent.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{agent.name}</div>
                            <div className="text-xs text-gray-600">{agent.email}</div>
                            {agent.location && (
                              <div className="text-xs text-gray-500">{agent.location}</div>
                            )}
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            {agent.role && (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(agent.role)}`}>
                                {agent.role.replace('_', ' ')}
                              </span>
                            )}
                            {isSelected ? (
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-2">
        {selectedAgents.length === 0
          ? 'Select agents to assign to this team leader'
          : `${selectedAgents.length} agent${selectedAgents.length !== 1 ? 's' : ''} will be assigned to this team leader`}
      </p>
    </div>
  )
}
