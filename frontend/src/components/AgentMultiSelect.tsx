'use client'

import { useState, useEffect } from 'react'
import { Users, X, Search, Check } from 'lucide-react'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'

interface Agent {
  id: number
  name: string
  email: string
  user_code: string
  is_assigned: boolean
}

interface AgentMultiSelectProps {
  selectedAgentIds: number[]
  onChange: (agentIds: number[]) => void
  label?: string
  className?: string
}

export function AgentMultiSelect({ 
  selectedAgentIds, 
  onChange, 
  label = "Assigned Agents",
  className = "" 
}: AgentMultiSelectProps) {
  const { token } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Load agents
  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await usersApi.getByRole('agent')
      
      if (response.success && response.data) {
        setAgents(response.data)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
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

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{label}</span>
        </div>
      </label>

      {/* Selected Agents Pills */}
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedAgents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              <span className="font-medium">{agent.user_code}</span>
              <span>-</span>
              <span>{agent.name}</span>
              <button
                type="button"
                onClick={() => removeAgent(agent.id)}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <span className="text-gray-700">
            {selectedAgents.length > 0
              ? `${selectedAgents.length} agent${selectedAgents.length !== 1 ? 's' : ''} selected`
              : 'Select agents...'}
          </span>
          <Users className="h-4 w-4 text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown Content */}
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
              {/* Search Box */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search agents..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Agent List */}
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Loading agents...
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No agents found' : 'No agents available'}
                  </div>
                ) : (
                  filteredAgents.map(agent => {
                    const isSelected = selectedAgentIds.includes(agent.id)
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAgent(agent.id)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{agent.name}</span>
                            <span className="text-xs text-gray-500">({agent.user_code})</span>
                            {agent.is_assigned && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{agent.email}</div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-1">
        {selectedAgents.length === 0
          ? 'Select agents to assign to this team leader'
          : `${selectedAgents.length} agent${selectedAgents.length !== 1 ? 's' : ''} will be assigned to this team leader`}
      </p>
    </div>
  )
}
