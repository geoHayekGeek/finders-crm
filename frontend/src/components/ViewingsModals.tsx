'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, User, Building2, Phone, Plus, Trash2, ChevronDown, ChevronUp, MessageSquare, Edit3 } from 'lucide-react'
import { Viewing, CreateViewingFormData, EditViewingFormData, VIEWING_STATUSES, ViewingUpdate } from '@/types/viewing'
import PropertySelectorForViewings from './PropertySelectorForViewings'
import LeadSelectorForViewings from './LeadSelectorForViewings'
import { AgentSelector } from './AgentSelector'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { viewingsApi } from '@/utils/api'

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
}

export function ViewingsModals(props: ViewingsModalsProps) {
  const { user, token } = useAuth()
  const { canManageViewings } = usePermissions()

  // Add Modal Component
  const AddViewingModal = () => {
    const [formData, setFormData] = useState<CreateViewingFormData>({
      property_id: 0,
      lead_id: 0,
      agent_id: (user?.role === 'agent' || user?.role === 'team_leader') ? user.id : undefined,
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled',
      notes: '',
      initial_update_title: '',
      initial_update_description: ''
    })
    
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Validation
      const newErrors: Record<string, string> = {}
      if (!formData.property_id) newErrors.property_id = 'Property is required'
      if (!formData.lead_id) newErrors.lead_id = 'Lead is required'
      if (!formData.agent_id) newErrors.agent_id = 'Agent is required'
      if (!formData.viewing_date) newErrors.viewing_date = 'Date is required'
      if (!formData.viewing_time) newErrors.viewing_time = 'Time is required'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      setSaving(true)
      try {
        await props.onSaveAdd(formData)
        props.setShowAddModal(false)
        // Reset form
        setFormData({
          property_id: 0,
          lead_id: 0,
          agent_id: (user?.role === 'agent' || user?.role === 'team_leader') ? user.id : undefined,
          viewing_date: '',
          viewing_time: '',
          status: 'Scheduled',
          notes: '',
          initial_update_title: '',
          initial_update_description: ''
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
              onSelect={(id) => setFormData({ ...formData, property_id: id })}
              error={errors.property_id}
            />
            
            {/* Lead Selector */}
            <LeadSelectorForViewings
              selectedLeadId={formData.lead_id || undefined}
              onSelect={(id) => setFormData({ ...formData, lead_id: id })}
              error={errors.lead_id}
            />
            
            {/* Agent Selector - Required for all users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent <span className="text-red-500">*</span>
              </label>
              {canManageViewings && user?.role !== 'agent' && user?.role !== 'team_leader' ? (
                <AgentSelector
                  selectedAgentId={formData.agent_id}
                  onAgentChange={(agent) => setFormData({ ...formData, agent_id: agent?.id })}
                />
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <User className="h-4 w-4 inline mr-1" />
                    This viewing will be automatically assigned to you.
                  </p>
                </div>
              )}
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
            
            {/* Initial Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Update (Optional)
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Update Title</label>
                  <input
                    type="text"
                    value={formData.initial_update_title || ''}
                    onChange={(e) => setFormData({ ...formData, initial_update_title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief title for this update..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Update Description</label>
                  <textarea
                    value={formData.initial_update_description || ''}
                    onChange={(e) => setFormData({ ...formData, initial_update_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the initial status or any important details..."
                  />
                </div>
              </div>
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
  const EditViewingModal = () => {
    const [formData, setFormData] = useState<EditViewingFormData>({
      property_id: props.editingViewing?.property_id || 0,
      lead_id: props.editingViewing?.lead_id || 0,
      agent_id: props.editingViewing?.agent_id || 0,
      viewing_date: props.editingViewing?.viewing_date ? new Date(props.editingViewing.viewing_date).toISOString().split('T')[0] : '',
      viewing_time: props.editingViewing?.viewing_time || '',
      status: props.editingViewing?.status || 'Scheduled',
      notes: props.editingViewing?.notes
    })
    
    const [saving, setSaving] = useState(false)
    const [newUpdate, setNewUpdate] = useState({ 
      title: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    })
    const [addingUpdate, setAddingUpdate] = useState(false)
    const [savingUpdate, setSavingUpdate] = useState(false)
    
    // Update form data when editingViewing changes
    useEffect(() => {
      if (props.editingViewing) {
        setFormData({
          property_id: props.editingViewing.property_id,
          lead_id: props.editingViewing.lead_id,
          agent_id: props.editingViewing.agent_id,
          viewing_date: props.editingViewing.viewing_date ? new Date(props.editingViewing.viewing_date).toISOString().split('T')[0] : '',
          viewing_time: props.editingViewing.viewing_time,
          status: props.editingViewing.status,
          notes: props.editingViewing.notes
        })
      }
    }, [props.editingViewing])
    
    const handleAddUpdate = async () => {
      if (!props.editingViewing || !newUpdate.title.trim() || !newUpdate.description.trim()) return
      
      setSavingUpdate(true)
      try {
        await viewingsApi.addUpdate(props.editingViewing.id, {
          update_text: `${newUpdate.title}\n\n${newUpdate.description}`,
          update_date: newUpdate.date
        }, token || undefined)
        
        // Reset form
        setNewUpdate({ title: '', description: '', date: new Date().toISOString().split('T')[0] })
        setAddingUpdate(false)
      } catch (error) {
        console.error('Error adding update:', error)
      } finally {
        setSavingUpdate(false)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSaving(true)
      try {
        await props.onSaveEdit(formData)
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
            
            {/* Add Update */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Updates
                </h4>
                <button
                  type="button"
                  onClick={() => setAddingUpdate(!addingUpdate)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Update
                </button>
              </div>

              {/* Add Update Form */}
              {addingUpdate && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Update Date
                      </label>
                      <input
                        type="date"
                        value={newUpdate.date}
                        onChange={(e) => setNewUpdate({ ...newUpdate, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Update Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newUpdate.title}
                        onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Brief title for this update..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={newUpdate.description}
                        onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Describe what happened or any changes..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddUpdate}
                        disabled={!newUpdate.title.trim() || !newUpdate.description.trim() || savingUpdate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingUpdate ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        onClick={() => {
                          setAddingUpdate(false)
                          setNewUpdate({ title: '', description: '', date: new Date().toISOString().split('T')[0] })
                        }}
                        className="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
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

  // View Modal Component with Updates
  const ViewViewingModal = () => {
    const [newUpdate, setNewUpdate] = useState({ 
      title: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    })
    const [addingUpdate, setAddingUpdate] = useState(false)
    const [savingUpdate, setSavingUpdate] = useState(false)
    const [showUpdates, setShowUpdates] = useState(true)
    
    const handleAddUpdate = async () => {
      if (!props.viewingViewing || !newUpdate.title.trim() || !newUpdate.description.trim()) return
      
      setSavingUpdate(true)
      try {
        await viewingsApi.addUpdate(props.viewingViewing.id, {
          update_text: `${newUpdate.title}\n\n${newUpdate.description}`,
          update_date: newUpdate.date
        }, token || undefined)
        
        // Refresh the viewing
        await props.onRefreshViewing(props.viewingViewing.id)
        
        // Reset form
        setNewUpdate({ title: '', description: '', date: new Date().toISOString().split('T')[0] })
        setAddingUpdate(false)
      } catch (error) {
        console.error('Error adding update:', error)
      } finally {
        setSavingUpdate(false)
      }
    }
    
    
    const formatUpdateText = (text: string) => {
      const lines = text.split('\n')
      if (lines.length >= 2) {
        return {
          title: lines[0],
          description: lines.slice(2).join('\n').trim()
        }
      }
      return {
        title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        description: text
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
            {/* Status Badge */}
            <div className="flex items-center justify-between">
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
            
            {/* Updates Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setShowUpdates(!showUpdates)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Updates ({props.viewingViewing.updates?.length || 0})
                  {showUpdates ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingUpdate(!addingUpdate)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Update
                  </button>
                </div>
              </div>

              {/* Add Update Form */}
              {addingUpdate && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Update Date
                      </label>
                      <input
                        type="date"
                        value={newUpdate.date}
                        onChange={(e) => setNewUpdate({ ...newUpdate, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Update Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newUpdate.title}
                        onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Brief title for this update..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={newUpdate.description}
                        onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Describe what happened or any changes..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddUpdate}
                        disabled={!newUpdate.title.trim() || !newUpdate.description.trim() || savingUpdate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingUpdate ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        onClick={() => {
                          setAddingUpdate(false)
                          setNewUpdate({ title: '', description: '', date: new Date().toISOString().split('T')[0] })
                        }}
                        className="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Updates List - Expandable */}
              {showUpdates && (
                <>
                  {(!props.viewingViewing.updates || props.viewingViewing.updates.length === 0) ? (
                    <div className="text-sm text-gray-500 italic">
                      No updates available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {props.viewingViewing.updates
                        .sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime())
                        .map((update: ViewingUpdate, index) => {
                          const updateDate = new Date(update.update_date)
                          const isRecent = index === 0
                          const formatted = formatUpdateText(update.update_text)
                          
                          return (
                            <div
                              key={update.id}
                              className={`p-3 rounded-lg border ${
                                isRecent
                                  ? 'border-blue-200 bg-blue-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {formatted.title}
                                    </span>
                                    {isRecent && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">
                                    {updateDate.toLocaleDateString()} at {updateDate.toLocaleTimeString()}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-700">
                                    {formatted.description}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    by {update.created_by_name}
                                  </div>
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
