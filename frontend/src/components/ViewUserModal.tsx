'use client'

import { useState, useEffect } from 'react'
import { X, UserCircle, Mail, Phone, MapPin, Calendar, Briefcase, Shield, CheckCircle, XCircle, FolderOpen, Users } from 'lucide-react'
import { User } from '@/types/user'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeRole } from '@/utils/roleUtils'

interface ViewUserModalProps {
  user: User
  onClose: () => void
  onEdit?: () => void
  onViewDocuments?: () => void
}

export function ViewUserModal({ user, onClose, onEdit, onViewDocuments }: ViewUserModalProps) {
  const { token } = useAuth()
  const [agents, setAgents] = useState<User[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  useEffect(() => {
    if (normalizeRole(user.role) === 'team leader' && token) {
      loadTeamAgents()
    }
  }, [user.id, user.role, token])

  const loadTeamAgents = async () => {
    if (!token) return
    
    try {
      setLoadingAgents(true)
      const response = await usersApi.getTeamLeaderAgents(user.id, token)
      if (response.success && response.agents) {
        setAgents(response.agents)
      }
    } catch (error) {
      // Silently fail - non-critical
    } finally {
      setLoadingAgents(false)
    }
  }
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleDisplay = (role: string) => {
    return role.replace(/_/g, ' ').toUpperCase()
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      'operations manager': 'bg-red-100 text-red-800 border-red-200',
      operations: 'bg-orange-100 text-orange-800 border-orange-200',
      'agent manager': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      team_leader: 'bg-blue-100 text-blue-800 border-blue-200',
      agent: 'bg-green-100 text-green-800 border-green-200',
      accountant: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-600 rounded-lg">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <p className="text-sm text-gray-600">View user information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
                <p className="text-gray-600 flex items-center space-x-2 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                    {getRoleDisplay(user.role)}
                  </span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center space-x-1 ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {user.is_active ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>Disabled</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Code */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">User Code</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{user.user_code}</p>
              </div>

              {/* Work Location */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm font-medium">Work Location</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {user.work_location || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>

              {/* Address */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Address</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {user.address || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>

              {/* Phone */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm font-medium">Phone Number</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {user.phone || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>

              {/* Date of Birth */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Date of Birth</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {user.dob ? formatDate(user.dob) : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>

            </div>

            {/* Agent Assignment Info & Properties/Leads */}
            {user.role === 'agent' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Agent Status</h4>
                <div className="space-y-3">
                  {/* Team Assignment */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {user.is_assigned ? 'Assigned to properties' : 'Available for assignment'}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      user.is_assigned 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.is_assigned ? 'Assigned' : 'Available'}
                    </span>
                  </div>
                  
                  {/* Team Assignment Badge */}
                  {user.assigned_to && (user as any).team_leader_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">Team Assignment</span>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation()
                          const url = `/dashboard/hr?view=${user.assigned_to}`
                          window.open(url, '_blank')
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
                        title="Click to view team leader details"
                      >
                        Assigned to {(user as any).team_leader_name} Team
                      </span>
                    </div>
                  )}
                  
                  {/* Properties and Leads Counts */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-200">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/dashboard/properties?agent_id=${user.id}`, '_blank')
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors flex items-center space-x-1"
                      title="Click to view properties"
                    >
                      <span>{(user as any).properties_count || 0}</span>
                      <span>{(user as any).properties_count === 1 ? 'Property' : 'Properties'}</span>
                    </span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/dashboard/leads?agent_id=${user.id}`, '_blank')
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors flex items-center space-x-1"
                      title="Click to view leads"
                    >
                      <span>{(user as any).leads_count || 0}</span>
                      <span>{(user as any).leads_count === 1 ? 'Lead' : 'Leads'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Team Leader Properties/Leads */}
            {normalizeRole(user.role) === 'team leader' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Properties & Leads</h4>
                <div className="flex flex-wrap gap-2">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(`/dashboard/properties?agent_id=${user.id}`, '_blank')
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors flex items-center space-x-1"
                    title="Click to view properties"
                  >
                    <span>{(user as any).properties_count || 0}</span>
                    <span>{(user as any).properties_count === 1 ? 'Property' : 'Properties'}</span>
                  </span>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(`/dashboard/leads?agent_id=${user.id}`, '_blank')
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors flex items-center space-x-1"
                    title="Click to view leads"
                  >
                    <span>{(user as any).leads_count || 0}</span>
                    <span>{(user as any).leads_count === 1 ? 'Lead' : 'Leads'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Team Leader Agents */}
            {normalizeRole(user.role) === 'team leader' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-900 flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Team Agents</span>
                  </h4>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
                  </span>
                </div>
                
                {loadingAgents ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-blue-700">Loading agents...</p>
                  </div>
                ) : agents.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {agents.map((agent) => (
                      <div key={agent.id} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                            <p className="text-xs text-gray-600">{agent.email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {agent.user_code}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-blue-700">No agents assigned yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Account Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="font-semibold text-gray-900">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated</span>
                  <p className="font-semibold text-gray-900">{formatDate(user.updated_at)}</p>
                </div>
                {user.added_by_name && user.added_by && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Added By</span>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation()
                        const url = `/dashboard/hr?view=${user.added_by}`
                        window.open(url, '_blank')
                      }}
                      className="mt-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                    >
                      <p className="font-semibold text-gray-900">{user.added_by_name}</p>
                      {user.added_by_code && (
                        <p className="text-xs text-gray-500">{user.added_by_code}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Count */}
            {user.document_count !== undefined && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-purple-900 mb-1">Documents</h4>
                  <p className="text-lg font-bold text-purple-800">
                    {user.document_count} {user.document_count === 1 ? 'document' : 'documents'} uploaded
                  </p>
                </div>
                {onViewDocuments && (
                  <button
                    onClick={onViewDocuments}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>View Documents</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            User ID: <span className="font-mono font-semibold">#{user.id}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
