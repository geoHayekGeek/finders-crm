'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Calendar, Users, Tag, Globe, Settings, RefreshCw, Calculator, Edit3 } from 'lucide-react'
import { Lead, LEAD_STATUSES, CreateLeadFormData, EditLeadFormData, ReferenceSource, OperationsUser, LeadReferralInput, LeadNote } from '@/types/leads'
import { AgentSelector } from './AgentSelector'
import { StatusSelector } from './StatusSelector'
import { ReferenceSourceSelector } from './ReferenceSourceSelector'
import { OperationsSelector } from './OperationsSelector'
import { LeadReferralsSection } from './LeadReferralsSection'
import { LeadReferralSelector } from './LeadReferralSelector'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { useToast } from '@/contexts/ToastContext'
import { leadStatusesApi, leadsApi, leadNotesApi, ApiError } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'

interface User {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface LeadsModalsProps {
  // Add Lead Modal
  showAddLeadModal: boolean
  setShowAddLeadModal: (show: boolean) => void
  onSaveAdd: (leadData: CreateLeadFormData) => Promise<Lead | void>
  
  // Edit Lead Modal
  showEditLeadModal: boolean
  setShowEditLeadModal: (show: boolean) => void
  editingLead: Lead | null
  editFormData: EditLeadFormData
  setEditFormData: (data: EditLeadFormData) => void
  editValidationErrors: Record<string, string>
  setEditValidationErrors: (errors: Record<string, string>) => void
  onSaveEdit: () => Promise<void>
  
  // View Lead Modal
  showViewLeadModal: boolean
  setShowViewLeadModal: (show: boolean) => void
  viewingLead: Lead | null
  
  // Delete Lead Modal
  showDeleteLeadModal: boolean
  setShowDeleteLeadModal: (show: boolean) => void
  deletingLead: Lead | null
  deleteConfirmation: string
  setDeleteConfirmation: (confirmation: string) => void
  onConfirmDelete: () => Promise<void>
  
  // Refresh callback
  onRefreshLead?: (leadId: number) => Promise<void>
}

export function LeadsModals({
  showAddLeadModal,
  setShowAddLeadModal,
  onSaveAdd,
  showEditLeadModal,
  setShowEditLeadModal,
  editingLead,
  editFormData,
  setEditFormData,
  editValidationErrors,
  setEditValidationErrors,
  onSaveEdit,
  showViewLeadModal,
  setShowViewLeadModal,
  viewingLead,
  showDeleteLeadModal,
  setShowDeleteLeadModal,
  deletingLead,
  deleteConfirmation,
  setDeleteConfirmation,
  onConfirmDelete,
  onRefreshLead
}: LeadsModalsProps) {
  const { showSuccess, showError } = useToast()
  const { token, user } = useAuth()
  const limitedAccess = isAgentRole(user?.role) || isTeamLeaderRole(user?.role)
  
  // Lead statuses state
  const [leadStatuses, setLeadStatuses] = useState<Array<{ value: string; label: string; color: string }>>([])
  const [loadingStatuses, setLoadingStatuses] = useState(false)
  
  // Agents state for referrals
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  
  // Fetch agents for referrals
  useEffect(() => {
    const fetchAgents = async () => {
      if (!token) return
      
      setLoadingAgents(true)
      try {
        const data = await (await import('@/utils/api')).usersApi.getAgents(token)
        if (data.success) {
          setAgents(data.agents.map((agent: any) => ({ id: agent.id, name: agent.name })))
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
      } finally {
        setLoadingAgents(false)
      }
    }

    fetchAgents()
  }, [token])
  
  // Handler for adding referrals
  const handleAddReferral = async (leadId: number, agentId: number, referralDate: string) => {
    if (!token) {
      showError('Authentication required')
      return
    }
    
    try {
      // Get the agent name from the agents list
      const agent = agents.find(a => a.id === agentId)
      const agentName = agent?.name || 'Unknown Agent'
      
      // Create the referral data object with the correct structure
      const referralData = {
        name: agentName,
        type: 'employee' as const,
        employee_id: agentId,
        date: referralDate
      }
      
      console.log('📤 Sending referral data:', referralData)
      const response = await leadsApi.addReferral(leadId, referralData, token)
      console.log('📥 Received response:', response)
      
      if (response.success) {
        showSuccess('Referral added successfully')
        // Refresh the lead data
        if (onRefreshLead) {
          await onRefreshLead(leadId)
        }
      } else {
        showError(response.message || 'Failed to add referral')
      }
    } catch (error) {
      console.error('Error adding referral:', error)
      showError('An error occurred while adding the referral')
    }
  }
  
  // Handler for deleting referrals
  const handleDeleteReferral = async (leadId: number, referralId: number) => {
    if (!token) {
      showError('Authentication required')
      return
    }
    
    try {
      const response = await leadsApi.deleteReferral(leadId, referralId, token)
      if (response.success) {
        showSuccess('Referral deleted successfully')
        // Refresh the lead data
        if (onRefreshLead) {
          await onRefreshLead(leadId)
        }
      } else {
        showError(response.message || 'Failed to delete referral')
      }
    } catch (error) {
      console.error('Error deleting referral:', error)
      showError('An error occurred while deleting the referral')
    }
  }
  
  // Validation state
  const [addValidationErrors, setAddValidationErrors] = useState<Record<string, string>>({})
  
  const [addFormData, setAddFormData] = useState<CreateLeadFormData>({
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    phone_number: '',
    agent_id: undefined,
    agent_name: '',
    price: undefined,
    reference_source_id: undefined,
    operations_id: undefined,
    contact_source: 'unknown',
    status: '',
    referrals: []
  })

  const [saving, setSaving] = useState(false)

  // Lead notes state (view modal)
  const [notes, setNotes] = useState<LeadNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingMyNote, setEditingMyNote] = useState(false)

  const canAddNote = (() => {
    if (!user || !viewingLead) return false
    const normalizedRole = user.role?.toLowerCase().replace(/\s+/g, '_')
    const isAssignedAgent = viewingLead.agent_id === user.id
    if (normalizedRole === 'agent') return !!isAssignedAgent
    // Operations can add on any lead
    if (normalizedRole === 'operations') return true
    // Operations manager / agent manager / admin can add on any lead
    if (['operations_manager', 'agent_manager', 'admin'].includes(normalizedRole || '')) return true
    return false
  })()

  useEffect(() => {
    const loadNotes = async () => {
      if (!token || !viewingLead) return
      setNotesLoading(true)
      try {
        const response = await leadNotesApi.getForLead(viewingLead.id, token)
        if (response.success) {
          setNotes(response.data)
          if (user) {
            const myNote = response.data.find(n => n.created_by === user.id)
            setNewNoteText(myNote ? myNote.note_text : '')
          }
        }
      } catch (error) {
        console.error('Error loading lead notes:', error)
      } finally {
        setNotesLoading(false)
      }
    }

    if (showViewLeadModal && viewingLead && token) {
      loadNotes()
    } else {
      setNotes([])
      setNewNoteText('')
      setEditingMyNote(false)
    }
  }, [showViewLeadModal, viewingLead, token, user])

  const handleAddNote = async () => {
    if (!token || !viewingLead) return
    const text = newNoteText.trim()
    if (!text) return
    try {
      const response = await leadNotesApi.create(viewingLead.id, text, token)
      if (response.success) {
        setNotes(prev => {
          const others = prev.filter(n => n.id !== response.data.id)
          return [response.data, ...others]
        })
        setNewNoteText(response.data.note_text)
        setEditingMyNote(false)
        showSuccess('Note saved')
      } else {
        showError(response.message || 'Failed to add note')
      }
    } catch (error) {
      console.error('Error adding lead note:', error)
      showError(error instanceof ApiError ? error.message : 'Failed to add note')
    }
  }

  // Load lead statuses from API
  const loadLeadStatuses = async () => {
    if (!token) return
    
    try {
      setLoadingStatuses(true)
      const response = await leadStatusesApi.getAll()
      
      if (response.success && response.data) {
        // Convert API data to the format expected by StatusSelector
        const statuses = response.data.map((status: any) => ({
          value: status.status_name,
          label: status.status_name,
          color: getStatusColor(status.status_name)
        }))
        setLeadStatuses(statuses)
      } else {
        // Fallback to hardcoded statuses if API fails
        setLeadStatuses(LEAD_STATUSES.map(s => ({ ...s })))
      }
    } catch (error) {
      console.error('Error loading lead statuses:', error)
      // Fallback to hardcoded statuses if API fails
      setLeadStatuses(LEAD_STATUSES.map(s => ({ ...s })))
    } finally {
      setLoadingStatuses(false)
    }
  }

  // Get color for status (fallback to hardcoded colors)
  const getStatusColor = (statusName: string) => {
    const hardcodedStatus = LEAD_STATUSES.find(s => s.value === statusName)
    return hardcodedStatus?.color || '#6B7280'
  }

  // Load lead statuses on component mount
  useEffect(() => {
    loadLeadStatuses()
  }, [token])

  // Clear validation errors when editing lead changes
  useEffect(() => {
    if (editingLead) {
      setEditValidationErrors({})
    }
  }, [editingLead])

  // Validation functions
  const validateField = (fieldName: string, value: any, isEditForm = false) => {
    let errorMessage = ''
    
    switch (fieldName) {
      case 'customer_name':
        if (!value || value.trim() === '') {
          errorMessage = 'Customer name is required'
        }
        break
      case 'phone_number':
        if (!value || value.trim() === '') {
          errorMessage = 'Phone number is required'
        }
        break
      case 'reference_source_id':
        if (!value || value === undefined || value === null) {
          errorMessage = 'Reference source is required'
        }
        break
      case 'operations_id':
        if (!value || value === undefined || value === null) {
          errorMessage = 'Operations staff assignment is required'
        }
        break
      case 'status':
        if (!value || value.trim() === '') {
          errorMessage = 'Status is required'
        }
        break
    }
    
    if (isEditForm) {
      setEditValidationErrors({
        ...editValidationErrors,
        [fieldName]: errorMessage
      })
    } else {
      setAddValidationErrors({
        ...addValidationErrors,
        [fieldName]: errorMessage
      })
    }
  }

  const clearFieldError = (fieldName: string, isEditForm = false) => {
    if (isEditForm) {
      setEditValidationErrors({
        ...editValidationErrors,
        [fieldName]: ''
      })
    } else {
      setAddValidationErrors({
        ...addValidationErrors,
        [fieldName]: ''
      })
    }
  }

  // Handle add form submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    const fieldsToValidate = ['customer_name', 'phone_number', 'reference_source_id', 'operations_id', 'status']
    const newValidationErrors: Record<string, string> = {}
    let hasErrors = false
    
    fieldsToValidate.forEach(field => {
      const value = addFormData[field as keyof CreateLeadFormData]
      let errorMessage = ''
      
      switch (field) {
        case 'customer_name':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Customer name is required'
          }
          break
        case 'phone_number':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Phone number is required'
          }
          break
        case 'reference_source_id':
          if (!value || value === undefined || value === null) {
            errorMessage = 'Reference source is required'
          }
          break
        case 'operations_id':
          if (!value || value === undefined || value === null) {
            errorMessage = 'Operations staff assignment is required'
          }
          break
        case 'status':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Status is required'
          }
          break
      }
      
      newValidationErrors[field] = errorMessage
      
      if (errorMessage) {
        hasErrors = true
      }
    })

    // Update validation errors state
    setAddValidationErrors(newValidationErrors)
    
    // If there are validation errors, don't submit
    if (hasErrors) {
      showError('Please fill in all required fields before submitting')
      return
    }

    setSaving(true)
    try {
      await onSaveAdd(addFormData)
      showSuccess('Lead created successfully!')
      setShowAddLeadModal(false)
      // Reset form
      setAddFormData({
        date: new Date().toISOString().split('T')[0],
        customer_name: '',
        phone_number: '',
        agent_id: undefined,
        agent_name: '',
        price: undefined,
        reference_source_id: undefined,
        operations_id: undefined,
        contact_source: 'unknown',
        status: '',
        referrals: []
      })
      // Clear validation errors
      setAddValidationErrors({})
    } catch (error) {
      console.error('Error saving lead:', error)
      showError('Failed to create lead. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    const fieldsToValidate = ['customer_name', 'phone_number', 'reference_source_id', 'operations_id', 'status']
    const newValidationErrors: Record<string, string> = {}
    let hasErrors = false
    
    fieldsToValidate.forEach(field => {
      const value = editFormData[field as keyof EditLeadFormData]
      let errorMessage = ''
      
      switch (field) {
        case 'customer_name':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Customer name is required'
          }
          break
        case 'phone_number':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Phone number is required'
          }
          break
        case 'reference_source_id':
          if (!value || value === undefined || value === null) {
            errorMessage = 'Reference source is required'
          }
          break
        case 'operations_id':
          if (!value || value === undefined || value === null) {
            errorMessage = 'Operations staff assignment is required'
          }
          break
        case 'status':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errorMessage = 'Status is required'
          }
          break
      }
      
      newValidationErrors[field] = errorMessage
      
      if (errorMessage) {
        hasErrors = true
      }
    })

    // Update validation errors state
    setEditValidationErrors(newValidationErrors)
    
    // If there are validation errors, don't submit
    if (hasErrors) {
      showError('Please fill in all required fields before submitting')
      return
    }

    setSaving(true)
    try {
      await onSaveEdit()
      showSuccess('Lead updated successfully!')
      setShowEditLeadModal(false)
      // Clear validation errors
      setEditValidationErrors({})
    } catch (error) {
      console.error('Error updating lead:', error)
      
      // Check if it's a validation error (ApiError with validation errors)
      if (error instanceof ApiError) {
        // Don't show error toast for validation errors - they're already displayed under fields
        // Don't close the modal - let user fix the validation errors
        console.log('Validation errors detected, keeping modal open')
      } else {
        // Show error toast for other types of errors
        showError('Failed to update lead. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle delete confirmation
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deleteConfirmation !== deletingLead?.customer_name) {
      showError('Please type the customer name exactly to confirm deletion')
      return
    }

    setSaving(true)
    try {
      await onConfirmDelete()
      showSuccess('Lead deleted successfully!')
      setShowDeleteLeadModal(false)
      setDeleteConfirmation('')
    } catch (error) {
      console.error('Error deleting lead:', error)
      showError('Failed to delete lead. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
                <button
                  onClick={() => setShowAddLeadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date *
                  </label>
                  <input
                    type="date"
                    value={addFormData.date}
                    onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={addFormData.customer_name}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAddFormData({ ...addFormData, customer_name: newValue })
                      clearFieldError('customer_name')
                      validateField('customer_name', newValue)
                    }}
                    onBlur={(e) => validateField('customer_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      addValidationErrors.customer_name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter customer name"
                  />
                  {addValidationErrors.customer_name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.customer_name}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={addFormData.phone_number}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAddFormData({ ...addFormData, phone_number: newValue })
                      clearFieldError('phone_number')
                      validateField('phone_number', newValue)
                    }}
                    onBlur={(e) => validateField('phone_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      addValidationErrors.phone_number ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {addValidationErrors.phone_number && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.phone_number}
                    </p>
                  )}
                </div>

                                 {/* Agent Selection */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <Users className="inline h-4 w-4 mr-1" />
                     Assigned Agent <span className="text-gray-400 text-xs">(optional)</span>
                   </label>
                   <AgentSelector
                     selectedAgentId={addFormData.agent_id}
                     onAgentChange={(agent) => setAddFormData({ 
                       ...addFormData, 
                       agent_id: agent?.id, 
                       agent_name: agent?.name || '' 
                     })}
                     placeholder="Select an agent..."
                   />
                 </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calculator className="inline h-4 w-4 mr-1" />
                    Price <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addFormData.price || ''}
                    onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter price/value (optional)"
                  />
                </div>

                {/* Reference Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Reference Source *
                  </label>
                  <ReferenceSourceSelector
                    selectedReferenceSourceId={addFormData.reference_source_id}
                    onReferenceSourceChange={(sourceId) => {
                      setAddFormData({ 
                        ...addFormData, 
                        reference_source_id: sourceId 
                      })
                      clearFieldError('reference_source_id')
                      validateField('reference_source_id', sourceId)
                    }}
                    placeholder="Select a reference source..."
                  />
                  {addValidationErrors.reference_source_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.reference_source_id}
                    </p>
                  )}
                </div>

                {/* Operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings className="inline h-4 w-4 mr-1" />
                    Operations *
                  </label>
                  <OperationsSelector
                    selectedOperationsId={addFormData.operations_id}
                    onOperationsChange={(userId) => {
                      setAddFormData({ 
                        ...addFormData, 
                        operations_id: userId 
                      })
                      clearFieldError('operations_id')
                      validateField('operations_id', userId)
                    }}
                    placeholder="Select operations staff..."
                  />
                  {addValidationErrors.operations_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.operations_id}
                    </p>
                  )}
                </div>

                {/* Contact Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Contact Source <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <select
                    value={addFormData.contact_source || 'unknown'}
                    onChange={(e) => setAddFormData({ ...addFormData, contact_source: e.target.value as 'call' | 'unknown' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="call">Call</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">How the lead was initially contacted</p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Status <span className="text-red-500">*</span>
                  </label>
                  <StatusSelector
                    selectedStatus={addFormData.status}
                    onStatusChange={(status) => {
                      setAddFormData({ 
                        ...addFormData, 
                        status: status 
                      })
                      clearFieldError('status')
                      validateField('status', status)
                    }}
                    placeholder="Select a status..."
                  />
                  {addValidationErrors.status && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.status}
                    </p>
                  )}
                </div>

                {/* Referrals */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline h-4 w-4 mr-1" />
                    Referrals <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <LeadReferralSelector
                    referrals={addFormData.referrals || []}
                    onReferralsChange={(referrals) => setAddFormData({ ...addFormData, referrals })}
                    agents={agents}
                    placeholder="Add lead referrals..."
                  />
                  <p className="mt-1 text-xs text-gray-500">Add agents who referred this lead</p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddLeadModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit Lead</h2>
                <button
                  onClick={() => setShowEditLeadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                {/* For agents/team leaders: Show read-only view */}
                {limitedAccess ? (
                  <>
                    {/* Read-only Information for Agents/Team Leaders */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700 mb-3 font-medium">
                        ℹ️ You have read-only access to this lead. Contact an admin to modify lead details.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: LEAD_STATUSES.find(s => s.value === editFormData.status)?.color || '#6B7280' }}
                          >
                            {editFormData.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                        <p className="text-sm text-gray-900 font-medium">{editFormData.customer_name}</p>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                        <p className="text-sm text-gray-900">{editFormData.phone_number}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Editable fields for Admin/Operations */}
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Date *
                      </label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline h-4 w-4 mr-1" />
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={editFormData.customer_name}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData({ ...editFormData, customer_name: newValue })
                          clearFieldError('customer_name', true)
                          validateField('customer_name', newValue, true)
                        }}
                        onBlur={(e) => validateField('customer_name', e.target.value, true)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          editValidationErrors.customer_name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter customer name"
                      />
                      {editValidationErrors.customer_name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.customer_name}
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={editFormData.phone_number}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData({ ...editFormData, phone_number: newValue })
                          clearFieldError('phone_number', true)
                          validateField('phone_number', newValue, true)
                        }}
                        onBlur={(e) => validateField('phone_number', e.target.value, true)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          editValidationErrors.phone_number ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter phone number"
                      />
                      {editValidationErrors.phone_number && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.phone_number}
                        </p>
                      )}
                    </div>
                    {/* Agent Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="inline h-4 w-4 mr-1" />
                        Assigned Agent <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <AgentSelector
                        selectedAgentId={editFormData.agent_id}
                        onAgentChange={(agent) => {
                          console.log('🔄 Agent changed:', agent)
                          const newFormData = { 
                            ...editFormData, 
                            agent_id: agent?.id, 
                            agent_name: agent?.name || '' 
                          }
                          console.log('📝 New form data after agent change:', newFormData)
                          setEditFormData(newFormData)
                        }}
                        placeholder="Select an agent..."
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calculator className="inline h-4 w-4 mr-1" />
                        Price <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editFormData.price || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter price/value (optional)"
                      />
                    </div>

                    {/* Reference Source */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="inline h-4 w-4 mr-1" />
                        Reference Source *
                      </label>
                      <ReferenceSourceSelector
                        selectedReferenceSourceId={editFormData.reference_source_id}
                        onReferenceSourceChange={(sourceId) => {
                          setEditFormData({ 
                            ...editFormData, 
                            reference_source_id: sourceId 
                          })
                          clearFieldError('reference_source_id', true)
                          validateField('reference_source_id', sourceId, true)
                        }}
                        placeholder="Select a reference source..."
                      />
                      {editValidationErrors.reference_source_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.reference_source_id}
                        </p>
                      )}
                    </div>

                    {/* Operations */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Settings className="inline h-4 w-4 mr-1" />
                        Operations *
                      </label>
                      <OperationsSelector
                        selectedOperationsId={editFormData.operations_id}
                        onOperationsChange={(userId) => {
                          setEditFormData({ 
                            ...editFormData, 
                            operations_id: userId 
                          })
                          clearFieldError('operations_id', true)
                          validateField('operations_id', userId, true)
                        }}
                        placeholder="Select operations staff..."
                      />
                      {editValidationErrors.operations_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.operations_id}
                        </p>
                      )}
                    </div>

                    {/* Contact Source */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Contact Source <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <select
                        value={editFormData.contact_source || 'unknown'}
                        onChange={(e) => setEditFormData({ ...editFormData, contact_source: e.target.value as 'call' | 'unknown' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="call">Call</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">How the lead was initially contacted</p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="inline h-4 w-4 mr-1" />
                        Status <span className="text-red-500">*</span>
                      </label>
                      <StatusSelector
                        selectedStatus={editFormData.status}
                        onStatusChange={(status) => {
                          console.log('🔄 [LeadsModals] Status changed in edit form:', status)
                          console.log('🔄 [LeadsModals] Current editFormData before change:', editFormData)
                          
                          const newFormData = { 
                            ...editFormData, 
                            status: status 
                          }
                          
                          console.log('📝 [LeadsModals] New form data after status change:', newFormData)
                          console.log('📝 [LeadsModals] Status field specifically:', newFormData.status)
                          
                          setEditFormData(newFormData)
                          clearFieldError('status', true)
                          validateField('status', status, true)
                          
                          console.log('✅ [LeadsModals] Status change processing completed')
                        }}
                        placeholder="Select a status..."
                      />
                      {editValidationErrors.status && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.status}
                        </p>
                      )}
                    </div>

                    {/* Referrals */}
                    {!['agent', 'team_leader'].includes(user?.role || '') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Users className="inline h-4 w-4 mr-1" />
                          Referrals <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <LeadReferralSelector
                          referrals={editFormData.referrals || []}
                          onReferralsChange={(referrals) => setEditFormData({ ...editFormData, referrals })}
                          agents={agents}
                          placeholder="Add lead referrals..."
                        />
                        <p className="mt-1 text-xs text-gray-500">Add agents who referred this lead</p>
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  {limitedAccess ? (
                    // Agents/Team Leaders have read-only access
                    <button
                      type="button"
                      onClick={() => setShowEditLeadModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  ) : (
                    // Admin/Operations get Cancel and Save buttons
                    <>
                      <button
                        type="button"
                        onClick={() => setShowEditLeadModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Update Lead'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {showViewLeadModal && viewingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
                <button
                  onClick={() => setShowViewLeadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!limitedAccess && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <p className="text-gray-900">{formatDateForDisplay(viewingLead.date)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ 
                        backgroundColor: LEAD_STATUSES.find(s => s.value === viewingLead.status)?.color || '#6B7280' 
                      }}
                    >
                      {LEAD_STATUSES.find(s => s.value === viewingLead.status)?.label || viewingLead.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <p className="text-gray-900 text-lg font-medium">{viewingLead.customer_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <p className="text-gray-900">{viewingLead.phone_number || 'Not provided'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <p className="text-gray-900">
                    {viewingLead.price ? `$${viewingLead.price.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>

                {!limitedAccess && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
                      <p className="text-gray-900">
                        {viewingLead.assigned_agent_name || viewingLead.agent_name || 'Not assigned'}
                        {viewingLead.agent_role && (
                          <span className="text-gray-500 ml-1 capitalize">
                            ({viewingLead.agent_role.replace('_', ' ')})
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference Source</label>
                      <p className="text-gray-900">{viewingLead.reference_source_name || 'Not assigned'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Source</label>
                      <p className="text-gray-900 capitalize">{viewingLead.contact_source || 'Unknown'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operations</label>
                      <p className="text-gray-900">
                        {viewingLead.operations_name || 'Not assigned'}
                        {viewingLead.operations_role && (
                          <span className="text-gray-500 ml-1 capitalize">
                            ({viewingLead.operations_role.replace('_', ' ')})
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}

                {/* Lead Referrals Section - Read Only in View Mode */}
                {!limitedAccess && (
                  <div className="pt-4 border-t border-gray-200">
                    <LeadReferralsSection
                      leadId={viewingLead.id}
                      referrals={viewingLead.referrals || []}
                      isLoading={loadingAgents}
                      canEdit={false}
                      agents={agents}
                      onAddReferral={async (_agentId, _referralDate) => {
                        // read-only
                      }}
                      onDeleteReferral={async (_referralId) => {
                        // read-only
                      }}
                    />
                  </div>
                )}

                {/* Lead Notes Section */}
                {viewingLead && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Lead Notes</h3>
                    {user && (
                      <p className="text-xs text-gray-500 mb-2">
                        You can keep one personal note on this lead. Use the edit icon on your note to change it.
                      </p>
                    )}
                    {notesLoading ? (
                      <p className="text-sm text-gray-500">Loading notes...</p>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-2">No notes yet for this lead.</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {notes.map(note => {
                          const isMyNote = user && note.created_by === user.id
                          const isEditingThis = isMyNote && editingMyNote
                          const createdAt = new Date(note.created_at)
                          const updatedAt = note.updated_at ? new Date(note.updated_at) : null

                          return (
                            <div key={note.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  {isEditingThis ? (
                                    <textarea
                                      value={newNoteText}
                                      onChange={(e) => setNewNoteText(e.target.value)}
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {note.note_text}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-gray-500">
                                    By {note.created_by_name || 'User'} ({note.created_by_role}) · Created{' '}
                                    {createdAt.toLocaleString()}
                                    {updatedAt && updatedAt.getTime() !== createdAt.getTime() && (
                                      <> · Updated {updatedAt.toLocaleString()}</>
                                    )}
                                  </p>
                                </div>
                                {isMyNote && canAddNote && (
                                  <div className="flex flex-col items-end gap-1">
                                    {!isEditingThis && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewNoteText(note.note_text)
                                          setEditingMyNote(true)
                                        }}
                                        className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit your note"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </button>
                                    )}
                                    {isEditingThis && (
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={handleAddNote}
                                          disabled={!newNoteText.trim()}
                                          className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMyNote(false)
                                            setNewNoteText(note.note_text)
                                          }}
                                          className="px-2 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Only show composer if user can add and doesn't already have a note */}
                    {canAddNote && user && !notes.some(n => n.created_by === user.id) && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Your note
                        </label>
                        <textarea
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Write a note about this lead..."
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={handleAddNote}
                            disabled={!newNoteText.trim()}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                          >
                            Add Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                {!limitedAccess && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                      <p className="text-gray-600">{new Date(viewingLead.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-600">{new Date(viewingLead.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowViewLeadModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Modal */}
      {showDeleteLeadModal && deletingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-red-600">Delete Lead</h2>
                <button
                  onClick={() => setShowDeleteLeadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this lead? This action cannot be undone.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{deletingLead.customer_name}</p>
                  <p className="text-gray-600">{formatDateForDisplay(deletingLead.date)}</p>
                </div>
              </div>

              <form onSubmit={handleDeleteSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type the customer name to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder={deletingLead.customer_name}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteLeadModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleteConfirmation !== deletingLead.customer_name}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Deleting...' : 'Delete Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
