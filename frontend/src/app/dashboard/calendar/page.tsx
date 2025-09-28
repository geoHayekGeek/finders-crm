'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/Calendar'
import { EventModal } from '@/components/EventModal'
import { EventList } from '@/components/EventList'
import { CalendarHeader } from '@/components/CalendarHeader'
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/contexts/ToastContext'

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
  const { showSuccess, showError, showWarning, showInfo } = useToast()

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

  // Load events from API on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔍 FETCHING EVENTS FROM API...')
        const token = localStorage.getItem('token')
        
        if (!token) {
          console.log('❌ No token found, skipping permission checks')
          setError('Not authenticated')
          showError('Please log in to view calendar events')
          return
        }
        
        const response = await fetch('http://localhost:10000/api/calendar', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        console.log('📡 API Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📦 Raw API data:', data)
          
          if (data.success) {
            const eventsWithDates = data.events.map((event: { start: string; end: string; [key: string]: unknown }) => ({
              ...event,
              start: new Date(event.start),
              end: new Date(event.end)
            }))
            
            console.log('🎯 ALL EVENTS LOADED:', eventsWithDates.length)
            console.log('🔗 Events with property/lead data:', eventsWithDates.filter(e => e.propertyId || e.leadId))
            
            // Log each event with property/lead data in detail
            eventsWithDates.forEach(event => {
              if (event.propertyId || event.leadId) {
                console.log(`📋 Event "${event.title}" (ID: ${event.id}):`, {
                  propertyId: event.propertyId,
                  propertyReference: event.propertyReference,
                  propertyLocation: event.propertyLocation,
                  leadId: event.leadId,
                  leadName: event.leadName,
                  leadPhone: event.leadPhone
                })
              }
            })
            
            setEvents(eventsWithDates)
            
            // Check permissions for each event
            const permissions: Record<string, EventPermissions> = {}
            for (const event of eventsWithDates) {
              const eventId = String(event.id) // Ensure event ID is a string
              const eventPermissions = await checkEventPermissions(eventId)
              permissions[eventId] = eventPermissions
            }
            setEventPermissions(permissions)
            
            // Show success message for loading events
            if (eventsWithDates.length > 0) {
              showInfo(`Loaded ${eventsWithDates.length} event${eventsWithDates.length === 1 ? '' : 's'}`)
            }
          } else {
            const errorMessage = data.message || 'Failed to fetch events'
            setError(errorMessage)
            showError(errorMessage)
          }
        } else {
          const errorMessage = 'Failed to fetch events'
          setError(errorMessage)
          showError(errorMessage)
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        const errorMessage = 'Failed to fetch events'
        setError(errorMessage)
        showError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleAddEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:10000/api/calendar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Convert string dates back to Date objects
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
      const errorMessage = 'Failed to create event'
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  const handleUpdateEvent = async (event: CalendarEvent) => {
    try {
      console.log('🔄 UPDATING EVENT!')
      console.log('📝 Event data being sent to API:', {
        id: event.id,
        title: event.title,
        propertyId: event.propertyId,
        leadId: event.leadId
      })
      
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:10000/api/calendar/${event.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      })

      console.log('📡 Update API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('📦 Update API response data:', data)
        
        if (data.success) {
          // Convert string dates back to Date objects
          const updatedEvent: CalendarEvent = {
            ...data.event,
            start: new Date(data.event.start),
            end: new Date(data.event.end)
          }
          
          console.log('✅ UPDATED EVENT FROM API:', {
            id: updatedEvent.id,
            title: updatedEvent.title,
            propertyId: updatedEvent.propertyId,
            propertyReference: updatedEvent.propertyReference,
            propertyLocation: updatedEvent.propertyLocation,
            leadId: updatedEvent.leadId,
            leadName: updatedEvent.leadName,
            leadPhone: updatedEvent.leadPhone
          })
          
          console.log('🔄 Updating events state with new data...')
          console.log('🔍 Comparing IDs for update:')
          console.log('  - Original event ID:', event.id, typeof event.id)
          console.log('  - Updated event ID:', updatedEvent.id, typeof updatedEvent.id)
          
          setEvents(prev => {
            console.log('📋 Current events in state:', prev.map(e => ({ id: e.id, title: e.title, propertyId: e.propertyId, leadId: e.leadId })))
            
            const newEvents = prev.map(e => {
              const match = String(e.id) === String(event.id)
              console.log(`🔍 Checking event ${e.id} (${typeof e.id}) vs ${event.id} (${typeof event.id}): ${match}`)
              return match ? updatedEvent : e
            })
            
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
      const errorMessage = 'Failed to update event'
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:10000/api/calendar/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
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
      const errorMessage = 'Failed to delete event'
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
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

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Events Section */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showSidebar ? 'Hide Events' : 'Show Events'}
          </button>
          
          {/* Mobile Events List - appears directly below the button */}
          {showSidebar && (
            <div className="mt-4">
              <EventList
                events={events}
                selectedDate={selectedDate}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-3">
            <CalendarHeader
              view={view}
              onViewChange={setView}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
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

          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <EventList
              events={events}
              selectedDate={selectedDate}
              onEventClick={handleEventClick}
            />
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
