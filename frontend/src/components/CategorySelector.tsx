'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Tag, RefreshCw } from 'lucide-react'
import { Category } from '@/types/property'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'

interface CategorySelectorProps {
  selectedCategoryId?: number
  onCategoryChange: (categoryId: number | undefined) => void
  placeholder?: string
  required?: boolean
}

export function CategorySelector({ 
  selectedCategoryId, 
  onCategoryChange, 
  placeholder = "Select a category...",
  required = false
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch categories from database
  const fetchCategories = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('🔍 Fetching categories...')
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('🏷️ Categories response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🏷️ Categories data:', data)
        if (data.success) {
          setCategories(data.data || data.categories || [])
          console.log('✅ Categories loaded:', data.data?.length || data.categories?.length || 0)
        } else {
          setError(data.message || 'Failed to load categories')
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
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

  const filteredCategories = categories.filter(category => {
    const searchLower = searchTerm.toLowerCase()
    return category.name.toLowerCase().includes(searchLower)
  })

  const handleCategorySelect = (categoryId: number) => {
    onCategoryChange(categoryId)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearCategory = () => {
    onCategoryChange(undefined)
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  return (
    <div className="space-y-2">
      {/* Display selected category */}
      {selectedCategoryId && selectedCategory && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Tag className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              {selectedCategory.name}
            </span>
            {selectedCategory.description && (
              <span className="text-xs text-purple-600">
                ({selectedCategory.description})
              </span>
            )}
          </div>
          {!required && (
            <button
              type="button"
              onClick={handleClearCategory}
              className="p-1 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear category"
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
              <span className={selectedCategory ? "text-gray-900" : "text-gray-600"}>
                {isLoading ? 'Loading...' : (selectedCategory ? selectedCategory.name : placeholder)}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={fetchCategories}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh categories"
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
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Categories list */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading categories...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No categories found matching your search' : 'No categories available'}
                </div>
              ) : (
                <div>
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-purple-600" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-gray-600">{category.description}</div>
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
