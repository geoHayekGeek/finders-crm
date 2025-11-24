'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Plus,
  Grid3X3,
  List,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  ChevronDown,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { PropertyCard } from '@/components/PropertyCard'
import { PropertyFilters } from '@/components/PropertyFilters'
import { PropertyModals } from '@/components/PropertyModals'
import { PropertyPagination } from '@/components/PropertyPagination'
import { getPropertyColumns, getPropertyDetailedColumns } from '@/components/PropertyTableColumns'
import { Property, Category, Status, PropertyFilters as PropertyFiltersType, EditFormData } from '@/types/property'
import { propertiesApi, categoriesApi, statusesApi, mockProperties, mockCategories, mockStatuses } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { useToast } from '@/contexts/ToastContext'

export default function PropertiesPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageProperties, canViewProperties } = usePermissions()
  const { showSuccess, showError, showWarning } = useToast()
  const router = useRouter()
  
  // State management
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Backend validation errors state
  const [backendValidationErrors, setBackendValidationErrors] = useState<Record<string, string>>({})
  
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
    reference_number: '',
    status_id: 0,
    property_type: 'sale',
    location: '',
    category_id: 0,
    building_name: '',
    owner_name: '',
    phone_number: '',
    surface: 0,
    details: '',
    interior_details: '',
    built_year: 0,
    view_type: 'no view',
    concierge: false,
    agent_id: 0,
    price: 0,
    notes: '',
    closed_date: '',
    main_image: '',
    image_gallery: [],
    referrals: []
  })
  // Image modal state is now managed internally by PropertyModals component
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Statistics state
  const [stats, setStats] = useState<any>(null)
  
  // Loading states for refresh buttons
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [statusesLoading, setStatusesLoading] = useState(false)


  
  // Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showExportDropdown && !target.closest('.export-dropdown')) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

  // Check if user can view properties (redirect accountant)
  useEffect(() => {
    if (isAuthenticated && user && !canViewProperties) {
      // Accountant or other roles without property access should be redirected
      showError('You do not have permission to view properties')
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, canViewProperties, router, showError])

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated && canViewProperties) {
      loadData()
    }
  }, [isAuthenticated, canViewProperties])

  // Reload data when filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadPropertiesOnly()
      setCurrentPage(1) // Reset to first page when filters change
    }
  }, [filters, isAuthenticated])

  // Load only properties (for filtering)
  const loadPropertiesOnly = async () => {
    try {
      setPropertiesLoading(true)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view properties')
        return
      }
      
      // Build query parameters for filters
      const hasFilters = Object.keys(filters).length > 0
      const queryParams = new URLSearchParams()
      
      if (hasFilters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString())
          }
        })
      }
      
      const queryString = queryParams.toString()
      const endpoint = hasFilters 
        ? `http://localhost:10000/api/properties/filtered${queryString ? `?${queryString}` : ''}`
        : 'http://localhost:10000/api/properties'
      
      console.log('🔍 Loading properties with endpoint:', endpoint)
      
      // Load properties from production API with authentication
      const propertiesResponse = await fetch(endpoint, {
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
      
      // Add action handlers to properties
      const propertiesWithActions = propertiesData.map((property: Property) => ({
        ...property,
        onView: handleViewProperty,
        onEdit: handleEditProperty,
        onDelete: handleDeleteProperty
      }))
      
      setProperties(propertiesWithActions)
      
    } catch (error) {
      setError('Failed to load properties data')
      console.error('Error loading properties:', error)
    } finally {
      setPropertiesLoading(false)
    }
  }

  // Format currency with K, M, B suffixes
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '$0'
    
    const absAmount = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''
    
    if (absAmount >= 1000000000) {
      // Billions
      return `${sign}$${(absAmount / 1000000000).toFixed(1).replace('.0', '')}B`
    } else if (absAmount >= 1000000) {
      // Millions
      return `${sign}$${(absAmount / 1000000).toFixed(1).replace('.0', '')}M`
    } else if (absAmount >= 1000) {
      // Thousands
      return `${sign}$${(absAmount / 1000).toFixed(1).replace('.0', '')}K`
    } else {
      // Less than 1000
      return `${sign}$${absAmount.toFixed(0)}`
    }
  }

  // Load all necessary data (initial load)
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view properties')
        return
      }
      
      // Build query parameters for filters
      const hasFilters = Object.keys(filters).length > 0
      const queryParams = new URLSearchParams()
      
      if (hasFilters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString())
          }
        })
      }
      
      const queryString = queryParams.toString()
      const endpoint = hasFilters 
        ? `http://localhost:10000/api/properties/filtered${queryString ? `?${queryString}` : ''}`
        : 'http://localhost:10000/api/properties'
      
      console.log('🔍 Loading properties with endpoint:', endpoint)
      
      // Load properties from production API with authentication
      const propertiesResponse = await fetch(endpoint, {
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

  // Since we're now filtering on the backend, filteredProperties is just properties
  const filteredProperties = properties

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
    // Clear any previous backend validation errors
    setBackendValidationErrors({})
  }

  const handleSaveEdit = async () => {
    try {
      console.log('💾 Saving property edits:', editFormData)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        showError('You must be logged in to edit properties')
        return
      }
      
      // Check permissions
      if (!canManageProperties) {
        showError('You do not have permission to edit properties')
        return
      }

      // Get the property ID from selectedProperty
      if (!selectedProperty) {
        showError('No property selected for editing')
        return
      }

      // Note: Required field validation is now handled by HTML required attributes

      // Prepare update data (EXCLUDE file objects - they should only be uploaded via file upload endpoints)
      const updateData = {
        ...editFormData,
        id: selectedProperty.id,
        // Remove file objects from regular property update - they should only be uploaded via dedicated endpoints
        main_image: editFormData.main_image, // Keep main_image to allow clearing it
        main_image_file: undefined,
        main_image_preview: undefined,
        // Keep image_gallery to allow removal of gallery images
        image_gallery: editFormData.image_gallery,
        // Ensure referrals is always an array (never null or undefined)
        referrals: editFormData.referrals || []
      }

      console.log('📡 Sending update request:', updateData)
      console.log('📡 Referrals in updateData:', updateData.referrals)
      if (updateData.referrals && updateData.referrals.length > 0) {
        console.log('📡 First referral details:', updateData.referrals[0])
        console.log('📡 First referral date:', updateData.referrals[0].date)
        console.log('📡 First referral date type:', typeof updateData.referrals[0].date)
      }

      // Use the handleUpdateProperty function which handles CSRF tokens
      const result = await handleUpdateProperty(selectedProperty.id, updateData)
      
      console.log('🔍 handleUpdateProperty result:', result)
      
      // Check if there were validation errors
      if (result && !result.success && result.validationErrors) {
        // Handle validation errors - don't close modal, show errors under inputs
        console.log('🔍 Backend validation errors received:', result.validationErrors)
        
        // Convert backend validation errors to frontend format
        const fieldErrors: Record<string, string> = {}
        result.validationErrors.forEach((error: any) => {
          fieldErrors[error.field] = error.message
        })
        
        // Set backend validation errors to display under inputs
        setBackendValidationErrors(fieldErrors)
        console.log('🔍 Field errors to display:', fieldErrors)
        
        // Show a generic error message
        showError('Please fix the validation errors shown below')
        return // Don't close modal
      }
      
      // Check if there was an error (but not validation errors)
      if (result && !result.success && !result.validationErrors) {
        console.log('🔍 Update failed with error:', result.error)
        // Show the error message
        showError(result.error || 'Update failed')
        // Don't close modal for other errors either
        return
      }
      
      // Only close modal if update was successful
      if (result && result.success) {
        console.log('🔍 Update successful, closing modal')
        setShowEditModal(false)
        setSelectedProperty(null)
        
        // Refresh the properties list
        await loadData()
        
        // Refresh categories and statuses to ensure they're up to date
        await refreshCategories()
        await refreshStatuses()
      } else {
        console.log('🔍 Unexpected result format:', result)
        // Don't close modal if we don't know what happened
      }
    } catch (error) {
      console.error('❌ Error updating property:', error)
      showError('Something went wrong while updating the property. Please try again.')
    }
  }

  // Handle add property
  const handleAddProperty = async (propertyData: any) => {
    try {
      console.log('Adding new property:', propertyData)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        showError('You must be logged in to add properties')
        return
      }
      
      // Check permissions
      if (!canManageProperties) {
        showError('You do not have permission to add properties')
        return
      }
      
      // Note: Required field validation is now handled by HTML required attributes

      // Ensure numeric fields are properly formatted and exclude image data
              const formattedData = {
          status_id: parseInt(propertyData.status_id),
          property_type: propertyData.property_type || 'sale',
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
          property_url: propertyData.property_url || null,
          referrals: propertyData.referrals || null
          // Note: main_image and image_gallery are excluded - they will be handled separately via file uploads
        }
      
              console.log('Formatted data to send:', formattedData)
        console.log('📤 Referrals in formattedData:', formattedData.referrals)
        if (formattedData.referrals && formattedData.referrals.length > 0) {
          console.log('📤 First referral details:', formattedData.referrals[0])
          console.log('📤 First referral date:', formattedData.referrals[0].date)
          console.log('📤 First referral date type:', typeof formattedData.referrals[0].date)
        }
        
        // Additional validation after formatting
        if (isNaN(formattedData.status_id) || isNaN(formattedData.category_id) || isNaN(formattedData.price)) {
          showError('Invalid values detected. Please check Status, Category, and Price fields.')
          return
        }
        
        // Debug: Log the exact JSON being sent
        console.log('📤 JSON payload being sent:', JSON.stringify(formattedData, null, 2))
        
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
          showError('Authentication required. Please log in again.')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to add property: ${response.statusText}`)
      }

      const newProperty = await response.json()
      console.log('Property added successfully:', newProperty)
      showSuccess('Property added successfully!')

              // Refresh the properties list
        await loadData()
        
        // Refresh categories and statuses to ensure they're up to date
        await refreshCategories()
        await refreshStatuses()
        
        // Return the created property data for image upload
        return newProperty.data || newProperty
      
    } catch (error) {
      console.error('Error adding property:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showError(`Something went wrong: ${errorMessage}`)
      throw error // Re-throw so the modal knows the creation failed
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
          showError('You must be logged in to delete properties')
          return
        }
        
        // Check permissions
        if (!canManageProperties) {
          showError('You do not have permission to delete properties')
          return
        }
        
        // Debug: Log the property being deleted
        console.log('🔍 Deleting property:', {
          id: deletingProperty.id,
          type: typeof deletingProperty.id,
          reference_number: deletingProperty.reference_number,
          location: deletingProperty.location
        })
        
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
            showError('Authentication required. Please log in again.')
            return
          }
          
          // Get the error response body
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          console.error('❌ Delete property error response:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          })
          
          throw new Error(`Failed to delete property: ${errorData.message || response.statusText}`)
        }
        
        console.log('✅ Property deleted successfully!')
        
        // Refresh the properties list
        await loadData()
        
        // Refresh categories and statuses to ensure they're up to date
        await refreshCategories()
        await refreshStatuses()
        
        // Close modal and reset state
        setShowDeleteModal(false)
        setDeletingProperty(null)
        setDeleteConfirmation('')
        
        // Show success message
        showSuccess('Property deleted successfully!')
        
      } catch (error) {
        console.error('❌ Error deleting property:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        showError(`Something went wrong while deleting property: ${errorMessage}`)
      }
    }
  }

  // Image navigation is now handled internally by PropertyModals component

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      // Note: This is just a generic file handler - actual image upload 
      // is handled in PropertyModals component using proper file upload API
      console.log(`Selected ${files.length} files for upload. Use the Edit Property modal to upload images.`)
    }
  }

  // Gallery image management is now handled internally by PropertyModals component

  const handleUpdateProperty = async (id: number, propertyData: any) => {
    console.log('🚀 handleUpdateProperty called with centralized API')
    try {
      // Check authentication
      if (!isAuthenticated || !token) {
        showError('You must be logged in to update properties')
        return
      }
      
      // Check permissions
      if (!canManageProperties) {
        showError('You do not have permission to update properties')
        return
      }
      
      console.log('🔍 Using centralized propertiesApi.update')
      console.log('🔍 Request body:', JSON.stringify(propertyData, null, 2))
      
      // Use the centralized API function which handles CSRF tokens automatically
      const response = await propertiesApi.update(id, propertyData)
      
      console.log('🔍 API response:', response)
      
      // Check if there were validation errors
      if (response && !response.success && (response as any).validationErrors) {
        // Handle validation errors - don't close modal, show errors under inputs
        console.log('🔍 Backend validation errors received:', (response as any).validationErrors)
        
        // Convert backend validation errors to frontend format
        const fieldErrors: Record<string, string> = {}
        ;(response as any).validationErrors.forEach((error: any) => {
          fieldErrors[error.field] = error.message
        })
        
        setBackendValidationErrors(fieldErrors)
        return { success: false, validationErrors: (response as any).validationErrors }
      }
      
      // Check for other errors
      if (!response.success) {
        console.log('🔍 API returned error:', response.message)
        return { success: false, error: response.message || 'Update failed' }
      }
      
      // Update local state
      setProperties(prev => prev.map(p => 
        p.id === id ? { ...response.data, onView: handleViewProperty, onEdit: handleEditProperty, onDelete: handleDeleteProperty } : p
      ))
      
      // Clear any previous validation errors
      setBackendValidationErrors({})
      
      // Show success message
      showSuccess('Property successfully updated!')
      
      // Return success indicator
      return { success: true, data: response.data }
      
    } catch (error) {
      console.error('Error updating property:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Check if it's a CSRF error
      if (errorMessage.includes('CSRF') || errorMessage.includes('Invalid CSRF token')) {
        showError('Security token expired. Please refresh the page and try again.')
      } else {
        showError(`Something went wrong while updating property: ${errorMessage}`)
      }
      
      return { success: false, error: errorMessage }
    }
  }

  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
    // The useEffect will trigger loadData when filters change
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Refresh categories
  const refreshCategories = async () => {
    setCategoriesLoading(true)
    try {
      if (!isAuthenticated || !token) {
        console.error('Not authenticated')
        return
      }

      const categoriesResponse = await fetch('http://localhost:10000/api/categories', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (categoriesResponse.ok) {
        const categoriesResponseData = await categoriesResponse.json()
        const categoriesData: Category[] = categoriesResponseData.data || categoriesResponseData
        setCategories(categoriesData)
        console.log('✅ Categories refreshed:', categoriesData.length)
      } else {
        console.error('Failed to refresh categories')
      }
    } catch (error) {
      console.error('Error refreshing categories:', error)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Refresh statuses
  const refreshStatuses = async () => {
    setStatusesLoading(true)
    try {
      if (!isAuthenticated || !token) {
        console.error('Not authenticated')
        return
      }

      const statusesResponse = await fetch('http://localhost:10000/api/statuses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (statusesResponse.ok) {
        const statusesResponseData = await statusesResponse.json()
        const statusesData: Status[] = statusesResponseData.data || statusesResponseData
        setStatuses(statusesData)
        console.log('✅ Statuses refreshed:', statusesData.length)
      } else {
        console.error('Failed to refresh statuses')
      }
    } catch (error) {
      console.error('Error refreshing statuses:', error)
    } finally {
      setStatusesLoading(false)
    }
  }

  // Export functions
  const exportToCSV = () => {
    const currentData = viewMode === 'table' ? paginatedProperties : filteredProperties
    
    // Prepare CSV headers
    const headers = [
      'Reference Number',
      'Location', 
      'Category',
      'Status',
      'Owner Name',
      'Phone Number',
      'Surface (m²)',
      'Built Year',
      'View Type',
      'Concierge',
      'Agent',
      'Price ($)',
      'Notes'
    ]
    
    // Prepare CSV data
    const csvData = currentData.map(property => [
      property.reference_number || '',
      property.location || '',
      property.category_name || '',
      property.status_name || '',
      property.owner_name || '',
      property.phone_number || '',
      property.surface || '',
      property.built_year || '',
      property.view_type || '',
      property.concierge ? 'Yes' : 'No',
      property.agent_name || '',
      property.price || '',
      property.notes || ''
    ])
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `properties_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowExportDropdown(false)
  }

  const exportToExcel = () => {
    const currentData = viewMode === 'table' ? paginatedProperties : filteredProperties
    
    // Prepare Excel-compatible CSV data with more detailed headers
    const headers = [
      'Reference Number',
      'Location',
      'Category', 
      'Status',
      'Building Name',
      'Owner Name',
      'Phone Number',
      'Surface (m²)',
      'Interior Details',
      'Built Year',
      'View Type',
      'Concierge',
      'Agent',
      'Price ($)',
      'Notes',
      'Created Date'
    ]
    
    // Prepare CSV data
    const csvData = currentData.map(property => [
      property.reference_number || '',
      property.location || '',
      property.category_name || '',
      property.status_name || '',
      property.building_name || '',
      property.owner_name || '',
      property.phone_number || '',
      property.surface || '',
      property.interior_details || '',
      property.built_year || '',
      property.view_type || '',
      property.concierge ? 'Yes' : 'No',
      property.agent_name || '',
      property.price || '',
      property.notes || '',
      property.created_at ? new Date(property.created_at).toLocaleDateString() : ''
    ])
    
    // Create CSV content (Excel-compatible)
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n')
    
    // Download as CSV file (Excel will open it automatically)
    const blob = new Blob([csvContent], { 
      type: 'application/vnd.ms-excel' 
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `properties_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowExportDropdown(false)
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
                  {formatCurrency(properties.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0))}
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
            onClick={loadPropertiesOnly}
            disabled={propertiesLoading}
            className={`p-2 rounded-lg transition-colors ${
              propertiesLoading 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Refresh properties"
          >
            <RefreshCw className={`h-5 w-5 ${propertiesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Export Dropdown */}
          <div className="relative export-dropdown">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-600"
            >
              <Download className="h-4 w-4" />
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export as Excel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-600">
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {propertiesLoading ? (
        // Loading state for properties only
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading properties...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
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
          columns={getPropertyColumns(canManageProperties)}
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
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        onImageUpload={handleImageUpload}
        onSaveAdd={handleAddProperty}
        categories={categories}
        statuses={statuses}
        onRefreshCategories={refreshCategories}
        onRefreshStatuses={refreshStatuses}
        onRefreshProperties={loadData}
        backendValidationErrors={backendValidationErrors}
        setBackendValidationErrors={setBackendValidationErrors}
        canManageProperties={canManageProperties}
      />
    </div>
  )
}