'use client'

import { useState, useRef } from 'react'
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  Check, 
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Star,
  Eye,
  Edit,
  Upload,
  Plus
} from 'lucide-react'

import { Property, EditFormData } from '@/types/property'

interface PropertyModalsProps {
  showAddPropertyModal: boolean
  setShowAddPropertyModal: (show: boolean) => void
  showEditPropertyModal: boolean
  setShowEditPropertyModal: (show: boolean) => void
  showViewPropertyModal: boolean
  setShowViewPropertyModal: (show: boolean) => void
  showDeletePropertyModal: boolean
  setShowDeletePropertyModal: (show: boolean) => void
  showImportModal: boolean
  setShowImportModal: (show: boolean) => void
  showImageModal: boolean
  setShowImageModal: (show: boolean) => void
  editingProperty: Property | null
  viewingProperty: Property | null
  deletingProperty: Property | null
  deleteConfirmation: string
  setDeleteConfirmation: (confirmation: string) => void
  editFormData: EditFormData
  setEditFormData: (data: any) => void
  selectedImage: string
  allImages: string[]
  currentImageIndex: number
  onSaveEdit: () => void
  onConfirmDelete: () => void
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveGalleryImage: (index: number) => void
  onGoToPreviousImage: () => void
  onGoToNextImage: () => void
}

export function PropertyModals({
  showAddPropertyModal,
  setShowAddPropertyModal,
  showEditPropertyModal,
  setShowEditPropertyModal,
  showViewPropertyModal,
  setShowViewPropertyModal,
  showDeletePropertyModal,
  setShowDeletePropertyModal,
  showImportModal,
  setShowImportModal,
  showImageModal,
  setShowImageModal,
  editingProperty,
  viewingProperty,
  deletingProperty,
  deleteConfirmation,
  setDeleteConfirmation,
  editFormData,
  setEditFormData,
  selectedImage,
  allImages,
  currentImageIndex,
  onSaveEdit,
  onConfirmDelete,
  onImageUpload,
  onRemoveGalleryImage,
  onGoToPreviousImage,
  onGoToNextImage
}: PropertyModalsProps) {
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)
  
  // Local state for add property modal
  const [addFormData, setAddFormData] = useState({
    title: '',
    address: '',
    status: 'For Sale',
    type: 'Single Family',
    beds: '',
    baths: '',
    sqft: '',
    price: '',
    agent: '',
    featured: false,
    mainImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=150&fit=crop',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=150&fit=crop',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop'
    ]
  })

  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const galleryImageInputRef = useRef<HTMLInputElement>(null)
  const editMainImageInputRef = useRef<HTMLInputElement>(null)
  const editGalleryImageInputRef = useRef<HTMLInputElement>(null)

  // Handle main image upload for add property modal
  const handleMainImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAddFormData((prev: typeof addFormData) => ({
          ...prev,
          mainImage: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle gallery image upload for add property modal
  const handleGalleryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setAddFormData((prev: typeof addFormData) => ({
            ...prev,
            galleryImages: [...prev.galleryImages, e.target?.result as string]
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Handle main image upload for edit property modal
  const handleEditMainImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditFormData((prev: EditFormData) => ({
          ...prev,
          mainImage: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle gallery image upload for edit property modal
  const handleEditGalleryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setEditFormData((prev: EditFormData) => ({
            ...prev,
            galleryImages: [...prev.galleryImages, e.target?.result as string]
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={mainImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleMainImageUpload}
        className="hidden"
      />
      <input
        ref={galleryImageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryImageUpload}
        className="hidden"
      />
      <input
        ref={editMainImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleEditMainImageUpload}
        className="hidden"
      />
      <input
        ref={editGalleryImageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleEditGalleryImageUpload}
        className="hidden"
      />

      {/* Import Properties Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Import Properties</h3>
                  <p className="text-sm text-gray-500">Upload your property data file</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Drop your file here</h4>
                <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Choose File
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  Supports CSV, Excel (.xlsx, .xls) files up to 10MB
                </p>
              </div>

              {/* Import Options */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Import Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                        checked={skipDuplicates}
                        onChange={(e) => {
                          setSkipDuplicates(e.target.checked)
                          if (e.target.checked) {
                            setUpdateExisting(false)
                          }
                        }}
                        disabled={updateExisting}
                      />
                      <span className={`ml-2 text-sm ${updateExisting ? 'text-gray-400' : 'text-gray-700'}`}>
                        Skip duplicate properties
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                        checked={updateExisting}
                        onChange={(e) => {
                          setUpdateExisting(e.target.checked)
                          if (e.target.checked) {
                            setSkipDuplicates(false)
                          }
                        }}
                        disabled={skipDuplicates}
                      />
                      <span className={`ml-2 text-sm ${skipDuplicates ? 'text-gray-400' : 'text-gray-700'}`}>
                        Update existing properties
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        defaultChecked 
                      />
                      <span className="ml-2 text-sm text-gray-700">Send notification email</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Import Properties
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Add New Property</h3>
                  <p className="text-sm text-gray-500">Fill in the property details below</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPropertyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Property Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Property Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Title *</label>
                      <input
                        type="text"
                        value={addFormData.title}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Modern Downtown Apartment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input
                        type="text"
                        value={addFormData.address}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="e.g., 123 Main St, Downtown"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                      <select 
                        value={addFormData.type}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="Single Family">Single Family</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Condo">Condo</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select 
                        value={addFormData.status}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="For Sale">For Sale</option>
                        <option value="For Rent">For Rent</option>
                        <option value="Sold">Sold</option>
                        <option value="Rented">Rented</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={addFormData.price}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="450,000"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <input
                        type="text"
                        value={addFormData.agent}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, agent: e.target.value }))}
                        placeholder="e.g., Sarah Johnson"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <input
                        type="number"
                        value={addFormData.beds}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, beds: e.target.value }))}
                        placeholder="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <input
                        type="number"
                        value={addFormData.baths}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, baths: e.target.value }))}
                        placeholder="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <input
                        type="number"
                        value={addFormData.sqft}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, sqft: e.target.value }))}
                        placeholder="1200"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-4">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={addFormData.featured}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, featured: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured Property</span>
                    </label>
                  </div>
                </div>

                {/* Main Image Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300">
                      <img 
                        src={addFormData.mainImage}
                        alt="Main image"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Upload Button */}
                    <button
                      onClick={() => mainImageInputRef.current?.click()}
                      className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      title="Upload main image"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Image Gallery Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Additional images</span>
                    <button
                      onClick={() => galleryImageInputRef.current?.click()}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Images</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {addFormData.galleryImages.map((image, index) => (
                      <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                        <img 
                          src={image}
                          alt={`Gallery image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setAddFormData(prev => ({
                              ...prev,
                              galleryImages: prev.galleryImages.filter((_, i) => i !== index)
                            }))
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <div className="w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowAddPropertyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditPropertyModal && editingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Property</h3>
                  <p className="text-sm text-gray-500">Update property information and images</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditPropertyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Property Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Property Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Title *</label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                      <select 
                        value={editFormData.type}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="Single Family">Single Family</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Condo">Condo</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select 
                        value={editFormData.status}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="For Sale">For Sale</option>
                        <option value="For Rent">For Rent</option>
                        <option value="Sold">Sold</option>
                        <option value="Rented">Rented</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, price: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <input
                        type="text"
                        value={editFormData.agent}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, agent: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <input
                        type="number"
                        value={editFormData.beds}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, beds: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <input
                        type="number"
                        value={editFormData.baths}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, baths: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <input
                        type="number"
                        value={editFormData.sqft}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, sqft: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-4">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={editFormData.featured}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, featured: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured Property</span>
                    </label>
                  </div>
                </div>

                {/* Main Image Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300">
                      {editFormData.mainImage ? (
                        <img 
                          src={editFormData.mainImage} 
                          alt="Main property image" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => editMainImageInputRef.current?.click()}
                      className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      title="Edit main image"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Image Gallery Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Additional images</span>
                    <button
                      onClick={() => editGalleryImageInputRef.current?.click()}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Images</span>
                    </button>
                  </div>
                  
                  {editFormData.galleryImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {editFormData.galleryImages.map((image, index) => (
                        <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                          <img 
                            src={image} 
                            alt={`Gallery image ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => {
                              setEditFormData((prev: EditFormData) => ({
                                ...prev,
                                galleryImages: prev.galleryImages.filter((_, i) => i !== index)
                              }))
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <Camera className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-sm">No additional images</p>
                      <p className="text-xs text-gray-400">Click "Add Images" to upload more photos</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowEditPropertyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Property Modal */}
      {showViewPropertyModal && viewingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">View Property</h3>
                  <p className="text-sm text-gray-500">Property information and images</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewPropertyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Property Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Property Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Title</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.title}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.address}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.type}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          viewingProperty.status === 'For Sale' ? 'bg-blue-100 text-blue-800' :
                          viewingProperty.status === 'For Rent' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {viewingProperty.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-green-600 font-semibold">
                        {viewingProperty.price}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.agent}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.beds}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.baths}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.sqft}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          {viewingProperty.rating}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Featured Property:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingProperty.featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingProperty.featured ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Image Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-300">
                      {viewingProperty.image ? (
                        <img 
                          src={viewingProperty.image} 
                          alt="Main property image" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image Gallery Section */}
                {viewingProperty.images && viewingProperty.images.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {viewingProperty.images.map((image, index) => (
                        <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-colors">
                          <img 
                            src={image} 
                            alt={`Gallery image ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Gallery Images Message */}
                {(!viewingProperty.images || viewingProperty.images.length === 0) && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <Camera className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-sm">No additional images</p>
                      <p className="text-xs text-gray-400">This property doesn't have additional gallery images</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowViewPropertyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewPropertyModal(false)
                  // This would typically open the edit modal
                  // You might need to add a prop for this functionality
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
          <div className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-lg overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all z-10"
            >
              <X className="h-6 w-6 text-black" />
            </button>

            {/* Navigation Buttons */}
            {allImages.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={onGoToPreviousImage}
                  disabled={currentImageIndex === 0}
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${
                    currentImageIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                  }`}
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Next Button */}
                <button
                  onClick={onGoToNextImage}
                  disabled={currentImageIndex === allImages.length - 1}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${
                    currentImageIndex === allImages.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                  }`}
                  title="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}

            {/* Image Display */}
            <div className="w-full h-full max-h-[80vh] overflow-auto">
              <img 
                src={selectedImage} 
                alt="Full size image" 
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Modal */}
      {showDeletePropertyModal && deletingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Property</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeletePropertyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="h-8 w-8 text-red-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Are you sure?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    You are about to delete <span className="font-semibold text-gray-900">"{deletingProperty.title}"</span>.
                  </p>
                  <p className="text-sm text-gray-500">
                    This will permanently remove the property and all associated data.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-semibold text-gray-900">"{deletingProperty.title}"</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Enter property title to confirm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowDeletePropertyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDelete}
                disabled={deleteConfirmation !== deletingProperty.title}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
