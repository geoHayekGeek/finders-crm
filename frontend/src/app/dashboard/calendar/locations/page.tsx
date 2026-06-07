'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Circle, FileText, MapPin } from 'lucide-react'
import { CalendarLocation } from '@/types/location'
import { locationsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, RequireCategoryStatusAccess } from '@/contexts/PermissionContext'
import LocationTable from '@/components/locations/LocationTable'
import LocationModal from '@/components/locations/LocationModal'
import LocationDeleteModal from '@/components/locations/LocationDeleteModal'

export default function CalendarLocationsPage() {
  const { token, isAuthenticated } = useAuth()
  const { canManageCategoriesAndStatuses } = usePermissions()

  const [locations, setLocations] = useState<CalendarLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<CalendarLocation | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      void loadLocations()
    }
  }, [isAuthenticated])

  const loadLocations = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!isAuthenticated || !token) {
        setError('You must be logged in to view locations')
        return
      }

      const response = await locationsApi.getAllForAdmin(token || undefined)

      if (response.success) {
        setLocations(response.data || [])
      } else {
        setError('Failed to load locations')
      }
    } catch (err) {
      console.error('Error loading locations:', err)
      setError('Failed to load locations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredLocations = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return locations.filter(location =>
      location.name.toLowerCase().includes(term) ||
      (location.description || '').toLowerCase().includes(term)
    )
  }, [locations, searchTerm])

  const handleAddLocation = () => {
    setSelectedLocation(null)
    setShowAddModal(true)
  }

  const handleEditLocation = (location: CalendarLocation) => {
    setSelectedLocation(location)
    setShowEditModal(true)
  }

  const handleDeleteLocation = (location: CalendarLocation) => {
    setSelectedLocation(location)
    setShowDeleteModal(true)
  }

  const handleLocationSaved = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedLocation(null)
    void loadLocations()
  }

  const handleLocationDeleted = () => {
    setShowDeleteModal(false)
    setSelectedLocation(null)
    void loadLocations()
  }

  return (
    <RequireCategoryStatusAccess>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
              <p className="text-gray-600">Manage predefined calendar locations used in event creation and filtering</p>
            </div>
          </div>

          {canManageCategoriesAndStatuses && (
            <button
              onClick={handleAddLocation}
              className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Add Location</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="input-with-icon relative flex-1">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Circle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.filter(location => location.is_active).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Circle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.filter(location => !location.is_active).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Used in Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.filter(location => (location.event_count || 0) > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading locations...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Locations</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadLocations}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No locations found' : 'No locations yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by adding your first location'
                }
              </p>
              {canManageCategoriesAndStatuses && !searchTerm && (
                <button
                  onClick={handleAddLocation}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors duration-200"
                >
                  Add Location
                </button>
              )}
            </div>
          ) : (
            <LocationTable
              locations={filteredLocations}
              onEdit={handleEditLocation}
              onDelete={handleDeleteLocation}
              canManage={canManageCategoriesAndStatuses}
            />
          )}
        </div>

        <LocationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleLocationSaved}
          title="Add Location"
        />

        {selectedLocation && (
          <LocationModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={handleLocationSaved}
            location={selectedLocation}
            title="Edit Location"
          />
        )}

        {selectedLocation && (
          <LocationDeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onSuccess={handleLocationDeleted}
            location={selectedLocation}
          />
        )}
      </div>
    </RequireCategoryStatusAccess>
  )
}
