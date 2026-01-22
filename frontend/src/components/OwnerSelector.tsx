'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, User, RefreshCw, UserCircle, Plus, Phone, Globe, Tag, Users } from 'lucide-react'
import { leadsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ReferenceSourceSelector } from './ReferenceSourceSelector'

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
  const { showSuccess, showError } = useToast()
  const [owners, setOwners] = useState<Owner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Quick add form state
  const [quickAddForm, setQuickAddForm] = useState({
    customer_name: '',
    phone_number: '',
    reference_source_id: undefined as number | undefined
  })
  
  // Validation errors for quick add form
  const [quickAddErrors, setQuickAddErrors] = useState({
    customer_name: '',
    phone_number: '',
    reference_source_id: ''
  })

  // Fetch owners (leads) from database
  const fetchOwners = async () => {
    if (!token) {
      setError('No authentication token available')
      return
    }
    
    setIsLoading(true)
    setError('')
    try {
      const data = await leadsApi.getAll(token)
      
      if (data.success && data.data) {
        setOwners(data.data)
      } else {
        setError(data.message || 'Failed to load owners')
      }
    } catch (error) {
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
        fetchOwners()
      } else if (owners.length > 0 && !ownerExists && !isLoading) {
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
  
  // Quick add modal handlers
  const handleOpenQuickAdd = () => {
    setQuickAddForm({
      customer_name: '',
      phone_number: '',
      reference_source_id: undefined
    })
    setQuickAddErrors({
      customer_name: '',
      phone_number: '',
      reference_source_id: ''
    })
    setShowQuickAddModal(true)
  }
  
  const handleCloseQuickAdd = () => {
    setShowQuickAddModal(false)
    setQuickAddForm({
      customer_name: '',
      phone_number: '',
      reference_source_id: undefined
    })
    setQuickAddErrors({
      customer_name: '',
      phone_number: '',
      reference_source_id: ''
    })
  }
  
  const validateQuickAddForm = () => {
    const errors = {
      customer_name: '',
      phone_number: '',
      reference_source_id: ''
    }
    
    let isValid = true
    
    if (!quickAddForm.customer_name.trim()) {
      errors.customer_name = 'Customer name is required'
      isValid = false
    }
    
    if (!quickAddForm.phone_number.trim()) {
      errors.phone_number = 'Phone number is required'
      isValid = false
    }
    
    if (!quickAddForm.reference_source_id) {
      errors.reference_source_id = 'Reference source is required'
      isValid = false
    }
    
    setQuickAddErrors(errors)
    return isValid
  }
  
  const handleQuickAddSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    // Prevent default and stop propagation if event exists (for form submission)
    if (e) {
      e.preventDefault()
      e.stopPropagation()
      
      // Also stop immediate propagation
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation()
      }
    }
    
    if (!validateQuickAddForm()) {
      return
    }
    
    if (!token) {
      showError('Authentication required')
      return
    }
    
    setIsCreatingLead(true)
    
    try {
      // Prepare lead data with smart defaults
      const today = new Date().toISOString().split('T')[0]
      const leadData = {
        customer_name: quickAddForm.customer_name.trim(),
        phone_number: quickAddForm.phone_number.trim(),
        reference_source_id: quickAddForm.reference_source_id,
        date: today,
        status: 'Active', // Default status
        referrals: [
          {
            name: 'Property Owner',
            type: 'custom' as const,
            date: today
          }
        ]
      }
      
      // Create the lead
      const response = await leadsApi.create(leadData, token)
      
      if (response.success && response.data) {
        showSuccess('Owner added successfully!')
        
        // Refresh the owners list
        await fetchOwners()
        
        // Auto-select the newly created lead
        const newLead = {
          id: response.data.id,
          customer_name: response.data.customer_name,
          phone_number: response.data.phone_number,
          date: response.data.date,
          status: response.data.status
        }
        onOwnerChange(newLead)
        
        // Close the modal
        handleCloseQuickAdd()
      } else {
        showError(response.message || 'Failed to create owner')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create owner')
    } finally {
      setIsCreatingLead(false)
    }
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
      
      // Don't call onOwnerChange here as it might cause infinite loops
      // The selectedOwner will be computed on next render
    }
  }, [owners, selectedOwnerId, selectedOwner])

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
  // If owner_name is 'Hidden', don't use it - let the component find the owner by ID from the list
  // Also handle case where owner_name exists but owner_id is null (legacy data)
  const displayOwner = selectedOwner || (
    selectedOwnerName && 
    selectedOwnerName !== 'Hidden' && 
    selectedOwnerName.trim() !== '' ? {
      id: selectedOwnerId || 0, // Use 0 as placeholder if owner_id is null
      customer_name: selectedOwnerName,
      phone_number: undefined,
      date: '',
      status: undefined
    } : null
  )
  
  // Debug: Log owner selection state (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OwnerSelector] Owner selection state:', {
        selectedOwnerId,
        selectedOwnerName,
        ownersCount: owners.length,
        foundInList: !!selectedOwner,
        displayOwner: displayOwner ? { id: displayOwner.id, name: displayOwner.customer_name } : null
      })
    }
  }, [selectedOwnerId, selectedOwnerName, owners.length, selectedOwner, displayOwner])

  return (
    <div className="space-y-2">
      {/* Display selected owner - show if we have owner_id OR owner_name (for legacy data) */}
      {displayOwner && (selectedOwnerId !== undefined && selectedOwnerId !== null || selectedOwnerName) && (
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
                {!selectedOwner && selectedOwnerName && selectedOwnerId && (
                  <span className="text-xs text-gray-500 italic">(Loading details...)</span>
                )}
                {!selectedOwnerId && selectedOwnerName && (
                  <span className="text-xs text-yellow-600 italic">(Not linked to lead - please select a lead)</span>
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
            onClick={handleOpenQuickAdd}
            className="p-3 text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300 rounded-lg transition-colors"
            title="Add new owner"
          >
            <Plus className="h-4 w-4" />
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
      
      {/* Quick Add Lead Modal */}
      {showQuickAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            // Only close if clicking the overlay, not the modal content
            if (e.target === e.currentTarget && !isCreatingLead) {
              handleCloseQuickAdd()
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => {
              e.stopPropagation()
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Add New Owner</h2>
                  <p className="text-sm text-gray-600 mt-1">Quickly add a property owner (lead)</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseQuickAdd}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isCreatingLead}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Quick Add Form - Using div instead of form to avoid nested form issue */}
              <div 
                className="space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quickAddForm.customer_name}
                    onChange={(e) => {
                      setQuickAddForm({ ...quickAddForm, customer_name: e.target.value })
                      if (quickAddErrors.customer_name) {
                        setQuickAddErrors({ ...quickAddErrors, customer_name: '' })
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        handleQuickAddSubmit()
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      quickAddErrors.customer_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter customer name"
                    disabled={isCreatingLead}
                  />
                  {quickAddErrors.customer_name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {quickAddErrors.customer_name}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={quickAddForm.phone_number}
                    onChange={(e) => {
                      setQuickAddForm({ ...quickAddForm, phone_number: e.target.value })
                      if (quickAddErrors.phone_number) {
                        setQuickAddErrors({ ...quickAddErrors, phone_number: '' })
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        handleQuickAddSubmit()
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      quickAddErrors.phone_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                    disabled={isCreatingLead}
                  />
                  {quickAddErrors.phone_number && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {quickAddErrors.phone_number}
                    </p>
                  )}
                </div>

                {/* Reference Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Reference Source <span className="text-red-500">*</span>
                  </label>
                  <ReferenceSourceSelector
                    selectedReferenceSourceId={quickAddForm.reference_source_id}
                    onReferenceSourceChange={(sourceId) => {
                      setQuickAddForm({ ...quickAddForm, reference_source_id: sourceId })
                      if (quickAddErrors.reference_source_id) {
                        setQuickAddErrors({ ...quickAddErrors, reference_source_id: '' })
                      }
                    }}
                    placeholder="Select a reference source..."
                  />
                  {quickAddErrors.reference_source_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {quickAddErrors.reference_source_id}
                    </p>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800">
                        <strong>Auto-filled:</strong> Date (today), Status (Active), and a default referral will be added automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseQuickAdd}
                    disabled={isCreatingLead}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingLead}
                    onClick={(e) => {
                      // Prevent any click event from bubbling
                      e.preventDefault()
                      e.stopPropagation()
                      // Manually trigger form submission
                      const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.FormEvent<HTMLFormElement>
                      handleQuickAddSubmit(fakeEvent)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingLead ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Owner
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

