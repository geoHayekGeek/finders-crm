'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Building2, 
  Plus,
  Grid3X3,
  List,
  Download,
  Upload,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { PropertyCard } from '@/components/PropertyCard'
import { PropertyFilters } from '@/components/PropertyFilters'
import { PropertyModals } from '@/components/PropertyModals'
import { PropertyPagination } from '@/components/PropertyPagination'
import { propertyColumns, propertyDetailedColumns } from '@/components/PropertyTableColumns'
import { Property, Category, Status, PropertyFilters as PropertyFiltersType } from '@/types/property'
import { propertiesApi, categoriesApi, statusesApi, mockProperties, mockCategories, mockStatuses } from '@/utils/api'

export default function PropertiesPage() {
  // State management
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // View and display state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showDetailedTable, setShowDetailedTable] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<PropertyFiltersType>({})
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  
  // Statistics state
  const [stats, setStats] = useState<any>(null)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Load all necessary data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to load from backend first, fallback to mock data
      let propertiesData: Property[] = []
      let categoriesData: Category[] = []
      let statusesData: Status[] = []
      
      try {
        // Load properties from demo endpoint (no authentication required)
        const propertiesResponse = await propertiesApi.getDemo()
        if (propertiesResponse.success) {
          propertiesData = propertiesResponse.data
          console.log('✅ Loaded properties from backend:', propertiesData.length)
        } else {
          throw new Error('Failed to load properties from backend')
        }
        
        // Load categories from demo endpoint (no authentication required)
        const categoriesResponse = await categoriesApi.getDemo()
        if (categoriesResponse.success) {
          categoriesData = categoriesResponse.data
          console.log('✅ Loaded categories from backend:', categoriesData.length)
        } else {
          throw new Error('Failed to load categories from backend')
        }
        
        // Load statuses from demo endpoint (no authentication required)
        const statusesResponse = await statusesApi.getDemo()
        if (statusesResponse.success) {
          statusesData = statusesResponse.data
          console.log('✅ Loaded statuses from backend:', statusesData.length)
        } else {
          throw new Error('Failed to load statuses from backend')
        }
        
        // Load statistics
        try {
          const statsResponse = await propertiesApi.getStats()
          if (statsResponse.success) {
            setStats(statsResponse.data)
          }
        } catch (statsError) {
          console.warn('Could not load statistics:', statsError)
        }
        
      } catch (apiError) {
        console.error('Failed to load data from backend:', apiError)
        setError('Failed to load data from backend. Please check your connection.')
        return
      }
      
      // Add action handlers to properties
      const propertiesWithActions = propertiesData.map(property => ({
        ...property,
        onView: handleViewProperty,
        onEdit: handleEditProperty,
        onDelete: handleDeleteProperty
      }))
      
      setProperties(propertiesWithActions)
      setCategories(categoriesData)
      setStatuses(statusesData)
      
    } catch (error) {
      setError('Failed to load properties data')
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter properties based on current filters
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const searchableFields = [
          property.reference_number,
          property.location,
          property.owner_name,
          property.building_name
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableFields.includes(searchTerm)) {
          return false
        }
      }
      
      // Status filter
      if (filters.status_id && property.status_id !== filters.status_id) {
        return false
      }
      
      // Category filter
      if (filters.category_id && property.category_id !== filters.category_id) {
        return false
      }
      
      // Price range filter
      if (filters.price_min && property.price && property.price < filters.price_min) {
        return false
      }
      if (filters.price_max && property.price && property.price > filters.price_max) {
        return false
      }
      
      // View type filter
      if (filters.view_type && property.view_type !== filters.view_type) {
        return false
      }
      
      return true
    })
  }, [properties, filters])

  // Paginate properties
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProperties.slice(startIndex, endIndex)
  }, [filteredProperties, currentPage, itemsPerPage])

  // Action handlers
  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowViewModal(true)
  }

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowEditModal(true)
  }

  const handleDeleteProperty = async (property: Property) => {
    if (confirm(`Are you sure you want to delete property ${property.reference_number}?`)) {
      try {
        // Try to delete from backend
        try {
          await propertiesApi.delete(property.id)
        } catch (apiError) {
          console.warn('Could not delete from backend:', apiError)
        }
        
        // Remove from local state
        setProperties(prev => prev.filter(p => p.id !== property.id))
      } catch (error) {
        console.error('Error deleting property:', error)
        alert('Failed to delete property')
      }
    }
  }

  const handleAddProperty = async (propertyData: any) => {
    try {
      // Try to create in backend
      let newProperty: Property
      try {
        const response = await propertiesApi.create(propertyData)
        if (response.success) {
          newProperty = response.data
        } else {
          throw new Error(response.message || 'Failed to create property')
        }
      } catch (apiError) {
        console.warn('Could not create in backend:', apiError)
        // Create mock property for demo
        newProperty = {
          id: Date.now(),
          reference_number: `FA${new Date().getFullYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          status_id: propertyData.status_id,
          status_name: statuses.find(s => s.id === propertyData.status_id)?.name || 'Active',
          status_color: statuses.find(s => s.id === propertyData.status_id)?.color || '#10B981',
          location: propertyData.location,
          category_id: propertyData.category_id,
          category_name: categories.find(c => c.id === propertyData.category_id)?.name || 'Unknown',
          category_code: categories.find(c => c.id === propertyData.category_id)?.code || 'U',
          building_name: propertyData.building_name,
          owner_name: propertyData.owner_name,
          phone_number: propertyData.phone_number,
          surface: propertyData.surface,
          details: propertyData.details,
          interior_details: propertyData.interior_details,
          built_year: propertyData.built_year,
          view_type: propertyData.view_type,
          concierge: propertyData.concierge,
          agent_id: propertyData.agent_id,
          agent_name: undefined,
          agent_role: undefined,
          price: propertyData.price,
          notes: propertyData.notes,
          referral_source: propertyData.referral_source,
          referral_dates: propertyData.referral_dates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      
      // Add action handlers to the property
      const newPropertyWithActions = {
        ...newProperty,
        onView: handleViewProperty,
        onEdit: handleEditProperty,
        onDelete: handleDeleteProperty
      }
      
      setProperties(prev => [newPropertyWithActions, ...prev])
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding property:', error)
      alert('Failed to add property')
    }
  }

  const handleUpdateProperty = async (id: number, propertyData: any) => {
    try {
      // Try to update in backend
      try {
        const response = await propertiesApi.update(id, propertyData)
        if (response.success) {
          // Update local state with backend response
          setProperties(prev => prev.map(p => 
            p.id === id ? { ...response.data, onView: handleViewProperty, onEdit: handleEditProperty, onDelete: handleDeleteProperty } : p
          ))
        } else {
          throw new Error(response.message || 'Failed to update property')
        }
      } catch (apiError) {
        console.warn('Could not update in backend:', apiError)
        // Update local state for demo
        setProperties(prev => prev.map(p => 
          p.id === id ? { ...p, ...propertyData, updated_at: new Date().toISOString() } : p
        ))
      }
      
      setShowEditModal(false)
      setSelectedProperty(null)
    } catch (error) {
      console.error('Error updating property:', error)
      alert('Failed to update property')
    }
  }

  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">
            Manage your property portfolio ({filteredProperties.length} properties)
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProperties || properties.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.propertiesByStatus?.find((s: any) => s.status === 'Active')?.count || 
                   properties.filter(p => p.status_name === 'Active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${properties.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <PropertyFilters
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        statuses={statuses}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        onClearFilters={clearFilters}
      />

      {/* View Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="h-5 w-5" />
          </button>
          
          {viewMode === 'table' && (
            <button
              onClick={() => setShowDetailedTable(!showDetailedTable)}
              className={`ml-4 px-3 py-1 text-sm rounded-lg border transition-colors ${
                showDetailedTable
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showDetailedTable ? 'Simple View' : 'Detailed View'}
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onView={handleViewProperty}
              onEdit={handleEditProperty}
              onDelete={handleDeleteProperty}
            />
          ))}
        </div>
      ) : (
        // Table View
        <DataTable
          columns={showDetailedTable ? propertyDetailedColumns : propertyColumns}
          data={paginatedProperties}
        />
      )}

      {/* Pagination */}
      {filteredProperties.length > itemsPerPage && (
        <PropertyPagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredProperties.length / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={filteredProperties.length}
          startIndex={(currentPage - 1) * itemsPerPage}
          endIndex={currentPage * itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={() => {}}
          viewMode={viewMode}
        />
      )}

      {/* Modals */}
      <PropertyModals
        showAddPropertyModal={showAddModal}
        setShowAddPropertyModal={setShowAddModal}
        showEditPropertyModal={showEditModal}
        setShowEditPropertyModal={setShowEditModal}
        showViewPropertyModal={showViewModal}
        setShowViewPropertyModal={setShowViewModal}
        showDeletePropertyModal={false}
        setShowDeletePropertyModal={() => {}}
        showImportModal={false}
        setShowImportModal={() => {}}
        showImageModal={false}
        setShowImageModal={() => {}}
        editingProperty={selectedProperty}
        viewingProperty={selectedProperty}
        deletingProperty={null}
        deleteConfirmation=""
        setDeleteConfirmation={() => {}}
        editFormData={{} as any}
        setEditFormData={() => {}}
        selectedImage=""
        allImages={[]}
        currentImageIndex={0}
        onSaveEdit={() => {}}
        onConfirmDelete={() => {}}
        onImageUpload={() => {}}
        onRemoveGalleryImage={() => {}}
        onGoToPreviousImage={() => {}}
        onGoToNextImage={() => {}}
      />
    </div>
  )
}