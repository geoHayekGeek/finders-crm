'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Users, RefreshCw, User } from 'lucide-react'
import { usersApi } from '@/utils/api'

interface Agent {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface AgentSelectorProps {
  selectedAgentId?: number
  onAgentChange: (agent: Agent | undefined) => void
  placeholder?: string
}

export function AgentSelector({ 
  selectedAgentId, 
  onAgentChange, 
  placeholder = "Select an agent..."
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch agents from database
  const fetchAgents = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching agents...')
      const data = await usersApi.getAgents()
      console.log('👥 Agents data:', data)
      
      if (data.success) {
        setAgents(data.agents)
        console.log('✅ Agents loaded:', data.agents.length)
      } else {
        setError(data.message || 'Failed to load agents')
      }
    } catch (error) {
      console.error('❌ Error fetching agents:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

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

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase()
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      agent.email.toLowerCase().includes(searchLower) ||
      agent.role.toLowerCase().includes(searchLower)
    )
  })

  const handleAgentSelect = (agent: Agent) => {
    onAgentChange(agent)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearAgent = () => {
    onAgentChange(undefined)
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'operations_manager':
        return 'bg-purple-100 text-purple-700'
      case 'agent_manager':
        return 'bg-indigo-100 text-indigo-700'
      case 'agent':
        return 'bg-green-100 text-green-700'
      case 'operations':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-2">
      {/* Display selected agent */}
      {selectedAgentId && selectedAgent && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Users className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-blue-800">
                {selectedAgent.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">{selectedAgent.email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(selectedAgent.role)}`}>
                  {selectedAgent.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearAgent}
            className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear agent"
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
            className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            disabled={isLoading}
          >
            <div className="flex items-center justify-between">
              <span className={selectedAgent ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedAgent ? selectedAgent.name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchAgents}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh agents"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Agents list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading agents...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No agents found matching your search' : 'No agents available'}
                </div>
              ) : (
                <div>
                  {filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleAgentSelect(agent)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
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
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(agent.role)}`}>
                            {agent.role.replace('_', ' ')}
                          </span>
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
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
