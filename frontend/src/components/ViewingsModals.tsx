'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, User, Building2, Phone, Plus, Trash2 } from 'lucide-react'
import { Viewing, CreateViewingFormData, VIEWING_STATUSES, ViewingUpdate } from '@/types/viewing'
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
      notes: ''
    })
    
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Validation
      const newErrors: Record<string, string> = {}
      if (!formData.property_id) newErrors.property_id = 'Property is required'
      if (!formData.lead_id) newErrors.lead_id = 'Lead is required'
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
          notes: ''
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
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add New Viewing</h2>
            <button
              onClick={() => props.setShowAddModal(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            
            {/* Agent Selector (only for management roles) */}
            {canManageViewings && user?.role !== 'agent' && user?.role !== 'team_leader' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                <AgentSelector
                  selectedAgentId={formData.agent_id}
                  onSelect={(id) => setFormData({ ...formData, agent_id: id || undefined })}
                />
              </div>
            )}
            
            {/* Auto-assigned message for agents/team leaders */}
            {(user?.role === 'agent' || user?.role === 'team_leader') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <User className="h-4 w-4 inline mr-1" />
                  This viewing will be automatically assigned to you.
                </p>
              </div>
            )}
            
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
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => props.setShowAddModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Viewing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Edit Modal Component
  const EditViewingModal = () => {
    const [formData, setFormData] = useState<Partial<CreateViewingFormData>>({
      property_id: props.editingViewing?.property_id,
      lead_id: props.editingViewing?.lead_id,
      agent_id: props.editingViewing?.agent_id,
      viewing_date: props.editingViewing?.viewing_date,
      viewing_time: props.editingViewing?.viewing_time,
      status: props.editingViewing?.status,
      notes: props.editingViewing?.notes
    })
    
    const [saving, setSaving] = useState(false)
    
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
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Edit Viewing</h2>
            <button
              onClick={() => props.setShowEditModal(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => props.setShowEditModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // View Modal Component with Updates
  const ViewViewingModal = () => {
    const [newUpdate, setNewUpdate] = useState({ text: '', date: new Date().toISOString().split('T')[0] })
    const [addingUpdate, setAddingUpdate] = useState(false)
    const [savingUpdate, setSavingUpdate] = useState(false)
    
    const handleAddUpdate = async () => {
      if (!props.viewingViewing || !newUpdate.text.trim()) return
      
      setSavingUpdate(true)
      try {
        await viewingsApi.addUpdate(props.viewingViewing.id, {
          update_text: newUpdate.text,
          update_date: newUpdate.date
        }, token)
        
        // Refresh the viewing
        await props.onRefreshViewing(props.viewingViewing.id)
        
        // Reset form
        setNewUpdate({ text: '', date: new Date().toISOString().split('T')[0] })
        setAddingUpdate(false)
      } catch (error) {
        console.error('Error adding update:', error)
      } finally {
        setSavingUpdate(false)
      }
    }
    
    if (!props.showViewModal || !props.viewingViewing) return null
    
    const statusInfo = VIEWING_STATUSES.find(s => s.value === props.viewingViewing?.status)
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Viewing Details</h2>
            <button
              onClick={() => props.setShowViewModal(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center space-x-3">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: statusInfo?.color ? statusInfo.color + '20' : '#E5E7EB',
                  color: statusInfo?.color || '#6B7280'
                }}
              >
                {props.viewingViewing.status}
              </span>
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
            
            {/* Date, Time, Agent */}
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
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Agent
              </p>
              <p className="text-gray-900">{props.viewingViewing.agent_name}</p>
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
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Updates</h3>
                <button
                  onClick={() => setAddingUpdate(!addingUpdate)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Update
                </button>
              </div>
              
              {/* Add Update Form */}
              {addingUpdate && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Date</label>
                    <input
                      type="date"
                      value={newUpdate.date}
                      onChange={(e) => setNewUpdate({ ...newUpdate, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Text</label>
                    <textarea
                      value={newUpdate.text}
                      onChange={(e) => setNewUpdate({ ...newUpdate, text: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter update details..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddUpdate}
                      disabled={!newUpdate.text.trim() || savingUpdate}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {savingUpdate ? 'Saving...' : 'Save Update'}
                    </button>
                    <button
                      onClick={() => {
                        setAddingUpdate(false)
                        setNewUpdate({ text: '', date: new Date().toISOString().split('T')[0] })
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Updates List */}
              <div className="space-y-3">
                {props.viewingViewing.updates && props.viewingViewing.updates.length > 0 ? (
                  props.viewingViewing.updates.map((update: ViewingUpdate) => (
                    <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            {new Date(update.update_date).toLocaleDateString()} • {update.created_by_name}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700">{update.update_text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No updates yet</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={() => props.setShowViewModal(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Delete Viewing</h2>
          </div>
          
          <div className="p-6 space-y-4">
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
          
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              onClick={() => {
                props.setShowDeleteModal(false)
                props.setDeleteConfirmation('')
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={props.onConfirmDelete}
              disabled={props.deleteConfirmation !== propertyRef}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Viewing
            </button>
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

