'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Users, 
  Plus,
  Grid3X3,
  List,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { LeadsCard } from '@/components/LeadsCard'
import { LeadsFilters } from '@/components/LeadsFilters'
import { LeadsModals } from '@/components/LeadsModals'
import { PropertyPagination } from '@/components/PropertyPagination'
import { getLeadsColumns, getLeadsDetailedColumns } from '@/components/LeadsTableColumns'
import { Lead, LeadFilters as LeadFiltersType, EditLeadFormData, CreateLeadFormData, LeadStatsData } from '@/types/leads'
import { leadsApi, ApiError } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { formatDateForInput } from '@/utils/dateUtils'

export default function LeadsPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageLeads, canViewLeads } = usePermissions()
  
  // State management
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<LeadStatsData | null>(null)
  
  // View and display state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<LeadFiltersType>({})
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [editFormData, setEditFormData] = useState<EditLeadFormData>({
    date: '',
    customer_name: '',
    phone_number: '',
    agent_id: undefined,
    agent_name: '',
    price: undefined,
    reference_source_id: 0,
    operations_id: 0,
    notes: '',
    status: 'Active'
  })
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Statistics state
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

  // Load leads data
  const loadLeads = async () => {
    try {
      setLeadsLoading(true)
      setError(null)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view leads')
        return
      }
      
      // Check permissions
      if (!canViewLeads) {
        setError('You do not have permission to view leads')
        return
      }
      
      // Check if we have any active filters
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
        value !== undefined && value !== null && value !== '' && value !== 'All'
      )
      
      let response
      if (hasActiveFilters) {
        response = await leadsApi.getWithFilters(filters, token)
      } else {
        response = await leadsApi.getAll(token)
      }
      
      if (response.success) {
        setLeads(response.data || [])
      } else {
        setError(response.message || 'Failed to load leads')
      }
      
    } catch (error) {
      console.error('Error loading leads:', error)
      setError(error instanceof Error ? error.message : 'Failed to load leads')
    } finally {
      setLeadsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Reload leads when filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadLeads()
      setCurrentPage(1) // Reset to first page when filters change
    }
  }, [filters, isAuthenticated, token])

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
        setError('You must be logged in to view leads')
        return
      }
      
      // Check permissions
      if (!canViewLeads) {
        setError('You do not have permission to view leads')
        return
      }
      
      // Load leads and statistics
      const [leadsResponse, statsResponse] = await Promise.allSettled([
        leadsApi.getAll(token),
        leadsApi.getStats(token)
      ])
      
      // Handle leads response
      if (leadsResponse.status === 'fulfilled' && leadsResponse.value.success) {
        setLeads(leadsResponse.value.data || [])
      } else {
        const error = leadsResponse.status === 'rejected' ? leadsResponse.reason : leadsResponse.value
        setError('Failed to load leads: ' + (error?.message || 'Unknown error'))
      }
      
      // Handle stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        setStats(statsResponse.value.data)
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }


  // Action handlers (defined before useMemo to avoid initialization issues)
  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowViewModal(true)
  }

  const handleEditLead = (lead: Lead) => {
    console.log('🔍 Opening edit modal for lead:', lead)
    setSelectedLead(lead)
    
    // Format date properly - ensure it's in YYYY-MM-DD format for date input
    const formattedDate = formatDateForInput(lead.date)
    
    // Use assigned_agent_name if agent_name is not available
    const agentName = lead.agent_name || lead.assigned_agent_name || ''
    
    const formData = {
      date: formattedDate,
      customer_name: lead.customer_name,
      phone_number: lead.phone_number || '',
      agent_id: lead.agent_id,
      agent_name: agentName,
      price: lead.price ? parseFloat(lead.price.toString()) : undefined,
      reference_source_id: lead.reference_source_id || 0,
      operations_id: lead.operations_id || 0,
      notes: lead.notes || '',
      status: lead.status
    }
    
    console.log('📝 Setting edit form data:', formData)
    setEditFormData(formData)
    setEditValidationErrors({}) // Clear any previous validation errors
    setShowEditModal(true)
  }

  const handleDeleteLead = (lead: Lead) => {
    setDeletingLead(lead)
    setDeleteConfirmation('')
    setShowDeleteModal(true)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({})
  }

  // Paginated leads for table view (with action handlers)
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return leads.slice(startIndex, endIndex).map(lead => ({
      ...lead,
      onView: handleViewLead,
      onEdit: handleEditLead,
      onDelete: handleDeleteLead
    }))
  }, [leads, currentPage, itemsPerPage, handleViewLead, handleEditLead, handleDeleteLead])

  // Grid view leads (accumulated for "load more" functionality)
  const gridViewLeads = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return leads.slice(0, endIndex)
  }, [leads, currentPage, itemsPerPage])


  const handleSaveEdit = async () => {
    try {
      console.log('💾 Saving lead edits:', editFormData)
      console.log('🔍 Selected lead ID:', selectedLead?.id)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        console.log('❌ Not authenticated or no token')
        return
      }
      
      // Check permissions
      if (!canManageLeads) {
        console.log('❌ No permission to manage leads')
        return
      }

      // Get the lead ID from selectedLead
      if (!selectedLead) {
        console.log('❌ No selected lead')
        return
      }

      // Validate required fields
      if (!editFormData.customer_name.trim()) {
        console.log('❌ Customer name is required')
        return
      }

      console.log('📡 [LeadsPage] Sending update request for lead:', selectedLead.id)
      console.log('📡 [LeadsPage] Raw update data:', editFormData)
      console.log('📡 [LeadsPage] Status field specifically:', editFormData.status)

      // Filter out undefined values and prepare clean update data
      const cleanUpdateData = Object.fromEntries(
        Object.entries(editFormData).filter(([_, value]) => value !== undefined)
      )
      
      console.log('📡 [LeadsPage] After filtering undefined values:', cleanUpdateData)
      console.log('📡 [LeadsPage] Status after filtering:', cleanUpdateData.status)
      
      // Handle agent removal - if agent_id is undefined, set it to null
      if (cleanUpdateData.agent_id === undefined) {
        cleanUpdateData.agent_id = null
        cleanUpdateData.agent_name = null
        console.log('📡 [LeadsPage] Agent removed, set to null')
      }
      
      console.log('📡 [LeadsPage] Final clean update data:', cleanUpdateData)
      console.log('📡 [LeadsPage] Final status value:', cleanUpdateData.status)

      // Send PUT request to update the lead
      console.log('📡 [LeadsPage] Calling leadsApi.update with:', {
        leadId: selectedLead.id,
        updateData: cleanUpdateData,
        hasToken: !!token
      })
      
      const response = await leadsApi.update(selectedLead.id, cleanUpdateData, token)
      console.log('📡 [LeadsPage] Update response:', response)
      
      if (response.success) {
        console.log('✅ [LeadsPage] Lead updated successfully')
        console.log('✅ [LeadsPage] Updated lead data:', response.data)
        
        // Close the modal only on success
        setShowEditModal(false)
        setSelectedLead(null)
        
        // Refresh the leads list
        await loadData()
      } else {
        console.error('❌ [LeadsPage] Update failed:', response.message)
        
        // Handle other types of errors
        console.error('❌ [LeadsPage] Update error:', response.message)
        // You could show a toast notification here
      }
      
    } catch (error) {
      console.error('❌ Error updating lead:', error)
      
      // Handle ApiError with validation errors
      if (error instanceof ApiError) {
        if (error.errors && Array.isArray(error.errors)) {
          console.log('🚫 [LeadsPage] Processing validation errors:', error.errors.length, 'errors')
          
          // Set validation errors for each field
          const newValidationErrors: Record<string, string> = {}
          error.errors.forEach((validationError: any) => {
            // If there are multiple errors for the same field, combine them
            if (newValidationErrors[validationError.field]) {
              newValidationErrors[validationError.field] += `; ${validationError.message}`
            } else {
              newValidationErrors[validationError.field] = validationError.message
            }
          })
          
          setEditValidationErrors(newValidationErrors)
          
          // Throw the error so the modal knows the operation failed
          throw error
        }
      }
      
      // Re-throw any other errors
      throw error
    }
  }

  // Handle add lead
  const handleAddLead = async (leadData: CreateLeadFormData) => {
    try {
      console.log('Adding new lead:', leadData)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        return
      }
      
      // Check permissions
      if (!canManageLeads) {
        return
      }
      
      // Validate required fields
      if (!leadData.customer_name.trim()) {
        return
      }

      console.log('📡 Sending create request:', leadData)
      
      // Call the API to create the lead
      const response = await leadsApi.create(leadData, token)
      
      console.log('✅ Lead created successfully:', response.data)

      // Refresh the leads list
      await loadData()
      
      // Return the created lead data
      return response.data
      
    } catch (error) {
      console.error('Error adding lead:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      throw error // Re-throw so the modal knows the creation failed
    }
  }


  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (deletingLead && deleteConfirmation === deletingLead.customer_name) {
      try {
        // Check authentication
        if (!isAuthenticated || !token) {
          return
        }
        
        // Check permissions
        if (!canManageLeads) {
          return
        }
        
        console.log('🗑️ Deleting lead:', deletingLead.id)
        
        // Call the API to delete the lead
        await leadsApi.delete(deletingLead.id, token)
        
        console.log('✅ Lead deleted successfully!')
        
        // Refresh the leads list
        await loadData()
        
        // Close modal and reset state
        setShowDeleteModal(false)
        setDeletingLead(null)
        setDeleteConfirmation('')
        
        // Show success message
        
      } catch (error) {
        console.error('Error deleting lead:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      }
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

  // Export functions
  const exportToCSV = () => {
    const currentData = viewMode === 'table' ? paginatedLeads : leads
    
    // Prepare CSV headers
    const headers = [
      'Date',
      'Customer Name', 
      'Phone Number',
      'Agent Name',
      'Status',
      'Reference Source',
      'Operations',
      'Referral Sources',
      'Notes',
      'Created Date'
    ]
    
    // Prepare CSV data
    const csvData = currentData.map((lead: Lead) => [
      lead.date || '',
      lead.customer_name || '',
      lead.phone_number || '',
      lead.assigned_agent_name || lead.agent_name || '',
      lead.status || '',
      lead.reference_source_name || '',
      lead.operations_name || '',
      lead.reference_source_name || '',
      lead.notes || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''
    ])
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any[]) => 
        row.map((cell: any) => 
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
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowExportDropdown(false)
  }

  const exportToExcel = () => {
    const currentData = viewMode === 'table' ? paginatedLeads : leads
    
    // Prepare Excel-compatible CSV data with more detailed headers
    const headers = [
      'Date',
      'Customer Name',
      'Phone Number',
      'Agent Name',
      'Agent Role',
      'Status',
      'Reference Source',
      'Operations',
      'Operations Role',
      'Referral Sources',
      'Notes',
      'Created Date',
      'Updated Date'
    ]
    
    // Prepare CSV data
    const csvData = currentData.map((lead: Lead) => [
      lead.date || '',
      lead.customer_name || '',
      lead.phone_number || '',
      lead.assigned_agent_name || lead.agent_name || '',
      lead.agent_role || '',
      lead.status || '',
      lead.reference_source_name || '',
      lead.operations_name || '',
      lead.operations_role || '',
      lead.reference_source_name || '',
      lead.notes || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '',
      lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : ''
    ])
    
    // Create CSV content (Excel-compatible)
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any[]) => 
        row.map((cell: any) => 
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
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`)
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
          <p className="text-gray-600">Loading leads...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            Manage your leads pipeline ({leads.length} leads)
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!isAuthenticated || !canManageLeads}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
              isAuthenticated && canManageLeads
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="h-5 w-5" />
            <span>Add Lead</span>
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
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New (7 Days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentActivity.newLeads7Days}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.pricing.averagePrice)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.pricing.totalValue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <LeadsFilters
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
            onClick={loadLeads}
            disabled={leadsLoading}
            className={`p-2 rounded-lg transition-colors ${
              leadsLoading 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Refresh leads"
          >
            <RefreshCw className={`h-5 w-5 ${leadsLoading ? 'animate-spin' : ''}`} />
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
      {leadsLoading ? (
        // Loading state for leads only
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading leads...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gridViewLeads.map((lead) => (
            <LeadsCard
              key={lead.id}
              lead={lead}
              onView={handleViewLead}
              onEdit={handleEditLead}
              onDelete={handleDeleteLead}
              canManageLeads={canManageLeads}
            />
          ))}
        </div>
      ) : (
        // Table View
        <DataTable
          columns={getLeadsColumns(canManageLeads)}
          data={paginatedLeads}
        />
      )}

      {/* Pagination */}
      {leads.length > itemsPerPage && (
        <PropertyPagination
          currentPage={currentPage}
          totalPages={Math.ceil(leads.length / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={leads.length}
          startIndex={(currentPage - 1) * itemsPerPage}
          endIndex={Math.min(currentPage * itemsPerPage, leads.length)}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          viewMode={viewMode}
        />
      )}

      {/* Modals */}
      <LeadsModals
        showAddLeadModal={showAddModal}
        setShowAddLeadModal={setShowAddModal}
        onSaveAdd={handleAddLead}
        showEditLeadModal={showEditModal}
        setShowEditLeadModal={setShowEditModal}
        editingLead={selectedLead}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editValidationErrors={editValidationErrors}
        setEditValidationErrors={setEditValidationErrors}
        onSaveEdit={handleSaveEdit}
        showViewLeadModal={showViewModal}
        setShowViewLeadModal={setShowViewModal}
        viewingLead={selectedLead}
        showDeleteLeadModal={showDeleteModal}
        setShowDeleteLeadModal={setShowDeleteModal}
        deletingLead={deletingLead}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  )
}
