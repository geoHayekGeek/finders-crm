'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, TrashIcon, UserIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { CalendarEvent, Property, Lead } from '@/app/dashboard/calendar/page'
import { UserSelector } from './UserSelector'
import { LocationSelector } from './LocationSelector'
import { useToast } from '@/contexts/ToastContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useAuth } from '@/contexts/AuthContext'
import { calendarApi } from '@/utils/api'

interface EventUser {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface EventPermissions {
  canEdit: boolean
  canDelete: boolean
  reason: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  selectedDate: Date
  onSave: (event: Omit<CalendarEvent, 'id'> | CalendarEvent) => void
  onDelete?: (eventId: string) => void
  permissions?: EventPermissions
}

export function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSave,
  onDelete,
  permissions
}: EventModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    color: 'blue' as CalendarEvent['color'],
    type: 'other' as CalendarEvent['type'],
    locationId: null as number | null,
    locationText: '',
    attendees: [] as EventUser[],
    notes: '',
    propertyId: null as number | null,
    leadId: null as number | null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [properties, setProperties] = useState<Property[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [propertySearchTerm, setPropertySearchTerm] = useState('')
  const [leadSearchTerm, setLeadSearchTerm] = useState('')
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false)
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locationAvailability, setLocationAvailability] = useState<{
    status: 'idle' | 'checking' | 'available' | 'unavailable' | 'error'
    conflictCount: number
  }>({
    status: 'idle',
    conflictCount: 0
  })
  const propertyDropdownRef = useRef<HTMLDivElement>(null)
  const leadDropdownRef = useRef<HTMLDivElement>(null)
  const propertySearchInputRef = useRef<HTMLInputElement>(null)
  const leadSearchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setLocationAvailability({ status: 'idle', conflictCount: 0 })
      setPropertySearchTerm('')
      setLeadSearchTerm('')
      setProperties([])
      setLeads([])
      setLoadingProperties(false)
      setLoadingLeads(false)
      setIsPropertyDropdownOpen(false)
      setIsLeadDropdownOpen(false)
      return
    }

    if (event) {
      // Editing existing event - convert attendee strings to EventUser objects
      const attendeeUsers: EventUser[] = event.attendees?.map((attendee, index) => ({
        id: index + 1000, // Generate unique ID for existing attendees
        name: attendee,
        email: '',
        role: '',
        location: '',
        phone: ''
      })) || []

      // Convert dates to local timezone for the datetime-local input
      const startLocal = new Date(event.start.getTime() - (event.start.getTimezoneOffset() * 60000))
      const endLocal = new Date(event.end.getTime() - (event.end.getTimezoneOffset() * 60000))


      setFormData({
        title: event.title,
        description: event.description || '',
        start: startLocal.toISOString().slice(0, 16),
        end: endLocal.toISOString().slice(0, 16),
        allDay: event.allDay,
        color: event.color,
        type: event.type,
        locationId: event.locationId || null,
        locationText: event.locationName || event.location || '',
        attendees: attendeeUsers,
        notes: event.notes || '',
        propertyId: event.propertyId || null,
        leadId: event.leadId || null
      })
    } else {
      // Creating new event
      const startDate = new Date(selectedDate)
      // Use the hour from selectedDate if it's set, otherwise default to 9 AM
      if (selectedDate.getHours() === 0 && selectedDate.getMinutes() === 0 && selectedDate.getSeconds() === 0) {
        // If selectedDate is at midnight (default), use 9 AM
        startDate.setHours(9, 0, 0, 0)
      }
      // Otherwise, keep the hour from selectedDate (from hour click)

      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 1, 0, 0, 0) // Set end time to 1 hour after start

      // Convert to local timezone for the datetime-local input
      const startLocal = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000))
      const endLocal = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000))

      setFormData({
        title: '',
        description: '',
        start: startLocal.toISOString().slice(0, 16),
        end: endLocal.toISOString().slice(0, 16),
        allDay: false,
        color: 'blue',
        type: 'other',
        locationId: null,
        locationText: '',
        attendees: [],
        notes: '',
        propertyId: null,
        leadId: null
      })
    }

    setErrors({})
    setLocationAvailability({ status: 'idle', conflictCount: 0 })
    setProperties([])
    setLeads([])
    setPropertySearchTerm('')
    setLeadSearchTerm('')
    setIsPropertyDropdownOpen(false)
    setIsLeadDropdownOpen(false)
  }, [event, selectedDate, isOpen])

  useEffect(() => {
    if (!isOpen || !token) {
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoadingProperties(true)
      try {
        const response = await calendarApi.getProperties(token, {
          search: propertySearchTerm.trim() || undefined,
          page: 1,
          limit: 20
        })

        if (cancelled) return

        if (response.success) {
          setProperties(response.properties || [])
        } else {
          setProperties([])
          showError('Failed to load properties. Please try again.')
        }
      } catch (error) {
        if (!cancelled) {
          setProperties([])
          showError('Failed to load properties. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoadingProperties(false)
        }
      }
    }, propertySearchTerm.trim() ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [isOpen, token, propertySearchTerm])

  useEffect(() => {
    if (!isOpen || !token) {
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoadingLeads(true)
      try {
        const response = await calendarApi.getLeads(token, {
          search: leadSearchTerm.trim() || undefined,
          page: 1,
          limit: 20
        })

        if (cancelled) return

        if (response.success) {
          setLeads(response.leads || [])
        } else {
          setLeads([])
          showError('Failed to load leads. Please try again.')
        }
      } catch (error) {
        if (!cancelled) {
          setLeads([])
          showError('Failed to load leads. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoadingLeads(false)
        }
      }
    }, leadSearchTerm.trim() ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [isOpen, token, leadSearchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(target)) {
        setIsPropertyDropdownOpen(false)
      }
      if (leadDropdownRef.current && !leadDropdownRef.current.contains(target)) {
        setIsLeadDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isPropertyDropdownOpen) {
      setTimeout(() => propertySearchInputRef.current?.focus(), 0)
    }
  }, [isPropertyDropdownOpen])

  useEffect(() => {
    if (isLeadDropdownOpen) {
      setTimeout(() => leadSearchInputRef.current?.focus(), 0)
    }
  }, [isLeadDropdownOpen])

  useEffect(() => {
    if (!isOpen) return

    if (!formData.locationId) {
      setLocationAvailability({ status: 'idle', conflictCount: 0 })
      return
    }

    if (!formData.start || !formData.end) {
      setLocationAvailability({ status: 'idle', conflictCount: 0 })
      return
    }

    const startDate = new Date(formData.start)
    const endDate = new Date(formData.end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      setLocationAvailability({ status: 'idle', conflictCount: 0 })
      return
    }

    let cancelled = false
    setLocationAvailability(prev => ({ ...prev, status: 'checking' }))

    const timeout = setTimeout(async () => {
      try {
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await calendarApi.checkLocationAvailability(
          {
            locationId: formData.locationId as number,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            eventId: event?.id
          },
          token
        )

        if (cancelled) return

        if (response.success && response.data) {
          setLocationAvailability({
            status: response.data.available ? 'available' : 'unavailable',
            conflictCount: response.data.conflictCount || 0
          })
        } else {
          setLocationAvailability({ status: 'error', conflictCount: 0 })
        }
      } catch (error) {
        if (!cancelled) {
          setLocationAvailability({ status: 'error', conflictCount: 0 })
        }
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [isOpen, formData.locationId, formData.start, formData.end, token, event?.id])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required field: Title
    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Event title must be at least 3 characters'
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Event title must be less than 100 characters'
    }

    // Required fields: Start and End time (when not all-day)
    if (!formData.allDay) {
      if (!formData.start) {
        newErrors.start = 'Start time is required'
      }
      if (!formData.end) {
        newErrors.end = 'End time is required'
      }

      // Validate time logic
      if (formData.start && formData.end) {
        const start = new Date(formData.start)
        const end = new Date(formData.end)
        
        if (start >= end) {
          newErrors.end = 'End time must be after start time'
        }
        
        // Check if event is too long (more than 24 hours)
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        if (durationHours > 24) {
          newErrors.end = 'Event duration cannot exceed 24 hours'
        }
        
        // Check if event is in the past (more than 1 hour ago)
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))
        if (start < oneHourAgo) {
          newErrors.start = 'Event cannot be scheduled more than 1 hour in the past'
        }
      }
    }

    // Optional field validation: Description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    // Optional field validation: Location label
    if (formData.locationText && formData.locationText.length > 255) {
      newErrors.location = 'Location must be less than 255 characters'
    }

    // Optional field validation: Notes
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters'
    }

    // Validate attendees (optional but if provided, should be valid)
    if (formData.attendees.length > 10) {
      newErrors.attendees = 'Maximum 10 attendees allowed'
    }

    // Validate attendees have names
    const invalidAttendees = formData.attendees.filter(attendee => !attendee.name.trim())
    if (invalidAttendees.length > 0) {
      newErrors.attendees = 'All attendees must have names'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Clear validation error for a specific field
  const clearFieldError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form first
    if (!validateForm()) {
      showError('Please fix the validation errors before saving')
      return
    }

    setSaving(true)
    try {
      const startDate = new Date(formData.start)
      const endDate = new Date(formData.end)

      // Convert attendees to array of names for backward compatibility
      const attendeeNames = formData.attendees.map(user => user.name)

      const eventData = event
        ? { 
            ...event, 
            ...formData, 
            title: formData.title.trim(), 
            description: formData.description.trim() || undefined, 
            start: startDate, 
            end: endDate, 
            allDay: formData.allDay, 
            color: formData.color, 
            type: formData.type, 
            locationId: formData.locationId,
            location: formData.locationText.trim() || undefined, 
            attendees: attendeeNames, 
            notes: formData.notes.trim() || undefined,
            propertyId: formData.propertyId,
            leadId: formData.leadId
          }
        : {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            start: startDate,
            end: endDate,
            allDay: formData.allDay,
            color: formData.color,
            type: formData.type,
            locationId: formData.locationId,
            location: formData.locationText.trim() || undefined,
            attendees: attendeeNames,
            notes: formData.notes.trim() || undefined,
            propertyId: formData.propertyId,
            leadId: formData.leadId
          }

      await onSave(eventData)
      
      // Success toast will be shown by the parent component
      // Clear validation errors on successful save
      setErrors({})
      
    } catch (error) {
      showError('Failed to save event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleDelete = async () => {
    if (event && onDelete) {
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = async () => {
    if (event && onDelete) {
      try {
        await onDelete(event.id)
        setShowDeleteModal(false)
        // Success toast will be shown by the parent component
      } catch (error) {
        showError('Failed to delete event. Please try again.')
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
    { value: 'viewing', label: 'Property Viewing' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'closing', label: 'Closing' },
    { value: 'other', label: 'Other' }
  ]

  const locationUnavailable = Boolean(formData.locationId && locationAvailability.status === 'unavailable')

  const availabilityUI = (() => {
    if (!formData.locationId) {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
          <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700">Location availability</p>
            <p className="text-sm text-gray-500">Select a location to check whether it is free for the chosen time.</p>
          </div>
        </div>
      )
    }

    if (locationAvailability.status === 'checking') {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-3">
          <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-900">Checking availability</p>
            <p className="text-sm text-teal-700">Please wait while we verify the selected time slot.</p>
          </div>
        </div>
      )
    }

    if (locationAvailability.status === 'available') {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-900">Location available</p>
            <p className="text-sm text-emerald-700">This location is free for the selected time.</p>
          </div>
        </div>
      )
    }

    if (locationAvailability.status === 'unavailable') {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-rose-900">Location unavailable</p>
            <p className="text-sm text-rose-700">
              This location is already occupied for the selected time.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
        <InformationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900">Could not verify availability</p>
          <p className="text-sm text-amber-700">Try again in a moment, or save if you need to continue.</p>
        </div>
      </div>
    )
  })()

  const propertyOptions: Property[] = formData.propertyId
    ? (
        properties.some(property => property.id === formData.propertyId)
          ? properties
          : [
              {
                id: formData.propertyId,
                reference_number: event?.propertyReference || `Property #${formData.propertyId}`,
                location: event?.propertyLocation || 'Selected property'
              },
              ...properties
            ]
      )
    : properties

  const leadOptions: Lead[] = formData.leadId
    ? (
        leads.some(lead => lead.id === formData.leadId)
          ? leads
          : [
              {
                id: formData.leadId,
                customer_name: event?.leadName || `Lead #${formData.leadId}`,
                phone_number: event?.leadPhone
              },
              ...leads
            ]
      )
    : leads

  const selectedProperty = formData.propertyId
    ? propertyOptions.find(property => property.id === formData.propertyId)
    : null

  const selectedLead = formData.leadId
    ? leadOptions.find(lead => lead.id === formData.leadId)
    : null

  const handleSelectProperty = (propertyId: number | null) => {
    setFormData(prev => ({
      ...prev,
      propertyId
    }))
    setIsPropertyDropdownOpen(false)
    setPropertySearchTerm('')
  }

  const handleSelectLead = (leadId: number | null) => {
    setFormData(prev => ({
      ...prev,
      leadId
    }))
    setIsLeadDropdownOpen(false)
    setLeadSearchTerm('')
  }

  const handleClearProperty = () => {
    handleSelectProperty(null)
  }

  const handleClearLead = () => {
    handleSelectLead(null)
  }

  return (
    <>
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="mx-auto w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900">
                {event ? 'Edit Event' : 'New Event'}
              </Dialog.Title>
              {event?.createdByName && (
                <div className="mt-0.5 text-xs text-gray-500">Created by {event.createdByName}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-gray-50 border border-gray-200 hover:border-gray-300"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
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
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                  clearFieldError('title')
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Created by (read-only) */}
            {event?.createdByName && (
              <div className="-mt-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Created by</label>
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{event.createdByName}</span>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                  clearFieldError('description')
                }}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Event description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
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
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, start: e.target.value }))
                      clearFieldError('start')
                    }}
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
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, end: e.target.value }))
                      clearFieldError('end')
                    }}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <LocationSelector
                selectedLocationId={formData.locationId}
                selectedLocationName={formData.locationText}
                onLocationChange={(location) => {
                  setFormData(prev => ({
                    ...prev,
                    locationId: location?.id || null,
                    locationText: location?.name || ''
                  }))
                  clearFieldError('location')
                }}
                placeholder="Select a predefined location..."
              />
              <div className="mt-2">
                {availabilityUI}
              </div>
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* Property and Lead Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div ref={propertyDropdownRef} className="relative">
                <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
                  Related Property
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsLeadDropdownOpen(false)
                    setIsPropertyDropdownOpen(prev => !prev)
                  }}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  disabled={loadingProperties}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`truncate ${selectedProperty ? 'text-gray-900' : 'text-gray-600'}`}>
                      {loadingProperties ? 'Loading...' : (selectedProperty ? `${selectedProperty.reference_number} - ${selectedProperty.location}` : 'Select a property...')}
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isPropertyDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isPropertyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        ref={propertySearchInputRef}
                        type="text"
                        value={propertySearchTerm}
                        onChange={(e) => setPropertySearchTerm(e.target.value)}
                        placeholder="Search properties by reference or location..."
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {loadingProperties ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          Loading properties...
                        </div>
                      ) : properties.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {propertySearchTerm ? 'No properties found matching your search' : 'No properties available'}
                        </div>
                      ) : (
                        <div>
                          {properties.map((property) => (
                            <button
                              key={property.id}
                              type="button"
                              onClick={() => handleSelectProperty(property.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${formData.propertyId === property.id ? 'bg-blue-50' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">{property.reference_number}</div>
                                  <div className="text-xs text-gray-600 truncate">{property.location}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={leadDropdownRef} className="relative">
                <label htmlFor="lead" className="block text-sm font-medium text-gray-700 mb-1">
                  Related Lead
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsPropertyDropdownOpen(false)
                    setIsLeadDropdownOpen(prev => !prev)
                  }}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  disabled={loadingLeads}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`truncate ${selectedLead ? 'text-gray-900' : 'text-gray-600'}`}>
                      {loadingLeads ? 'Loading...' : (selectedLead ? `${selectedLead.customer_name}${selectedLead.phone_number ? ` - ${selectedLead.phone_number}` : ''}` : 'Select a lead...')}
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isLeadDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isLeadDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        ref={leadSearchInputRef}
                        type="text"
                        value={leadSearchTerm}
                        onChange={(e) => setLeadSearchTerm(e.target.value)}
                        placeholder="Search leads by name or phone..."
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {loadingLeads ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          Loading leads...
                        </div>
                      ) : leads.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {leadSearchTerm ? 'No leads found matching your search' : 'No leads available'}
                        </div>
                      ) : (
                        <div>
                          {leads.map((lead) => (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => handleSelectLead(lead.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${formData.leadId === lead.id ? 'bg-blue-50' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">{lead.customer_name}</div>
                                  {lead.phone_number && (
                                    <div className="text-xs text-gray-600 truncate">{lead.phone_number}</div>
                                  )}
                                </div>
                                <div className="ml-3 flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <UserIcon className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Show selected property/lead info */}
            {formData.propertyId && (() => {
              const selectedProperty = propertyOptions.find(p => p.id === formData.propertyId)
              const propertyRef = selectedProperty?.reference_number || event?.propertyReference || 'N/A'
              
              return (
                <div 
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (formData.propertyId) {
                      const url = `/dashboard/properties?view=${formData.propertyId}`
                      window.open(url, '_blank')
                    }
                  }}
                  title="Click to view property details"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-blue-800">
                          Property Event
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          Reference: <span className="font-semibold">{propertyRef}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleClearProperty()
                        }}
                        className="p-1 rounded-full text-blue-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Clear property"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <div className="text-blue-600 text-xs font-medium">
                        View
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {formData.leadId && (() => {
              const selectedLead = leadOptions.find(l => l.id === formData.leadId)
              const leadName = selectedLead?.customer_name || event?.leadName || 'N/A'
              
              return (
                <div 
                  className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 hover:border-green-300 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (formData.leadId) {
                      const url = `/dashboard/leads?view=${formData.leadId}`
                      window.open(url, '_blank')
                    }
                  }}
                  title="Click to view lead details"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-green-800">
                          Lead Event
                        </p>
                        <p className="text-xs text-green-600 truncate">
                          Lead: <span className="font-semibold">{leadName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleClearLead()
                        }}
                        className="p-1 rounded-full text-green-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Clear lead"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <div className="text-green-600 text-xs font-medium">
                        View
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Attendees - Now using UserSelector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendees
              </label>
              <UserSelector
                selectedUsers={formData.attendees}
                onUsersChange={(users) => {
                  setFormData(prev => ({ ...prev, attendees: users }))
                  clearFieldError('attendees')
                }}
                placeholder="Search and select attendees..."
                maxUsers={20}
              />
              {errors.attendees && (
                <p className="mt-1 text-sm text-red-600">{errors.attendees}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, notes: e.target.value }))
                  clearFieldError('notes')
                }}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${errors.notes ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Additional notes"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 space-y-3 sm:space-y-0">
              <div className="flex items-center justify-center sm:justify-start">
                {event && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!permissions?.canDelete}
                    className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors w-full sm:w-auto ${
                      permissions?.canDelete
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                    title={!permissions?.canDelete ? permissions?.reason : 'Delete event'}
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
                  disabled={saving || locationAvailability.status === 'checking' || locationUnavailable || (event && !permissions?.canEdit) || false}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    saving || locationAvailability.status === 'checking' || locationUnavailable || (event && !permissions?.canEdit)
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-white bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={
                    locationUnavailable
                      ? 'Selected location is not available for this time'
                      : event && !permissions?.canEdit
                        ? permissions?.reason
                        : undefined
                  }
                >
                  {saving ? 'Saving...' : (event ? 'Update' : 'Create')} Event
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>

    {/* Delete Confirmation Modal */}
    {event && (
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete the event "${event.title}"?\n\nThis action cannot be undone.`}
        confirmText="Delete Event"
        variant="danger"
      />
    )}
  </>
  )
}
