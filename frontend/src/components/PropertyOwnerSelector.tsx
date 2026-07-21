'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Phone, RefreshCw, UserCircle2, X } from 'lucide-react'
import { leadsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAgentRole, isTeamLeaderRole } from '@/utils/roleUtils'
import { LeadFilters } from '@/types/leads'

interface PropertyOwnerOption {
  id: number
  customer_name: string
  phone_number?: string
  date?: string
  lead_role?: string
}

interface PropertyOwnerSelectorProps {
  selectedOwnerId?: number
  selectedOwnerName?: string
  onOwnerChange: (owner: PropertyOwnerOption | undefined) => void
  onResolvedOwnerName?: (ownerName: string) => void
  placeholder?: string
}

const mapOwner = (owner: any): PropertyOwnerOption => ({
  id: owner.id,
  customer_name: owner.customer_name,
  phone_number: owner.phone_number,
  date: owner.date,
  lead_role: owner.lead_role,
})

export function PropertyOwnerSelector({
  selectedOwnerId,
  selectedOwnerName,
  onOwnerChange,
  onResolvedOwnerName,
  placeholder = 'Select an owner...'
}: PropertyOwnerSelectorProps) {
  const { token, user } = useAuth()
  const [owners, setOwners] = useState<PropertyOwnerOption[]>([])
  const [selectedOwnerDetails, setSelectedOwnerDetails] = useState<PropertyOwnerOption | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchOwners = useCallback(async (search = '') => {
    if (!token) {
      setError('No authentication token available')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const filters: LeadFilters = {
        lead_role: 'buyer',
        search: search || undefined,
      }

      if (isAgentRole(user?.role) && user?.id) {
        filters.agent_id = user.id
      } else if (isTeamLeaderRole(user?.role)) {
        filters.my_team = true
      }

      const response = await leadsApi.getWithFilters(filters, token, { page: 1, limit: 20 })
      if (response.success && Array.isArray(response.data)) {
        setOwners(response.data.map(mapOwner))
      } else {
        setError(response.message || 'Failed to load owners')
        setOwners([])
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown error occurred')
      setOwners([])
    } finally {
      setIsLoading(false)
    }
  }, [token, user?.id, user?.role])

  const fetchOwnerById = useCallback(async (ownerId: number) => {
    if (!token || !ownerId) {
      return
    }

    try {
      const response = await leadsApi.getById(ownerId, token)
      if (response.success && response.data) {
        const owner = mapOwner(response.data)
        setSelectedOwnerDetails(owner)
        onResolvedOwnerName?.(owner.customer_name)
      }
    } catch (requestError) {
      console.error('Error fetching selected owner:', requestError)
    }
  }, [token, onResolvedOwnerName])

  useEffect(() => {
    if (!token || !isDropdownOpen) {
      return
    }

    const timeout = setTimeout(() => {
      fetchOwners(searchTerm.trim())
    }, searchTerm.trim() ? 250 : 0)

    return () => clearTimeout(timeout)
  }, [fetchOwners, isDropdownOpen, searchTerm, token])

  useEffect(() => {
    if (!token) {
      setSelectedOwnerDetails(null)
      onResolvedOwnerName?.('')
      return
    }

    if (selectedOwnerId === undefined || selectedOwnerId === null || selectedOwnerId === 0) {
      setSelectedOwnerDetails(null)
      onResolvedOwnerName?.('')
      return
    }

    const ownerInList = owners.find((owner) => Number(owner.id) === Number(selectedOwnerId))
    if (ownerInList) {
      setSelectedOwnerDetails(ownerInList)
      onResolvedOwnerName?.(ownerInList.customer_name)
      return
    }

    if (selectedOwnerDetails?.id !== Number(selectedOwnerId)) {
      setSelectedOwnerDetails(null)
      fetchOwnerById(Number(selectedOwnerId))
    }
  }, [fetchOwnerById, onResolvedOwnerName, owners, selectedOwnerDetails?.id, selectedOwnerId, token])

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

  const filteredOwners = owners.filter((owner) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      owner.customer_name.toLowerCase().includes(searchLower) ||
      (owner.phone_number && owner.phone_number.toLowerCase().includes(searchLower))
    )
  })

  const handleOwnerSelect = (owner: PropertyOwnerOption) => {
    onOwnerChange(owner)
    setSelectedOwnerDetails(owner)
    onResolvedOwnerName?.(owner.customer_name)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearOwner = () => {
    onOwnerChange(undefined)
    setSelectedOwnerDetails(null)
    onResolvedOwnerName?.('')
  }

  const selectedOwner = owners.find((owner) => Number(owner.id) === Number(selectedOwnerId))
    || selectedOwnerDetails

  const displayOwner = selectedOwner || (
    selectedOwnerName &&
    selectedOwnerName !== 'Hidden' &&
    selectedOwnerName.trim() !== ''
      ? {
          id: selectedOwnerId || 0,
          customer_name: selectedOwnerName,
          phone_number: undefined,
          date: '',
          lead_role: undefined,
        }
      : null
  )

  return (
    <div className="space-y-2">
      {displayOwner && (selectedOwnerId !== undefined && selectedOwnerId !== null || selectedOwnerName) && (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <UserCircle2 className="h-4 w-4 text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-indigo-800">
                {displayOwner.customer_name}
              </span>
              <div className="flex items-center gap-2">
                {displayOwner.phone_number && (
                  <span className="text-xs text-indigo-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {displayOwner.phone_number}
                  </span>
                )}
                {!selectedOwner && selectedOwnerName && selectedOwnerId && (
                  <span className="text-xs text-gray-500 italic">(Loading details...)</span>
                )}
                {!selectedOwnerId && selectedOwnerName && (
                  <span className="text-xs text-yellow-600 italic">(Not linked to a lead)</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearOwner}
            className="p-1 text-indigo-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear owner filter"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
            disabled={isLoading}
          >
            <div className="flex items-center justify-between">
              <span className={displayOwner ? 'text-gray-900' : 'text-gray-600'}>
                {isLoading ? 'Loading...' : (displayOwner ? displayOwner.customer_name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => fetchOwners(searchTerm.trim())}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh owners"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2" />
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
                  {filteredOwners.map((owner) => (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => handleOwnerSelect(owner)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{owner.customer_name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {owner.phone_number && <span>{owner.phone_number}</span>}
                            {owner.date && <span>{owner.date}</span>}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          {owner.lead_role && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                              {owner.lead_role}
                            </span>
                          )}
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserCircle2 className="h-4 w-4 text-indigo-600" />
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
