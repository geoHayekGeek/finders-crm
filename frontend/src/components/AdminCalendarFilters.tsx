'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRole } from '@/utils/roleFormatter'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  UserGroupIcon,
  TagIcon
} from '@heroicons/react/24/outline'

interface AdminCalendarFiltersProps {
  onFiltersChange: (filters: CalendarFilters) => void
  onClearFilters: () => void
}

export interface CalendarFilters {
  createdBy?: string
  attendee?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface User {
  id: number
  name: string
  role: string
}

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'showing', label: 'Property Showing' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'closing', label: 'Closing' },
  { value: 'other', label: 'Other' }
]

export function AdminCalendarFilters({ onFiltersChange, onClearFilters }: AdminCalendarFiltersProps) {
  console.log('🎨 AdminCalendarFilters component rendering')
  
  const [filters, setFilters] = useState<CalendarFilters>({})
  const [users, setUsers] = useState<User[]>([])
  const [attendees, setAttendees] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load users when component mounts
  useEffect(() => {
    console.log('🔄 AdminCalendarFilters: Component mounted, loading users')
    loadUsers()
  }, [])

  // Load attendees when filters are shown (to avoid circular dependency)
  useEffect(() => {
    if (showFilters && attendees.length === 0) {
      console.log('🔄 AdminCalendarFilters: Loading attendees when filters shown')
      loadAttendees()
    }
  }, [showFilters, attendees.length])

  // Track if this is the initial render
  const isInitialRender = useRef(true)

  // Notify parent component when filters change (skip initial empty state)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      console.log('🔄 AdminCalendarFilters: Skipping initial empty filters')
      return
    }
    
    console.log('🔄 AdminCalendarFilters: Filters changed, calling onFiltersChange with:', filters)
    onFiltersChange(filters)
  }, [filters]) // Removed onFiltersChange from dependencies to prevent infinite loop

  const loadUsers = async () => {
    console.log('👥 Loading users...')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:10000/api/users/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('👥 Loaded users:', data.users?.length || 0)
        setUsers(data.users || [])
      } else {
        console.error('Failed to load users:', response.status)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadAttendees = async () => {
    console.log('👥 Loading attendees...')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:10000/api/calendar', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const allAttendees = new Set<string>()
        
        data.events?.forEach((event: any) => {
          if (event.attendees && Array.isArray(event.attendees)) {
            event.attendees.forEach((attendee: string) => {
              if (attendee && typeof attendee === 'string') {
                allAttendees.add(attendee)
              }
            })
          }
        })
        
        console.log('👥 Loaded attendees:', allAttendees.size)
        setAttendees(Array.from(allAttendees).sort())
      }
    } catch (error) {
      console.error('Error loading attendees:', error)
    }
  }

  const handleFilterChange = (key: keyof CalendarFilters, value: string | undefined) => {
    console.log(`🔧 Filter changed: ${key} = ${value}`)
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value || undefined
      }
      console.log('📝 New filters:', newFilters)
      return newFilters
    })
  }

  const handleClearFilters = () => {
    setFilters({})
    onClearFilters()
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '')

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Admin Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="p-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
              Search Events
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by title, description, location, notes, property, lead, or user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Created By
            </label>
            <select
              value={filters.createdBy || ''}
              onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({formatRole(user.role)})
                      </option>
                    ))}
            </select>
          </div>

          {/* Attendee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <UserGroupIcon className="h-4 w-4 inline mr-1" />
              Attendee
            </label>
            <select
              value={filters.attendee || ''}
              onChange={(e) => handleFilterChange('attendee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Attendees</option>
              {attendees.map(attendee => (
                <option key={attendee} value={attendee}>
                  {attendee}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TagIcon className="h-4 w-4 inline mr-1" />
              Event Type
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: &quot;{filters.search}&quot;
                  </span>
                )}
                {filters.createdBy && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Created by: {(() => {
                      const user = users.find(u => u.id.toString() === filters.createdBy)
                      return user ? `${user.name} (${formatRole(user.role)})` : filters.createdBy
                    })()}
                  </span>
                )}
                {filters.attendee && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Attendee: {filters.attendee}
                  </span>
                )}
                {filters.type && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Type: {EVENT_TYPES.find(t => t.value === filters.type)?.label || filters.type}
                  </span>
                )}
                {filters.dateFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    From: {filters.dateFrom}
                  </span>
                )}
                {filters.dateTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    To: {filters.dateTo}
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
