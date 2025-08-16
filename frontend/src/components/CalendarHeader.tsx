'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarEvent } from '@/app/dashboard/calendar/page'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface CalendarHeaderProps {
  view: 'month' | 'week' | 'day'
  onViewChange: (view: 'month' | 'week' | 'day') => void
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function CalendarHeader({ view, onViewChange, selectedDate, onDateChange }: CalendarHeaderProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [quickNavOpen, setQuickNavOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const quickNavRef = useRef<HTMLDivElement>(null)

  const viewOptions = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' }
  ] as const

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false)
      }
      if (quickNavRef.current && !quickNavRef.current.contains(event.target as Node)) {
        setQuickNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const goToToday = () => {
    onDateChange(new Date())
    setIsDatePickerOpen(false)
    setQuickNavOpen(false)
  }

  const goToDate = (date: Date) => {
    onDateChange(date)
    setIsDatePickerOpen(false)
    setQuickNavOpen(false)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    
    switch (view) {
      case 'month':
        // Navigate by months
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        // Navigate by weeks (7 days)
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        // Navigate by days
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    
    onDateChange(newDate)
  }

  const getQuickNavigationOptions = () => {
    const today = new Date()
    const options = []

    switch (view) {
      case 'month':
        // For month view: show months
        for (let i = -6; i <= 6; i++) {
          const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
          options.push({
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            date: date,
            type: i === 0 ? 'current' : i < 0 ? 'past' : 'future'
          })
        }
        break

      case 'week':
        // For week view: show weeks
        for (let i = -4; i <= 4; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + (i * 7))
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          
          options.push({
            label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            date: weekStart,
            type: i === 0 ? 'current' : i < 0 ? 'past' : 'future'
          })
        }
        break

      case 'day':
        // For day view: show days
        for (let i = -7; i <= 7; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i)
          options.push({
            label: `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
            date: date,
            type: i === 0 ? 'today' : i < 0 ? 'past' : 'future'
          })
        }
        break
    }

    return options
  }

  const formatSelectedDate = () => {
    switch (view) {
      case 'month':
        return selectedDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
      case 'week':
        const weekStart = new Date(selectedDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'day':
        return selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center justify-between p-4">
        {/* Left side - View selector */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Center - Smart Date Navigation */}
        <div className="flex items-center space-x-3">
          {/* Previous/Next buttons */}
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors group"
            title={`Previous ${view}`}
          >
            <ChevronLeftIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
          
          {/* Date Display with Dropdown */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
            >
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                {formatSelectedDate()}
              </span>
              <ChevronDownIcon className={`h-4 w-4 text-gray-600 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Date Picker Dropdown */}
            {isDatePickerOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pick a date</label>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          goToDate(new Date(e.target.value))
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={goToToday}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                    >
                      Today
                    </button>
                    
                    <div className="border-t pt-2">
                      <button
                        onClick={() => setQuickNavOpen(!quickNavOpen)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between"
                      >
                        Quick Navigation
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${quickNavOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {quickNavOpen && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {getQuickNavigationOptions().map((option, index) => (
                            <button
                              key={index}
                              onClick={() => goToDate(option.date)}
                                                             className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-gray-50 ${
                                 option.type === 'today' || option.type === 'current' ? 'text-blue-600 font-medium' :
                                 option.type === 'past' ? 'text-gray-600' :
                                 'text-green-600'
                               }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors group"
            title={`Next ${view}`}
          >
            <ChevronRightIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Right side - Additional Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}
