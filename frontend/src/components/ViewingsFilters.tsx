// components/ViewingsFilters.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, Calendar, Users } from 'lucide-react'
import { ViewingFilters, VIEWING_STATUSES } from '@/types/viewing'
import { usersApi } from '@/utils/api'

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface ViewingsFiltersProps {
  filters: ViewingFilters
  setFilters: (filters: ViewingFilters) => void
  showAdvancedFilters: boolean
  setShowAdvancedFilters: (show: boolean) => void
  onClearFilters: () => void
}

export function ViewingsFilters({
  filters,
  setFilters,
  showAdvancedFilters,
  setShowAdvancedFilters,
  onClearFilters
}: ViewingsFiltersProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  // Load agents for agent filter
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true)
      try {
        const data = await usersApi.getAgents()
        if (data.success) {
          setUsers(data.agents)
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  const handleFilterChange = (key: keyof ViewingFilters, value: string | number | undefined) => {
    let newValue = value === '' ? undefined : value
    
    setFilters({
      ...filters,
      [key]: newValue
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && value !== 'All'
  )

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="h-4 w-4 inline mr-1" />
            Search
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search property, lead name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status || 'All'}
            onChange={(e) => handleFilterChange('status', e.target.value === 'All' ? undefined : e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            {VIEWING_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <>
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Agent
              </label>
              <select
                value={filters.agent_id || 'All'}
                onChange={(e) => handleFilterChange('agent_id', e.target.value === 'All' ? undefined : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="All">All Agents</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Clear All Filters</span>
          </button>
        )}
      </div>
    </div>
  )
}

