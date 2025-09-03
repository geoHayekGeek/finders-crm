'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/Calendar'
import { EventModal } from '@/components/EventModal'
import { EventList } from '@/components/EventList'
import { CalendarHeader } from '@/components/CalendarHeader'
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'

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

  // Load events from API on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('http://localhost:10000/api/calendar')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const eventsWithDates = data.events.map((event: { start: string; end: string; [key: string]: unknown }) => ({
              ...event,
              start: new Date(event.start),
              end: new Date(event.end)
            }))
            setEvents(eventsWithDates)
          } else {
            setError(data.message || 'Failed to fetch events')
          }
        } else {
          setError('Failed to fetch events')
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        setError('Failed to fetch events')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleAddEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const response = await fetch('http://localhost:10000/api/calendar', {
        method: 'POST',
        headers: {
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
        } else {
          setError(data.message || 'Failed to create event')
        }
      } else {
        setError('Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      setError('Failed to create event')
    }
  }

  const handleUpdateEvent = async (event: CalendarEvent) => {
    try {
      const response = await fetch(`/api/calendar/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Convert string dates back to Date objects
          const updatedEvent: CalendarEvent = {
            ...data.event,
            start: new Date(data.event.start),
            end: new Date(data.event.end)
          }
          setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
          setIsEventModalOpen(false)
          setSelectedEvent(null)
        } else {
          setError(data.message || 'Failed to update event')
        }
      } else {
        setError('Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      setError('Failed to update event')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvents(prev => prev.filter(e => e.id !== eventId))
          setIsEventModalOpen(false)
          setSelectedEvent(null)
        } else {
          setError(data.message || 'Failed to delete event')
        }
      } else {
        setError('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      setError('Failed to delete event')
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventModalOpen(true)
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
      />
    </div>
  )
}
