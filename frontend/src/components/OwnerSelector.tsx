'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, User, RefreshCw, UserCircle } from 'lucide-react'
import { leadsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'

interface Owner {
  id: number
  customer_name: string
  phone_number?: string
  date: string
  status?: string
}

interface OwnerSelectorProps {
  selectedOwnerId?: number
  selectedOwnerName?: string // Optional: display name while owner is being found in list
  onOwnerChange: (owner: Owner | undefined) => void
  placeholder?: string
}

export function OwnerSelector({ 
  selectedOwnerId, 
  selectedOwnerName,
  onOwnerChange, 
  placeholder = "Select an owner (lead)..."
}: OwnerSelectorProps) {
  const { token } = useAuth()
  const [owners, setOwners] = useState<Owner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch owners (leads) from database
  const fetchOwners = async () => {
    if (!token) {
      setError('No authentication token available')
      return
    }
    
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching leads/owners with token...')
      const data = await leadsApi.getAll(token)
      console.log('👥 Leads/Owners data:', data)
      
      if (data.success && data.data) {
        setOwners(data.data)
        console.log('✅ Owners loaded:', data.data.length)
      } else {
        setError(data.message || 'Failed to load owners')
      }
    } catch (error) {
      console.error('❌ Error fetching owners:', error)
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
    if (token) {
      fetchOwners()
    }
  }, [token])

  // Re-fetch owners when selectedOwnerId changes (if owners list is empty or owner not found)
  // This ensures the owner is found when the component receives a selectedOwnerId prop
  useEffect(() => {
    if (token && selectedOwnerId !== undefined && selectedOwnerId !== null) {
      // Check if owner exists with robust type matching
      const ownerExists = owners.find(o => {
        if (o.id === selectedOwnerId) return true
        if (o.id == selectedOwnerId) return true
        const ownerIdNum = Number(o.id)
        const selectedIdNum = Number(selectedOwnerId)
        return !isNaN(ownerIdNum) && !isNaN(selectedIdNum) && ownerIdNum === selectedIdNum
      })
      
      if (owners.length === 0 && !isLoading) {
        console.log('🔄 Re-fetching owners because selectedOwnerId is set but owners list is empty')
        fetchOwners()
      } else if (owners.length > 0 && !ownerExists && !isLoading) {
        console.log('🔄 Owner not found in current list, re-fetching owners...')
        console.log('🔍 Looking for owner ID:', selectedOwnerId, 'type:', typeof selectedOwnerId)
        console.log('📋 Current owner IDs:', owners.slice(0, 5).map(o => ({ id: o.id, type: typeof o.id })))
        fetchOwners()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOwnerId])

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

  const filteredOwners = owners.filter(owner => {
    const searchLower = searchTerm.toLowerCase()
    return (
      owner.customer_name.toLowerCase().includes(searchLower) ||
      (owner.phone_number && owner.phone_number.toLowerCase().includes(searchLower)) ||
      (owner.status && owner.status.toLowerCase().includes(searchLower))
    )
  })

  const handleOwnerSelect = (owner: Owner) => {
    onOwnerChange(owner)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearOwner = () => {
    onOwnerChange(undefined)
  }

  // Find selected owner with robust type matching
  const selectedOwner = owners.find(o => {
    // Try strict equality first
    if (o.id === selectedOwnerId) return true
    // Then try loose equality for type coercion
    if (o.id == selectedOwnerId) return true
    // Try converting both to numbers
    const ownerIdNum = Number(o.id)
    const selectedIdNum = Number(selectedOwnerId)
    if (!isNaN(ownerIdNum) && !isNaN(selectedIdNum) && ownerIdNum === selectedIdNum) return true
    return false
  })
  
  // Notify parent when owner is found after owners load (for cases where component mounts before owners load)
  useEffect(() => {
    if (selectedOwnerId !== undefined && selectedOwnerId !== null && owners.length > 0 && !selectedOwner) {
      const found = owners.find(o => {
        if (o.id === selectedOwnerId) return true
        if (o.id == selectedOwnerId) return true
        const ownerIdNum = Number(o.id)
        const selectedIdNum = Number(selectedOwnerId)
        return !isNaN(ownerIdNum) && !isNaN(selectedIdNum) && ownerIdNum === selectedIdNum
      })
      
      if (found) {
        console.log('✅ OwnerSelector - Owner found after owners loaded, notifying parent:', found.customer_name, 'ID:', found.id)
        // Don't call onOwnerChange here as it might cause infinite loops
        // The selectedOwner will be computed on next render
      } else {
        console.log('⚠️ OwnerSelector - Owner ID', selectedOwnerId, 'type:', typeof selectedOwnerId, 'not found in owners list')
        console.log('📋 OwnerSelector - Sample owner IDs:', owners.slice(0, 5).map(o => ({ id: o.id, type: typeof o.id, name: o.customer_name })))
      }
    } else if (selectedOwnerId !== undefined && selectedOwnerId !== null && owners.length > 0 && selectedOwner) {
      console.log('✅ OwnerSelector - Owner already found:', selectedOwner.customer_name, 'ID:', selectedOwner.id)
    }
  }, [owners, selectedOwnerId, selectedOwner])
  
  // Debug logging
  if (selectedOwnerId !== undefined && selectedOwnerId !== null) {
    console.log('🔍 OwnerSelector - selectedOwnerId:', selectedOwnerId, 'type:', typeof selectedOwnerId)
    console.log('🔍 OwnerSelector - owners length:', owners.length)
    console.log('🔍 OwnerSelector - selectedOwner:', selectedOwner ? `${selectedOwner.customer_name} (ID: ${selectedOwner.id}, type: ${typeof selectedOwner.id})` : 'not found')
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'contacted':
        return 'bg-blue-100 text-blue-700'
      case 'qualified':
        return 'bg-purple-100 text-purple-700'
      case 'converted':
        return 'bg-indigo-100 text-indigo-700'
      case 'closed':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Determine what to display - prefer selectedOwner from list, fallback to selectedOwnerName prop
  const displayOwner = selectedOwner || (selectedOwnerId && selectedOwnerName ? {
    id: selectedOwnerId,
    customer_name: selectedOwnerName,
    phone_number: undefined,
    date: '',
    status: undefined
  } : null)

  return (
    <div className="space-y-2">
      {/* Display selected owner */}
      {selectedOwnerId !== undefined && selectedOwnerId !== null && displayOwner && (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <UserCircle className="h-4 w-4 text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-indigo-800">
                {displayOwner.customer_name}
              </span>
              <div className="flex items-center gap-2">
                {displayOwner.phone_number && (
                  <span className="text-xs text-indigo-600">{displayOwner.phone_number}</span>
                )}
                {displayOwner.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(displayOwner.status)}`}>
                    {displayOwner.status}
                  </span>
                )}
                {!selectedOwner && selectedOwnerName && (
                  <span className="text-xs text-gray-500 italic">(Loading details...)</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearOwner}
            className="p-1 text-indigo-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear owner"
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
            className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
            disabled={isLoading}
          >
            <div className="flex items-center justify-between">
              <span className={displayOwner ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (displayOwner ? displayOwner.customer_name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchOwners}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh owners"
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
                placeholder="Search owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Owners list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  Loading owners...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredOwners.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No owners found matching your search' : 'No owners available'}
                </div>
              ) : (
                <div>
                  {filteredOwners.map(owner => (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => handleOwnerSelect(owner)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{owner.customer_name}</div>
                          {owner.phone_number && (
                            <div className="text-xs text-gray-600">{owner.phone_number}</div>
                          )}
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          {owner.status && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(owner.status)}`}>
                              {owner.status}
                            </span>
                          )}
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserCircle className="h-4 w-4 text-indigo-600" />
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

