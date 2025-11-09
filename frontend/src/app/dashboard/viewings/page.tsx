'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  Eye, 
  Plus,
  Grid3X3,
  List,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import ViewingsCard from '@/components/ViewingsCard'
import { ViewingsFilters } from '@/components/ViewingsFilters'
import { ViewingsModals } from '@/components/ViewingsModals'
import { PropertyPagination } from '@/components/PropertyPagination'
import { getViewingsColumns } from '@/components/ViewingsTableColumns'
import { Viewing, ViewingFilters as ViewingFiltersType, CreateViewingFormData } from '@/types/viewing'
import { viewingsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { useToast } from '@/contexts/ToastContext'

export default function ViewingsPage() {
  const { token, isAuthenticated } = useAuth()
  const { canManageViewings, canViewViewings } = usePermissions()
  const { showSuccess, showError } = useToast()
  
  // State management
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingsLoading, setViewingsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // View and display state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<ViewingFiltersType>({})
  const isInitialLoad = useRef(true)
  const prevFiltersRef = useRef<string>('')
  const loadViewingsRef = useRef<(() => Promise<void>) | null>(null)
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null)
  const [deletingViewing, setDeletingViewing] = useState<Viewing | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Statistics state
  const [stats, setStats] = useState<any>(null)

  // Load viewings data
  const loadViewings = useCallback(async () => {
    console.log('🔄 Loading viewings...', { isAuthenticated, hasToken: !!token, canViewViewings })
    
    try {
      setViewingsLoading(true)
      setError(null)
      
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view viewings')
        return
      }
      
      if (!canViewViewings) {
        setError('You do not have permission to view viewings')
        return
      }
      
      // Check if we have any active filters
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
        value !== undefined && value !== null && value !== '' && value !== 'All' && value !== 0
      )
      
      let response
      if (hasActiveFilters) {
        console.log('🔍 Using filtered API call')
        response = await viewingsApi.getWithFilters(filters, token)
      } else {
        console.log('🔍 Using getAll API call')
        response = await viewingsApi.getAll(token)
      }
      
      console.log('📡 API response received', { success: response.success, dataLength: response.data?.length })
      
      if (response.success) {
        setViewings(response.data || [])
        console.log('✅ Viewings updated successfully')
      } else {
        setError(response.message || 'Failed to load viewings')
      }
      
    } catch (error) {
      console.error('❌ Error loading viewings:', error)
      setError(error instanceof Error ? error.message : 'Failed to load viewings')
    } finally {
      setViewingsLoading(false)
      setLoading(false)
    }
  }, [isAuthenticated, token, canViewViewings, filters])

  // Store the latest loadViewings function in ref
  loadViewingsRef.current = loadViewings

  // Load stats separately
  const loadStats = useCallback(async () => {
    try {
      if (!isAuthenticated || !token) return
      
      const statsResponse = await viewingsApi.getStats(token)
      if (statsResponse.success) {
        setStats(statsResponse.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [isAuthenticated, token])

  // Load data on component mount
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached, setting loading to false')
      setLoading(false)
    }, 10000)
    
    if (isAuthenticated && token) {
      loadStats()
      if (loadViewingsRef.current) {
        loadViewingsRef.current()
      }
    } else {
      setLoading(false)
    }
    
    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [isAuthenticated, token, loadStats])

  // Load viewings when filters change
  useEffect(() => {
    if (isAuthenticated) {
      const currentFiltersStr = JSON.stringify(filters)
      
      if (isInitialLoad.current) {
        isInitialLoad.current = false
        prevFiltersRef.current = currentFiltersStr
      } else if (prevFiltersRef.current !== currentFiltersStr) {
        if (loadViewingsRef.current) {
          loadViewingsRef.current()
        }
        setCurrentPage(1)
        prevFiltersRef.current = currentFiltersStr
      }
    }
  }, [isAuthenticated, filters])

  // Action handlers
  const handleViewViewing = useCallback(async (viewing: Viewing) => {
    console.log('👁️ Opening view modal for viewing:', viewing.id)
    try {
      const response = await viewingsApi.getById(viewing.id, token)
      
      if (response.success && response.data) {
        setSelectedViewing(response.data)
        setShowViewModal(true)
      }
    } catch (error) {
      console.error('❌ Error fetching viewing data:', error)
    }
  }, [token])

  const handleEditViewing = useCallback(async (viewing: Viewing) => {
    console.log('🔍 Opening edit modal for viewing:', viewing.id)
    try {
      const response = await viewingsApi.getById(viewing.id, token)
      
      if (!response.success || !response.data) {
        console.error('❌ Failed to fetch full viewing data')
        return
      }
      
      setSelectedViewing(response.data)
      setShowEditModal(true)
    } catch (error) {
      console.error('❌ Error fetching viewing data:', error)
    }
  }, [token])

  const handleDeleteViewing = useCallback((viewing: Viewing) => {
    setDeletingViewing(viewing)
    setDeleteConfirmation('')
    setShowDeleteModal(true)
  }, [])

  const handleClearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  const handleRefreshViewing = async (viewingId: number): Promise<Viewing | null> => {
    try {
      const response = await viewingsApi.getById(viewingId, token)
      
      if (response.success && response.data) {
        const refreshedViewing: Viewing = { 
          ...response.data,
          updates: response.data.updates ? [...response.data.updates] : []
        }
        
        setViewings(prevViewings => 
          prevViewings.map(viewing => 
            viewing.id === viewingId ? refreshedViewing : viewing
          )
        )
        
        if (selectedViewing && selectedViewing.id === viewingId) {
          setSelectedViewing(refreshedViewing)
        }
        
        return refreshedViewing
      }
    } catch (error) {
      console.error('❌ Error refreshing viewing:', error)
    }
    return null
  }

  // Handle add viewing
  const handleAddViewing = async (viewingData: CreateViewingFormData) => {
    try {
      console.log('Adding new viewing:', viewingData)
      
      if (!isAuthenticated || !token) {
        return
      }
      
      const response = await viewingsApi.create(viewingData, token)
      console.log('✅ Viewing created successfully:', response.data)

      if (!response.success) {
        const errorMessage = response.message || 'Failed to create viewing'
        showError(errorMessage)
        throw new Error(errorMessage)
      }

      // Refresh the viewings list
      await loadViewings()
      await loadStats()
      
      showSuccess('Viewing created successfully')

      return response.data
    } catch (error) {
      console.error('Error adding viewing:', error)
      showError(error instanceof Error ? error.message : 'Failed to create viewing')
      throw error
    }
  }

  // Handle save edit
  const handleSaveEdit = async (updateData: Partial<CreateViewingFormData>) => {
    try {
      if (!selectedViewing || !isAuthenticated || !token) return
      
      console.log('💾 Saving viewing edits:', updateData)
      
      const response = await viewingsApi.update(selectedViewing.id, updateData, token)
      
      if (response.success) {
        console.log('✅ Viewing updated successfully')
        setShowEditModal(false)
        setSelectedViewing(null)
        
        // Refresh the viewings list
        await loadViewings()
        await loadStats()

        showSuccess('Viewing updated successfully')
      } else {
        const errorMessage = response.message || 'Failed to update viewing'
        showError(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('❌ Error updating viewing:', error)
      showError(error instanceof Error ? error.message : 'Failed to update viewing')
      throw error
    }
  }

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (deletingViewing && deleteConfirmation === (deletingViewing.property_reference || 'this viewing')) {
      try {
        if (!isAuthenticated || !token) return
        
        console.log('🗑️ Deleting viewing:', deletingViewing.id)
        
        await viewingsApi.delete(deletingViewing.id, token)
        
        console.log('✅ Viewing deleted successfully!')
        
        // Refresh the viewings list
        await loadViewings()
        await loadStats()

        showSuccess('Viewing deleted successfully')
        
        // Close modal and reset state
        setShowDeleteModal(false)
        setDeletingViewing(null)
        setDeleteConfirmation('')
      } catch (error) {
        console.error('Error deleting viewing:', error)
        showError(error instanceof Error ? error.message : 'Failed to delete viewing')
      }
    }
  }

  // Paginated viewings for table view
  const paginatedViewings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return viewings.slice(startIndex, endIndex).map(viewing => ({
      ...viewing,
      onView: handleViewViewing,
      onEdit: handleEditViewing,
      onDelete: handleDeleteViewing
    }))
  }, [viewings, currentPage, itemsPerPage, handleViewViewing, handleEditViewing, handleDeleteViewing])

  // Grid view viewings
  const gridViewViewings = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return viewings.slice(0, endIndex)
  }, [viewings, currentPage, itemsPerPage])

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading viewings...</p>
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
            onClick={() => {
              loadViewings()
              loadStats()
            }}
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
          <h1 className="text-2xl font-bold text-gray-900">Viewings</h1>
          <p className="text-gray-600 mt-1">
            Manage property viewings ({viewings.length} viewings)
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!isAuthenticated || !canViewViewings}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
              isAuthenticated && canViewViewings
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="h-5 w-5" />
            <span>Add Viewing</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Viewings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_viewings || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelled || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ViewingsFilters
        filters={filters}
        setFilters={setFilters}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        onClearFilters={handleClearFilters}
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
            onClick={loadViewings}
            disabled={viewingsLoading}
            className={`p-2 rounded-lg transition-colors ${
              viewingsLoading 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Refresh viewings"
          >
            <RefreshCw className={`h-5 w-5 ${viewingsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewingsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading viewings...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gridViewViewings.map((viewing) => (
            <ViewingsCard
              key={viewing.id}
              viewing={viewing}
              onView={handleViewViewing}
              onEdit={handleEditViewing}
              onDelete={handleDeleteViewing}
              canManageViewings={canManageViewings}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={getViewingsColumns(canManageViewings)}
          data={paginatedViewings}
        />
      )}

      {/* Pagination */}
      {(viewMode === 'table' || viewings.length > itemsPerPage) && (
        <PropertyPagination
          currentPage={currentPage}
          totalPages={Math.ceil(viewings.length / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={viewings.length}
          startIndex={(currentPage - 1) * itemsPerPage}
          endIndex={Math.min(currentPage * itemsPerPage, viewings.length)}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          viewMode={viewMode}
          entityName="viewings"
        />
      )}

      {/* Modals */}
      <ViewingsModals
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        onSaveAdd={handleAddViewing}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingViewing={selectedViewing}
        onSaveEdit={handleSaveEdit}
        showViewModal={showViewModal}
        setShowViewModal={setShowViewModal}
        viewingViewing={selectedViewing}
        onRefreshViewing={handleRefreshViewing}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        deletingViewing={deletingViewing}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  )
}

