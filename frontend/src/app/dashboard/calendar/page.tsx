'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/Calendar'
import { EventModal } from '@/components/EventModal'
import { EventList } from '@/components/EventList'
import { CalendarHeader } from '@/components/CalendarHeader'
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { getSampleEvents } from '@/utils/sampleEvents'

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

  // Load events from localStorage on component mount
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem('calendar-events')
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents).map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }))
        setEvents(parsedEvents)
      } else {
        // Load sample events if no saved events exist
        setEvents(getSampleEvents())
      }
    } catch (error) {
      console.error('Error loading events:', error)
      // Fallback to sample events if there's an error
      setEvents(getSampleEvents())
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save events to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem('calendar-events', JSON.stringify(events))
  }, [events])

  const handleAddEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString()
    }
    setEvents(prev => [...prev, newEvent])
    setIsEventModalOpen(false)
  }

  const handleUpdateEvent = (event: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e))
    setIsEventModalOpen(false)
    setSelectedEvent(null)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId))
    setIsEventModalOpen(false)
    setSelectedEvent(null)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventModalOpen(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
                <p className="text-gray-600">Manage your appointments and events</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setEvents(getSampleEvents())}
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Load Sample Events
              </button>
              <button
                onClick={openNewEventModal}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
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
