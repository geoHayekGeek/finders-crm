'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Flag, RefreshCw } from 'lucide-react'
import { LeadStatusOption } from '@/types/leads'
import { leadStatusesApi } from '@/utils/api'

interface StatusSelectorProps {
  selectedStatus: string
  onStatusChange: (status: string) => void
  placeholder?: string
}

export function StatusSelector({ 
  selectedStatus, 
  onStatusChange, 
  placeholder = "Select a status..."
}: StatusSelectorProps) {
  const [statuses, setStatuses] = useState<LeadStatusOption[]>([])
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
      console.log('🔍 Fetching lead statuses...')
      const data = await leadStatusesApi.getAll()
      console.log('🏳️ Lead statuses data:', data)
      
      if (data.success) {
        setStatuses(data.data || [])
        console.log('✅ Lead statuses loaded:', data.data?.length || 0)
      } else {
        setError(data.message || 'Failed to load lead statuses')
      }
    } catch (error) {
      console.error('❌ Error fetching lead statuses:', error)
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
    return status.status_name.toLowerCase().includes(searchLower)
  })

  const handleStatusSelect = (status: string) => {
    onStatusChange(status)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearStatus = () => {
    onStatusChange('')
  }

  const selectedStatusObj = statuses.find(s => s.status_name.toLowerCase() === selectedStatus.toLowerCase())

  const getStatusColor = (statusName: string) => {
    const colors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-700',
      'contacted': 'bg-blue-100 text-blue-700',
      'qualified': 'bg-purple-100 text-purple-700',
      'converted': 'bg-emerald-100 text-emerald-700',
      'closed': 'bg-gray-100 text-gray-700'
    }
    
    return colors[statusName.toLowerCase()] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-2">
      {/* Display selected status */}
      {selectedStatus && selectedStatusObj && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Flag className="h-4 w-4 text-blue-600" />
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(selectedStatusObj.status_name)}`}>
              {selectedStatusObj.status_name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearStatus}
            className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear status"
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
              <span className={selectedStatusObj ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedStatusObj ? selectedStatusObj.status_name : placeholder)}
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
                      onClick={() => handleStatusSelect(status.status_name)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Flag className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status.status_name)}`}>
                            {status.status_name}
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