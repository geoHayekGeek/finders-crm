'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar } from '@/components/Calendar'
import { EventModal } from '@/components/EventModal'
import { EventList } from '@/components/EventList'
import { CalendarHeader } from '@/components/CalendarHeader'
// import { AdminCalendarFilters, CalendarFilters } from '@/components/AdminCalendarFilters'
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatRole } from '@/utils/roleFormatter'

interface CalendarFilters {
  createdBy?: string
  attendee?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink'
  type: 'meeting' | 'showing' | 'inspection' | 'closing' | 'other'
  location?: string
  attendees?: string[]
  notes?: string
  propertyId?: number | null
  propertyReference?: string
  propertyLocation?: string
  leadId?: number | null
  leadName?: string
  leadPhone?: string
  createdById?: string
  createdByName?: string
}

export interface Property {
  id: number
  reference_number: string
  location: string
}

export interface Lead {
  id: number
  customer_name: string
  phone_number?: string
}

export interface EventPermissions {
  canEdit: boolean
  canDelete: boolean
  reason: string
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventPermissions, setEventPermissions] = useState<Record<string, EventPermissions>>({})
  const [adminFilters, setAdminFilters] = useState<CalendarFilters>({})
  const [users, setUsers] = useState<any[]>([])
  const [attendees, setAttendees] = useState<string[]>([])
  const loadingRef = useRef(false)
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const { user } = useAuth()

  // Check permissions for an event
  const checkEventPermissions = async (eventId: string): Promise<EventPermissions> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:10000/api/calendar/${eventId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return {
          canEdit: data.canEdit,
          canDelete: data.canDelete,
          reason: data.reason
        }
      } else {
        const errorData = await response.json()
        showWarning(`Permission check failed: ${errorData.message || 'Unknown error'}`)
        return {
          canEdit: false,
          canDelete: false,
          reason: 'Failed to check permissions'
        }
      }
    } catch (error) {
      console.error('Error checking event permissions:', error)
      showWarning('Failed to check event permissions')
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Error checking permissions'
      }
    }
  }

  // Load events from API
  const loadEvents = async (filters?: CalendarFilters) => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        loadingRef.current = false
        setIsLoading(false)
        return
      }

      // Build query parameters for admin filters only
      const queryParams = new URLSearchParams()
      if (filters && user?.role === 'admin') {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            queryParams.append(key, value)
          }
        })
      }

      const url = queryParams.toString() 
        ? `http://localhost:10000/api/calendar?${queryParams.toString()}`
        : 'http://localhost:10000/api/calendar'

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.events) {
          // Convert the events to the expected format
          // Backend handles all permission filtering, so we just display what's returned
          const formattedEvents: CalendarEvent[] = data.events.map((event: any) => ({
            id: String(event.id),
            title: event.title,
            description: event.description,
            start: new Date(event.start),
            end: new Date(event.end),
            allDay: event.allDay,
            color: event.color || 'blue',
            type: event.type || 'other',
            location: event.location,
            attendees: Array.isArray(event.attendees)
              ? event.attendees.map((att: any) => String(att))
              : [],
            notes: event.notes,
            propertyId: event.propertyId,
            propertyReference: event.propertyReference,
            propertyLocation: event.propertyLocation,
            leadId: event.leadId,
            leadName: event.leadName,
            leadPhone: event.leadPhone,
            createdById: event.createdBy ? String(event.createdBy) : undefined,
            createdByName: event.createdByName
          }))

          setEvents(formattedEvents)
        } else {
          setError('Failed to load events')
        }
      } else {
        if (response.status === 401) {
          setError('Authentication required. Please log in again.')
        } else {
          setError('Failed to load events')
        }
      }
    } catch (error) {
      console.error('Error loading events:', error)
      setError('Failed to load events')
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }

  // Load events when user context is available
  useEffect(() => {
    if (!user) return
    loadEvents()
  }, [user?.id, user?.role])

  // Load users for admin filters
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
    }
  }, [user?.role])

  // Track if this is the initial load
  const isInitialLoad = useRef(true)

  // Load events when admin filters change (with debouncing)
  useEffect(() => {
    if (user?.role === 'admin') {
      // Skip the initial load since we already load events on mount
      if (isInitialLoad.current) {
        isInitialLoad.current = false
        return
      }
      
      const timeoutId = setTimeout(() => {
        loadEvents(adminFilters)
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    }
  }, [adminFilters, user?.role])

  const handleAddEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:10000/api/calendar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          color: event.color,
          type: event.type,
          location: event.location,
          attendees: event.attendees?.map(a => typeof a === 'string' ? a : String(a)) || [],
          notes: event.notes,
          propertyId: event.propertyId,
          leadId: event.leadId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.event) {
          const newEvent: CalendarEvent = {
            ...data.event,
            start: new Date(data.event.start),
            end: new Date(data.event.end)
          }
          setEvents(prev => [...prev, newEvent])
          setIsEventModalOpen(false)
          showSuccess('Event created successfully!')
        } else {
          const errorMessage = data.message || 'Failed to create event'
          setError(errorMessage)
          showError(errorMessage)
        }
      } else {
        const errorMessage = 'Failed to create event'
        setError(errorMessage)
        showError(errorMessage)
      }
    } catch (error) {
      console.error('Error creating event:', error)
      setError('Failed to create event')
      showError('Failed to create event')
    }
  }

  const handleUpdateEvent = async (event: CalendarEvent) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:10000/api/calendar/${event.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          color: event.color,
          type: event.type,
          location: event.location,
          attendees: event.attendees?.map(a => typeof a === 'string' ? a : String(a)) || [],
          notes: event.notes,
          propertyId: event.propertyId,
          leadId: event.leadId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.event) {
          const updatedEvent: CalendarEvent = {
            ...data.event,
            start: new Date(data.event.start),
            end: new Date(data.event.end)
          }
          
          setEvents(prev => {
            const newEvents = prev.map(e => e.id === event.id ? updatedEvent : e)
            const updatedEventInNewState = newEvents.find(e => String(e.id) === String(event.id))
            console.log('📋 Updated event in new state:', updatedEventInNewState)
            return newEvents
          })
          
          setIsEventModalOpen(false)
          setSelectedEvent(null)
          showSuccess('Event updated successfully!')
        } else {
          const errorMessage = data.message || 'Failed to update event'
          setError(errorMessage)
          showError(errorMessage)
        }
      } else {
        const errorMessage = 'Failed to update event'
        setError(errorMessage)
        showError(errorMessage)
      }
    } catch (error) {
      console.error('Error updating event:', error)
      setError('Failed to update event')
      showError('Failed to update event')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:10000/api/calendar/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvents(prev => prev.filter(e => e.id !== eventId))
          setIsEventModalOpen(false)
          setSelectedEvent(null)
          showSuccess('Event deleted successfully!')
        } else {
          const errorMessage = data.message || 'Failed to delete event'
          setError(errorMessage)
          showError(errorMessage)
        }
      } else {
        const errorMessage = 'Failed to delete event'
        setError(errorMessage)
        showError(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      setError('Failed to delete event')
      showError('Failed to delete event')
    }
  }

  const handleEventClick = async (event: CalendarEvent) => {
    console.log('🖱️ EVENT CLICKED!')
    console.log('📅 Clicked event details:', {
      id: event.id,
      title: event.title,
      propertyId: event.propertyId,
      propertyReference: event.propertyReference,
      propertyLocation: event.propertyLocation,
      leadId: event.leadId,
      leadName: event.leadName,
      leadPhone: event.leadPhone
    })
    
    console.log('🔍 Checking event in current state:')
    const eventInState = events.find(e => String(e.id) === String(event.id))
    if (eventInState) {
      console.log('📋 Event found in state:', {
        id: eventInState.id,
        title: eventInState.title,
        propertyId: eventInState.propertyId,
        propertyReference: eventInState.propertyReference,
        propertyLocation: eventInState.propertyLocation,
        leadId: eventInState.leadId,
        leadName: eventInState.leadName,
        leadPhone: eventInState.leadPhone
      })
    } else {
      console.log('❌ Event NOT found in state!')
    }
    
    // Check permissions for this event
    console.log('🔐 Checking permissions for event:', event.id)
    const permissions = await checkEventPermissions(event.id)
    console.log('📋 Permissions result:', permissions)
    
    // Store permissions for this event
    setEventPermissions(prev => ({
      ...prev,
      [String(event.id)]: permissions
    }))
    
    setSelectedEvent(event)
    setIsEventModalOpen(true)
    
    console.log('✅ Modal should open now with event:', event.title)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsEventModalOpen(true)
  }

  const handleHourClick = (date: Date, hour: number) => {
    // Set the selected date to the clicked hour
    const newDate = new Date(date)
    newDate.setHours(hour, 0, 0, 0)
    setSelectedDate(newDate)
    setIsEventModalOpen(true)
  }

  const openNewEventModal = () => {
    setSelectedEvent(null)
    setIsEventModalOpen(true)
  }

  const handleFiltersChange = useCallback((filters: CalendarFilters) => {
    setAdminFilters(filters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setAdminFilters({})
  }, [])

  // Load users for the filter dropdown
  const loadUsers = async () => {
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
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Load attendees from existing events
  const loadAttendees = async () => {
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
        
        setAttendees(Array.from(allAttendees).sort())
      }
    } catch (error) {
      console.error('Error loading attendees:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage your appointments and events</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={openNewEventModal}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Filters */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Admin Filters</h3>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 rounded-md transition-colors border border-red-200"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Events
                  </label>
                  <input
                    type="text"
                    placeholder="Search by title, description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.search || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, search: e.target.value || undefined })}
                  />
                </div>

                {/* Created By Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.createdBy || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, createdBy: e.target.value || undefined })}
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({formatRole(user.role)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendee Filter (same dataset as Created By) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendee
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.attendee || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, attendee: e.target.value || undefined })}
                  >
                    <option value="">All Attendees</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({formatRole(user.role)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.type || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, type: e.target.value || undefined })}
                  >
                    <option value="">All Types</option>
                    <option value="meeting">Meeting</option>
                    <option value="showing">Property Showing</option>
                    <option value="inspection">Inspection</option>
                    <option value="closing">Closing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.dateFrom || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, dateFrom: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={adminFilters.dateTo || ''}
                    onChange={(e) => handleFiltersChange({ ...adminFilters, dateTo: e.target.value || undefined })}
                  />
                </div>
              </div>

              {/* Active Filters Summary */}
              {Object.keys(adminFilters).some(key => adminFilters[key as keyof CalendarFilters]) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
                  <div className="flex flex-wrap gap-2">
                    {adminFilters.search && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Search: "{adminFilters.search}"
                      </span>
                    )}
                    {adminFilters.createdBy && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Created by: {(() => {
                          const user = users.find(u => u.id.toString() === adminFilters.createdBy)
                          return user ? `${user.name} (${formatRole(user.role)})` : adminFilters.createdBy
                        })()}
                      </span>
                    )}
                    {adminFilters.attendee && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Attendee: {(() => {
                          const u = users.find(u => u.id.toString() === adminFilters.attendee)
                          return u ? `${u.name} (${formatRole(u.role)})` : adminFilters.attendee
                        })()}
                      </span>
                    )}
                    {adminFilters.type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Type: {adminFilters.type}
                      </span>
                    )}
                    {adminFilters.dateFrom && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        From: {adminFilters.dateFrom}
                      </span>
                    )}
                    {adminFilters.dateTo && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        To: {adminFilters.dateTo}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-8 [@media(min-width:1920px)]:flex-row">
          {/* Calendar */}
          <div className="flex-1 [@media(min-width:1920px)]:w-3/4">
            <div className="bg-white rounded-lg shadow">
              <CalendarHeader
                selectedDate={selectedDate}
                view={view}
                onDateChange={setSelectedDate}
                onViewChange={setView}
              />
              <Calendar
                events={events}
                selectedDate={selectedDate}
                view={view}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                onHourClick={handleHourClick}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full [@media(min-width:1920px)]:w-1/4">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Events</h3>
              </div>
              <div className="p-6">
                <EventList
                  events={events}
                  onEventClick={handleEventClick}
                  selectedDate={selectedDate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        selectedDate={selectedDate}
        onSave={(event) => {
            if (selectedEvent) {
              handleUpdateEvent(event as CalendarEvent);
            } else {
              handleAddEvent(event as Omit<CalendarEvent, "id">);
            }
          }}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        permissions={selectedEvent ? eventPermissions[String(selectedEvent.id)] : undefined}
      />
    </div>
  )
}