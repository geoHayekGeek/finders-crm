'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRole } from '@/utils/roleFormatter'
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface UserSelectorProps {
  selectedUsers: User[]
  onUsersChange: (users: User[]) => void
  placeholder?: string
  maxUsers?: number
}

export function UserSelector({ 
  selectedUsers, 
  onUsersChange, 
  placeholder = "Search and select users...",
  maxUsers = 10
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/users/all`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUsers(data.users)
          } else {
            setError('Failed to fetch users')
          }
        } else {
          setError('Failed to fetch users')
        }
      } catch (err) {
        setError('Failed to fetch users')
        console.error('Error fetching users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

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
    ) && !selectedUsers.some(selected => selected.id === user.id)
  })

  const handleUserSelect = (user: User) => {
    if (selectedUsers.length >= maxUsers) {
      return
    }
    onUsersChange([...selectedUsers, user])
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleUserRemove = (userId: number) => {
    onUsersChange(selectedUsers.filter(user => user.id !== userId))
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      // Focus the input when opening
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputClick = () => {
    setIsOpen(true)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <div
                key={user.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                <UserIcon className="h-4 w-4" />
                <span>{user.name}</span>
                <button
                  onClick={() => handleUserRemove(user.id)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {selectedUsers.length >= maxUsers && (
            <p className="text-xs text-gray-500 mt-1">
              Maximum {maxUsers} users allowed
            </p>
          )}
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
          className="w-full px-4 py-2 pl-12 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
        />
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        {/* Dropdown Toggle Button */}
        <button
          onClick={toggleDropdown}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading users...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              {error}
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
                          {formatRole(user.role)}
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
