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
    const loadEvents = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('token')
        
        if (!token) {
          setError('No authentication token found')
          return
        }

        const response = await fetch('http://localhost:10000/api/calendar', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            // Convert the events to the expected format
            const formattedEvents: CalendarEvent[] = data.data.map((event: any) => ({
              id: String(event.id),
              title: event.title,
              description: event.description,
              start: new Date(event.start_time),
              end: new Date(event.end_time),
              allDay: event.all_day,
              color: event.color || 'blue',
              type: event.type || 'other',
              location: event.location,
              attendees: event.attendees || [],
              notes: event.notes,
              propertyId: event.property_id,
              propertyReference: event.property_reference,
              propertyLocation: event.property_location,
              leadId: event.lead_id,
              leadName: event.lead_name,
              leadPhone: event.lead_phone
            }))
            
            setEvents(formattedEvents)
            console.log('✅ Loaded events:', formattedEvents.length)
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
      }
    }

    loadEvents()
  }, [])

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
          attendees: event.attendees?.map(a => typeof a === 'string' ? a : a.name) || [],
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
          attendees: event.attendees?.map(a => typeof a === 'string' ? a : a.name) || [],
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-3">
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
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Today's Events</h3>
              </div>
              <div className="p-6">
                <EventList
                  events={events.filter(event => {
                    const today = new Date()
                    const eventDate = new Date(event.start)
                    return eventDate.toDateString() === today.toDateString()
                  })}
                  onEventClick={handleEventClick}
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