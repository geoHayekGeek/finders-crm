'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

interface User {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface SingleUserSelectorProps {
  users: User[]
  selectedUserId?: number
  onUserSelect: (user: User | null) => void
  placeholder?: string
  loading?: boolean
}

export function SingleUserSelector({ 
  users, 
  selectedUserId, 
  onUserSelect, 
  placeholder = "Select a user...",
  loading = false
}: SingleUserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get the selected user object
  const selectedUser = users.find(user => user.id === selectedUserId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      (user.location && user.location.toLowerCase().includes(searchLower))
    )
  })

  const handleUserSelect = (user: User) => {
    onUserSelect(user)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClearSelection = () => {
    onUserSelect(null)
    setSearchTerm('')
  }

  const toggleDropdown = () => {
    if (loading) return
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      // Focus the input when opening
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleInputFocus = () => {
    if (loading) return
    setIsOpen(true)
  }

  const handleInputClick = () => {
    if (loading) return
    setIsOpen(true)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected User Display */}
      {selectedUser && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <UserIcon className="h-4 w-4" />
            <span>{selectedUser.name}</span>
            <button
              onClick={handleClearSelection}
              className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative input-with-icon">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={loading}
          className={`w-full px-4 py-2 pl-12 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${
            loading ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        {/* Dropdown Toggle Button */}
        <button
          onClick={toggleDropdown}
          disabled={loading}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded transition-colors ${
            loading 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'hover:bg-gray-100 text-gray-400'
          }`}
          type="button"
        >
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            <div className="py-2">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {user.role}
                        </span>
                        {user.location && (
                          <span className="text-xs text-gray-500">
                            📍 {user.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
