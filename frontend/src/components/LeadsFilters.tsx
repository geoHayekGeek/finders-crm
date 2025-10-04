'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRole } from '@/utils/roleFormatter'
import { Search, Filter, X, ChevronDown, Calendar, Users, Tag } from 'lucide-react'
import { LeadFilters, LEAD_STATUSES, ReferenceSource } from '@/types/leads'
import { usersApi } from '@/utils/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface LeadsFiltersProps {
  filters: LeadFilters
  setFilters: (filters: LeadFilters) => void
  showAdvancedFilters: boolean
  setShowAdvancedFilters: (show: boolean) => void
  onClearFilters: () => void
}

export function LeadsFilters({
  filters,
  setFilters,
  showAdvancedFilters,
  setShowAdvancedFilters,
  onClearFilters
}: LeadsFiltersProps) {
  const [users, setUsers] = useState<User[]>([])
  const [referenceSources, setReferenceSources] = useState<ReferenceSource[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRefSources, setLoadingRefSources] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

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

  // Load reference sources for reference source filter
  useEffect(() => {
    const fetchReferenceSources = async () => {
      setLoadingRefSources(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:10000/api/leads/reference-sources', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setReferenceSources(data.data)
          }
        }
      } catch (error) {
        console.error('Error fetching reference sources:', error)
      } finally {
        setLoadingRefSources(false)
      }
    }

    fetchReferenceSources()
  }, [])

  const handleFilterChange = (key: keyof LeadFilters, value: string | number | undefined) => {
    // For date inputs, ensure we handle empty strings properly
    let newValue = value === '' ? undefined : value
    
    // For date inputs, ensure the value is a valid date string or undefined
    if ((key === 'date_from' || key === 'date_to') && newValue) {
      // Validate that it's a proper date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newValue as string)) {
        newValue = undefined
      } else {
        // Check if the date is too far in the future (more than 1 year)
        const selectedDate = new Date(newValue as string)
        const today = new Date()
        const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
        
        if (selectedDate > oneYearFromNow) {
          console.warn('Cannot select dates more than 1 year in the future:', newValue)
          // Reset to undefined to prevent selecting dates too far in the future
          newValue = undefined
          // You could show a toast notification here
          // toast.error('Cannot select dates more than 1 year in the future')
        }
      }
    }
    
    console.log('🔍 [LeadsFilters] Filter change:', { key, value, newValue })
    setFilters({
      ...filters,
      [key]: newValue
    });
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    value !== undefined && value !== null && value !== '' && value !== 0
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Basic Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search - Takes 50% width */}
        <div className="w-full lg:w-1/2">
          <div className="relative input-with-icon">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status Filter and Advanced Filters - Takes 50% width */}
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-0">
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
                showAdvancedFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear all filters"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div ref={filtersRef} className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Start date"
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                title="Cannot select dates more than 1 year in the future"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="End date"
                min={filters.date_from || undefined}
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                title="Cannot select dates more than 1 year in the future"
              />
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Agent
              </label>
              <select
                value={filters.agent_id || ''}
                onChange={(e) => handleFilterChange('agent_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={loading}
              >
                <option value="">All Agents</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({formatRole(user.role)})
                      </option>
                    ))}
              </select>
            </div>

            {/* Reference Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Reference Source
              </label>
              <select
                value={filters.reference_source_id || ''}
                onChange={(e) => handleFilterChange('reference_source_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={loadingRefSources}
              >
                <option value="">All Reference Sources</option>
                {referenceSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.source_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.search && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Search: "{filters.search}"
                    <button
                      onClick={() => handleFilterChange('search', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Status: {LEAD_STATUSES.find(s => s.value === filters.status)?.label}
                    <button
                      onClick={() => handleFilterChange('status', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.agent_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Agent: {users.find(u => u.id === filters.agent_id)?.name}
                    <button
                      onClick={() => handleFilterChange('agent_id', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.date_from && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    From: {filters.date_from}
                    <button
                      onClick={() => handleFilterChange('date_from', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.date_to && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    To: {filters.date_to}
                    <button
                      onClick={() => handleFilterChange('date_to', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.reference_source_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Reference Source: {referenceSources.find(rs => rs.id === filters.reference_source_id)?.source_name}
                    <button
                      onClick={() => handleFilterChange('reference_source_id', undefined)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
