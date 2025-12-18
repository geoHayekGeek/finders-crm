'use client'

import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { User } from '@/types/user'
import { usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface DeleteUserModalProps {
  user: User
  onClose: () => void
  onSuccess: () => void
}

export function DeleteUserModal({ user, onClose, onSuccess }: DeleteUserModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const handleDelete = async () => {
    if (!token) return
    
    // Validation - user must type the user's email to confirm
    if (confirmation !== user.email) {
      showError('Email does not match. Please type the exact email address to confirm.')
      return
    }
    
    try {
      setDeleting(true)
      
      const response = await usersApi.delete(user.id, token)
      
      if (response.success) {
        showSuccess('User deleted successfully')
        onSuccess()
        onClose()
      } else {
        showError(response.message || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      showError(error?.message || 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-200 flex items-center justify-between bg-red-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    Warning: This action cannot be undone
                  </h3>
                  <p className="text-sm text-red-800">
                    Deleting this user will permanently remove all their data from the system.
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">You are about to delete:</h4>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-600">
                  Role: <span className="font-medium">{user.role.replace('_', ' ').toUpperCase()}</span>
                </p>
                <p className="text-sm text-gray-600">
                  User Code: <span className="font-mono font-medium">{user.user_code}</span>
                </p>
              </div>
            </div>

            {/* Consequences List */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                This will also:
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Remove the user&apos;s access to the system</li>
                <li>Delete all associated documents</li>
                <li>Remove user assignments (if applicable)</li>
                <li>Clear all user activity logs</li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-semibold text-red-600">{user.email}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Enter user email"
                disabled={deleting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmation !== user.email}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete User</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
