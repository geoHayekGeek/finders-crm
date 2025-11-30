'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { getLeadsColumns } from '@/components/LeadsTableColumns'
import { ReferLeadModal } from '@/components/ReferLeadModal'
import { Lead, LeadFilters as LeadFiltersType, EditLeadFormData, CreateLeadFormData, LeadStatsData } from '@/types/leads'
import { leadsApi, ApiError } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { formatDateForInput } from '@/utils/dateUtils'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'

export default function LeadsPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageLeads, canViewLeads } = usePermissions()
  const limitedLeadAccess = isAgentRole(user?.role) || isTeamLeaderRole(user?.role)
  
  // State management
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<LeadStatsData | null>(null)
  
  // View and display state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

useEffect(() => {
  if (limitedLeadAccess && showAdvancedFilters) {
    setShowAdvancedFilters(false)
  }
}, [limitedLeadAccess, showAdvancedFilters])
  
  // Filters state
  const [filters, setFilters] = useState<LeadFiltersType>({})
  const isInitialLoad = useRef(true)
  const prevFiltersRef = useRef<string>('')
  const loadLeadsRef = useRef<(() => Promise<void>) | null>(null)
  const hasProcessedAgentFilter = useRef(false)
  
  // Debug render counter
  const renderCount = useRef(0)
  renderCount.current += 1
  console.log('🔄 [DEBUG] LeadsPage render #', renderCount.current, { 
    isAuthenticated, 
    hasToken: !!token,
    canViewLeads,
    loading,
    leadsLoading,
    error,
    filtersCount: Object.keys(filters).length,
    leadsCount: leads.length 
  })
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReferModal, setShowReferModal] = useState(false)
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
    reference_source_id: undefined,
    operations_id: undefined,
    contact_source: 'unknown',
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
  const loadLeads = useCallback(async () => {
    console.log('🔄 [DEBUG] loadLeads called', { 
      isAuthenticated, 
      hasToken: !!token, 
      canViewLeads, 
      filters,
      timestamp: new Date().toISOString()
    })
    
    try {
      setLeadsLoading(true)
      setError(null)
      
      // Check authentication
      if (!isAuthenticated || !token) {
        console.log('❌ [DEBUG] Authentication failed')
        setError('You must be logged in to view leads')
        return
      }
      
      // Check permissions
      if (!canViewLeads) {
        console.log('❌ [DEBUG] Permission denied')
        setError('You do not have permission to view leads')
        return
      }
      
      // Check URL for agent_id filter (in case it wasn't set in state yet)
      let effectiveFilters = { ...filters }
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const agentIdFromUrl = urlParams.get('agent_id')
        if (agentIdFromUrl) {
          const agentIdNum = parseInt(agentIdFromUrl, 10)
          if (!isNaN(agentIdNum) && agentIdNum > 0) {
            effectiveFilters.agent_id = agentIdNum
            // Also update state if not already set
            if (!filters.agent_id || filters.agent_id !== agentIdNum) {
              setFilters(prev => ({ ...prev, agent_id: agentIdNum }))
            }
          }
        }
      }
      
      // Check if we have any active filters
      const hasActiveFilters = Object.entries(effectiveFilters).some(([key, value]) => 
        value !== undefined && value !== null && value !== '' && value !== 'All' && value !== 0
      )
      
      console.log('🔍 [DEBUG] Filter check', { hasActiveFilters, effectiveFilters, originalFilters: filters })
      console.log('🔍 [DEBUG] Date filters specifically:', { 
        date_from: filters.date_from, 
        date_to: filters.date_to,
        date_from_type: typeof filters.date_from,
        date_to_type: typeof filters.date_to
      })
      
      let response
      if (hasActiveFilters) {
        console.log('🔍 [LeadsPage] Using filtered API call with filters:', effectiveFilters)
        response = await leadsApi.getWithFilters(effectiveFilters, token)
      } else {
        console.log('🔍 [LeadsPage] Using getAll API call')
        response = await leadsApi.getAll(token)
      }
      
      console.log('📡 [DEBUG] API response received', { success: response.success, dataLength: response.data?.length })
      
      if (response.success) {
        setLeads(response.data || [])
        console.log('✅ [DEBUG] Leads updated successfully')
      } else {
        // Handle validation errors gracefully
        if (response.errors && Array.isArray(response.errors)) {
          // Show validation errors as toast messages instead of crashing
          response.errors.forEach((error: any) => {
            console.warn('Validation error:', error.message)
            // You could show a toast notification here
            // toast.error(`${error.field}: ${error.message}`)
          })
          // Set a generic error message for validation errors
          setError('Please check your filter values and try again')
        } else {
          setError(response.message || 'Failed to load leads')
        }
      }
      
    } catch (error) {
      console.error('❌ [DEBUG] Error loading leads:', error)
      setError(error instanceof Error ? error.message : 'Failed to load leads')
    } finally {
      setLeadsLoading(false)
      setLoading(false) // Set main loading to false when leads are loaded
      console.log('🏁 [DEBUG] loadLeads completed')
    }
  }, [isAuthenticated, token, canViewLeads, filters])

  // Store the latest loadLeads function in ref
  loadLeadsRef.current = loadLeads

  // Load stats separately
  const loadStats = useCallback(async () => {
    try {
      if (!isAuthenticated || !token) return
      
      const statsResponse = await leadsApi.getStats(token)
      if (statsResponse.success) {
        setStats(statsResponse.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [isAuthenticated, token])

  // Initialize filters from URL parameters (must run before loadLeads)
  useEffect(() => {
    if (typeof window === 'undefined' || hasProcessedAgentFilter.current) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const agentId = urlParams.get('agent_id')
    
    if (agentId) {
      const agentIdNum = parseInt(agentId, 10)
      if (!isNaN(agentIdNum) && agentIdNum > 0) {
        console.log('🔍 Initializing filter from URL agent_id:', agentIdNum)
        setFilters({
          agent_id: agentIdNum
        })
        hasProcessedAgentFilter.current = true
        // Mark that we need to load with this filter
        isInitialLoad.current = false // This will allow the filter change useEffect to trigger
      }
    }
  }, [])

  // Load data on component mount (only if no URL filter is present)
  useEffect(() => {
    console.log('🔄 [DEBUG] Initial load useEffect triggered', { 
      isAuthenticated, 
      hasToken: !!token,
      canViewLeads,
      isInitialLoad: isInitialLoad.current,
      hasProcessedAgentFilter: hasProcessedAgentFilter.current
    })
    
    // If we have an agent_id in URL, don't load here - let the filter change useEffect handle it
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const agentId = urlParams.get('agent_id')
      if (agentId) {
        console.log('🔍 Agent ID in URL, skipping initial load - will be handled by filter change')
        return
      }
    }
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ [DEBUG] Loading timeout reached, setting loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout
    
    if (isAuthenticated && token) {
      console.log('✅ [DEBUG] User is authenticated, loading data')
      loadStats()
      if (loadLeadsRef.current) {
        loadLeadsRef.current()
      }
    } else {
      console.log('❌ [DEBUG] User not authenticated or no token, setting loading to false')
      // If not authenticated, set loading to false to show error state
      setLoading(false)
    }
    
    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [isAuthenticated, token, loadStats])

  // Load leads when filters change (including initial load from URL)
  useEffect(() => {
    console.log('🔄 [DEBUG] Filter change useEffect triggered', { 
      isAuthenticated, 
      isInitialLoad: isInitialLoad.current,
      filters,
      prevFilters: prevFiltersRef.current,
      hasProcessedAgentFilter: hasProcessedAgentFilter.current
    })
    
    if (!isAuthenticated || !token) return
    
    const currentFiltersStr = JSON.stringify(filters)
    
    // Check if this is the initial load with URL filter
    const hasUrlFilter = typeof window !== 'undefined' && hasProcessedAgentFilter.current
    
    if (isInitialLoad.current && !hasUrlFilter) {
      // Initial load without URL filter - don't reload leads here, it's already done in the first useEffect
      console.log('🔄 [DEBUG] Initial load without URL filter, skipping filter reload')
      isInitialLoad.current = false
      prevFiltersRef.current = currentFiltersStr
      return
    }
    
    // If filters changed OR this is the first time we're setting filters from URL
    if (prevFiltersRef.current !== currentFiltersStr || (hasUrlFilter && prevFiltersRef.current === '')) {
      // Filters actually changed or being set from URL
      console.log('🔍 [DEBUG] Filters changed or set from URL, loading leads:', { 
        oldFilters: prevFiltersRef.current, 
        newFilters: currentFiltersStr,
        filters,
        hasUrlFilter
      })
      if (loadLeadsRef.current) {
        loadLeadsRef.current()
      }
      setCurrentPage(1) // Reset to first page when filters change
      prevFiltersRef.current = currentFiltersStr
      isInitialLoad.current = false
    } else {
      console.log('🔄 [DEBUG] No filter change detected, skipping reload')
    }
  }, [isAuthenticated, token, filters])

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

  // Handle refresh lead (fetch full lead data including referrals)
  const handleRefreshLead = async (leadId: number): Promise<void> => {
    try {
      console.log('🔄 Refreshing lead:', leadId)
      const response = await leadsApi.getById(leadId, token)
      
      if (response.success && response.data) {
        console.log('✅ Refreshed lead data:', response.data)
        console.log('✅ Referrals in response:', response.data.referrals)
        console.log('✅ Number of referrals:', response.data.referrals?.length || 0)
        
        // Create a completely new object with new array reference to force React re-render
        const refreshedLead: Lead = { 
          ...response.data,
          // Ensure referrals is a new array reference
          referrals: response.data.referrals ? [...response.data.referrals] : []
        }
        
        console.log('🔄 New refreshedLead referrals:', refreshedLead.referrals?.length || 0)
        
        // Update the lead in the leads array with new object reference
        setLeads(prevLeads => {
          return prevLeads.map(lead => 
            lead.id === leadId ? refreshedLead : lead
          )
        })
        
        // IMPORTANT: Always update selectedLead when refreshing the lead being viewed/edited
        if (selectedLead && selectedLead.id === leadId) {
          console.log('🔄 Forcing selectedLead update with completely new object reference')
          setSelectedLead(refreshedLead)
        }
        
        console.log('✅ Lead refreshed successfully')
        return
      }
    } catch (error) {
      console.error('❌ Error refreshing lead:', error)
    }
  }

  // Action handlers (defined before useMemo to avoid initialization issues)
  const handleViewLead = useCallback(async (lead: Lead) => {
    console.log('👁️ Opening view modal for lead:', lead.id)
    // Fetch full lead data including referrals before opening modal
    try {
      const response = await leadsApi.getById(lead.id, token)
      
      if (response.success && response.data) {
        console.log('✅ Refreshed lead data:', response.data)
        console.log('✅ Referrals in response:', response.data.referrals)
        
        // Create a completely new object with new array reference
        const refreshedLead: Lead = { 
          ...response.data,
          referrals: response.data.referrals ? [...response.data.referrals] : []
        }
        
        setSelectedLead(refreshedLead)
        setShowViewModal(true)
      }
    } catch (error) {
      console.error('❌ Error fetching lead data:', error)
    }
  }, [token])

  const handleEditLead = useCallback(async (lead: Lead) => {
    console.log('🔍 Opening edit modal for lead:', lead.id)
    
    try {
      const response = await leadsApi.getById(lead.id, token)
      
      if (!response.success || !response.data) {
        console.error('❌ Failed to fetch full lead data')
        return
      }
      
      const refreshedLead = { 
        ...response.data,
        referrals: response.data.referrals ? [...response.data.referrals] : []
      }
      
      console.log('📋 Full lead data fetched:', refreshedLead)
      console.log('📋 Referrals count:', refreshedLead.referrals?.length || 0)
      
      setSelectedLead(refreshedLead)
      
      // Format date properly - ensure it's in YYYY-MM-DD format for date input
      const formattedDate = formatDateForInput(refreshedLead.date)
      
      // Use assigned_agent_name if agent_name is not available
      const agentName = refreshedLead.agent_name || refreshedLead.assigned_agent_name || ''
      
      // Convert referrals from backend format to frontend format
      const convertedReferrals = (refreshedLead.referrals || []).map(ref => ({
        id: ref.id,
        name: ref.name,
        type: ref.type,
        employee_id: ref.agent_id || undefined,
        date: ref.referral_date ? new Date(ref.referral_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }))
      
      // Helper function to safely convert to number or undefined
      const safeNumber = (value: number | null | undefined): number | undefined => {
        if (value === null || value === undefined || value === 0) return undefined;
        return Number(value);
      };

      const formData = {
        date: formattedDate,
        customer_name: refreshedLead.customer_name || '',
        phone_number: refreshedLead.phone_number || '',
        agent_id: safeNumber(refreshedLead.agent_id),
        agent_name: agentName,
        price: refreshedLead.price !== null && refreshedLead.price !== undefined && refreshedLead.price !== 0 
          ? parseFloat(refreshedLead.price.toString()) 
          : undefined,
        reference_source_id: safeNumber(refreshedLead.reference_source_id),
        operations_id: safeNumber(refreshedLead.operations_id),
        contact_source: refreshedLead.contact_source || 'unknown',
        status: refreshedLead.status || 'Active',
        referrals: convertedReferrals
      }
      
      console.log('📝 Full refreshed lead data:', refreshedLead)
      console.log('📝 Setting edit form data:', formData)
      console.log('📝 Referrals in form data:', convertedReferrals.length)
      console.log('📝 operations_id from backend:', refreshedLead.operations_id, '-> form:', formData.operations_id)
      console.log('📝 reference_source_id from backend:', refreshedLead.reference_source_id, '-> form:', formData.reference_source_id)
      console.log('📝 contact_source from backend:', refreshedLead.contact_source, '-> form:', formData.contact_source)
      console.log('📝 price from backend:', refreshedLead.price, '-> form:', formData.price)
      setEditFormData(formData)
      setEditValidationErrors({}) // Clear any previous validation errors
      setShowEditModal(true)
    } catch (error) {
      console.error('❌ Error fetching lead data:', error)
    }
  }, [token])

  const handleDeleteLead = useCallback((lead: Lead) => {
    setDeletingLead(lead)
    setDeleteConfirmation('')
    setShowDeleteModal(true)
  }, [])

  const handleReferLead = useCallback((lead: Lead) => {
    console.log('Refer lead clicked:', lead)
    setSelectedLead(lead)
    setShowReferModal(true)
  }, [])

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({})
  }

  // Function to check if a lead can be referred
  const canReferLead = useCallback((lead: Lead) => {
    if (!user) return false
    const isClosed = lead.status && ['closed', 'converted'].includes(lead.status.toLowerCase())
    return (user.role === 'agent' || user.role === 'team_leader') && 
           lead.agent_id === user.id &&
           !isClosed
  }, [user])

  // Paginated leads for table view (with action handlers)
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return leads.slice(startIndex, endIndex).map(lead => ({
      ...lead,
      onView: handleViewLead,
      onEdit: handleEditLead,
      onDelete: handleDeleteLead,
      onRefer: handleReferLead
    }))
  }, [leads, currentPage, itemsPerPage, handleViewLead, handleEditLead, handleDeleteLead, handleReferLead])

  // Grid view leads (accumulated for "load more" functionality)
  const gridViewLeads = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return leads.slice(0, endIndex)
  }, [leads, currentPage, itemsPerPage])

  // Ref to track if we've already processed the URL parameter
  const hasProcessedUrlParam = useRef(false)

  // Handle URL parameter for auto-opening view modal
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !token) return
    if (loading || leadsLoading || showViewModal || hasProcessedUrlParam.current) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const viewLeadId = urlParams.get('view')
    
    if (!viewLeadId) return
    
    const leadId = parseInt(viewLeadId, 10)
    if (isNaN(leadId)) return
    
    // Mark as processed to prevent multiple runs
    hasProcessedUrlParam.current = true
    
    // First, try to find the lead in the loaded leads
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      console.log('✅ Found lead in list, opening modal:', leadId)
      handleViewLead(lead)
      // Clean up URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }
    
    // If lead not found in list, fetch it directly using the API
    console.log('🔍 Lead not in list, fetching:', leadId)
    const fetchAndOpenLead = async () => {
      try {
        const response = await leadsApi.getById(leadId, token)
        
        if (response.success && response.data) {
          console.log('✅ Fetched lead, opening modal:', leadId)
          handleViewLead(response.data)
          // Clean up URL parameter
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        } else {
          console.error('❌ Failed to fetch lead:', response)
        }
      } catch (error) {
        console.error('❌ Error fetching lead for view:', error)
      }
    }
    
    // Fetch the lead
    fetchAndOpenLead()
  }, [leads, showViewModal, isAuthenticated, token, loading, leadsLoading, handleViewLead])
  
  // Reset the ref when modal closes
  useEffect(() => {
    if (!showViewModal) {
      hasProcessedUrlParam.current = false
    }
  }, [showViewModal])


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
      console.log('📡 [LeadsPage] Referrals in update data:', cleanUpdateData.referrals)
      console.log('📡 [LeadsPage] Number of referrals:', cleanUpdateData.referrals?.length || 0)

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
        await loadLeads()
        await loadStats()
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
      await loadLeads()
      await loadStats()
      
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
        await loadLeads()
        await loadStats()
        
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
    // The useEffect will trigger loadLeads when filters change
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
            onClick={() => {
              loadLeads()
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
                <p className="text-sm font-medium text-gray-600">
                  {user?.role === 'agent' || user?.role === 'team_leader' 
                    ? 'My Leads' 
                    : 'Total Leads'}
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  {user?.role === 'agent' || user?.role === 'team_leader' 
                    ? 'New Assigned (7d)' 
                    : 'New (7 Days)'}
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  {user?.role === 'agent' || user?.role === 'team_leader' 
                    ? 'My Avg. Value' 
                    : 'Avg. Value'}
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  {user?.role === 'agent' || user?.role === 'team_leader' 
                    ? 'My Total Value' 
                    : 'Total Value'}
                </p>
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
        limitedAccess={limitedLeadAccess}
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
              limitedAccess={limitedLeadAccess}
            />
          ))}
        </div>
      ) : (
        // Table View
        <DataTable
          columns={getLeadsColumns(canManageLeads, { limitedAccess: limitedLeadAccess, canReferLead })}
          data={paginatedLeads}
        />
      )}

      {/* Pagination - Always show for table view, conditional for grid view */}
      {(viewMode === 'table' || leads.length > itemsPerPage) && (
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
        onRefreshLead={handleRefreshLead}
      />

      {/* Refer Lead Modal */}
      <ReferLeadModal
        isOpen={showReferModal}
        onClose={() => {
          setShowReferModal(false)
          setSelectedLead(null)
        }}
        lead={selectedLead}
        onSuccess={() => {
          loadLeads()
        }}
      />
    </div>
  )
}
