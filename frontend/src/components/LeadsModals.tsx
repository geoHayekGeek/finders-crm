'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Calendar, Users, MessageSquare, Tag, Globe, Settings, RefreshCw, Calculator } from 'lucide-react'
import { Lead, LEAD_STATUSES, CreateLeadFormData, EditLeadFormData, ReferenceSource, OperationsUser } from '@/types/leads'
import { AgentSelector } from './AgentSelector'
import { StatusSelector } from './StatusSelector'
import { ReferenceSourceSelector } from './ReferenceSourceSelector'
import { OperationsSelector } from './OperationsSelector'
import { formatDateForDisplay } from '@/utils/dateUtils'

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
  onSaveEdit,
  showViewLeadModal,
  setShowViewLeadModal,
  viewingLead,
  showDeleteLeadModal,
  setShowDeleteLeadModal,
  deletingLead,
  deleteConfirmation,
  setDeleteConfirmation,
  onConfirmDelete
}: LeadsModalsProps) {
  const [addFormData, setAddFormData] = useState<CreateLeadFormData>({
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    phone_number: '',
    agent_id: undefined,
    agent_name: '',
    price: undefined,
    reference_source_id: undefined,
    operations_id: undefined,
    notes: '',
    status: ''
  })

  const [saving, setSaving] = useState(false)

  // Handle add form submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!addFormData.customer_name.trim()) {
      alert('Customer name is required')
      return
    }
    if (!addFormData.phone_number.trim()) {
      alert('Phone number is required')
      return
    }
    if (!addFormData.reference_source_id) {
      alert('Reference source is required')
      return
    }
    if (!addFormData.operations_id) {
      alert('Operations staff assignment is required')
      return
    }
    if (!addFormData.status || !addFormData.status.trim()) {
      alert('Status is required')
      return
    }

    setSaving(true)
    try {
      await onSaveAdd(addFormData)
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
        notes: '',
        status: ''
      })
    } catch (error) {
      console.error('Error saving lead:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!editFormData.customer_name.trim()) {
      alert('Customer name is required')
      return
    }
    if (!editFormData.phone_number.trim()) {
      alert('Phone number is required')
      return
    }
    if (!editFormData.reference_source_id) {
      alert('Reference source is required')
      return
    }
    if (!editFormData.operations_id) {
      alert('Operations staff assignment is required')
      return
    }
    if (!editFormData.status || !editFormData.status.trim()) {
      alert('Status is required')
      return
    }

    setSaving(true)
    try {
      await onSaveEdit()
    } catch (error) {
      console.error('Error updating lead:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle delete confirmation
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deleteConfirmation !== deletingLead?.customer_name) {
      alert('Please type the customer name exactly to confirm deletion')
      return
    }

    setSaving(true)
    try {
      await onConfirmDelete()
    } catch (error) {
      console.error('Error deleting lead:', error)
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
                    required
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
                    required
                    value={addFormData.customer_name}
                    onChange={(e) => setAddFormData({ ...addFormData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addFormData.phone_number}
                    onChange={(e) => setAddFormData({ ...addFormData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
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
                    onReferenceSourceChange={(sourceId) => setAddFormData({ 
                      ...addFormData, 
                      reference_source_id: sourceId 
                    })}
                    placeholder="Select a reference source..."
                  />
                </div>

                {/* Operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings className="inline h-4 w-4 mr-1" />
                    Operations *
                  </label>
                  <OperationsSelector
                    selectedOperationsId={addFormData.operations_id}
                    onOperationsChange={(userId) => setAddFormData({ 
                      ...addFormData, 
                      operations_id: userId 
                    })}
                    placeholder="Select operations staff..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Status <span className="text-red-500">*</span>
                  </label>
                  <StatusSelector
                    selectedStatus={addFormData.status}
                    onStatusChange={(status) => setAddFormData({ 
                      ...addFormData, 
                      status: status 
                    })}
                    placeholder="Select a status..."
                  />
                </div>



                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="inline h-4 w-4 mr-1" />
                    Notes <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any notes about this lead"
                  />
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
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date *
                  </label>
                  <input
                    type="date"
                    required
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
                    required
                    value={editFormData.customer_name}
                    onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                                 {/* Agent Selection */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <Users className="inline h-4 w-4 mr-1" />
                     Assigned Agent <span className="text-gray-400 text-xs">(optional)</span>
                   </label>
                   <AgentSelector
                     selectedAgentId={editFormData.agent_id}
                     onAgentChange={(agent) => setEditFormData({ 
                       ...editFormData, 
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
                    onReferenceSourceChange={(sourceId) => setEditFormData({ 
                      ...editFormData, 
                      reference_source_id: sourceId 
                    })}
                    placeholder="Select a reference source..."
                  />
                </div>

                {/* Operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings className="inline h-4 w-4 mr-1" />
                    Operations *
                  </label>
                  <OperationsSelector
                    selectedOperationsId={editFormData.operations_id}
                    onOperationsChange={(userId) => setEditFormData({ 
                      ...editFormData, 
                      operations_id: userId 
                    })}
                    placeholder="Select operations staff..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Status <span className="text-red-500">*</span>
                  </label>
                  <StatusSelector
                    selectedStatus={editFormData.status}
                    onStatusChange={(status) => setEditFormData({ 
                      ...editFormData, 
                      status: status 
                    })}
                    placeholder="Select a status..."
                  />
                </div>



                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="inline h-4 w-4 mr-1" />
                    Notes <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any notes about this lead"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-gray-900">{formatDateForDisplay(viewingLead.date)}</p>
                  </div>
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



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingLead.notes || 'No notes'}</p>
                </div>

                {/* Timestamps */}
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
