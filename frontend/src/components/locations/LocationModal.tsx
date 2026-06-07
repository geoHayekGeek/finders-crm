'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Save } from 'lucide-react'
import { CalendarLocation } from '@/types/location'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { locationsApi } from '@/utils/api'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (location: CalendarLocation) => void
  location?: CalendarLocation
  title: string
}

export default function LocationModal({ isOpen, onClose, onSuccess, location, title }: LocationModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setFormData({
          name: location.name,
          description: location.description || '',
          is_active: location.is_active
        })
      } else {
        setFormData({
          name: '',
          description: '',
          is_active: true
        })
      }
      setError(null)
      setValidationErrors({})
    }
  }, [isOpen, location])

  const validateField = (fieldName: string, value: string) => {
    let errorMessage = ''

    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') {
          errorMessage = 'Location name is required'
        } else if (value.trim().length > 255) {
          errorMessage = 'Location name must be 255 characters or less'
        }
        break
      case 'description':
        if (value && value.length > 1000) {
          errorMessage = 'Description must be 1000 characters or less'
        }
        break
    }

    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }))
  }

  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    validateField('name', formData.name)
    validateField('description', formData.description)

    if (!formData.name.trim()) {
      showError('Please fill in all required fields before submitting')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const locationData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_active: formData.is_active
      }

      const response = location
        ? await locationsApi.update(location.id, locationData, token || undefined)
        : await locationsApi.create(locationData, token || undefined)

      if (response.success) {
        onSuccess(response.data)
        showSuccess(`Location ${location ? 'updated' : 'created'} successfully!`)
        onClose()
      } else {
        const errorMessage = response.message || `Failed to ${location ? 'update' : 'create'} location`
        setError(errorMessage)
        showError(errorMessage)
      }
    } catch (err) {
      console.error('Error saving location:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative z-[101] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-shrink-0 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-50">
                  <MapPin className="h-6 w-6 text-teal-600" />
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
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                    clearFieldError('name')
                  }}
                  onBlur={(e) => validateField('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    validationErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g. Downtown Office"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                    clearFieldError('description')
                  }}
                  onBlur={(e) => validateField('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    validationErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Optional notes about the location"
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active location
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Saving...' : 'Save Location'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:outline-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
