'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Circle,
  FileText
} from 'lucide-react'
import { Status } from '@/types/property'
import { statusesApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, RequireCategoryStatusAccess } from '@/contexts/PermissionContext'
import StatusTable from '@/components/statuses/StatusTable'
import StatusModal from '@/components/statuses/StatusModal'
import StatusDeleteModal from '@/components/statuses/StatusDeleteModal'

export default function StatusesPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageProperties } = usePermissions()
  
  // State management
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)

  // Load statuses on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadStatuses()
    }
  }, [isAuthenticated])

  const loadStatuses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view statuses')
        return
      }
      
      // Use the admin API client to get all statuses (active and inactive)
      const response = await statusesApi.getAllForAdmin(token || undefined)
      
      if (response.success) {
        setStatuses(response.data || [])
      } else {
        setError('Failed to load statuses')
      }
      
    } catch (err) {
      console.error('Error loading statuses:', err)
      setError('Failed to load statuses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const filteredStatuses = statuses.filter(status =>
    status.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    status.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (status.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle status operations
  const handleAddStatus = () => {
    setSelectedStatus(null)
    setShowAddModal(true)
  }

  const handleEditStatus = (status: Status) => {
    setSelectedStatus(status)
    setShowEditModal(true)
  }

  const handleDeleteStatus = (status: Status) => {
    setSelectedStatus(status)
    setShowDeleteModal(true)
  }

  const handleStatusCreated = (newStatus: Status) => {
    setStatuses(prev => [...prev, newStatus])
    setShowAddModal(false)
  }

  const handleStatusUpdated = (updatedStatus: Status) => {
    setStatuses(prev => prev.map(stat => 
      stat.id === updatedStatus.id ? updatedStatus : stat
    ))
    setShowEditModal(false)
    setSelectedStatus(null)
  }

  const handleStatusDeleted = (deletedStatusId: number) => {
    setStatuses(prev => prev.filter(stat => stat.id !== deletedStatusId))
    setShowDeleteModal(false)
    setSelectedStatus(null)
  }

  return (
    <RequireCategoryStatusAccess>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Circle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statuses</h1>
            <p className="text-gray-600">Manage property statuses with custom colors</p>
          </div>
        </div>
        
        {canManageProperties && (
          <button
            onClick={handleAddStatus}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add Status</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="input-with-icon relative flex-1">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search statuses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Circle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Statuses</p>
              <p className="text-2xl font-bold text-gray-900">{statuses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Statuses</p>
              <p className="text-2xl font-bold text-gray-900">
                {statuses.filter(stat => stat.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Search className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Filtered Results</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStatuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statuses Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading statuses...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Statuses</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadStatuses}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : filteredStatuses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Circle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No statuses found' : 'No statuses yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by adding your first status'
              }
            </p>
            {canManageProperties && !searchTerm && (
              <button
                onClick={handleAddStatus}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Add Status
              </button>
            )}
          </div>
        ) : (
          <StatusTable
            statuses={filteredStatuses}
            onEdit={handleEditStatus}
            onDelete={handleDeleteStatus}
            canManage={canManageProperties}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <StatusModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleStatusCreated}
          title="Add Status"
        />
      )}

      {showEditModal && selectedStatus && (
        <StatusModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleStatusUpdated}
          status={selectedStatus}
          title="Edit Status"
        />
      )}

      {showDeleteModal && selectedStatus && (
        <StatusDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleStatusDeleted}
          status={selectedStatus}
        />
      )}
      </div>
    </RequireCategoryStatusAccess>
  )
}
