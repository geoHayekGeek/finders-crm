'use client'

import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { Category } from '@/types/property'
import { useAuth } from '@/contexts/AuthContext'
import { categoriesApi } from '@/utils/api'

interface CategoryDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (categoryId: number) => void
  category: Category
}

export default function CategoryDeleteModal({ isOpen, onClose, onSuccess, category }: CategoryDeleteModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== category.name) {
      setError('Please type the category name exactly to confirm deletion')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await categoriesApi.delete(category.id, token)

      if (response.success) {
        onSuccess(category.id)
      } else {
        setError(response.message || 'Failed to delete category')
      }
    } catch (err) {
      console.error('Error deleting category:', err)
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
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Category</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This action cannot be undone. This will permanently delete the category and may affect 
                    properties that are currently assigned to this category.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Category to delete:</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{category.name}</p>
                <p className="text-sm text-gray-600">Code: {category.code}</p>
                {category.description && (
                  <p className="text-sm text-gray-600">Description: {category.description}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold">{category.name}</span> to confirm deletion:
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={category.name}
              />
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || confirmText !== category.name}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Deleting...' : 'Delete Category'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
    </div>
  )
}
