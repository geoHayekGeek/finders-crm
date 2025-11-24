'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Calendar, User, Phone, Star, MessageSquare, Plus, Edit, AlertCircle } from 'lucide-react'
import { Viewing, ViewingUpdate, VIEWING_UPDATE_STATUSES } from '@/types/viewing'
import { viewingsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'

interface PropertyViewingsSectionProps {
  propertyId: number
  canEdit?: boolean
  onAddViewing?: () => void
  canAddViewing?: boolean
  propertyAgentId?: number // The agent_id of the property (to check if agent owns it)
}

export function PropertyViewingsSection({ propertyId, canEdit = false, onAddViewing, canAddViewing = false, propertyAgentId }: PropertyViewingsSectionProps) {
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [expandedViewings, setExpandedViewings] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [addingUpdate, setAddingUpdate] = useState<number | null>(null)
  const [editingUpdateId, setEditingUpdateId] = useState<number | null>(null)
  const [newUpdate, setNewUpdate] = useState({ text: '', status: 'Initial Contact' })
  const [editingUpdate, setEditingUpdate] = useState({ text: '', status: 'Initial Contact' })
  const { token, user } = useAuth()
  const { canManageViewings } = usePermissions()
  const { showSuccess, showError } = useToast()
  const [teamAgentIds, setTeamAgentIds] = useState<number[]>([])
  
  // Load team agents for team leaders
  useEffect(() => {
    const loadTeamAgents = async () => {
      if (isTeamLeaderRole(user?.role) && user?.id && token) {
        try {
          const response = await usersApi.getTeamLeaderAgents(user.id, token)
          if (response.success) {
            const agentIds = response.agents.map((agent: any) => agent.id)
            setTeamAgentIds([user.id, ...agentIds])
          } else {
            setTeamAgentIds([user.id])
          }
        } catch (error) {
          console.error('Error loading team agents:', error)
          setTeamAgentIds([user.id])
        }
      }
    }
    loadTeamAgents()
  }, [user?.role, user?.id, token])
  
  // Check if user can mark/unmark serious for a specific viewing
  const canMarkSeriousForViewing = (viewing: Viewing): boolean => {
    // Admin, operations, operations manager, agent manager: can mark/unmark serious for everyone
    if (canManageViewings) {
      return true
    }
    
    // Team leaders: can mark/unmark serious for their own viewings and their team's viewings
    if (isTeamLeaderRole(user?.role)) {
      return viewing.agent_id === user?.id || teamAgentIds.includes(viewing.agent_id)
    }
    
    // Agents: cannot mark/unmark serious
    return false
  }

  // Check if user can add updates to a specific viewing
  const canAddUpdateToViewing = (viewing: Viewing): boolean => {
    if (!user) return false
    
    // Admin, operations, operations manager, agent manager: can add updates to all viewings
    if (canManageViewings) return true
    
    // Agents: can add updates to their own viewings
    if (isAgentRole(user.role)) {
      return viewing.agent_id === user.id
    }
    
    // Team leaders: can add updates to their own viewings and their team's viewings
    if (isTeamLeaderRole(user.role)) {
      return viewing.agent_id === user.id || teamAgentIds.includes(viewing.agent_id)
    }
    
    return false
  }
  
  // Security: For agents, only allow adding viewings if the property belongs to them
  const canActuallyAddViewing = canAddViewing && (
    !isAgentRole(user?.role) || 
    propertyAgentId === user?.id ||
    propertyAgentId === undefined // Allow if property has no agent (for backward compatibility, but backend will block)
  )

  useEffect(() => {
    if (!token) return
    loadViewings()
  }, [propertyId, token])

  const loadViewings = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await viewingsApi.getWithFilters({ property_id: propertyId }, token)
      if (response.success) {
        // Load updates for each viewing
        const viewingsWithUpdates = await Promise.all(
          response.data.map(async (viewing) => {
            try {
              const updatesResponse = await viewingsApi.getUpdates(viewing.id, token!)
              return { ...viewing, updates: updatesResponse.success ? updatesResponse.data : [] }
            } catch {
              return { ...viewing, updates: [] }
            }
          })
        )
        setViewings(viewingsWithUpdates)
      }
    } catch (error) {
      console.error('Failed to load viewings:', error)
      showError('Failed to load viewings')
    } finally {
      setLoading(false)
    }
  }

  const toggleSeriousFlag = async (viewing: Viewing) => {
    if (!token) {
      showError('You must be logged in to update viewings')
      return
    }

    try {
      const response = await viewingsApi.update(
        viewing.id,
        { is_serious: !viewing.is_serious },
        token
      )

      if (response.success) {
        showSuccess(
          viewing.is_serious
            ? 'Viewing unmarked as serious'
            : 'Viewing marked as serious'
        )
        await loadViewings()
      } else {
        showError(response.message || 'Failed to update viewing priority')
      }
    } catch (error) {
      console.error('Failed to toggle serious flag:', error)
      showError('Failed to update viewing priority')
    }
  }

  const toggleExpanded = (viewingId: number) => {
    const newExpanded = new Set(expandedViewings)
    if (newExpanded.has(viewingId)) {
      newExpanded.delete(viewingId)
    } else {
      newExpanded.add(viewingId)
    }
    setExpandedViewings(newExpanded)
  }

  const handleAddUpdate = async (viewingId: number) => {
    if (!token) {
      showError('You must be logged in to add updates')
      return
    }
    if (!newUpdate.text.trim()) {
      showError('Update text is required')
      return
    }

    try {
      const response = await viewingsApi.addUpdate(
        viewingId,
        {
          update_text: newUpdate.text,
          status: newUpdate.status,
          update_date: new Date().toISOString().split('T')[0]
        },
        token
      )

      if (response.success) {
        showSuccess('Update added successfully')
        setNewUpdate({ text: '', status: 'Initial Contact' })
        setAddingUpdate(null)
        await loadViewings()
      }
    } catch (error) {
      console.error('Failed to add update:', error)
      showError('Failed to add update')
    }
  }

  const handleStartEditUpdate = (update: ViewingUpdate) => {
    setEditingUpdateId(update.id)
    setEditingUpdate({ text: update.update_text || '', status: update.status || 'Initial Contact' })
    setAddingUpdate(null) // Close add form if open
  }

  const handleCancelEditUpdate = () => {
    setEditingUpdateId(null)
    setEditingUpdate({ text: '', status: 'Initial Contact' })
  }

  const handleSaveEditUpdate = async (viewingId: number, updateId: number) => {
    if (!token) {
      showError('You must be logged in to edit updates')
      return
    }
    if (!editingUpdate.text.trim()) {
      showError('Update text is required')
      return
    }

    try {
      const response = await viewingsApi.updateUpdate(
        viewingId,
        updateId,
        {
          update_text: editingUpdate.text,
          status: editingUpdate.status
        },
        token
      )

      if (response.success) {
        showSuccess('Update edited successfully')
        setEditingUpdateId(null)
        setEditingUpdate({ text: '', status: 'Initial Contact' })
        await loadViewings()
      } else {
        showError(response.message || 'Failed to edit update')
      }
    } catch (error) {
      console.error('Failed to edit update:', error)
      showError('Failed to edit update')
    }
  }

  // Check if user can edit an update
  const canEditUpdate = (update: ViewingUpdate): boolean => {
    if (!user) return false
    // Admin, operations, operations manager, agent manager: can edit all updates
    if (canManageViewings) return true
    // Users can edit their own updates
    return update.created_by === user.id
  }

  const getStatusConfig = (status: string) => {
    return VIEWING_UPDATE_STATUSES.find(s => s.value === status) || VIEWING_UPDATE_STATUSES[0]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (viewings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p className="mb-4">No viewings scheduled for this property yet</p>
        {canActuallyAddViewing && onAddViewing && (
          <button
            onClick={onAddViewing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Viewing</span>
          </button>
        )}
      </div>
    )
  }

  // Separate serious and non-serious viewings
  const seriousViewings = viewings.filter(v => v.is_serious)
  const regularViewings = viewings.filter(v => !v.is_serious)

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Viewings</h3>
        {canActuallyAddViewing && onAddViewing && (
          <button
            onClick={onAddViewing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Viewing</span>
          </button>
        )}
      </div>
      
      {/* Serious Viewings */}
      {seriousViewings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            Serious Viewings ({seriousViewings.length})
          </h4>
          {seriousViewings.map((viewing) => (
            <ViewingCard
              key={viewing.id}
              viewing={viewing}
              expanded={expandedViewings.has(viewing.id)}
              onToggle={() => toggleExpanded(viewing.id)}
              onToggleSerious={canMarkSeriousForViewing(viewing) ? () => toggleSeriousFlag(viewing) : undefined}
              onAddUpdate={canAddUpdateToViewing(viewing) ? () => setAddingUpdate(viewing.id) : undefined}
              addingUpdate={addingUpdate === viewing.id}
              editingUpdateId={editingUpdateId}
              editingUpdate={editingUpdate}
              setEditingUpdate={setEditingUpdate}
              onStartEditUpdate={handleStartEditUpdate}
              onCancelEditUpdate={handleCancelEditUpdate}
              onSaveEditUpdate={(updateId) => handleSaveEditUpdate(viewing.id, updateId)}
              canEditUpdate={canEditUpdate}
              newUpdate={newUpdate}
              setNewUpdate={setNewUpdate}
              handleAddUpdate={() => handleAddUpdate(viewing.id)}
              cancelAddUpdate={() => setAddingUpdate(null)}
              getStatusConfig={getStatusConfig}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Regular Viewings */}
      {regularViewings.length > 0 && (
        <div className="space-y-3">
          {seriousViewings.length > 0 && (
            <h4 className="text-sm font-semibold text-gray-700">
              Other Viewings ({regularViewings.length})
            </h4>
          )}
          {regularViewings.map((viewing) => (
            <ViewingCard
              key={viewing.id}
              viewing={viewing}
              expanded={expandedViewings.has(viewing.id)}
              onToggle={() => toggleExpanded(viewing.id)}
              onToggleSerious={canMarkSeriousForViewing(viewing) ? () => toggleSeriousFlag(viewing) : undefined}
              onAddUpdate={canAddUpdateToViewing(viewing) ? () => setAddingUpdate(viewing.id) : undefined}
              addingUpdate={addingUpdate === viewing.id}
              editingUpdateId={editingUpdateId}
              editingUpdate={editingUpdate}
              setEditingUpdate={setEditingUpdate}
              onStartEditUpdate={handleStartEditUpdate}
              onCancelEditUpdate={handleCancelEditUpdate}
              onSaveEditUpdate={(updateId) => handleSaveEditUpdate(viewing.id, updateId)}
              canEditUpdate={canEditUpdate}
              newUpdate={newUpdate}
              setNewUpdate={setNewUpdate}
              handleAddUpdate={() => handleAddUpdate(viewing.id)}
              cancelAddUpdate={() => setAddingUpdate(null)}
              getStatusConfig={getStatusConfig}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ViewingCardProps {
  viewing: Viewing
  expanded: boolean
  onToggle: () => void
  onToggleSerious?: () => void
  onAddUpdate?: () => void
  addingUpdate: boolean
  editingUpdateId: number | null
  editingUpdate: { text: string; status: string }
  setEditingUpdate: (update: { text: string; status: string }) => void
  onStartEditUpdate: (update: ViewingUpdate) => void
  onCancelEditUpdate: () => void
  onSaveEditUpdate: (updateId: number) => void
  canEditUpdate: (update: ViewingUpdate) => boolean
  newUpdate: { text: string; status: string }
  setNewUpdate: (update: { text: string; status: string }) => void
  handleAddUpdate: () => void
  cancelAddUpdate: () => void
  getStatusConfig: (status: string) => typeof VIEWING_UPDATE_STATUSES[number]
  formatDate: (date: string) => string
}

function ViewingCard({
  viewing,
  expanded,
  onToggle,
  onToggleSerious,
  onAddUpdate,
  addingUpdate,
  editingUpdateId,
  editingUpdate,
  setEditingUpdate,
  onStartEditUpdate,
  onCancelEditUpdate,
  onSaveEditUpdate,
  canEditUpdate,
  newUpdate,
  setNewUpdate,
  handleAddUpdate,
  cancelAddUpdate,
  getStatusConfig,
  formatDate
}: ViewingCardProps) {
  const latestStatus = viewing.updates && viewing.updates.length > 0
    ? viewing.updates[viewing.updates.length - 1].status
    : 'Initial Contact'
  const statusConfig = getStatusConfig(latestStatus)

  return (
    <div
      className={`border rounded-lg transition-all ${
        viewing.is_serious
          ? 'border-yellow-300 bg-yellow-50/30 shadow-md'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {viewing.is_serious && (
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-semibold text-gray-900">{viewing.lead_name}</h5>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {viewing.lead_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{viewing.lead_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(viewing.viewing_date)} at {viewing.viewing_time}</span>
              </div>
              {viewing.agent_name && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>{viewing.agent_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleSerious && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSerious()
              }}
              className="text-xs px-2 py-1 rounded-full border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              {viewing.is_serious ? 'Unmark serious' : 'Mark serious'}
            </button>
          )}
          {viewing.updates && viewing.updates.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {viewing.updates.length} update{viewing.updates.length !== 1 ? 's' : ''}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
          {/* Description */}
          {viewing.description && (
            <div className="pt-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewing.description}</p>
            </div>
          )}

          {/* Updates */}
          {viewing.updates && viewing.updates.length > 0 && (
            <div className="space-y-2 pt-2">
              <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Updates Timeline
              </h6>
              <div className="space-y-2">
                {[...viewing.updates].reverse().map((update, index) => {
                  const updateStatus = getStatusConfig(update.status)
                  const isEditing = editingUpdateId === update.id
                  
                  return (
                    <div
                      key={update.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                    >
                      {!isEditing ? (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                              style={{ backgroundColor: updateStatus.color }}
                            >
                              {updateStatus.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {canEditUpdate(update) && (
                                <button
                                  onClick={() => onStartEditUpdate(update)}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit update"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDate(update.update_date || update.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.update_text}</p>
                          {update.created_by_name && (
                            <p className="text-xs text-gray-500 mt-2">
                              By {update.created_by_name}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Update Status
                            </label>
                            <select
                              value={editingUpdate.status}
                              onChange={(e) => setEditingUpdate({ ...editingUpdate, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {VIEWING_UPDATE_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Update Details
                            </label>
                            <textarea
                              value={editingUpdate.text}
                              onChange={(e) => setEditingUpdate({ ...editingUpdate, text: e.target.value })}
                              placeholder="Enter update details..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onSaveEditUpdate(update.id)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={onCancelEditUpdate}
                              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Update Form */}
          {onAddUpdate && !addingUpdate && (
            <button
              onClick={onAddUpdate}
              className="w-full mt-3 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Update</span>
            </button>
          )}

          {addingUpdate && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Update Status
                </label>
                <select
                  value={newUpdate.status}
                  onChange={(e) => setNewUpdate({ ...newUpdate, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {VIEWING_UPDATE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Update Details
                </label>
                <textarea
                  value={newUpdate.text}
                  onChange={(e) => setNewUpdate({ ...newUpdate, text: e.target.value })}
                  placeholder="Enter update details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddUpdate}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Update
                </button>
                <button
                  onClick={cancelAddUpdate}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

