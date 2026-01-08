'use client'

import { useEffect, useState } from 'react'
import { X, Save, Eye, EyeOff, UserPlus } from 'lucide-react'
import { CreateUserFormData } from '@/types/user'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { AgentMultiSelect } from './AgentMultiSelect'

interface AddUserModalProps {
  allowedRoles: CreateUserFormData['role'][]
  onClose: () => void
  onSuccess: () => void
}

export function AddUserModal({ allowedRoles, onClose, onSuccess }: AddUserModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError, showWarning } = useToast()
  
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [assignedAgentIds, setAssignedAgentIds] = useState<number[]>([])

  const initialRole = allowedRoles[0] ?? 'agent'
  
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: '',
    email: '',
    password: '',
    role: initialRole,
    phone: '',
    dob: '',
    work_location: '',
    address: ''
  })

  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(formData.role)) {
      setFormData((prev) => ({
        ...prev,
        role: allowedRoles[0]
      }))
    }
  }, [allowedRoles, formData.role])

  const handleSave = async () => {
    if (!token) return
    if (!allowedRoles.includes(formData.role)) {
      showError('You do not have permission to create this role')
      return
    }
    
    // Validation
    if (!formData.name.trim()) {
      showError('Name is required')
      return
    }
    
    if (!formData.email.trim()) {
      showError('Email is required')
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address')
      return
    }
    
    if (!formData.password || formData.password.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }
    
    try {
      setSaving(true)
      
      // Prepare data
      const createData: CreateUserFormData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone?.trim() || undefined,
        dob: formData.dob || undefined,
        work_location: formData.work_location?.trim() || undefined,
        address: formData.address?.trim() || undefined
      }
      
      const response = await usersApi.create(createData, token)
      
      if (response.success) {
        // If team leader, assign agents
        if (formData.role === 'team_leader' && assignedAgentIds.length > 0 && response.user) {
          try {
            for (const agentId of assignedAgentIds) {
              await usersApi.assignAgentToTeamLeader(response.user.id, agentId, token)
            }
          } catch (assignError) {
            console.error('Error assigning agents:', assignError)
            showWarning('User created but some agent assignments failed')
          }
        }
        
        showSuccess('User created successfully')
        onSuccess()
        onClose()
      } else {
        showError(response.message || 'Failed to create user')
      }
    } catch (error: any) {
      console.error('Error creating user:', error)
      showError(error?.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  // Handle role change - clear agent assignments if not team leader
  const handleRoleChange = (newRole: string) => {
    if (!allowedRoles.includes(newRole as CreateUserFormData['role'])) {
      showWarning('You do not have permission to assign this role')
      return
    }
    setFormData({ ...formData, role: newRole as CreateUserFormData['role'] })
    if (newRole !== 'team_leader') {
      setAssignedAgentIds([])
    }
  }

  const canSubmit = allowedRoles.includes(formData.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
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
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min. 6 characters)"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
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
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'admin' && 'Full system access'}
                {formData.role === 'operations manager' && 'Can manage operations team and workflows'}
                {formData.role === 'operations' && 'Can manage system operations'}
                {formData.role === 'agent manager' && 'Can manage agents and sales team'}
                {formData.role === 'team_leader' && 'Can manage agents and properties'}
                {formData.role === 'agent' && 'Can manage assigned properties'}
                {formData.role === 'accountant' && 'Can manage financial records and transactions'}
              </p>
            </div>

            {/* Agent Assignment (only for team leaders) */}
            {formData.role === 'team_leader' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <AgentMultiSelect
                  selectedAgentIds={assignedAgentIds}
                  onChange={setAssignedAgentIds}
                  label="Assign Agents to Team Leader"
                />
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
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+961 XX XXX XXX"
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>{allowedRoles.length === 0 ? 'No Roles Available' : 'Create User'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
