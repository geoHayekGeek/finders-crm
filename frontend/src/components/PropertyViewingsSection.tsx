'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Calendar, User, Phone, Star, MessageSquare, Plus, Edit, AlertCircle } from 'lucide-react'
import { Viewing, VIEWING_STATUSES } from '@/types/viewing'
import { viewingsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { isAgentRole, isTeamLeaderRole, isAdminRole, isOperationsRole, isAgentManagerRole } from '@/utils/roleUtils'
import Link from 'next/link'

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
  const [addingFollowUp, setAddingFollowUp] = useState<number | null>(null)
  const [newFollowUp, setNewFollowUp] = useState({ 
    viewing_date: '', 
    viewing_time: '', 
    notes: '',
    status: 'Scheduled' 
  })
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
    if (!user) return false
    
    // Admin, operations, operations manager, agent manager: can mark/unmark serious for everyone
    if (canManageViewings) {
      return true
    }
    
    // Team leaders: can mark/unmark serious for their own viewings and their team's viewings
    if (isTeamLeaderRole(user.role)) {
      return viewing.agent_id === user.id || teamAgentIds.includes(viewing.agent_id)
    }
    
    // Agents: can mark/unmark serious for their own viewings
    if (isAgentRole(user.role)) {
      return viewing.agent_id === user.id
    }
    
    return false
  }

  // Check if user can add follow-up viewings to a specific viewing
  const canAddFollowUpToViewing = (viewing: Viewing): boolean => {
    if (!user) return false
    
    // Admin, operations, operations manager, agent manager: can add follow-up viewings to all viewings
    if (canManageViewings) return true
    
    // Agents: can add follow-up viewings to their own viewings
    if (isAgentRole(user.role)) {
      return viewing.agent_id === user.id
    }
    
    // Team leaders: can add follow-up viewings to their own viewings and their team's viewings
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
    // Clear viewings when property changes to prevent showing stale data
    setViewings([])
    setLoading(true)
    loadViewings()
  }, [propertyId, token, user?.id, user?.role, teamAgentIds])

  const loadViewings = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await viewingsApi.getWithFilters({ property_id: propertyId }, token)
      if (response.success) {
        // Viewings already include sub_viewings from the backend
        let viewingsWithSubViewings = response.data.map((viewing) => ({
          ...viewing,
          sub_viewings: viewing.sub_viewings || []
        }))
        
        // Filter viewings based on user role (only parent viewings, sub_viewings are already attached)
        if (isAgentRole(user?.role)) {
          // Agents can only see their own viewings
          viewingsWithSubViewings = viewingsWithSubViewings.filter(viewing => viewing.agent_id === user?.id)
        } else if (isTeamLeaderRole(user?.role)) {
          // Team leaders can see their own viewings and their team's agents' viewings
          viewingsWithSubViewings = viewingsWithSubViewings.filter(viewing => 
            viewing.agent_id === user?.id || teamAgentIds.includes(viewing.agent_id)
          )
        }
        // Admin, operations manager, operations, agent manager can see all viewings (no filtering needed)
        
        setViewings(viewingsWithSubViewings)
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

  const handleAddFollowUp = async (viewingId: number) => {
    if (!token) {
      showError('You must be logged in to add follow-up viewings')
      return
    }
    if (!newFollowUp.viewing_date || !newFollowUp.viewing_time) {
      showError('Follow-up viewing date and time are required')
      return
    }

    try {
      const response = await viewingsApi.addUpdate(
        viewingId,
        {
          viewing_date: newFollowUp.viewing_date,
          viewing_time: newFollowUp.viewing_time,
          notes: newFollowUp.notes || '',
          status: newFollowUp.status
        },
        token
      )

      if (response.success) {
        showSuccess('Follow-up viewing added successfully')
        setNewFollowUp({ viewing_date: '', viewing_time: '', notes: '', status: 'Scheduled' })
        setAddingFollowUp(null)
        await loadViewings()
      }
    } catch (error) {
      console.error('Failed to add follow-up viewing:', error)
      showError('Failed to add follow-up viewing')
    }
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
              onAddFollowUp={canAddFollowUpToViewing(viewing) ? () => setAddingFollowUp(viewing.id) : undefined}
              addingFollowUp={addingFollowUp === viewing.id}
              newFollowUp={newFollowUp}
              setNewFollowUp={setNewFollowUp}
              handleAddFollowUp={() => handleAddFollowUp(viewing.id)}
              cancelAddFollowUp={() => setAddingFollowUp(null)}
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
              onAddFollowUp={canAddFollowUpToViewing(viewing) ? () => setAddingFollowUp(viewing.id) : undefined}
              addingFollowUp={addingFollowUp === viewing.id}
              newFollowUp={newFollowUp}
              setNewFollowUp={setNewFollowUp}
              handleAddFollowUp={() => handleAddFollowUp(viewing.id)}
              cancelAddFollowUp={() => setAddingFollowUp(null)}
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
  onAddFollowUp?: () => void
  addingFollowUp: boolean
  newFollowUp: { viewing_date: string; viewing_time: string; notes: string; status: string }
  setNewFollowUp: (followUp: { viewing_date: string; viewing_time: string; notes: string; status: string }) => void
  handleAddFollowUp: () => void
  cancelAddFollowUp: () => void
  formatDate: (date: string) => string
}

function ViewingCard({
  viewing,
  expanded,
  onToggle,
  onToggleSerious,
  onAddFollowUp,
  addingFollowUp,
  newFollowUp,
  setNewFollowUp,
  handleAddFollowUp,
  cancelAddFollowUp,
  formatDate
}: ViewingCardProps) {
  const { user } = useAuth()
  const statusConfig = VIEWING_STATUSES.find(s => s.value === viewing.status) || VIEWING_STATUSES[0]
  
  // Check if lead name should be clickable
  const hasLead = viewing && viewing.lead_id
  const hasRole = isAdminRole(user?.role) || isOperationsRole(user?.role) || isAgentManagerRole(user?.role)
  const isLeadClickable = hasLead && hasRole

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
              {isLeadClickable ? (
                <Link
                  href={`/dashboard/leads?view=${viewing.lead_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!viewing.lead_id) {
                      console.error('❌ Lead ID is missing:', viewing)
                      e.preventDefault()
                      return
                    }
                    console.log('🔗 Opening lead URL from viewing:', `/dashboard/leads?view=${viewing.lead_id}`, 'Lead ID:', viewing.lead_id)
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                  title="Click to view lead details"
                >
                  {viewing.lead_name}
                </Link>
              ) : (
                <h5 className="font-semibold text-gray-900">{viewing.lead_name}</h5>
              )}
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
          {viewing.sub_viewings && viewing.sub_viewings.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {viewing.sub_viewings.length} follow-up{viewing.sub_viewings.length !== 1 ? 's' : ''}
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

          {/* Follow-up Viewings */}
          {viewing.sub_viewings && viewing.sub_viewings.length > 0 && (
            <div className="space-y-2 pt-2">
              <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Follow-up Viewings
              </h6>
              <div className="space-y-2">
                {viewing.sub_viewings.map((subViewing) => {
                  const subStatusConfig = VIEWING_STATUSES.find(s => s.value === subViewing.status) || VIEWING_STATUSES[0]
                  
                  return (
                    <div
                      key={subViewing.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                          style={{ backgroundColor: subStatusConfig.color }}
                        >
                          {subStatusConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(subViewing.viewing_date)} at {subViewing.viewing_time}
                        </span>
                      </div>
                      {subViewing.notes && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{subViewing.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Follow-up Viewing Form */}
          {onAddFollowUp && !addingFollowUp && (
            <button
              onClick={onAddFollowUp}
              className="w-full mt-3 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Follow-up Viewing</span>
            </button>
          )}

          {addingFollowUp && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newFollowUp.viewing_date}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, viewing_date: e.target.value })}
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
                    value={newFollowUp.viewing_time}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, viewing_time: e.target.value })}
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
                  value={newFollowUp.status}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, status: e.target.value })}
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
                  value={newFollowUp.notes}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                  placeholder="Enter notes for this follow-up viewing..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFollowUp}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Follow-up Viewing
                </button>
                <button
                  onClick={cancelAddFollowUp}
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

