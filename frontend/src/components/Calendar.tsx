'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CalendarEvent } from '@/app/dashboard/calendar/page'

interface CalendarProps {
  events: CalendarEvent[]
  selectedDate: Date
  view: 'month' | 'week' | 'day'
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
  onHourClick?: (date: Date, hour: number) => void
}

export function Calendar({ events, selectedDate, view, onEventClick, onDateClick, onHourClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Update currentDate when selectedDate changes
  useEffect(() => {
    setCurrentDate(selectedDate)
  }, [selectedDate])

  // Ensure currentDate is always valid
  useEffect(() => {
    if (!currentDate || isNaN(currentDate.getTime())) {
      setCurrentDate(new Date())
    }
  }, [currentDate])

  const calendarData = useMemo(() => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      if (view === 'month') {
        return generateMonthData(year, month)
      } else if (view === 'week') {
        return generateWeekData(currentDate)
      } else {
        return generateDayData(currentDate)
      }
    } catch (error) {
      console.error('Error generating calendar data:', error)
      // Return empty data as fallback
      if (view === 'month') {
        return []
      } else if (view === 'week') {
        return []
      } else {
        return []
      }
    }
  }, [currentDate, view])

  // Get current month for month view calculations
  const currentMonth = currentDate.getMonth()

  // Type-safe calendar data access
  const getWeekDates = () => {
    if (view === 'week' && Array.isArray(calendarData) && calendarData.length > 0) {
      return calendarData as Date[]
    }
    return []
  }

  const getMonthDates = () => {
    if (view === 'month' && Array.isArray(calendarData) && calendarData.length > 0) {
      return calendarData as Date[][]
    }
    return []
  }

  const getEventsForDate = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return []
      
      return events.filter(event => {
        try {
          const eventDate = new Date(event.start)
          return eventDate.toDateString() === date.toDateString()
        } catch (error) {
          console.error('Error processing event:', error)
          return false
        }
      })
    } catch (error) {
      console.error('Error getting events for date:', error)
      return []
    }
  }

  const getEventColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      yellow: 'bg-yellow-500 text-black',
      purple: 'bg-purple-500 text-white',
      pink: 'bg-pink-500 text-white'
    }
    return colors[color as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    try {
      const newDate = new Date(currentDate)
      
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      } else {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
      }
      
      setCurrentDate(newDate)
    } catch (error) {
      console.error('Error navigating date:', error)
      // Fallback to today
      setCurrentDate(new Date())
    }
  }

  const goToToday = () => {
    try {
      setCurrentDate(new Date())
    } catch (error) {
      console.error('Error going to today:', error)
      // Fallback to a safe date
      setCurrentDate(new Date('2024-01-01'))
    }
  }

  const handleHourClick = (hour: number) => {
    if (onHourClick) {
      const clickedDate = new Date(currentDate)
      clickedDate.setHours(hour, 0, 0, 0)
      onHourClick(clickedDate, hour)
    }
  }

  // Don't render until we have a valid currentDate
  if (!currentDate || isNaN(currentDate.getTime())) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
        <div className="text-center text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  if (view === 'month') {
    // Ensure calendarData is valid
    const monthDates = getMonthDates()
    if (monthDates.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
          <div className="text-center text-gray-500">Unable to load calendar data</div>
        </div>
      )
    }
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <button
            onClick={() => navigateDate('prev')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={goToToday}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Month Grid */}
        <div className="p-2 sm:p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {getMonthDates().map((week, weekIndex) =>
              week && Array.isArray(week) ? week.map((day, dayIndex) => {
                try {
                  const isCurrentMonth = day && day.getMonth() === currentMonth
                  const isToday = day && day.toDateString() === new Date().toDateString()
                  const isSelected = day && day.toDateString() === selectedDate.toDateString()
                  const dayEvents = day ? getEventsForDate(day) : []
                  
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-100 ${
                        !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                      } ${isToday ? 'bg-blue-50 border-blue-200' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      } hover:bg-gray-50 transition-colors cursor-pointer`}
                      onClick={() => day && onDateClick(day)}
                    >
                      {day && (
                        <>
                          <div className={`text-xs sm:text-sm font-medium mb-1 ${
                            !isCurrentMonth ? 'text-gray-400' : 
                            isToday ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {day.getDate()}
                          </div>
                          
                          {/* Events */}
                          <div className="space-y-0.5 sm:space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate cursor-pointer ${getEventColor(event.color)}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEventClick(event)
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 px-1 sm:px-2">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                } catch (error) {
                  console.error('Error rendering day:', error)
                  return (
                    <div key={`${weekIndex}-${dayIndex}`} className="min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-100 bg-gray-50">
                      <div className="text-xs text-gray-400">Error</div>
                    </div>
                  )
                }
              }) : null
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'week') {
    // Ensure calendarData is valid
    const weekDates = getWeekDates()
    if (weekDates.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
          <div className="text-center text-gray-500">Unable to load calendar data</div>
        </div>
      )
    }
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Week Navigation */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <button
            onClick={() => navigateDate('prev')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-center">
              {(() => {
                const weekDates = getWeekDates()
                if (weekDates.length >= 7) {
                  return `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${
                    weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  }`
                }
                return 'Week View'
              })()}
            </h2>
            <button
              onClick={goToToday}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Week Grid */}
        <div className="p-2 sm:p-4 overflow-x-auto">
          {/* Time Grid */}
          <div className="grid grid-cols-8 gap-1 min-w-[600px]">
            {/* Time Column */}
            <div className="space-y-1">
              <div className="h-8 sm:h-12"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="h-8 sm:h-12 text-xs text-gray-500 pr-1 sm:pr-2 text-right">
                  {i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {getWeekDates().map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString()
              const dayEvents = getEventsForDate(date)
              
              return (
                <div key={index} className="border-l border-gray-200">
                  {/* Day Header */}
                  <div className={`h-8 sm:h-12 flex flex-col items-center justify-center border-b border-gray-200 ${
                    isToday ? 'bg-blue-50' : ''
                  }`}>
                    <div className={`text-xs sm:text-sm font-medium ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-xs ${
                      isToday ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {Array.from({ length: 24 }, (_, hour) => {
                    const hourEvents = dayEvents.filter(event => {
                      const eventHour = new Date(event.start).getHours()
                      return eventHour === hour
                    })
                    
                    return (
                      <div key={hour} className="h-8 sm:h-12 border-b border-gray-100 relative">
                        {hourEvents.map(event => (
                          <div
                            key={event.id}
                            className={`absolute left-0 right-0 mx-0.5 sm:mx-1 px-1 sm:px-2 py-0.5 sm:py-1 text-xs rounded cursor-pointer ${getEventColor(event.color)}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick(event)
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Day View
  // Ensure calendarData is valid
  if (!Array.isArray(calendarData) || calendarData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
        <div className="text-center text-gray-500">Unable to load calendar data</div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Day Navigation */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
        <button
          onClick={() => navigateDate('prev')}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-center">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </h2>
          <button
            onClick={goToToday}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={() => navigateDate('next')}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* Day Schedule */}
      <div className="p-2 sm:p-4">
        <div className="space-y-1">
          {Array.from({ length: 24 }, (_, hour) => {
            const hourEvents = events.filter(event => {
              try {
                const eventDate = new Date(event.start)
                const eventHour = eventDate.getHours()
                const eventDay = eventDate.getDate()
                const eventMonth = eventDate.getMonth()
                const eventYear = eventDate.getFullYear()
                
                const selectedDay = selectedDate.getDate()
                const selectedMonth = selectedDate.getMonth()
                const selectedYear = selectedDate.getFullYear()
                
                // Check if event is on the selected date and at the correct hour
                return eventHour === hour && 
                       eventDay === selectedDay && 
                       eventMonth === selectedMonth && 
                       eventYear === selectedYear
              } catch (error) {
                console.error('Error filtering event by hour:', error)
                return false
              }
            })
            
            return (
              <div key={hour} className="flex h-12 sm:h-16 border-b border-gray-100">
                <div className="w-16 sm:w-20 text-xs sm:text-sm text-gray-500 pr-2 sm:pr-4 pt-2">
                  {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                <div 
                  className="flex-1 pt-2 relative cursor-pointer hover:bg-gray-50 transition-colors group"
                  onClick={() => handleHourClick(hour)}
                >
                  {/* Hour slot background with hover effect */}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-gray-50 transition-colors pointer-events-none" />
                  
                  {/* Events */}
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className={`mb-1 sm:mb-2 px-2 sm:px-3 py-1 sm:py-2 rounded cursor-pointer ${getEventColor(event.color)} relative z-10`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    >
                      <div className="font-medium text-xs sm:text-sm">{event.title}</div>
                      {event.location && (
                        <div className="text-xs opacity-90">{event.location}</div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add event hint on hover */}
                  {hourEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-xs text-gray-400 font-medium">Click to add event</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function generateMonthData(year: number, month: number): Date[][] {
  try {
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const weeks: Date[][] = []
    let currentWeek: Date[] = []
    
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      currentWeek.push(currentDate)
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    
    return weeks
  } catch (error) {
    console.error('Error generating month data:', error)
    return []
  }
}

function generateWeekData(date: Date): Date[] {
  try {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    
    return week
  } catch (error) {
    console.error('Error generating week data:', error)
    return []
  }
}

function generateDayData(date: Date): Date[] {
  try {
    return [date]
  } catch (error) {
    console.error('Error generating day data:', error)
    return []
  }
}
