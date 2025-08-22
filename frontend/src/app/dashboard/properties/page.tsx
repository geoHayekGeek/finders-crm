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
import { Property, Category, Status, PropertyFilters as PropertyFiltersType, EditFormData } from '@/types/property'
import { propertiesApi, categoriesApi, statusesApi, mockProperties, mockCategories, mockStatuses } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'

export default function PropertiesPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageProperties } = usePermissions()
  
  // State management
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // View and display state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<PropertyFiltersType>({})
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [editFormData, setEditFormData] = useState<EditFormData>({
    status_id: 0,
    location: '',
    category_id: 0,
    owner_name: '',
    concierge: false
  })
  const [selectedImage, setSelectedImage] = useState('')
  const [allImages, setAllImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Statistics state
  const [stats, setStats] = useState<any>(null)

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Load all necessary data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view properties')
        return
      }
      
      // Load properties from production API with authentication
      const propertiesResponse = await fetch('http://localhost:10000/api/properties', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!propertiesResponse.ok) {
        if (propertiesResponse.status === 401) {
          setError('Authentication required. Please log in again.')
          return
        }
        throw new Error(`Failed to load properties: ${propertiesResponse.statusText}`)
      }

      const propertiesResponseData = await propertiesResponse.json()
      const propertiesData: Property[] = propertiesResponseData.data || propertiesResponseData
      console.log('✅ Loaded properties from production API:', propertiesData.length)
      
      // Load categories from production API with authentication
      const categoriesResponse = await fetch('http://localhost:10000/api/categories', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!categoriesResponse.ok) {
        throw new Error(`Failed to load categories: ${categoriesResponse.statusText}`)
      }

      const categoriesResponseData = await categoriesResponse.json()
      const categoriesData: Category[] = categoriesResponseData.data || categoriesResponseData
      console.log('✅ Loaded categories from production API:', categoriesData.length)
      
      // Load statuses from production API with authentication
      const statusesResponse = await fetch('http://localhost:10000/api/statuses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!statusesResponse.ok) {
        throw new Error(`Failed to load statuses: ${statusesResponse.statusText}`)
      }

      const statusesResponseData = await statusesResponse.json()
      const statusesData: Status[] = statusesResponseData.data || statusesResponseData
      console.log('✅ Loaded statuses from production API:', statusesData.length)
      
      // Load statistics from production API with authentication
      try {
        const statsResponse = await fetch('http://localhost:10000/api/properties/stats/overview', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (statsResponse.ok) {
          const statsResponseData = await statsResponse.json()
          const statsData = statsResponseData.data || statsResponseData
          setStats(statsData)
        }
      } catch (statsError) {
        console.warn('Could not load statistics:', statsError)
      }
      
      // Add action handlers to properties
      const propertiesWithActions = propertiesData.map((property: Property) => ({
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

  // Grid view properties (accumulated for "load more" functionality)
  const gridViewProperties = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return filteredProperties.slice(0, endIndex)
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

  // Handle add property
  const handleAddProperty = async (propertyData: any) => {
    try {
      console.log('Adding new property:', propertyData)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        alert('You must be logged in to add properties')
        return
      }
      
      // Check permissions
      if (!canManageProperties) {
        alert('You do not have permission to add properties')
        return
      }
      
      // Validate required fields
      const requiredFields = ['status_id', 'location', 'category_id', 'owner_name', 'price']
      const missingFields = requiredFields.filter(field => !propertyData[field])
      
      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(', ')}`)
        return
      }

      // Ensure numeric fields are properly formatted and exclude image data
      const formattedData = {
        status_id: parseInt(propertyData.status_id),
        location: propertyData.location,
        category_id: parseInt(propertyData.category_id),
        building_name: propertyData.building_name || null,
        owner_name: propertyData.owner_name,
        phone_number: propertyData.phone_number || null,
        surface: propertyData.surface ? parseFloat(propertyData.surface) : null,
        details: propertyData.details || null,
        interior_details: propertyData.interior_details || null,
        built_year: propertyData.built_year ? parseInt(propertyData.built_year) : null,
        view_type: propertyData.view_type || null,
        concierge: Boolean(propertyData.concierge),
        agent_id: propertyData.agent_id || null,
        price: parseFloat(propertyData.price),
        notes: propertyData.notes || null,
        referral_source: propertyData.referral_source || null,
        referral_dates: propertyData.referral_dates || null
        // Note: main_image and image_gallery are excluded - they will be handled separately via file uploads
      }
      
      console.log('Formatted data to send:', formattedData)
      
      // Call the production API with authentication
      const response = await fetch('http://localhost:10000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData),
      })

      if (!response.ok) {
        if (response.status === 401) {
          alert('Authentication required. Please log in again.')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to add property: ${response.statusText}`)
      }

      const newProperty = await response.json()
      console.log('Property added successfully:', newProperty)

      // Refresh the properties list
      await loadData()
      
      // Close the modal
      setShowAddModal(false)
      
      // Show success message
      alert('Property added successfully!')
      
    } catch (error) {
      console.error('Error adding property:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error adding property: ${errorMessage}`)
    }
  }

  // Handle delete property
  const handleDeleteProperty = async (property: Property) => {
    setDeletingProperty(property)
    setShowDeleteModal(true)
  }

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (deletingProperty && deleteConfirmation === deletingProperty.reference_number) {
      try {
        // Check authentication
        if (!isAuthenticated || !token) {
          alert('You must be logged in to delete properties')
          return
        }
        
        // Check permissions
        if (!canManageProperties) {
          alert('You do not have permission to delete properties')
          return
        }
        
        // Call the production API to delete the property
        const response = await fetch(`http://localhost:10000/api/properties/${deletingProperty.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            alert('Authentication required. Please log in again.')
            return
          }
          throw new Error(`Failed to delete property: ${response.statusText}`)
        }
        
        console.log('Property deleted successfully!')
        
        // Refresh the properties list
        await loadData()
        
        // Close modal and reset state
        setShowDeleteModal(false)
        setDeletingProperty(null)
        setDeleteConfirmation('')
        
        // Show success message
        alert('Property deleted successfully!')
        
      } catch (error) {
        console.error('Error deleting property:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        alert(`Error deleting property: ${errorMessage}`)
      }
    }
  }

  // Handle image navigation
  const handleGoToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
      setSelectedImage(allImages[currentImageIndex - 1])
    }
  }

  const handleGoToNextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
      setSelectedImage(allImages[currentImageIndex + 1])
    }
  }

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64Image = e.target?.result as string
          // Handle the uploaded image
          console.log('Image uploaded:', base64Image.substring(0, 50) + '...')
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Handle remove gallery image
  const handleRemoveGalleryImage = (index: number) => {
    const newImages = allImages.filter((_, i) => i !== index)
    setAllImages(newImages)
    if (currentImageIndex >= newImages.length) {
      setCurrentImageIndex(Math.max(0, newImages.length - 1))
    }
  }

  const handleUpdateProperty = async (id: number, propertyData: any) => {
    try {
      // Check authentication
      if (!isAuthenticated || !token) {
        alert('You must be logged in to update properties')
        return
      }
      
      // Check permissions
      if (!canManageProperties) {
        alert('You do not have permission to update properties')
        return
      }
      
      // Call the production API to update the property
      const response = await fetch(`http://localhost:10000/api/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(propertyData),
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Authentication required. Please log in again.')
          return
        }
        throw new Error(`Failed to update property: ${response.statusText}`)
      }
      
      const updatedProperty = await response.json()
      
      // Update local state
      setProperties(prev => prev.map(p => 
        p.id === id ? { ...updatedProperty, onView: handleViewProperty, onEdit: handleEditProperty, onDelete: handleDeleteProperty } : p
      ))
      
      setShowEditModal(false)
      setSelectedProperty(null)
      
      // Show success message
      alert('Property updated successfully!')
      
    } catch (error) {
      console.error('Error updating property:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to update property: ${errorMessage}`)
    }
  }

  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing page size
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
            disabled={!isAuthenticated || !canManageProperties}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
              isAuthenticated && canManageProperties
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
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
                  ${properties.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0).toLocaleString()}
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
          
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-600">
            <Download className="h-4 w-4" />
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-600">
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gridViewProperties.map((property) => (
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
          columns={propertyColumns}
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
          onItemsPerPageChange={handleItemsPerPageChange}
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
        showDeletePropertyModal={showDeleteModal}
        setShowDeletePropertyModal={setShowDeleteModal}
        showImportModal={false}
        setShowImportModal={() => {}}
        showImageModal={showImageModal}
        setShowImageModal={setShowImageModal}
        editingProperty={selectedProperty}
        viewingProperty={selectedProperty}
        deletingProperty={deletingProperty}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        selectedImage={selectedImage}
        allImages={allImages}
        currentImageIndex={currentImageIndex}
        onSaveEdit={() => {}}
        onConfirmDelete={handleConfirmDelete}
        onImageUpload={handleImageUpload}
        onRemoveGalleryImage={handleRemoveGalleryImage}
        onGoToPreviousImage={handleGoToPreviousImage}
        onGoToNextImage={handleGoToNextImage}
        onSaveAdd={handleAddProperty}
        categories={categories}
        statuses={statuses}
      />
    </div>
  )
}