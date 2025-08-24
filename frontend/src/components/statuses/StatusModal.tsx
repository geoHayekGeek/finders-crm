'use client'

import { useState, useEffect } from 'react'
import { X, Circle, Save, Palette } from 'lucide-react'
import { Status } from '@/types/property'
import { useAuth } from '@/contexts/AuthContext'
import { statusesApi } from '@/utils/api'

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (status: Status) => void
  status?: Status
  title: string
}

// Predefined colors for quick selection
const PRESET_COLORS = [
  '#10B981', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F59E0B', // Yellow
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#F43F5E', // Rose
  '#6366F1', // Indigo
]

export default function StatusModal({ isOpen, onClose, onSuccess, status, title }: StatusModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#6B7280',
    is_active: true
  })

  // Reset form when modal opens/closes or status changes
  useEffect(() => {
    if (isOpen) {
      if (status) {
        setFormData({
          name: status.name,
          code: status.code,
          description: status.description || '',
          color: status.color || '#6B7280',
          is_active: status.is_active
        })
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          color: '#6B7280',
          is_active: true
        })
      }
      setError(null)
    }
  }, [isOpen, status])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleColorChange = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color: color
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and code are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const statusData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        is_active: formData.is_active
      }

      let response
      if (status) {
        // Update existing status
        response = await statusesApi.update(status.id, statusData, token)
      } else {
        // Create new status
        response = await statusesApi.create(statusData, token)
      }

      if (response.success) {
        onSuccess(response.data)
      } else {
        setError(response.message || `Failed to ${status ? 'update' : 'create'} status`)
      }
    } catch (err) {
      console.error('Error saving status:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 relative z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <Circle 
                    className="h-6 w-6" 
                    style={{ color: formData.color }}
                    fill={formData.color}
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Status Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter status name"
                  required
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Status Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter status code (e.g., ACTIVE, SOLD)"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <p className="text-xs text-gray-500 mt-1">Short code for this status (will be converted to uppercase)</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter status description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="inline h-4 w-4 mr-1" />
                  Color
                </label>
                
                {/* Color Picker Input */}
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>

                {/* Preset Colors */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 ${
                          formData.color === color 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.is_active ? 'Status is active and visible' : 'Status is inactive and hidden'}
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="is_active"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        formData.is_active ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Saving...' : (status ? 'Update Status' : 'Create Status')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
