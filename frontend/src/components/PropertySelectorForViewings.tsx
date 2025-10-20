// components/PropertySelectorForViewings.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Building2, RefreshCw } from 'lucide-react'
import { propertiesApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'

interface Property {
  id: number
  reference_number: string
  location: string
  property_type: string
}

interface PropertySelectorProps {
  selectedPropertyId?: number
  onSelect: (propertyId: number) => void
  error?: string
}

export default function PropertySelectorForViewings({ selectedPropertyId, onSelect, error }: PropertySelectorProps) {
  const { token } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch properties from database
  const fetchProperties = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const response = await propertiesApi.getAll(token)
      if (response.success) {
        setProperties(response.data)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchProperties()
    }
  }, [token])

  // Close dropdown when clicking outside
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

  const filteredProperties = properties.filter(property => {
    const searchLower = searchTerm.toLowerCase()
    return (
      property.reference_number.toLowerCase().includes(searchLower) ||
      property.location.toLowerCase().includes(searchLower) ||
      property.property_type.toLowerCase().includes(searchLower)
    )
  })

  const handleSelect = (property: Property) => {
    onSelect(property.id)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onSelect(0)
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Property <span className="text-red-500">*</span>
      </label>

      {/* Display selected property */}
      {selectedPropertyId && selectedProperty && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-800">
                {selectedProperty.reference_number}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600">{selectedProperty.location}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">
                  {selectedProperty.property_type}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-green-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear property"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropdown selector */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex-1 px-4 py-3 text-left border rounded-lg hover:border-green-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            <div className="flex items-center justify-between">
              <span className={selectedProperty ? "text-gray-900" : "text-gray-600"}>
                {loading ? 'Loading...' : (selectedProperty ? selectedProperty.reference_number : 'Select a property...')}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchProperties}
            disabled={loading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh properties"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>

            {/* Properties list */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                  Loading properties...
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No properties found matching your search' : 'No properties available'}
                </div>
              ) : (
                <div>
                  {filteredProperties.map(property => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => handleSelect(property)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{property.reference_number}</div>
                          <div className="text-xs text-gray-600">{property.location}</div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 capitalize">
                            {property.property_type}
                          </span>
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-green-600" />
                          </div>
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
  )
}

