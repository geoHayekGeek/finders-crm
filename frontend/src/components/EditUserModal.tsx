'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Save, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { User, EditUserFormData } from '@/types/user'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { AgentMultiSelect } from './AgentMultiSelect'

interface EditUserModalProps {
  user: User
  allowedRoles: EditUserFormData['role'][]
  onClose: () => void
  onSuccess: () => void
}

export function EditUserModal({ user, allowedRoles, onClose, onSuccess }: EditUserModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError, showWarning } = useToast()
  
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [assignedAgentIds, setAssignedAgentIds] = useState<number[]>([])
  const [initialAgentIds, setInitialAgentIds] = useState<number[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  
  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toISOString().slice(0, 10)
  }

  const [formData, setFormData] = useState<EditUserFormData>({
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    dob: formatDateForInput(user.dob),
    work_location: user.work_location || '',
    address: user.address || '',
    user_code: user.user_code,
    is_active: user.is_active,
    password: ''
  })

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      dob: formatDateForInput(user.dob),
      work_location: user.work_location || '',
      address: user.address || '',
      user_code: user.user_code,
      is_active: user.is_active,
      password: ''
    })
  }, [user])

  // Load assigned agents if user is a team leader
  useEffect(() => {
    if (user.role === 'team_leader' && token) {
      loadAssignedAgents()
    }
  }, [user.id, user.role, token])

  const loadAssignedAgents = async () => {
    if (!token) return
    
    try {
      setLoadingAgents(true)
      const response = await usersApi.getTeamLeaderAgents(user.id, token)
      
      if (response.success && response.agents) {
        const agentIds = response.agents.map((agent: any) => agent.id)
        setAssignedAgentIds(agentIds)
        setInitialAgentIds(agentIds)
      }
    } catch (error) {
      console.error('Error loading assigned agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleSave = async () => {
    if (!token) return
    
    // Validation
    if (!formData.name.trim()) {
      showError('Name is required')
      return
    }
    
    if (!formData.email.trim()) {
      showError('Email is required')
      return
    }
    
    if (changePassword && formData.password && formData.password.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }
    
    try {
      setSaving(true)
      
      // Prepare data - only include password if changing it
      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone?.trim() || null,
        dob: formData.dob || null,
        work_location: formData.work_location?.trim() || null,
        address: formData.address?.trim() || null,
        user_code: formData.user_code,
        is_active: formData.is_active
      }
      
      // Only include password if user wants to change it
      if (changePassword && formData.password && formData.password.trim()) {
        updateData.password = formData.password.trim()
      }
      
      const response = await usersApi.update(user.id, updateData, token)
      
      if (response.success) {
        // If team leader, update agent assignments
        if (formData.role === 'team_leader') {
          try {
            // Find agents to add (in assignedAgentIds but not in initialAgentIds)
            const agentsToAdd = assignedAgentIds.filter(id => !initialAgentIds.includes(id))
            
            // Find agents to remove (in initialAgentIds but not in assignedAgentIds)
            const agentsToRemove = initialAgentIds.filter(id => !assignedAgentIds.includes(id))
            
            // Add new agents
            for (const agentId of agentsToAdd) {
              await usersApi.assignAgentToTeamLeader(user.id, agentId, token)
            }
            
            // Remove old agents
            for (const agentId of agentsToRemove) {
              await usersApi.removeAgentFromTeamLeader(user.id, agentId, token)
            }
          } catch (assignError) {
            console.error('Error updating agent assignments:', assignError)
            showWarning('User updated but some agent assignments failed')
          }
        }
        
        showSuccess('User updated successfully')
        onSuccess()
        onClose()
      } else {
        showError(response.message || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      showError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  // Handle role change - clear agent assignments if not team leader
  const handleRoleChange = (newRole: string) => {
    if (!allowedRoles.includes(newRole as EditUserFormData['role'])) {
      showWarning('You do not have permission to assign this role')
      return
    }
    setFormData({ ...formData, role: newRole as EditUserFormData['role'] })
    if (newRole !== 'team_leader') {
      setAssignedAgentIds([])
      setInitialAgentIds([])
    }
  }

  useEffect(() => {
    if (!allowedRoles.includes(formData.role)) {
      setFormData(prev => ({
        ...prev,
        role: allowedRoles[0] ?? prev.role
      }))
    }
  }, [allowedRoles, formData.role])

  const canSubmit = allowedRoles.includes(formData.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={allowedRoles.length === 0}
              >
                {allowedRoles.map(roleOption => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Assignment (only for team leaders) */}
            {formData.role === 'team_leader' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                {loadingAgents ? (
                  <div className="text-center py-4 text-gray-600">
                    Loading assigned agents...
                  </div>
                ) : (
                  <AgentMultiSelect
                    selectedAgentIds={assignedAgentIds}
                    onChange={setAssignedAgentIds}
                    label="Assign Agents to Team Leader"
                    teamLeaderId={user.id}
                  />
                )}
              </div>
            )}

            {/* Work Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Location
              </label>
              <input
                type="text"
                value={formData.work_location}
                onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                placeholder="e.g., Beirut, Kesserwan"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full physical address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Account Status */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Account Status
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.is_active 
                      ? 'User can log in to the system' 
                      : 'User cannot log in (account disabled)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    formData.is_active ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {!formData.is_active && (
                <div className="mt-3 flex items-start space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    This user will not be able to log in until their account is re-enabled.
                  </p>
                </div>
              )}
            </div>

            {/* Change Password Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-900">
                  Change Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setChangePassword(!changePassword)
                    if (changePassword) {
                      setFormData({ ...formData, password: '' })
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    changePassword ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      changePassword ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              {changePassword && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Leave blank to keep current password
                  </p>
                </div>
              )}
            </div>

            {/* User Code (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Code
              </label>
              <input
                type="text"
                value={formData.user_code}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
