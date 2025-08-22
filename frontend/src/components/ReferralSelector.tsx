'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, User, Calendar, ChevronDown } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface ReferralItem {
  source: string
  date: string
  isCustom: boolean // true if it's a custom name, false if it's a selected user
}

interface ReferralSelectorProps {
  referrals: ReferralItem[]
  onReferralsChange: (referrals: ReferralItem[]) => void
  placeholder?: string
}

export function ReferralSelector({ 
  referrals, 
  onReferralsChange, 
  placeholder = "Click to add referral sources..."
}: ReferralSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/users/all')
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
        setIsDropdownOpen(false)
        setShowCustomInput(false)
        setSearchTerm('')
        setCustomName('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus custom input when it becomes visible
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [showCustomInput])

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    ) && !referrals.some(referral => referral.source === user.name)
  })

  const handleUserSelect = (user: User) => {
    const newReferral: ReferralItem = {
      source: user.name,
      date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      isCustom: false
    }
    onReferralsChange([...referrals, newReferral])
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleCustomNameAdd = () => {
    if (customName.trim() && !referrals.some(referral => referral.source === customName.trim())) {
      const newReferral: ReferralItem = {
        source: customName.trim(),
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        isCustom: true
      }
      onReferralsChange([...referrals, newReferral])
      setCustomName('')
      setShowCustomInput(false)
      setIsDropdownOpen(false)
    }
  }

  const handleReferralRemove = (index: number) => {
    onReferralsChange(referrals.filter((_, i) => i !== index))
  }

  const handleDateChange = (index: number, newDate: string) => {
    const updatedReferrals = referrals.map((referral, i) => 
      i === index ? { ...referral, date: newDate } : referral
    )
    onReferralsChange(updatedReferrals)
  }

  const handleCustomNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomNameAdd()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomName('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Display existing referrals */}
      {referrals.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Selected Referrals</label>
          {referrals.map((referral, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {referral.source}
                  </span>
                  {referral.isCustom && (
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <input
                    type="date"
                    value={referral.date}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    className="text-sm border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => handleReferralRemove(index)}
                className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove referral"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add referral section */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {referrals.length === 0 ? 'Referral Source' : 'Add Another Referral'}
        </label>
        
        {/* Main trigger button */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {placeholder}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Custom name input */}
            {showCustomInput && (
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    ref={customInputRef}
                    type="text"
                    placeholder="Enter custom referral name..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={handleCustomNameKeyPress}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCustomNameAdd}
                    disabled={!customName.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomName('')
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add custom name button */}
            {!showCustomInput && (
              <div className="p-3 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add custom referral name</span>
                </button>
              </div>
            )}

            {/* Users list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading users...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No users found matching your search' : 'No users available'}
                </div>
              ) : (
                <div>
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-600">{user.email}</div>
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full mt-1">
                            {user.role}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
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
