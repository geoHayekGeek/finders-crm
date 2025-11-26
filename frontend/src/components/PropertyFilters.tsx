'use client'

import { Search, Filter, X } from 'lucide-react'
import { PropertyFilters as PropertyFiltersType, Category, Status } from '@/types/property'

interface Agent {
  id: number
  name: string
  email: string
  role: string
}

interface PropertyFiltersProps {
  filters: PropertyFiltersType
  setFilters: (filters: PropertyFiltersType) => void
  categories: Category[]
  statuses: Status[]
  agents?: Agent[]
  showAdvancedFilters: boolean
  setShowAdvancedFilters: (show: boolean) => void
  onClearFilters: () => void
}

export function PropertyFilters({
  filters,
  setFilters,
  categories,
  statuses,
  agents = [],
  showAdvancedFilters,
  setShowAdvancedFilters,
  onClearFilters
}: PropertyFiltersProps) {
  const handleFilterChange = (key: keyof PropertyFiltersType, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  )

  return (
    <div className="space-y-4">
      {/* Main Search and Filters Bar */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="input-with-icon relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reference number, location, owner name..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Basic Filters */}
          <div className="flex gap-3">
            <select
              value={filters.status_id || ''}
              onChange={(e) => handleFilterChange('status_id', e.target.value ? Number(e.target.value) : undefined)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>

            <select
              value={filters.category_id || ''}
              onChange={(e) => handleFilterChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={filters.agent_id || ''}
              onChange={(e) => handleFilterChange('agent_id', e.target.value ? Number(e.target.value) : undefined)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filters Button */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors flex items-center space-x-2 ${
                showAdvancedFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-4 py-3 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
              >
                <X className="h-5 w-5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.price_min || ''}
                  onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.price_max || ''}
                  onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* View Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
              <select
                value={filters.view_type || ''}
                onChange={(e) => handleFilterChange('view_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">All Views</option>
                <option value="open view">Open View</option>
                <option value="sea view">Sea View</option>
                <option value="mountain view">Mountain View</option>
                <option value="no view">No View</option>
              </select>
            </div>

            {/* Surface Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Surface Area (m²)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.surface_min || ''}
                  onChange={(e) => handleFilterChange('surface_min', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.surface_max || ''}
                  onChange={(e) => handleFilterChange('surface_max', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Built Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Built Year</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="From"
                  value={filters.built_year_min || ''}
                  onChange={(e) => handleFilterChange('built_year_min', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="To"
                  value={filters.built_year_max || ''}
                  onChange={(e) => handleFilterChange('built_year_max', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {filters.status_id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Status: {statuses.find(s => s.id === filters.status_id)?.name}
                    <button
                      onClick={() => handleFilterChange('status_id', undefined)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.category_id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    Category: {categories.find(c => c.id === filters.category_id)?.name}
                    <button
                      onClick={() => handleFilterChange('category_id', undefined)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.agent_id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-100 text-cyan-800">
                    Agent: {agents.find(a => a.id === filters.agent_id)?.name || 'Unknown'}
                    <button
                      onClick={() => handleFilterChange('agent_id', undefined)}
                      className="ml-2 text-cyan-600 hover:text-cyan-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.search && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    Search: {filters.search}
                    <button
                      onClick={() => handleFilterChange('search', undefined)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.price_min && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                    Min Price: ${filters.price_min.toLocaleString()}
                    <button
                      onClick={() => handleFilterChange('price_min', undefined)}
                      className="ml-2 text-yellow-600 hover:text-yellow-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.price_max && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                    Max Price: ${filters.price_max.toLocaleString()}
                    <button
                      onClick={() => handleFilterChange('price_max', undefined)}
                      className="ml-2 text-yellow-600 hover:text-yellow-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.view_type && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                    View: {filters.view_type}
                    <button
                      onClick={() => handleFilterChange('view_type', undefined)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.surface_min && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800">
                    Min Surface: {filters.surface_min}m²
                    <button
                      onClick={() => handleFilterChange('surface_min', undefined)}
                      className="ml-2 text-teal-600 hover:text-teal-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.surface_max && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800">
                    Max Surface: {filters.surface_max}m²
                    <button
                      onClick={() => handleFilterChange('surface_max', undefined)}
                      className="ml-2 text-teal-600 hover:text-teal-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.built_year_min && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                    Built From: {filters.built_year_min}
                    <button
                      onClick={() => handleFilterChange('built_year_min', undefined)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
                {filters.built_year_max && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                    Built To: {filters.built_year_max}
                    <button
                      onClick={() => handleFilterChange('built_year_max', undefined)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      <X className="h-4 w-4" />
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
