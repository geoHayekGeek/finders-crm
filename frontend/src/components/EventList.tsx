'use client'

import { useState, useMemo } from 'react'
import { CalendarEvent } from '@/app/dashboard/calendar/page'
import { ClockIcon, MapPinIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/outline'

interface EventListProps {
  events: CalendarEvent[]
  selectedDate: Date
  onEventClick: (event: CalendarEvent) => void
}

export function EventList({ events, selectedDate, onEventClick }: EventListProps) {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming')

  const filteredEvents = useMemo(() => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return events
      .filter(event => {
        const eventDate = new Date(event.start)
        
        switch (filter) {
          case 'today':
            return eventDate.toDateString() === today.toDateString()
          case 'upcoming':
            return eventDate >= now
          case 'past':
            return eventDate < now
          default:
            return true
        }
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [events, filter])

  const getEventColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500'
    }
    return colors[color as keyof typeof colors] || 'bg-gray-500'
  }

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return 'All day'
    
    const start = new Date(event.start)
    const end = new Date(event.end)
    
    const startTime = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    const endTime = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    return `${startTime} - ${endTime}`
  }

  const formatEventDate = (event: CalendarEvent) => {
    const eventDate = new Date(event.start)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      })
    }
  }

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting':
        return '👥'
      case 'showing':
        return '🏠'
      case 'inspection':
        return '🔍'
      case 'closing':
        return '📋'
      default:
        return '📅'
    }
  }

  const formatAttendees = (attendees?: string[]) => {
    if (!attendees || attendees.length === 0) return null
    
    if (attendees.length === 1) {
      return attendees[0]
    } else if (attendees.length === 2) {
      return `${attendees[0]} and ${attendees[1]}`
    } else {
      return `${attendees[0]}, ${attendees[1]}, and ${attendees.length - 2} others`
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Events</h3>
        
        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`flex-1 px-1 py-1 text-xs font-medium rounded transition-colors min-w-0 ${
                filter === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List - Scrollable Container */}
      <div className="p-3 sm:p-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="text-gray-400 text-3xl sm:text-4xl mb-2">📅</div>
            <p className="text-gray-500 text-xs sm:text-sm">
              {filter === 'all' && 'No events found'}
              {filter === 'today' && 'No events today'}
              {filter === 'upcoming' && 'No upcoming events'}
              {filter === 'past' && 'No past events'}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-2 sm:space-y-3 pr-2">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="p-2 sm:p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-base sm:text-lg">{getEventTypeIcon(event.type)}</span>
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getEventColor(event.color)}`} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {formatEventDate(event)}
                    </span>
                  </div>

                  {/* Event Title */}
                  <h4 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors text-sm sm:text-base">
                    {event.title}
                  </h4>

                  {/* Event Details */}
                  <div className="space-y-1 text-xs text-gray-600">
                    {/* Creator */}
                    {event.createdByName && (
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-3 w-3" />
                        <span className="truncate">{event.createdByName}</span>
                      </div>
                    )}
                    {/* Time */}
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>{formatEventTime(event)}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPinIcon className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}

                    {/* Attendees */}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <UserGroupIcon className="h-3 w-3" />
                        <span className="truncate">{formatAttendees(event.attendees)}</span>
                      </div>
                    )}

                    {/* Description */}
                    {event.description && (
                      <p className="text-gray-500 line-clamp-2 mt-2 text-xs">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Event Type Badge */}
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {events.filter(e => new Date(e.start) >= new Date()).length}
            </div>
            <div className="text-xs text-gray-500">Upcoming</div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {events.filter(e => {
                const eventDate = new Date(e.start)
                const today = new Date()
                return eventDate.toDateString() === today.toDateString()
              }).length}
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {events.filter(e => new Date(e.start) < new Date()).length}
            </div>
            <div className="text-xs text-gray-500">Past</div>
          </div>
        </div>
      </div>
    </div>
  )
}
