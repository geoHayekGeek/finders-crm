'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Flag, RefreshCw } from 'lucide-react'
import { Status } from '@/types/property'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'

interface PropertyStatusSelectorProps {
  selectedStatusId?: number
  onStatusChange: (statusId: number | undefined) => void
  placeholder?: string
  required?: boolean
}

export function PropertyStatusSelector({ 
  selectedStatusId, 
  onStatusChange, 
  placeholder = "Select a status...",
  required = false
}: PropertyStatusSelectorProps) {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch statuses from database
  const fetchStatuses = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching statuses...')
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/statuses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('🏳️ Statuses response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🏳️ Statuses data:', data)
        if (data.success) {
          setStatuses(data.data || data.statuses || [])
          console.log('✅ Statuses loaded:', data.data?.length || data.statuses?.length || 0)
        } else {
          setError(data.message || 'Failed to load statuses')
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Error fetching statuses:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
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

  const filteredStatuses = statuses.filter(status => {
    const searchLower = searchTerm.toLowerCase()
    return status.name.toLowerCase().includes(searchLower)
  })

  const handleStatusSelect = (statusId: number) => {
    onStatusChange(statusId)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearStatus = () => {
    onStatusChange(undefined)
  }

  const selectedStatus = statuses.find(s => s.id === selectedStatusId)

  const getStatusColor = (color?: string) => {
    if (!color) return 'bg-gray-100 text-gray-700'
    
    const colorMap: { [key: string]: string } = {
      'green': 'bg-green-100 text-green-700',
      'blue': 'bg-blue-100 text-blue-700',
      'red': 'bg-red-100 text-red-700',
      'yellow': 'bg-yellow-100 text-yellow-700',
      'purple': 'bg-purple-100 text-purple-700',
      'indigo': 'bg-indigo-100 text-indigo-700',
      'pink': 'bg-pink-100 text-pink-700',
      'gray': 'bg-gray-100 text-gray-700'
    }
    
    return colorMap[color.toLowerCase()] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-2">
      {/* Display selected status */}
      {selectedStatusId && selectedStatus && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Flag className="h-4 w-4 text-green-600" />
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(selectedStatus.color)}`}>
              {selectedStatus.name}
            </span>
            {selectedStatus.description && (
              <span className="text-xs text-green-600">
                ({selectedStatus.description})
              </span>
            )}
          </div>
          {!required && (
            <button
              type="button"
              onClick={handleClearStatus}
              className="p-1 text-green-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear status"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
              <span className={selectedStatus ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedStatus ? selectedStatus.name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchStatuses}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh statuses"
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
                placeholder="Search statuses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Statuses list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading statuses...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredStatuses.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No statuses found matching your search' : 'No statuses available'}
                </div>
              ) : (
                <div>
                  {filteredStatuses.map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => handleStatusSelect(status.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Flag className="h-4 w-4 text-green-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status.color)}`}>
                              {status.name}
                            </span>
                          </div>
                          {status.description && (
                            <div className="text-xs text-gray-600 mt-1">{status.description}</div>
                          )}
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
