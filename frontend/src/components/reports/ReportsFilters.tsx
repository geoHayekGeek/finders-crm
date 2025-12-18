'use client'

import { useState, useEffect, useMemo } from 'react'
import { Filter, X, CalendarRange, Sparkles } from 'lucide-react'
import { ReportFilters as ReportFiltersType } from '@/types/reports'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { User } from '@/types/user'

interface ReportsFiltersProps {
  filters: ReportFiltersType
  setFilters: (filters: ReportFiltersType) => void
  onClearFilters: () => void
  agentFilterDisabled?: boolean
  lockedAgentId?: number
}

export default function ReportsFilters({
  filters,
  setFilters,
  onClearFilters,
  agentFilterDisabled = false,
  lockedAgentId
}: ReportsFiltersProps) {
  const { token, user } = useAuth()
  const { role } = usePermissions()
  const [agents, setAgents] = useState<User[]>([])

  // Load agents
  useEffect(() => {
    if (token) {
      loadAgents()
    }
  }, [token, role, user?.id])

  const loadAgents = async () => {
    if (!token) return

    try {
      // If user is a team leader, load only their team agents + themselves
      if (role === 'team_leader' && user?.id) {
        const response = await usersApi.getTeamLeaderAgents(user.id, token)
        if (response.success) {
          // Include the team leader themselves in the list
          const teamAgents = response.agents || []
          // Add team leader to the list if not already included
          const allAgents = [
            { id: user.id, name: user.name, user_code: user.user_code, role: 'team_leader' } as User,
            ...teamAgents
          ]
          // Remove duplicates based on ID
          const uniqueAgents = allAgents.filter((agent, index, self) =>
            index === self.findIndex(a => a.id === agent.id)
          )
          setAgents(uniqueAgents)
        }
      } else {
        // For other roles, load all agents and team leaders
        const response = await usersApi.getAll(token)
        if (response.success) {
          // Filter to only show agents and team leaders
          const agentsList = response.users.filter(
            (u: User) => u.role === 'agent' || u.role === 'team_leader'
          )
          setAgents(agentsList)
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const handleFilterChange = (key: keyof ReportFiltersType, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(
    value => value !== undefined && value !== null && value !== ''
  )

  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  const formatRangeLabel = () => {
    if (!filters.start_date && !filters.end_date) return null

    const start = filters.start_date
      ? rangeFormatter.format(new Date(filters.start_date))
      : 'Start'
    const end = filters.end_date
      ? rangeFormatter.format(new Date(filters.end_date))
      : 'End'

    return `${start} → ${end}`
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-300 transition-colors">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Focus on an agent
          </label>
          <select
            value={lockedAgentId ?? filters.agent_id ?? ''}
            onChange={(e) => handleFilterChange('agent_id', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
            disabled={agentFilterDisabled || !!lockedAgentId}
          >
            <option value="">All Agents</option>
            {(lockedAgentId ? agents.filter(agent => agent.id === lockedAgentId) : agents).map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
              </option>
            ))}
            {lockedAgentId && !agents.find(agent => agent.id === lockedAgentId) && (
              <option value={lockedAgentId}>
                Agent #{lockedAgentId}
              </option>
            )}
          </select>
        </div>

        {/* Date Range */}
        <div className="lg:col-span-2 bg-blue-50/70 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Reporting window
          </label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              max={filters.end_date || undefined}
            />
            <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
              —
            </div>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              min={filters.start_date || undefined}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.agent_id && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Agent: {agents.find(a => a.id === filters.agent_id)?.name || filters.agent_id}
              <button
                onClick={() => handleFilterChange('agent_id', undefined)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(filters.start_date || filters.end_date) && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Range: {formatRangeLabel()}
              <button
                onClick={() => {
                  handleFilterChange('start_date', undefined)
                  handleFilterChange('end_date', undefined)
                }}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

