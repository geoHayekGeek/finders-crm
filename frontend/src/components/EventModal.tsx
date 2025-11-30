'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'
import { CalendarEvent, Property, Lead } from '@/app/dashboard/calendar/page'
import { UserSelector } from './UserSelector'
import { useToast } from '@/contexts/ToastContext'
import { ConfirmationModal } from '@/components/ConfirmationModal'

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
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    color: 'blue' as CalendarEvent['color'],
    type: 'other' as CalendarEvent['type'],
    location: '',
    attendees: [] as EventUser[],
    notes: '',
    propertyId: null as number | null,
    leadId: null as number | null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [properties, setProperties] = useState<Property[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)
  const [saving, setSaving] = useState(false)

  // Debug form data changes
  useEffect(() => {
    console.log('🔄 FORM DATA CHANGED:', {
      propertyId: formData.propertyId,
      leadId: formData.leadId,
      propertiesLoaded: properties.length,
      leadsLoaded: leads.length,
      loadingDropdowns: loadingDropdowns
    })
    
    if (formData.propertyId) {
      const selectedProperty = properties.find(p => p.id === formData.propertyId)
      console.log('🏠 Selected property details:', selectedProperty)
    }
    
    if (formData.leadId) {
      const selectedLead = leads.find(l => l.id === formData.leadId)
      console.log('👤 Selected lead details:', selectedLead)
    }
  }, [formData.propertyId, formData.leadId, properties.length, leads.length, loadingDropdowns, properties, leads])

  useEffect(() => {
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

      console.log('🎭 MODAL OPENED FOR EDITING EVENT!')
      console.log('📋 Event data received in modal:', {
        id: event.id,
        title: event.title,
        propertyId: event.propertyId,
        propertyReference: event.propertyReference,
        propertyLocation: event.propertyLocation,
        leadId: event.leadId,
        leadName: event.leadName,
        leadPhone: event.leadPhone
      })
      
      console.log('🎯 Form data will be set with:', {
        propertyId: event.propertyId || null,
        leadId: event.leadId || null
      })
      
      console.log('📊 Current dropdown state:', {
        propertiesLoaded: properties.length,
        leadsLoaded: leads.length,
        loadingDropdowns: loadingDropdowns
      })

      setFormData({
        title: event.title,
        description: event.description || '',
        start: startLocal.toISOString().slice(0, 16),
        end: endLocal.toISOString().slice(0, 16),
        allDay: event.allDay,
        color: event.color,
        type: event.type,
        location: event.location || '',
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
        location: '',
        attendees: [],
        notes: '',
        propertyId: null,
        leadId: null
      })
    }
    setErrors({})
  }, [event, selectedDate, isOpen])

  // Update form data when properties/leads are loaded and we have an event
  useEffect(() => {
    console.log('🔄 Checking if should update form data after dropdowns loaded:', {
      hasEvent: !!event,
      loadingDropdowns: loadingDropdowns,
      propertiesCount: properties.length,
      leadsCount: leads.length,
      eventPropertyId: event?.propertyId,
      eventLeadId: event?.leadId
    })
    
    if (event && !loadingDropdowns && (properties.length > 0 || leads.length > 0)) {
      console.log('✅ UPDATING FORM DATA AFTER DROPDOWNS LOADED!')
      console.log('🎯 Setting propertyId to:', event.propertyId || null)
      console.log('🎯 Setting leadId to:', event.leadId || null)
      
      setFormData(prev => {
        const newFormData = {
          ...prev,
          propertyId: event.propertyId || null,
          leadId: event.leadId || null
        }
        console.log('📝 New form data after update:', newFormData)
        return newFormData
      })
    }
  }, [event, loadingDropdowns, properties.length, leads.length])

  // Load properties and leads for dropdowns
  useEffect(() => {
    if (isOpen) {
      const loadDropdownData = async () => {
        setLoadingDropdowns(true)
        try {
          const token = localStorage.getItem('token')
          const [propertiesResponse, leadsResponse] = await Promise.all([
            fetch('http://localhost:10000/api/calendar/properties', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch('http://localhost:10000/api/calendar/leads', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
          ])

          console.log('📡 Properties API response status:', propertiesResponse.status)
          console.log('📡 Leads API response status:', leadsResponse.status)

          if (propertiesResponse.ok) {
            const propertiesData = await propertiesResponse.json()
            console.log('📦 Properties API data:', propertiesData)
            if (propertiesData.success) {
              console.log('✅ PROPERTIES LOADED:', propertiesData.properties.length)
              console.log('🏠 Properties list:', propertiesData.properties.map((p: any) => ({ id: p.id, ref: p.reference_number })))
              setProperties(propertiesData.properties)
            } else {
              console.error('❌ Properties API failed:', propertiesData.message)
            }
          } else {
            console.error('❌ Properties API request failed:', propertiesResponse.status)
          }

          if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json()
            console.log('📦 Leads API data:', leadsData)
            if (leadsData.success) {
              console.log('✅ LEADS LOADED:', leadsData.leads.length)
              console.log('👤 Leads list:', leadsData.leads.map((l: any) => ({ id: l.id, name: l.customer_name })))
              setLeads(leadsData.leads)
            } else {
              console.error('❌ Leads API failed:', leadsData.message)
            }
          } else {
            console.error('❌ Leads API request failed:', leadsResponse.status)
          }
        } catch (error) {
          console.error('Error loading dropdown data:', error)
        } finally {
          setLoadingDropdowns(false)
        }
      }

      loadDropdownData()
    }
  }, [isOpen])

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

    // Optional field validation: Location
    if (formData.location && formData.location.length > 200) {
      newErrors.location = 'Location must be less than 200 characters'
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
            location: formData.location.trim() || undefined, 
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
            location: formData.location.trim() || undefined,
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
      console.error('Error saving event:', error)
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
        console.error('Error deleting event:', error)
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
    { value: 'showing', label: 'Property Showing' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'closing', label: 'Closing' },
    { value: 'other', label: 'Other' }
  ]

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
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, location: e.target.value }))
                  clearFieldError('location')
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${errors.location ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Event location"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* Property and Lead Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
                  Related Property
                </label>
                <select
                  id="property"
                  value={(() => {
                    const value = formData.propertyId?.toString() || ''
                    console.log('🏠 Property dropdown rendering with value:', value)
                    console.log('🏠 Available properties:', properties.map(p => ({ id: p.id, ref: p.reference_number })))
                    console.log('🏠 Form data propertyId:', formData.propertyId)
                    return value
                  })()}
                  onChange={(e) => {
                    const value = e.target.value
                    console.log('🏠 Property selected:', value)
                    setFormData(prev => ({ 
                      ...prev, 
                      propertyId: value ? parseInt(value) : null
                    }))
                  }}
                  disabled={loadingDropdowns}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">Select a property...</option>
                  {properties.map((property) => {
                    console.log('🏠 Rendering property option:', { id: property.id, ref: property.reference_number })
                    return (
                      <option key={property.id} value={property.id} className="text-gray-900 bg-white">
                        {property.reference_number} - {property.location}
                      </option>
                    )
                  })}
                </select>
                {loadingDropdowns && (
                  <p className="mt-1 text-xs text-gray-500">Loading properties...</p>
                )}
              </div>

              <div>
                <label htmlFor="lead" className="block text-sm font-medium text-gray-700 mb-1">
                  Related Lead
                </label>
                <select
                  id="lead"
                  value={(() => {
                    const value = formData.leadId?.toString() || ''
                    console.log('👤 Lead dropdown rendering with value:', value)
                    console.log('👤 Available leads:', leads.map(l => ({ id: l.id, name: l.customer_name })))
                    console.log('👤 Form data leadId:', formData.leadId)
                    return value
                  })()}
                  onChange={(e) => {
                    const value = e.target.value
                    console.log('👤 Lead selected:', value)
                    setFormData(prev => ({ 
                      ...prev, 
                      leadId: value ? parseInt(value) : null
                    }))
                  }}
                  disabled={loadingDropdowns}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">Select a lead...</option>
                  {leads.map((lead) => {
                    console.log('👤 Rendering lead option:', { id: lead.id, name: lead.customer_name })
                    return (
                      <option key={lead.id} value={lead.id} className="text-gray-900 bg-white">
                        {lead.customer_name} {lead.phone_number ? `- ${lead.phone_number}` : ''}
                      </option>
                    )
                  })}
                </select>
                {loadingDropdowns && (
                  <p className="mt-1 text-xs text-gray-500">Loading leads...</p>
                )}
              </div>
            </div>

            {/* Show selected property/lead info */}
            {formData.propertyId && (() => {
              const selectedProperty = properties.find(p => p.id === formData.propertyId)
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
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      Property Event
                    </p>
                    <p className="text-xs text-blue-600">
                          Reference: <span className="font-semibold">{propertyRef}</span>
                    </p>
                  </div>
                </div>
                    <div className="text-blue-600 text-xs font-medium">
                      View →
              </div>
                  </div>
                </div>
              )
            })()}

            {formData.leadId && (() => {
              const selectedLead = leads.find(l => l.id === formData.leadId)
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
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Lead Event
                    </p>
                    <p className="text-xs text-green-600">
                          Lead: <span className="font-semibold">{leadName}</span>
                    </p>
                  </div>
                </div>
                    <div className="text-green-600 text-xs font-medium">
                      View →
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
                  disabled={saving || (event && !permissions?.canEdit) || false}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    saving || (event && !permissions?.canEdit)
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-white bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={event && !permissions?.canEdit ? permissions?.reason : undefined}
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
