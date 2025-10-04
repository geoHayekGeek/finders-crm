'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRole, getRoleColor } from '@/utils/roleFormatter'
import { X, ChevronDown, Settings, RefreshCw } from 'lucide-react'
import { OperationsUser } from '@/types/leads'
import { leadsApi } from '@/utils/api'

interface OperationsSelectorProps {
  selectedOperationsId?: number
  onOperationsChange: (userId: number | undefined) => void
  placeholder?: string
}

export function OperationsSelector({ 
  selectedOperationsId, 
  onOperationsChange, 
  placeholder = "Select operations staff..."
}: OperationsSelectorProps) {
  const [operationsUsers, setOperationsUsers] = useState<OperationsUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch operations users from database
  const fetchOperationsUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching operations users...')
      const data = await leadsApi.getOperationsUsers()
      console.log('⚙️ Operations users data:', data)
      
      if (data.success) {
        setOperationsUsers(data.data)
        console.log('✅ Operations users loaded:', data.data.length)
      } else {
        setError(data.message || 'Failed to load operations users')
      }
    } catch (error) {
      console.error('❌ Error fetching operations users:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOperationsUsers()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = operationsUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    )
  })

  const handleUserSelect = (userId: number) => {
    onOperationsChange(userId)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearUser = () => {
    onOperationsChange(undefined)
  }

  const selectedUser = operationsUsers.find(u => u.id === selectedOperationsId)


  return (
    <div className="space-y-2">
      {/* Display selected user */}
      {selectedOperationsId && selectedUser && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Settings className="h-4 w-4 text-purple-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-800">
                {selectedUser.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(selectedUser.role)}`}>
                {selectedUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearUser}
            className="p-1 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear operations staff"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropdown selector */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            disabled={isLoading}
          >
            <div className="flex items-center justify-between">
              <span className={selectedUser ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedUser ? selectedUser.name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchOperationsUsers}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh operations staff"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search operations staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Users list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading operations staff...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No operations staff found matching your search' : 'No operations staff available'}
                </div>
              ) : (
                <div>
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-600">{user.email}</div>
                        </div>
                        <div className="ml-3">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                            {formatRole(user.role)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
