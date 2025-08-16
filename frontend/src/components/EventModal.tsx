'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CalendarEvent } from '@/app/dashboard/calendar/page'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  selectedDate: Date
  onSave: (event: Omit<CalendarEvent, 'id'> | CalendarEvent) => void
  onDelete?: (eventId: string) => void
}

export function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSave,
  onDelete
}: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    color: 'blue' as CalendarEvent['color'],
    type: 'other' as CalendarEvent['type'],
    location: '',
    attendees: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (event) {
      // Editing existing event
      setFormData({
        title: event.title,
        description: event.description || '',
        start: event.start.toISOString().slice(0, 16),
        end: event.end.toISOString().slice(0, 16),
        allDay: event.allDay,
        color: event.color,
        type: event.type,
        location: event.location || '',
        attendees: event.attendees?.join(', ') || '',
        notes: event.notes || ''
      })
    } else {
      // Creating new event
      const startDate = new Date(selectedDate)
      startDate.setHours(9, 0, 0, 0) // Default to 9 AM

      const endDate = new Date(startDate)
      endDate.setHours(10, 0, 0, 0) // Default to 10 AM

      setFormData({
        title: '',
        description: '',
        start: startDate.toISOString().slice(0, 16),
        end: endDate.toISOString().slice(0, 16),
        allDay: false,
        color: 'blue',
        type: 'other',
        location: '',
        attendees: '',
        notes: ''
      })
    }
    setErrors({})
  }, [event, selectedDate, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.allDay) {
      if (!formData.start) {
        newErrors.start = 'Start time is required'
      }
      if (!formData.end) {
        newErrors.end = 'End time is required'
      }

      if (formData.start && formData.end) {
        const start = new Date(formData.start)
        const end = new Date(formData.end)
        if (start >= end) {
          newErrors.end = 'End time must be after start time'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const startDate = new Date(formData.start)
    const endDate = new Date(formData.end)

    const eventData = event
      ? { ...event, ...formData, title: formData.title.trim(), description: formData.description.trim() || undefined, start: startDate, end: endDate, allDay: formData.allDay, color: formData.color, type: formData.type, location: formData.location.trim() || undefined, attendees: formData.attendees.trim() ? formData.attendees.split(',').map(a => a.trim()) : undefined, notes: formData.notes.trim() || undefined }
      : {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        start: startDate,
        end: endDate,
        allDay: formData.allDay,
        color: formData.color,
        type: formData.type,
        location: formData.location.trim() || undefined,
        attendees: formData.attendees.trim() ? formData.attendees.split(',').map(a => a.trim()) : undefined,
        notes: formData.notes.trim() || undefined
      }

    onSave(eventData)
  }

  const handleDelete = () => {
    if (event && onDelete) {
      if (window.confirm('Are you sure you want to delete this event?')) {
        onDelete(event.id)
      }
    }
  }

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' }
  ]

  const typeOptions = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'showing', label: 'Property Showing' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'closing', label: 'Closing' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="mx-auto w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900">
              {event ? 'Edit Event' : 'New Event'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Event description"
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData(prev => ({ ...prev, allDay: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allDay" className="ml-2 text-sm text-gray-700">
                All day event
              </label>
            </div>

            {/* Date/Time */}
            {!formData.allDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
                    Start *
                  </label>
                  <input
                    type="datetime-local"
                    id="start"
                    value={formData.start}
                    onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.start ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors.start && (
                    <p className="mt-1 text-sm text-red-600">{errors.start}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
                    End *
                  </label>
                  <input
                    type="datetime-local"
                    id="end"
                    value={formData.end}
                    onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.end ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors.end && (
                    <p className="mt-1 text-sm text-red-600">{errors.end}</p>
                  )}
                </div>
              </div>
            )}

            {/* Color and Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value as CalendarEvent['color'] }))}
                      className={`w-6 h-6 rounded-full ${color.class} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as CalendarEvent['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  {typeOptions.map((type) => (
                    <option key={type.value} value={type.value} className="text-gray-900 bg-white">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Event location"
              />
            </div>

            {/* Attendees */}
            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-1">
                Attendees
              </label>
              <input
                type="text"
                id="attendees"
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Separate with commas"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Additional notes"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 space-y-3 sm:space-y-0">
              <div className="flex items-center justify-center sm:justify-start">
                {event && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full sm:w-auto"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {event ? 'Update' : 'Create'} Event
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
