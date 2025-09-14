'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Search, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { useToast } from '@/contexts/ToastContext'
import { leadStatusesApi } from '@/utils/api'
import LeadStatusTable from '@/components/leadStatuses/LeadStatusTable'
import LeadStatusModal from '@/components/leadStatuses/LeadStatusModal'
import LeadStatusDeleteModal from '@/components/leadStatuses/LeadStatusDeleteModal'

interface LeadStatus {
  id: number
  status_name: string
  code: string
  color: string
  description: string
  is_active: boolean
  created_at: string
  modified_at: string
}

export default function LeadStatusesPage() {
  const { token, isAuthenticated } = useAuth()
  const { canManageCategoriesAndStatuses } = usePermissions()
  const { showSuccess, showError } = useToast()
  
  // State management
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null)
  const [deletingStatus, setDeletingStatus] = useState<LeadStatus | null>(null)

  // Load statuses
  const loadStatuses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view statuses')
        return
      }
      
      if (!canManageCategoriesAndStatuses) {
        setError('You do not have permission to manage statuses')
        return
      }

      const response = await leadStatusesApi.getAll()
      
      if (response.success) {
        setStatuses(response.data || [])
      } else {
        setError('Failed to load statuses')
      }
    } catch (err) {
      console.error('Error loading statuses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statuses')
    } finally {
      setLoading(false)
    }
  }

  // Load statuses on component mount
  useEffect(() => {
    loadStatuses()
  }, [isAuthenticated, token, canManageCategoriesAndStatuses])

  // Filter statuses based on search
  const filteredStatuses = statuses.filter(status => {
    const matchesSearch = status.status_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  // Handle add status
  const handleAddStatus = () => {
    setSelectedStatus(null)
    setShowAddModal(true)
  }

  // Handle edit status
  const handleEditStatus = (status: LeadStatus) => {
    setSelectedStatus(status)
    setShowEditModal(true)
  }

  // Handle delete status
  const handleDeleteStatus = (status: LeadStatus) => {
    setDeletingStatus(status)
    setShowDeleteModal(true)
  }

  // Handle status success (create/update)
  const handleStatusSuccess = (status: LeadStatus) => {
    if (selectedStatus) {
      // Update existing status
      setStatuses(prev => prev.map(s => s.id === status.id ? status : s))
    } else {
      // Add new status
      setStatuses(prev => [status, ...prev])
    }
  }

  // Handle status delete success
  const handleDeleteSuccess = (statusId: number) => {
    setStatuses(prev => prev.filter(s => s.id !== statusId))
    setShowDeleteModal(false)
    setDeletingStatus(null)
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading statuses...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="text-red-600">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
        <button
          onClick={loadStatuses}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Statuses</h1>
          <p className="text-gray-600">Manage lead statuses and their properties</p>
        </div>
        {canManageCategoriesAndStatuses && (
          <button
            onClick={handleAddStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Status</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lead statuses by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-with-icon w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Clear search */}
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Status table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Lead Statuses ({filteredStatuses.length})
            </h3>
            <button
              onClick={loadStatuses}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh statuses"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredStatuses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No lead statuses found' : 'No lead statuses yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first lead status'
                }
              </p>
              {canManageCategoriesAndStatuses && !searchTerm && (
                <button
                  onClick={handleAddStatus}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Lead Status
                </button>
              )}
            </div>
          ) : (
            <LeadStatusTable
              statuses={filteredStatuses}
              onEdit={handleEditStatus}
              onDelete={handleDeleteStatus}
              canManage={canManageCategoriesAndStatuses}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <LeadStatusModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleStatusSuccess}
        title="Add Lead Status"
      />

      <LeadStatusModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleStatusSuccess}
        status={selectedStatus || undefined}
        title="Edit Lead Status"
      />

      {deletingStatus && (
        <LeadStatusDeleteModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeletingStatus(null)
          }}
          onSuccess={handleDeleteSuccess}
          status={deletingStatus}
        />
      )}
    </div>
  )
}
