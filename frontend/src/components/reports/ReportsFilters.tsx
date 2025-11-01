'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { ReportFilters as ReportFiltersType } from '@/types/reports'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { User } from '@/types/user'

interface ReportsFiltersProps {
  filters: ReportFiltersType
  setFilters: (filters: ReportFiltersType) => void
  onClearFilters: () => void
}

export default function ReportsFilters({
  filters,
  setFilters,
  onClearFilters
}: ReportsFiltersProps) {
  const { token } = useAuth()
  const [agents, setAgents] = useState<User[]>([])

  // Load agents
  useEffect(() => {
    if (token) {
      loadAgents()
    }
  }, [token])

  const loadAgents = async () => {
    try {
      const response = await usersApi.getAll(token)
      if (response.success) {
        // Filter to only show agents and team leaders
        const agentsList = response.users.filter(
          (u: User) => u.role === 'agent' || u.role === 'team_leader'
        )
        setAgents(agentsList)
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

  // Generate month/year options
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent
          </label>
          <select
            value={filters.agent_id || ''}
            onChange={(e) => handleFilterChange('agent_id', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Month
          </label>
          <select
            value={filters.month || ''}
            onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Months</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year
          </label>
          <select
            value={filters.year || ''}
            onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
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
          {filters.month && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Month: {months.find(m => m.value === filters.month)?.label || filters.month}
              <button
                onClick={() => handleFilterChange('month', undefined)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.year && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Year: {filters.year}
              <button
                onClick={() => handleFilterChange('year', undefined)}
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

