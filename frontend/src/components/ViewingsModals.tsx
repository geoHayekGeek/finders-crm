'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Building2, Phone, Plus, ChevronDown, ChevronUp, MessageSquare, Edit3, Star, ArrowRight } from 'lucide-react'
import { Viewing, CreateViewingFormData, EditViewingFormData, VIEWING_STATUSES } from '@/types/viewing'
import PropertySelectorForViewings from './PropertySelectorForViewings'
import LeadSelectorForViewings from './LeadSelectorForViewings'
import { AgentSelector } from './AgentSelector'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { isAgentRole, isTeamLeaderRole, isAgentManagerRole, isOperationsRole, isAdminRole } from '@/utils/roleUtils'
import { viewingsApi, propertiesApi } from '@/utils/api'
import { formatDateForInput } from '@/utils/dateUtils'
import { useToast } from '@/contexts/ToastContext'

interface ViewingsModalsProps {
  // Add Modal
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  onSaveAdd: (data: CreateViewingFormData) => Promise<any>
  
  // Edit Modal
  showEditModal: boolean
  setShowEditModal: (show: boolean) => void
  editingViewing: Viewing | null
  onSaveEdit: (data: Partial<CreateViewingFormData>) => Promise<void>
  
  // View Modal
  showViewModal: boolean
  setShowViewModal: (show: boolean) => void
  viewingViewing: Viewing | null
  onRefreshViewing: (viewingId: number) => Promise<Viewing | null>
  
  // Delete Modal
  showDeleteModal: boolean
  setShowDeleteModal: (show: boolean) => void
  deletingViewing: Viewing | null
  deleteConfirmation: string
  setDeleteConfirmation: (value: string) => void
  onConfirmDelete: () => Promise<void>
  
  // Optional: Pre-selected property ID (for adding viewings from property page)
  preSelectedPropertyId?: number
}


export function ViewingsModals(props: ViewingsModalsProps) {
  const { user, token } = useAuth()
  const { canManageViewings } = usePermissions()
  const { showSuccess, showError } = useToast()

  const createDefaultFollowUpState = () => ({
    viewing_date: '',
    viewing_time: '',
    status: 'Scheduled',
    notes: ''
  })

  // Add Modal Component
  const AddViewingModal = () => {
    const [formData, setFormData] = useState<CreateViewingFormData>({
      property_id: props.preSelectedPropertyId || 0,
      lead_id: 0,
      agent_id: (isAgentRole(user?.role) || isTeamLeaderRole(user?.role)) ? user?.id : undefined,
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled',
      is_serious: false,
      notes: ''
    })
    const [properties, setProperties] = useState<any[]>([])
    
    // Fetch properties to get agent_id information
    useEffect(() => {
      const fetchProperties = async () => {
        if (!token) return
        try {
          const response = await propertiesApi.getAll()
          if (response.success) {
            setProperties(response.data || [])
          }
        } catch (error) {
          console.error('Error fetching properties:', error)
        }
      }
      fetchProperties()
    }, [token])
    
    // Update property_id when preSelectedPropertyId changes
    useEffect(() => {
      if (props.preSelectedPropertyId) {
        setFormData(prev => ({ ...prev, property_id: props.preSelectedPropertyId! }))
      }
    }, [props.preSelectedPropertyId])
    
    // Security: For agents, ALWAYS ensure agent_id is set to their own ID
    // This prevents any form manipulation or state changes from allowing agents to assign to others
    useEffect(() => {
      if (isAgentRole(user?.role) && user?.id) {
        if (formData.agent_id !== user.id) {
          setFormData(prev => ({ ...prev, agent_id: user.id }))
        }
      }
    }, [formData.agent_id, user])
    
    // For team leaders: auto-select agent when property is selected
    useEffect(() => {
      if (isTeamLeaderRole(user?.role) && formData.property_id && properties.length > 0) {
        const selectedProperty = properties.find(p => p.id === formData.property_id)
        const propertyAgentId = selectedProperty?.agent_id
        
        if (propertyAgentId) {
          // Property has an assigned agent
          if (propertyAgentId === user?.id) {
            // Property belongs to team leader - assign to themselves
            if (formData.agent_id !== user.id) {
              setFormData(prev => ({ ...prev, agent_id: user.id }))
            }
          } else {
            // Property belongs to an agent under the team leader - assign to that agent
            if (formData.agent_id !== propertyAgentId) {
              setFormData(prev => ({ ...prev, agent_id: propertyAgentId }))
            }
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.property_id, formData.agent_id, properties.length, user?.id, user?.role])
    
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [includeSubViewing, setIncludeSubViewing] = useState(false)
    const [subViewingData, setSubViewingData] = useState({
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled'
    })
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Security: For agents, ALWAYS ensure agent_id is set to their own ID
      // This prevents any manipulation of the form data
      const finalFormData = { ...formData }
      if (isAgentRole(user?.role)) {
        finalFormData.agent_id = user?.id
      }
      
      // Validation
      const newErrors: Record<string, string> = {}
      if (!finalFormData.property_id) newErrors.property_id = 'Property is required'
      if (!finalFormData.lead_id) newErrors.lead_id = 'Lead is required'
      if (!finalFormData.agent_id) newErrors.agent_id = 'Agent is required'
      if (!finalFormData.viewing_date) newErrors.viewing_date = 'Date is required'
      if (!finalFormData.viewing_time) newErrors.viewing_time = 'Time is required'
      
      // Additional security check for agents
      if (isAgentRole(user?.role) && finalFormData.agent_id !== user?.id) {
        console.error('Security violation: Agent attempted to set agent_id to different value')
        newErrors.agent_id = 'You can only assign viewings to yourself'
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      setSaving(true)
      try {
        // Create the main viewing
        const result = await props.onSaveAdd(finalFormData)
        
        // If sub-viewing is included, create it with parent_viewing_id
        if (includeSubViewing && subViewingData.viewing_date && subViewingData.viewing_time) {
          try {
            const parentViewingId = result?.id || (result as any)?.data?.id
            if (!parentViewingId) {
              showError('Failed to get parent viewing ID')
              return
            }
            
            const subViewingFormData: CreateViewingFormData = {
              ...finalFormData,
              parent_viewing_id: parentViewingId,
              viewing_date: subViewingData.viewing_date,
              viewing_time: subViewingData.viewing_time,
              status: subViewingData.status,
            }
            await props.onSaveAdd(subViewingFormData)
          } catch (subError) {
            console.error('Error creating sub-viewing:', subError)
            showError('Main viewing created but sub-viewing failed: ' + (subError instanceof Error ? subError.message : 'Unknown error'))
          }
        }
        
        props.setShowAddModal(false)
        // Reset form - ensure agents always have their own ID
        setFormData({
          property_id: props.preSelectedPropertyId || 0,
          lead_id: 0,
          agent_id: (isAgentRole(user?.role) || isTeamLeaderRole(user?.role)) ? user?.id : undefined,
          viewing_date: '',
          viewing_time: '',
          status: 'Scheduled',
          is_serious: false,
          notes: ''
        })
        setIncludeSubViewing(false)
        setSubViewingData({
          viewing_date: '',
          viewing_time: '',
          status: 'Scheduled'
        })
        setErrors({})
      } catch (error) {
        console.error('Error creating viewing:', error)
      } finally {
        setSaving(false)
      }
    }
    
    if (!props.showAddModal) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add New Viewing</h2>
              <button
                onClick={() => props.setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property Selector */}
            <PropertySelectorForViewings
              selectedPropertyId={formData.property_id || undefined}
              onSelect={(id, agentId) => {
                const updates: Partial<CreateViewingFormData> = { property_id: id }
                
                // For team leaders: automatically set agent_id to the property's assigned agent
                if (isTeamLeaderRole(user?.role) && agentId) {
                  // Check if the agent is under this team leader or is the team leader themselves
                  if (agentId === user?.id) {
                    // Property belongs to team leader - assign to themselves
                    updates.agent_id = user.id
                  } else {
                    // Property belongs to an agent under the team leader - assign to that agent
                    updates.agent_id = agentId
                  }
                }
                
                setFormData({ ...formData, ...updates })
              }}
              error={errors.property_id}
              disabled={!!props.preSelectedPropertyId}
            />
            
            {/* Lead Selector */}
            <LeadSelectorForViewings
              selectedLeadId={formData.lead_id || undefined}
              onSelect={(id) => setFormData({ ...formData, lead_id: id })}
              error={errors.lead_id}
            />
            
            {/* Agent Display/Selector - Required for all users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent <span className="text-red-500">*</span>
              </label>
              {(() => {
                const selectedProperty = properties.find(p => p.id === formData.property_id)
                const propertyAgentId = selectedProperty?.agent_id
                const propertyAgentName = selectedProperty?.agent_name
                
                // If property is selected and has an assigned agent, show read-only agent info (NO DROPDOWN)
                if (formData.property_id && propertyAgentId) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-medium text-blue-900">
                          Assigned Agent
                        </p>
                      </div>
                      <p className="text-sm text-gray-900 font-semibold">
                        {propertyAgentName || `Agent ID: ${propertyAgentId}`}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        The viewing will be automatically assigned to the property&apos;s agent.
                      </p>
                    </div>
                  )
                }
                
                // No property selected or property has no agent - show agent selector based on role
                if (canManageViewings && !isAgentRole(user?.role) && !isTeamLeaderRole(user?.role)) {
                  // Admin, operations, operations manager, agent manager: can select any agent (only when no property selected)
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Please select a property first. The agent will be automatically assigned based on the property.
                      </p>
                    </div>
                  )
                } else if (isTeamLeaderRole(user?.role)) {
                  // Team leaders: can select themselves or agents under them (only when no property selected)
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Please select a property first. The agent will be automatically assigned based on the property.
                      </p>
                    </div>
                  )
                } else {
                  // Agents: automatically assigned to themselves
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <User className="h-4 w-4 inline mr-1" />
                        This viewing will be automatically assigned to you.
                      </p>
                    </div>
                  )
                }
              })()}
              {errors.agent_id && <p className="text-sm text-red-600 mt-1">{errors.agent_id}</p>}
            </div>
            
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.viewing_date}
                  onChange={(e) => setFormData({ ...formData, viewing_date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.viewing_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.viewing_date && <p className="text-sm text-red-600 mt-1">{errors.viewing_date}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.viewing_time}
                  onChange={(e) => setFormData({ ...formData, viewing_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.viewing_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.viewing_time && <p className="text-sm text-red-600 mt-1">{errors.viewing_time}</p>}
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {VIEWING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Serious Viewing Toggle - Only for management roles and team leaders */}
            {(() => {
              // Admin, operations, operations manager, agent manager: can mark/unmark serious for everyone
              // Team leaders: can mark/unmark serious for their own viewings and their team's viewings
              const canMarkSerious = canManageViewings || isTeamLeaderRole(user?.role)
              
              if (!canMarkSerious) return null
              
              return (
                <div
                  className={`rounded-lg border p-4 transition-colors ${
                    formData.is_serious
                      ? 'border-amber-300 bg-amber-50/80 shadow-sm'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      checked={!!formData.is_serious}
                      onChange={(e) => setFormData({ ...formData, is_serious: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        Mark as serious viewing
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Serious viewings are highlighted across the dashboard and shown first to the team.
                      </p>
                    </div>
                  </label>
                </div>
              )
            })()}

            {/* Divider between viewing fields and additional details */}
            <div className="border-t border-gray-200 my-4" />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Sub-Viewing (Follow-up) Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Follow-up Viewing (Optional)
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSubViewing}
                    onChange={(e) => setIncludeSubViewing(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Add follow-up viewing</span>
                </label>
              </div>
              
              {includeSubViewing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-blue-800 mb-2">
                    This will create another viewing with the same client and property, but with its own date.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Follow-up Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={subViewingData.viewing_date}
                        onChange={(e) => setSubViewingData({ ...subViewingData, viewing_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required={includeSubViewing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Follow-up Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={subViewingData.viewing_time}
                        onChange={(e) => setSubViewingData({ ...subViewingData, viewing_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required={includeSubViewing}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Status</label>
                    <select
                      value={subViewingData.status}
                      onChange={(e) => setSubViewingData({ ...subViewingData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {VIEWING_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => props.setShowAddModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Viewing'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    )
  }

  // Edit Modal Component
  const formatTimeForInput = (timeString?: string | null) => {
    if (!timeString) return ''

    try {
      // If we receive an ISO datetime, extract the time portion
      if (timeString.includes('T')) {
        const dateObj = new Date(timeString)
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[1].slice(0, 5)
        }
      }

      // Otherwise assume HH:mm:ss or HH:mm format
      return timeString.slice(0, 5)
    } catch (error) {
      console.warn('Error formatting time for input:', timeString, error)
      return ''
    }
  }

  const EditViewingModal = () => {
    const [formData, setFormData] = useState<EditViewingFormData>({
      property_id: props.editingViewing?.property_id || 0,
      lead_id: props.editingViewing?.lead_id || 0,
      agent_id: props.editingViewing?.agent_id || 0,
      viewing_date: props.editingViewing?.viewing_date ? formatDateForInput(props.editingViewing.viewing_date) : '',
      viewing_time: formatTimeForInput(props.editingViewing?.viewing_time),
      status: props.editingViewing?.status || 'Scheduled',
      is_serious: props.editingViewing?.is_serious ?? false,
      notes: props.editingViewing?.notes
    })
    
    const [saving, setSaving] = useState(false)
    const [addingFollowUp, setAddingFollowUp] = useState(false)
    const [followUpData, setFollowUpData] = useState({
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled',
      notes: ''
    })
    const [savingFollowUp, setSavingFollowUp] = useState(false)
    
    // Update form data when editingViewing changes
    useEffect(() => {
      if (props.editingViewing) {
        // Security: For agents, ALWAYS use their own ID, never trust the viewing's agent_id
        const agentIdForForm = isAgentRole(user?.role) 
          ? user?.id 
          : props.editingViewing.agent_id
        
        setFormData({
          property_id: props.editingViewing.property_id,
          lead_id: props.editingViewing.lead_id,
          agent_id: agentIdForForm,
          viewing_date: props.editingViewing.viewing_date ? formatDateForInput(props.editingViewing.viewing_date) : '',
          viewing_time: formatTimeForInput(props.editingViewing.viewing_time),
          status: props.editingViewing.status,
          is_serious: props.editingViewing.is_serious ?? false,
          notes: props.editingViewing.notes
        })
        setAddingFollowUp(false)
        setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
      }
    }, [props.editingViewing, user])
    
    // Check if user can add follow-up viewings to this viewing
    const canAddFollowUp = (): boolean => {
      if (!props.editingViewing || !user) return false
      
      // Admin, operations, operations manager, agent manager: can add follow-up viewings to all viewings
      if (canManageViewings) return true
      
      // Agents: can add follow-up viewings to their own viewings
      if (isAgentRole(user.role)) {
        return props.editingViewing.agent_id === user.id
      }
      
      // Team leaders: can add follow-up viewings to their own viewings and their team's viewings
      if (isTeamLeaderRole(user.role)) {
        return true // Backend will enforce the actual permission
      }
      
      return false
    }

    const handleAddFollowUp = async () => {
      if (!props.editingViewing) return

      if (!followUpData.viewing_date || !followUpData.viewing_time) {
        showError('Follow-up viewing date and time are required')
        return
      }

      setSavingFollowUp(true)
      try {
        await viewingsApi.addUpdate(props.editingViewing.id, {
          viewing_date: followUpData.viewing_date,
          viewing_time: followUpData.viewing_time,
          status: followUpData.status,
          notes: followUpData.notes || ''
        }, token || undefined)
        
        showSuccess('Follow-up viewing created successfully')

        await props.onRefreshViewing(props.editingViewing.id)

        // Reset form
        setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
        setAddingFollowUp(false)
      } catch (error) {
        console.error('Error adding follow-up viewing:', error)
        showError(error instanceof Error ? error.message : 'Failed to add follow-up viewing')
      } finally {
        setSavingFollowUp(false)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Security: For agents, ALWAYS ensure agent_id cannot be changed
      // Remove agent_id from the update if agent tries to change it
      const finalFormData = { ...formData }
      if (isAgentRole(user?.role)) {
        // Agents cannot change agent_id - remove it from the update
        delete finalFormData.agent_id
        // The backend will ensure it stays as the agent's own ID
      }
      
      setSaving(true)
      try {
        await props.onSaveEdit(finalFormData)
        props.setShowEditModal(false)
      } catch (error) {
        console.error('Error updating viewing:', error)
      } finally {
        setSaving(false)
      }
    }
    
    if (!props.showEditModal || !props.editingViewing) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Edit Viewing</h2>
              <button
                onClick={() => props.setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property Info (Read-only) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-1" />
                Property
              </p>
              <p className="font-medium text-gray-900">{props.editingViewing.property_reference}</p>
              <p className="text-sm text-gray-600">{props.editingViewing.property_location}</p>
            </div>
            
            {/* Lead Info (Read-only) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Lead
              </p>
              <p className="font-medium text-gray-900">{props.editingViewing.lead_name}</p>
              {props.editingViewing.lead_phone && (
                <p className="text-sm text-gray-600">{props.editingViewing.lead_phone}</p>
              )}
            </div>
            
            {/* Agent Info (Read-only) - Always shows property's agent */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Agent
              </p>
              <p className="font-medium text-gray-900">{props.editingViewing.agent_name || `Agent ID: ${props.editingViewing.agent_id}`}</p>
              <p className="text-xs text-gray-500 mt-1">
                Assigned based on the property&apos;s agent.
              </p>
            </div>
            
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={formData.viewing_date}
                  onChange={(e) => setFormData({ ...formData, viewing_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={formData.viewing_time}
                  onChange={(e) => setFormData({ ...formData, viewing_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {VIEWING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Serious Viewing Toggle - Only for management roles and team leaders */}
            {(() => {
              // Check if user can mark this viewing as serious
              // Admin, operations, operations manager, agent manager: can mark/unmark serious for everyone
              // Team leaders: can mark/unmark serious for their own viewings and their team's viewings
              const canMarkSerious = canManageViewings || isTeamLeaderRole(user?.role)
              
              // For team leaders, check if this viewing belongs to them or their team
              let canMarkThisViewing = canMarkSerious
              if (isTeamLeaderRole(user?.role) && !canManageViewings) {
                // Team leader can only mark serious for their own viewings or their team's viewings
                // The backend will enforce this, but we can show/hide the toggle based on agent_id
                // If viewing agent_id is the team leader or one of their agents, show toggle
                // For now, show it - backend will validate
                canMarkThisViewing = true
              }
              
              if (!canMarkThisViewing) return null
              
              return (
                <div
                  className={`rounded-lg border p-4 transition-colors ${
                    formData.is_serious
                      ? 'border-amber-300 bg-amber-50/80 shadow-sm'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      checked={!!formData.is_serious}
                      onChange={(e) => setFormData({ ...formData, is_serious: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        Mark as serious viewing
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Serious viewings are highlighted and prioritized for follow-up.
                      </p>
                    </div>
                  </label>
                </div>
              )
            })()}

            {/* Divider between viewing fields and additional details */}
            <div className="border-t border-gray-200 my-4" />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional notes..."
              />
            </div>
            
            {/* Follow-up Viewings List (if this viewing has follow-ups) */}
            {props.editingViewing.sub_viewings && props.editingViewing.sub_viewings.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-blue-600" />
                  Follow-up Viewings ({props.editingViewing.sub_viewings.length})
                </h4>
                <div className="space-y-2">
                  {props.editingViewing.sub_viewings.map((subViewing) => {
                    const subStatusInfo = VIEWING_STATUSES.find(s => s.value === subViewing.status)
                    return (
                      <div key={subViewing.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900 text-sm">
                                {new Date(subViewing.viewing_date).toLocaleDateString()} at {subViewing.viewing_time}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: subStatusInfo?.color ? subStatusInfo.color + '20' : '#E5E7EB',
                                  color: subStatusInfo?.color || '#6B7280'
                                }}
                              >
                                {subStatusInfo?.label || subViewing.status}
                              </span>
                            </div>
                            {subViewing.notes && (
                              <p className="text-xs text-gray-600 mt-1">{subViewing.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Follow-up Viewings Display */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Follow-up Viewings
              </h4>
              
              {props.editingViewing.sub_viewings && props.editingViewing.sub_viewings.length > 0 ? (
                <div className="space-y-2">
                  {props.editingViewing.sub_viewings.map((subViewing: Viewing) => {
                    const statusConfig = VIEWING_STATUSES.find(s => s.value === subViewing.status) || VIEWING_STATUSES[0]
                    const viewingDate = new Date(subViewing.viewing_date)
                    
                    return (
                      <div
                        key={subViewing.id}
                        className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: statusConfig.color }}
                              >
                                {statusConfig.label}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {viewingDate.toLocaleDateString()} at {subViewing.viewing_time}
                              </span>
                            </div>
                            {subViewing.notes && (
                              <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                {subViewing.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No follow-up viewings available
                </div>
              )}

              {/* Add Follow-up Viewing Button */}
              {canAddFollowUp() && !addingFollowUp && (
                <button
                  type="button"
                  onClick={() => setAddingFollowUp(true)}
                  className="w-full mt-3 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Follow-up Viewing</span>
                </button>
              )}

              {/* Add Follow-up Viewing Form */}
              {addingFollowUp && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={followUpData.viewing_date}
                        onChange={(e) => setFollowUpData({ ...followUpData, viewing_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Time *
                      </label>
                      <input
                        type="time"
                        value={followUpData.viewing_time}
                        onChange={(e) => setFollowUpData({ ...followUpData, viewing_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={followUpData.status}
                      onChange={(e) => setFollowUpData({ ...followUpData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {VIEWING_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={followUpData.notes}
                      onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
                      placeholder="Enter notes for this follow-up viewing..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddFollowUp}
                      disabled={!followUpData.viewing_date || !followUpData.viewing_time || savingFollowUp}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingFollowUp ? 'Adding...' : 'Add Follow-up Viewing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingFollowUp(false)
                        setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => props.setShowEditModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    )
  }

  // View Modal Component with Follow-up Viewings
  const ViewViewingModal = () => {
    const [addingFollowUp, setAddingFollowUp] = useState(false)
    const [followUpData, setFollowUpData] = useState({
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled',
      notes: ''
    })
    const [savingFollowUp, setSavingFollowUp] = useState(false)
    const [showFollowUps, setShowFollowUps] = useState(true)

    // Check if user can add follow-up viewings to this viewing
    const canAddFollowUp = (): boolean => {
      if (!props.viewingViewing || !user) return false
      
      // Admin, operations, operations manager, agent manager: can add follow-up viewings to all viewings
      if (canManageViewings) return true
      
      // Agents: can add follow-up viewings to their own viewings
      if (isAgentRole(user.role)) {
        return props.viewingViewing.agent_id === user.id
      }
      
      // Team leaders: can add follow-up viewings to their own viewings and their team's viewings
      if (isTeamLeaderRole(user.role)) {
        return true // Backend will enforce the actual permission
      }
      
      return false
    }

    const handleAddFollowUp = async () => {
      if (!props.viewingViewing || !followUpData.viewing_date || !followUpData.viewing_time) {
        showError('Follow-up viewing date and time are required')
        return
      }
      
      setSavingFollowUp(true)
      try {
        await viewingsApi.addUpdate(props.viewingViewing.id, {
          viewing_date: followUpData.viewing_date,
          viewing_time: followUpData.viewing_time,
          status: followUpData.status,
          notes: followUpData.notes || ''
        }, token || undefined)

        showSuccess('Follow-up viewing added successfully')
        
        // Refresh the viewing
        await props.onRefreshViewing(props.viewingViewing.id)
        
        // Reset form
        setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
        setAddingFollowUp(false)
      } catch (error) {
        console.error('Error adding follow-up viewing:', error)
        showError(error instanceof Error ? error.message : 'Failed to add follow-up viewing')
      } finally {
        setSavingFollowUp(false)
      }
    }

    if (!props.showViewModal || !props.viewingViewing) return null
    
    const statusInfo = VIEWING_STATUSES.find(s => s.value === props.viewingViewing?.status)
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Viewing Details</h2>
              <button
                onClick={() => props.setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: statusInfo?.color ? statusInfo.color + '20' : '#E5E7EB',
                    color: statusInfo?.color || '#6B7280'
                  }}
                >
                  {statusInfo?.label || props.viewingViewing.status}
                </span>
              </div>

              {props.viewingViewing.is_serious && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>Serious viewing</span>
                </div>
              )}
            </div>
            
            {/* Property Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-gray-600" />
                Property
              </h3>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{props.viewingViewing.property_reference}</p>
                <p className="text-gray-600">{props.viewingViewing.property_location}</p>
                {props.viewingViewing.property_type && (
                  <p className="text-sm text-gray-500 capitalize">{props.viewingViewing.property_type}</p>
                )}
              </div>
            </div>
            
            {/* Lead Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-600" />
                Lead
              </h3>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{props.viewingViewing.lead_name}</p>
                {props.viewingViewing.lead_phone && (
                  <p className="text-gray-600 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {props.viewingViewing.lead_phone}
                  </p>
                )}
              </div>
            </div>
            
            {/* Agent Info (Read-only) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Agent
              </p>
              <p className="font-medium text-gray-900">{props.viewingViewing.agent_name}</p>
            </div>
            
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date
                </p>
                <p className="text-gray-900">
                  {new Date(props.viewingViewing.viewing_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time
                </p>
                <p className="text-gray-900">{props.viewingViewing.viewing_time}</p>
              </div>
            </div>
            
            {/* Notes */}
            {props.viewingViewing.notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{props.viewingViewing.notes}</p>
                </div>
              </div>
            )}

            {/* Sub-viewing indicator */}
            {props.viewingViewing.parent_viewing_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Follow-up Viewing</p>
                    <p className="text-sm text-blue-700">This is a follow-up viewing linked to a parent viewing.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up Viewings Section (if this is a parent viewing) */}
            {!props.viewingViewing.parent_viewing_id && props.viewingViewing.sub_viewings && props.viewingViewing.sub_viewings.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
                  Follow-up Viewings ({props.viewingViewing.sub_viewings.length})
                </h3>
                <div className="space-y-3">
                  {props.viewingViewing.sub_viewings.map((subViewing) => {
                    const subStatusInfo = VIEWING_STATUSES.find(s => s.value === subViewing.status)
                    return (
                      <div key={subViewing.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900">
                                {new Date(subViewing.viewing_date).toLocaleDateString()} at {subViewing.viewing_time}
                              </span>
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: subStatusInfo?.color ? subStatusInfo.color + '20' : '#E5E7EB',
                                  color: subStatusInfo?.color || '#6B7280'
                                }}
                              >
                                {subStatusInfo?.label || subViewing.status}
                              </span>
                            </div>
                            {subViewing.notes && (
                              <p className="text-sm text-gray-600 mt-2">{subViewing.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Follow-up Viewings Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setShowFollowUps(!showFollowUps)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Follow-up Viewings ({props.viewingViewing.sub_viewings?.length || 0})
                  {showFollowUps ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {canAddFollowUp() && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingFollowUp(!addingFollowUp)
                        if (addingFollowUp) {
                          setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Follow-up
                    </button>
                  )}
                </div>
              </div>

              {/* Add Follow-up Viewing Form */}
              {addingFollowUp && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={followUpData.viewing_date}
                          onChange={(e) => setFollowUpData({ ...followUpData, viewing_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time *
                        </label>
                        <input
                          type="time"
                          value={followUpData.viewing_time}
                          onChange={(e) => setFollowUpData({ ...followUpData, viewing_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={followUpData.status}
                        onChange={(e) => setFollowUpData({ ...followUpData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        {VIEWING_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={followUpData.notes}
                        onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Enter notes for this follow-up viewing..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddFollowUp}
                        disabled={!followUpData.viewing_date || !followUpData.viewing_time || savingFollowUp}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingFollowUp ? 'Adding...' : 'Add Follow-up Viewing'}
                      </button>
                      <button
                        onClick={() => {
                          setAddingFollowUp(false)
                          setFollowUpData({ viewing_date: '', viewing_time: '', status: 'Scheduled', notes: '' })
                        }}
                        className="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-up Viewings List - Expandable */}
              {showFollowUps && (
                <>
                  {(!props.viewingViewing.sub_viewings || props.viewingViewing.sub_viewings.length === 0) ? (
                    <div className="text-sm text-gray-500 italic">
                      No follow-up viewings available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {props.viewingViewing.sub_viewings.map((subViewing: Viewing) => {
                        const statusConfig = VIEWING_STATUSES.find(s => s.value === subViewing.status) || VIEWING_STATUSES[0]
                        const viewingDate = new Date(subViewing.viewing_date)
                        
                        return (
                          <div
                            key={subViewing.id}
                            className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: statusConfig.color }}
                                  >
                                    {statusConfig.label}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {viewingDate.toLocaleDateString()} at {subViewing.viewing_time}
                                  </span>
                                </div>
                                {subViewing.notes && (
                                  <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                    {subViewing.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => props.setShowViewModal(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
          </div>
        </div>
      </div>
    )
  }

  // Delete Modal Component
  const DeleteViewingModal = () => {
    if (!props.showDeleteModal || !props.deletingViewing) return null
    
    const propertyRef = props.deletingViewing.property_reference || 'this viewing'
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-red-600">Delete Viewing</h2>
              <button
                onClick={() => {
                  props.setShowDeleteModal(false)
                  props.setDeleteConfirmation('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete the viewing for <strong>{propertyRef}</strong> with{' '}
              <strong>{props.deletingViewing.lead_name}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              To confirm, please type <strong>{propertyRef}</strong> below:
            </p>
            <input
              type="text"
              value={props.deleteConfirmation}
              onChange={(e) => props.setDeleteConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={`Type "${propertyRef}" to confirm`}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                props.setShowDeleteModal(false)
                props.setDeleteConfirmation('')
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={props.onConfirmDelete}
              disabled={props.deleteConfirmation !== propertyRef}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Viewing
            </button>
          </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AddViewingModal />
      <EditViewingModal />
      <ViewViewingModal />
      <DeleteViewingModal />
    </>
  )
}
