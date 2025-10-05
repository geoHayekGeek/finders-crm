'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  Plus,
  List,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  UserCircle,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  FolderOpen
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { UserDocuments } from '@/components/UserDocuments'
import { AddUserModal } from '@/components/AddUserModal'
import { EditUserModal } from '@/components/EditUserModal'
import { ViewUserModal } from '@/components/ViewUserModal'
import { DeleteUserModal } from '@/components/DeleteUserModal'
import { User, UserFilters as UserFiltersType } from '@/types/user'
import { usersApi, userDocumentsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { useToast } from '@/contexts/ToastContext'

export default function HRPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageLeads } = usePermissions() // Using leads permission for now
  const { showSuccess, showError, showWarning } = useToast()
  
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // View and display state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<UserFiltersType>({})
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Statistics state
  const [stats, setStats] = useState<any>(null)
  
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

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Load users
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view users')
        return
      }
      
      console.log('🔍 Loading users...')
      
      const response = await usersApi.getAll(token)
      console.log('📡 API Response:', response)
      
      if (response.success && response.users) {
        console.log('✅ Users data received:', response.users)
        
        // Add action handlers
        const usersWithActions = response.users.map((u: User) => ({
          ...u,
          onView: handleViewUser,
          onEdit: handleEditUser,
          onDelete: handleDeleteUser
        }))
        
        setUsers(usersWithActions)
        console.log('✅ Loaded users:', usersWithActions.length, usersWithActions)
        
        // Calculate stats
        calculateStats(usersWithActions)
      } else {
        console.error('❌ Failed to load users:', response)
        throw new Error(response.message || 'Failed to load users')
      }
      
    } catch (error) {
      setError('Failed to load users data')
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const calculateStats = (usersList: User[]) => {
    const roleCount: Record<string, number> = {}
    const locationCount: Record<string, number> = {}
    let assignedAgents = 0

    usersList.forEach(user => {
      // Count by role
      roleCount[user.role] = (roleCount[user.role] || 0) + 1
      
      // Count by work location
      if (user.work_location) {
        locationCount[user.work_location] = (locationCount[user.work_location] || 0) + 1
      }
      
      // Count assigned agents
      if (user.role === 'agent' && user.is_assigned) {
        assignedAgents++
      }
    })

    setStats({
      totalUsers: usersList.length,
      usersByRole: Object.entries(roleCount).map(([role, count]) => ({ role, count })),
      usersByLocation: Object.entries(locationCount).map(([work_location, count]) => ({ work_location, count })),
      assignedAgents,
      unassignedAgents: (roleCount['agent'] || 0) - assignedAgents
    })
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (filters.role && filters.role !== 'All' && user.role !== filters.role) {
        return false
      }
      
      // Work location filter
      if (filters.work_location && filters.work_location !== 'All' && user.work_location !== filters.work_location) {
        return false
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.user_code.toLowerCase().includes(searchLower) ||
          (user.phone && user.phone.toLowerCase().includes(searchLower))
        )
      }
      
      return true
    })
  }, [users, filters])

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }, [filteredUsers, currentPage, itemsPerPage])

  // Action handlers
  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user)
    setShowDeleteModal(true)
  }

  const handleViewDocuments = (user: User) => {
    setSelectedUser(user)
    setShowDocumentsModal(true)
  }

  const handleViewModalEdit = () => {
    setShowViewModal(false)
    setShowEditModal(true)
  }

  const handleViewModalDocuments = () => {
    setShowViewModal(false)
    setShowDocumentsModal(true)
  }

  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Export functions
  const exportToCSV = () => {
    const csvData = filteredUsers.map(user => [
      user.user_code || '',
      user.name || '',
      user.email || '',
      user.role || '',
      user.work_location || '',
      user.phone || '',
      user.dob || '',
      user.created_at ? new Date(user.created_at).toLocaleDateString() : ''
    ])
    
    const headers = ['User Code', 'Name', 'Email', 'Role', 'Work Location', 'Phone', 'Date of Birth', 'Created Date']
    
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
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowExportDropdown(false)
  }

  const exportToExcel = () => {
    // Similar to CSV but with more columns
    exportToCSV()
  }

  // Get unique work locations for filter
  const workLocations = useMemo(() => {
    const locations = new Set<string>()
    users.forEach(user => {
      if (user.work_location) {
        locations.add(user.work_location)
      }
    })
    return Array.from(locations).sort()
  }, [users])

  // Table columns
  const columns = [
    {
      header: 'User Code',
      accessorKey: 'user_code',
      cell: ({ row }: any) => (
        <div className="font-medium text-gray-900">{row.original.user_code}</div>
      ),
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.name}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: ({ row }: any) => {
        const user = row.original
        const roleColors: Record<string, string> = {
          admin: 'bg-purple-100 text-purple-800',
          team_leader: 'bg-blue-100 text-blue-800',
          agent: 'bg-green-100 text-green-800',
          operations: 'bg-orange-100 text-orange-800',
        }
        const roleDisplay = user.role ? user.role.replace('_', ' ').toUpperCase() : 'N/A'
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
            {roleDisplay}
          </span>
        )
      },
    },
    {
      header: 'Work Location',
      accessorKey: 'work_location',
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-900">
          {row.original.work_location || <span className="text-gray-400 italic">Not set</span>}
        </div>
      ),
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-900">{row.original.phone || '-'}</div>
      ),
    },
    {
      header: 'Account Status',
      accessorKey: 'is_active',
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          row.original.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.original.is_active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Assignment',
      accessorKey: 'is_assigned',
      cell: ({ row }: any) => {
        const user = row.original
        if (user.role !== 'agent') return <span className="text-gray-400">-</span>
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            user.is_assigned ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {user.is_assigned ? 'Assigned' : 'Available'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const user = row.original
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewUser(user)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View User"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEditUser(user)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Edit User"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewDocuments(user)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="View Documents"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteUser(user)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete User"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Human Resources</h1>
          <p className="text-gray-600 mt-1">
            Manage all system users ({filteredUsers.length} users)
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!isAuthenticated}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
              isAuthenticated
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="h-5 w-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Agents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.usersByRole?.find((r: any) => r.role === 'agent')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Leaders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.usersByRole?.find((r: any) => r.role === 'team_leader')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned Agents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.assignedAgents}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Name, email, code, phone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role || 'All'}
              onChange={(e) => setFilters({ ...filters, role: e.target.value === 'All' ? undefined : e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Roles</option>
              <option value="admin">Admin</option>
              <option value="team_leader">Team Leader</option>
              <option value="agent">Agent</option>
              <option value="operations">Operations</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Location
            </label>
            <select
              value={filters.work_location || 'All'}
              onChange={(e) => setFilters({ ...filters, work_location: e.target.value === 'All' ? undefined : e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Locations</option>
              {workLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>
        
        {Object.keys(filters).length > 0 && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={usersLoading}
            className={`p-2 rounded-lg transition-colors ${
              usersLoading 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Refresh users"
          >
            <RefreshCw className={`h-5 w-5 ${usersLoading ? 'animate-spin' : ''}`} />
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
        </div>
      </div>

      {/* Table View */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={paginatedUsers} />
      )}

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 px-6 gap-4">
            {/* Left side - Items per page */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            {/* Center - Showing X-Y of Z */}
            <div className="text-sm text-gray-700">
              Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of{' '}
              <span className="font-semibold">{filteredUsers.length}</span> users
            </div>
            
            {/* Right side - Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page <span className="font-semibold">{currentPage}</span> of{' '}
                <span className="font-semibold">{Math.ceil(filteredUsers.length / itemsPerPage)}</span>
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredUsers.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadData() // Reload users after successful add
          }}
        />
      )}
      
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            loadData() // Reload users after successful edit
          }}
        />
      )}
      
      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewModal(false)
            setSelectedUser(null)
          }}
          onEdit={handleViewModalEdit}
          onViewDocuments={handleViewModalDocuments}
        />
      )}
      
      {showDeleteModal && deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => {
            setShowDeleteModal(false)
            setDeletingUser(null)
          }}
          onSuccess={() => {
            loadData() // Reload users after successful delete
          }}
        />
      )}
      
      {showDocumentsModal && selectedUser && (
        <UserDocuments 
          user={selectedUser} 
          onClose={() => {
            setShowDocumentsModal(false)
            setSelectedUser(null)
          }} 
        />
      )}
    </div>
  )
}
