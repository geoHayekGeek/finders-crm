'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X, ChevronDown, MapPin, RefreshCw, Plus, Search } from 'lucide-react'
import { CalendarLocation } from '@/types/location'
import { locationsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface LocationSelectorProps {
  selectedLocationId?: number | null
  selectedLocationName?: string
  onLocationChange: (location: CalendarLocation | undefined) => void
  placeholder?: string
}

export function LocationSelector({
  selectedLocationId,
  selectedLocationName,
  onLocationChange,
  placeholder = 'Select a location...'
}: LocationSelectorProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [locations, setLocations] = useState<CalendarLocation[]>([])
  const [selectedLocationDetails, setSelectedLocationDetails] = useState<CalendarLocation | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [quickAddErrors, setQuickAddErrors] = useState({ name: '', description: '' })
  const [quickAddForm, setQuickAddForm] = useState({ name: '', description: '' })

  useEffect(() => {
    if (showQuickAddModal) {
      setQuickAddForm({ name: '', description: '' })
      setQuickAddErrors({ name: '', description: '' })
    }
  }, [showQuickAddModal])

  const fetchLocations = async (query = '') => {
    if (!token) return

    setIsLoading(true)
    try {
      const response = query.trim()
        ? await locationsApi.search(query.trim(), token)
        : await locationsApi.getAll(token)

      if (response.success) {
        setLocations(response.data || [])
      } else {
        showError('Failed to load locations')
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      showError('Failed to load locations')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLocationById = async (locationId: number) => {
    if (!token || !locationId) return

    try {
      const response = await locationsApi.getById(locationId, token)
      if (response.success && response.data) {
        setSelectedLocationDetails(response.data)
      }
    } catch (error) {
      console.error('Error loading selected location:', error)
    }
  }

  useEffect(() => {
    if (!token || !isDropdownOpen) return

    const timeout = setTimeout(() => {
      void fetchLocations(searchTerm)
    }, searchTerm.trim() ? 250 : 0)

    return () => clearTimeout(timeout)
  }, [token, isDropdownOpen, searchTerm])

  useEffect(() => {
    if (!token) {
      setSelectedLocationDetails(null)
      return
    }

    if (selectedLocationId === undefined || selectedLocationId === null) {
      setSelectedLocationDetails(null)
      return
    }

    const existingLocation = locations.find(location => Number(location.id) === Number(selectedLocationId))
    if (existingLocation) {
      setSelectedLocationDetails(existingLocation)
      return
    }

    if (selectedLocationDetails?.id !== Number(selectedLocationId)) {
      setSelectedLocationDetails(null)
      void fetchLocationById(Number(selectedLocationId))
    }
  }, [token, selectedLocationId, locations, selectedLocationDetails?.id])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocationSelect = (location: CalendarLocation) => {
    onLocationChange(location)
    setSelectedLocationDetails(location)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onLocationChange(undefined)
    setSelectedLocationDetails(null)
    setSearchTerm('')
  }

  const validateQuickAdd = () => {
    const errors = { name: '', description: '' }
    let valid = true

    if (!quickAddForm.name.trim()) {
      errors.name = 'Location name is required'
      valid = false
    } else if (quickAddForm.name.trim().length > 255) {
      errors.name = 'Location name must be 255 characters or less'
      valid = false
    }

    if (quickAddForm.description && quickAddForm.description.length > 1000) {
      errors.description = 'Description must be 1000 characters or less'
      valid = false
    }

    setQuickAddErrors(errors)
    return valid
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateQuickAdd()) return
    if (!token) {
      showError('Authentication required. Please log in again.')
      return
    }

    setIsSaving(true)
    try {
      const response = await locationsApi.create({
        name: quickAddForm.name.trim(),
        description: quickAddForm.description.trim() || undefined,
        is_active: true
      }, token)

      if (response.success && response.data) {
        const newLocation = response.data
        setLocations(prev => [newLocation, ...prev.filter(location => location.id !== newLocation.id)])
        setSelectedLocationDetails(newLocation)
        onLocationChange(newLocation)
        setIsDropdownOpen(false)
        setSearchTerm('')
        setShowQuickAddModal(false)
        setQuickAddForm({ name: '', description: '' })
        setQuickAddErrors({ name: '', description: '' })
        showSuccess('Location created successfully!')
      } else {
        showError(response.message || 'Failed to create location')
      }
    } catch (error: any) {
      console.error('Error creating location:', error)
      showError(error?.message || 'Failed to create location')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedLabel = selectedLocationDetails?.name || selectedLocationName || ''

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(prev => {
            const next = !prev
            if (!next) {
              setSearchTerm('')
            }
            return next
          })}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          <div className="flex items-center min-w-0">
            <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className={`truncate ${selectedLabel ? 'text-gray-900' : 'text-gray-500'}`}>
              {selectedLabel || placeholder}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>

        {selectedLabel && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Clear location
          </button>
        )}

        {isDropdownOpen && (
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-3 border-b border-gray-200 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void fetchLocations(searchTerm)}
                  className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                  title="Refresh locations"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                  className="p-2 border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50"
                  title="Add location"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">Loading locations...</div>
              ) : locations.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  {searchTerm ? 'No locations found' : 'No locations available'}
                </div>
              ) : (
                <div className="py-1">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center justify-between gap-3 ${
                        Number(selectedLocationId) === Number(location.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-sm font-medium text-gray-900">{location.name}</span>
                        </div>
                        {location.description && (
                          <div className="mt-0.5 text-xs text-gray-500 truncate">{location.description}</div>
                        )}
                      </div>
                      {!location.is_active && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showQuickAddModal} onClose={() => setShowQuickAddModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-md rounded-xl bg-white shadow-2xl">
            <form onSubmit={handleQuickAddSubmit}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900">Add Location</Dialog.Title>
                  <p className="text-sm text-gray-500">Create a predefined location for calendar events.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={quickAddForm.name}
                    onChange={(e) => {
                      setQuickAddForm(prev => ({ ...prev, name: e.target.value }))
                      setQuickAddErrors(prev => ({ ...prev, name: '' }))
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${quickAddErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="e.g. Downtown Office"
                  />
                  {quickAddErrors.name && <p className="mt-1 text-sm text-red-600">{quickAddErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={quickAddForm.description}
                    onChange={(e) => {
                      setQuickAddForm(prev => ({ ...prev, description: e.target.value }))
                      setQuickAddErrors(prev => ({ ...prev, description: '' }))
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${quickAddErrors.description ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Optional notes about this location"
                  />
                  {quickAddErrors.description && <p className="mt-1 text-sm text-red-600">{quickAddErrors.description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Create Location'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
}
