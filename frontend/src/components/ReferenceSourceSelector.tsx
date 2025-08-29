'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Globe, RefreshCw } from 'lucide-react'
import { ReferenceSource } from '@/types/leads'

interface ReferenceSourceSelectorProps {
  selectedReferenceSourceId?: number
  onReferenceSourceChange: (sourceId: number | undefined) => void
  placeholder?: string
}

export function ReferenceSourceSelector({ 
  selectedReferenceSourceId, 
  onReferenceSourceChange, 
  placeholder = "Select a reference source..."
}: ReferenceSourceSelectorProps) {
  const [referenceSources, setReferenceSources] = useState<ReferenceSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch reference sources from database
  const fetchReferenceSources = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching reference sources...')
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leads/reference-sources', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('🌐 Reference sources response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🌐 Reference sources data:', data)
        if (data.success) {
          setReferenceSources(data.data)
          console.log('✅ Reference sources loaded:', data.data.length)
        } else {
          setError(data.message || 'Failed to load reference sources')
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Error fetching reference sources:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReferenceSources()
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

  const filteredSources = referenceSources.filter(source => {
    const searchLower = searchTerm.toLowerCase()
    return source.source_name.toLowerCase().includes(searchLower)
  })

  const handleSourceSelect = (sourceId: number) => {
    onReferenceSourceChange(sourceId)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearSource = () => {
    onReferenceSourceChange(undefined)
  }

  const selectedSource = referenceSources.find(s => s.id === selectedReferenceSourceId)

  return (
    <div className="space-y-2">
      {/* Display selected source */}
      {selectedReferenceSourceId && selectedSource && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {selectedSource.source_name}
            </span>
          </div>
          <button
            onClick={handleClearSource}
            className="p-1 text-green-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear reference source"
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
              <span className={selectedSource ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedSource ? selectedSource.source_name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchReferenceSources}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh reference sources"
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
                placeholder="Search reference sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Sources list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading reference sources...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No reference sources found matching your search' : 'No reference sources available'}
                </div>
              ) : (
                <div>
                  {filteredSources.map(source => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => handleSourceSelect(source.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900 text-sm">{source.source_name}</span>
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
