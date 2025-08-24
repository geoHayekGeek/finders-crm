'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Tag,
  FileText
} from 'lucide-react'
import { Category } from '@/types/property'
import { categoriesApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import CategoryTable from '@/components/categories/CategoryTable'
import CategoryModal from '@/components/categories/CategoryModal'
import CategoryDeleteModal from '@/components/categories/CategoryDeleteModal'

export default function CategoriesPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { canManageProperties } = usePermissions()
  
  // State management
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // Load categories on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadCategories()
    }
  }, [isAuthenticated])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!isAuthenticated || !token) {
        setError('You must be logged in to view categories')
        return
      }
      
      // Use the admin API client to get all categories (active and inactive)
      const response = await categoriesApi.getAllForAdmin(token)
      
      if (response.success) {
        setCategories(response.data || [])
      } else {
        setError('Failed to load categories')
      }
      
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle category operations
  const handleAddCategory = () => {
    setSelectedCategory(null)
    setShowAddModal(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowEditModal(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowDeleteModal(true)
  }

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories(prev => [...prev, newCategory])
    setShowAddModal(false)
  }

  const handleCategoryUpdated = (updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => 
      cat.id === updatedCategory.id ? updatedCategory : cat
    ))
    setShowEditModal(false)
    setSelectedCategory(null)
  }

  const handleCategoryDeleted = (deletedCategoryId: number) => {
    setCategories(prev => prev.filter(cat => cat.id !== deletedCategoryId))
    setShowDeleteModal(false)
    setSelectedCategory(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Tag className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600">Manage property categories</p>
          </div>
        </div>
        
        {canManageProperties && (
          <button
            onClick={handleAddCategory}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.filter(cat => cat.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Search className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Filtered Results</p>
              <p className="text-2xl font-bold text-gray-900">{filteredCategories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading categories...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Categories</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadCategories}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by adding your first category'
              }
            </p>
            {canManageProperties && !searchTerm && (
              <button
                onClick={handleAddCategory}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Add Category
              </button>
            )}
          </div>
        ) : (
          <CategoryTable
            categories={filteredCategories}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            canManage={canManageProperties}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <CategoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCategoryCreated}
          title="Add Category"
        />
      )}

      {showEditModal && selectedCategory && (
        <CategoryModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleCategoryUpdated}
          category={selectedCategory}
          title="Edit Category"
        />
      )}

      {showDeleteModal && selectedCategory && (
        <CategoryDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleCategoryDeleted}
          category={selectedCategory}
        />
      )}
    </div>
  )
}
