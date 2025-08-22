'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Star, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { Property, Category, Status, EditFormData } from '@/types/property'
import { compressAndConvertToBase64, getRecommendedCompressionOptions } from '@/utils/imageCompression'

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
  onSaveAdd: (propertyData: any) => void
  categories: Category[]
  statuses: Status[]
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
  onGoToNextImage,
  onSaveAdd,
  categories,
  statuses
}: PropertyModalsProps) {
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [selectedImageState, setSelectedImageState] = useState<string>('')
  const [allImagesState, setAllImagesState] = useState<string[]>([])
  const [currentImageIndexState, setCurrentImageIndexState] = useState<number>(0)
  const [updateExisting, setUpdateExisting] = useState(false)
  
  // Local state for add property modal
  const [addFormData, setAddFormData] = useState({
    status_id: 0,
    location: '',
    category_id: 0,
    building_name: '',
    owner_name: '',
    phone_number: '',
    surface: '',
    details: '',
    interior_details: '',
    built_year: '',
    view_type: '',
    concierge: false,
    price: '',
    notes: '',
    referral_source: '',
    main_image: '',
    image_gallery: [] as string[]
  })

  // Debug useEffect to monitor main_image changes
  useEffect(() => {
    console.log('addFormData.main_image changed:', addFormData.main_image ? 'has image' : 'no image')
  }, [addFormData.main_image])
  
  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const galleryImageInputRef = useRef<HTMLInputElement>(null)
  const editMainImageInputRef = useRef<HTMLInputElement>(null)
  const editGalleryImageInputRef = useRef<HTMLInputElement>(null)

  // Handle main image upload for add property modal
  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleMainImageUpload called', event.target.files)
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.size, file.type)
      
      try {
        // Get recommended compression options based on file size
        const compressionOptions = getRecommendedCompressionOptions(file.size)
        console.log('Using compression options:', compressionOptions)
        
        // Compress and convert to base64
        const compressedBase64 = await compressAndConvertToBase64(file, compressionOptions)
        
        console.log('Image compressed and converted successfully')
        console.log('Compressed result length:', compressedBase64.length)
        console.log('Compressed result starts with:', compressedBase64.substring(0, 50))
        
        setAddFormData((prev) => ({
          ...prev,
          main_image: compressedBase64
        }))
        
        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing image:', error)
        alert('Error processing image. Please try again.')
      }
    }
  }

  // Handle gallery image upload for add property modal
  const handleGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      try {
        for (const file of Array.from(files)) {
          console.log('Processing gallery image:', file.name, file.size, file.type)
          
          // Get recommended compression options based on file size
          const compressionOptions = getRecommendedCompressionOptions(file.size)
          
          // Compress and convert to base64
          const compressedBase64 = await compressAndConvertToBase64(file, compressionOptions)
          
          setAddFormData((prev) => ({
            ...prev,
            image_gallery: [...prev.image_gallery, compressedBase64]
          }))
        }
        
        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing gallery images:', error)
        alert('Error processing gallery images. Please try again.')
      }
    }
  }

  // Remove image from gallery
  const removeGalleryImage = (index: number) => {
    setAddFormData((prev) => ({
      ...prev,
      image_gallery: prev.image_gallery.filter((_, i) => i !== index)
    }))
  }

  // Reset add form data
  const resetAddFormData = () => {
    setAddFormData({
      status_id: 0,
      location: '',
      category_id: 0,
      building_name: '',
      owner_name: '',
      phone_number: '',
      surface: '',
      details: '',
      interior_details: '',
      built_year: '',
      view_type: '',
      concierge: false,
      price: '',
      notes: '',
      referral_source: '',
      main_image: '',
      image_gallery: []
    })
  }

  // Handle main image upload for edit property modal
  const handleEditMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Get recommended compression options based on file size
        const compressionOptions = getRecommendedCompressionOptions(file.size)
        
        // Compress and convert to base64
        const compressedBase64 = await compressAndConvertToBase64(file, compressionOptions)
        
        setEditFormData((prev: EditFormData) => ({
          ...prev,
          main_image: compressedBase64
        }))
        
        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing edit image:', error)
        alert('Error processing image. Please try again.')
      }
    }
  }

  // Handle gallery image upload for edit property modal
  const handleEditGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      try {
        for (const file of Array.from(files)) {
          console.log('Processing edit gallery image:', file.name, file.size, file.type)
          
          // Get recommended compression options based on file size
          const compressionOptions = getRecommendedCompressionOptions(file.size)
          
          // Compress and convert to base64
          const compressedBase64 = await compressAndConvertToBase64(file, compressionOptions)
          
          setEditFormData((prev: EditFormData) => ({
            ...prev,
            image_gallery: [...(prev.image_gallery || []), compressedBase64]
          }))
        }
        
        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing edit gallery images:', error)
        alert('Error processing gallery images. Please try again.')
      }
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[101]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add New Property</h2>
              <button
                onClick={() => {
                  setShowAddPropertyModal(false)
                  resetAddFormData()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault()
                // Create property data object
                const propertyData = {
                  status_id: parseInt((document.getElementById('add-status') as HTMLSelectElement).value),
                  location: (document.getElementById('add-location') as HTMLInputElement).value,
                  category_id: parseInt((document.getElementById('add-category') as HTMLSelectElement).value),
                  building_name: (document.getElementById('add-building-name') as HTMLInputElement).value || undefined,
                  owner_name: (document.getElementById('add-owner-name') as HTMLInputElement).value,
                  phone_number: (document.getElementById('add-phone') as HTMLInputElement).value || undefined,
                  surface: parseFloat((document.getElementById('add-surface') as HTMLInputElement).value) || undefined,
                  details: (document.getElementById('add-details') as HTMLTextAreaElement).value || undefined,
                  interior_details: (document.getElementById('add-interior-details') as HTMLTextAreaElement).value || undefined,
                  built_year: parseInt((document.getElementById('add-built-year') as HTMLInputElement).value) || undefined,
                  view_type: (document.getElementById('add-view-type') as HTMLSelectElement).value || undefined,
                  concierge: (document.getElementById('add-concierge') as HTMLInputElement).checked,
                  price: parseFloat((document.getElementById('add-price') as HTMLInputElement).value) || undefined,
                  notes: (document.getElementById('add-notes') as HTMLTextAreaElement).value || undefined,
                  referral_source: (document.getElementById('add-referral-source') as HTMLInputElement).value || undefined,
                  referral_dates: [], // Will be implemented later
                  main_image: addFormData.main_image || undefined,
                  image_gallery: addFormData.image_gallery
                }
                onSaveAdd(propertyData)
                setShowAddPropertyModal(false)
                resetAddFormData()
              }}>
                
                {/* Main Image Section - Top of Modal */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
                   <div className="relative group">
                     <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                        {addFormData.main_image ? (
                          <div className="w-full h-full flex items-center justify-center relative z-300">
                            <img 
                              key={addFormData.main_image.substring(0, 100)} // Force re-render when image changes
                              src={addFormData.main_image} 
                              alt="Main property image" 
                              className="w-full h-full object-contain relative z-20"
                              onLoad={(event) => {
                                console.log('✅ Image loaded successfully')
                                console.log('Image dimensions:', (event.target as HTMLImageElement).naturalWidth, 'x', (event.target as HTMLImageElement).naturalHeight)
                              }}
                              onError={(e) => {
                                console.error('❌ Image failed to load:', e)
                                console.error('Image src:', addFormData.main_image)
                                console.error('Image src length:', addFormData.main_image.length)
                                // If image fails to load, show a fallback
                                setAddFormData((prev) => ({
                                  ...prev,
                                  main_image: ''
                                }))
                              }}
                            />
                          </div>
                        ) : (
                         <div className="w-full h-full flex items-center justify-center relative z-10">
                           <div className="text-center">
                             <Edit className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                             <p className="text-sm text-gray-600">Click to upload main image</p>
                             <p className="text-xs text-gray-400">Recommended: 16:9 aspect ratio</p>
                           </div>
                         </div>
                       )}
                       <div className="absolute inset-0 bg-black bg-opacity-0 opacity-0 group-hover:opacity-100 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center z-400">
                         <button
                           type="button"
                           onClick={() => {
                             console.log('Main image upload button clicked')
                             console.log('mainImageInputRef.current:', mainImageInputRef.current)
                             if (mainImageInputRef.current) {
                               mainImageInputRef.current.click()
                             } else {
                               console.error('mainImageInputRef.current is null')
                             }
                           }}
                           className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 p-2 rounded-full shadow-lg hover:bg-opacity-100"
                         >
                           <Edit className="h-5 w-5 text-gray-700" />
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>

                {/* Property Details Form */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select 
                        id="add-status"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Status</option>
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select 
                        id="add-category"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="add-location"
                        type="text"
                        required
                        placeholder="Enter property location"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
                      <input
                        id="add-building-name"
                        type="text"
                        placeholder="Enter building name (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Owner Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="add-owner-name"
                        type="text"
                        required
                        placeholder="Enter owner name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        id="add-phone"
                        type="tel"
                        placeholder="Enter phone number (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Surface Area (m²)</label>
                      <input
                        id="add-surface"
                        type="number"
                        step="0.01"
                        placeholder="Enter surface area"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Built Year</label>
                      <input
                        id="add-built-year"
                        type="number"
                        min="1800"
                        max={new Date().getFullYear()}
                        placeholder="Enter built year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="add-price"
                        type="number"
                        step="0.01"
                        required
                        placeholder="Enter price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
                      <select
                        id="add-view-type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select View Type</option>
                        <option value="open view">Open View</option>
                        <option value="sea view">Sea View</option>
                        <option value="mountain view">Mountain View</option>
                        <option value="no view">No View</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input 
                        id="add-concierge"
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Concierge Service</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                    <textarea
                      id="add-details"
                      rows={3}
                      placeholder="Enter property details (floor, balcony, parking, cave, etc.)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interior Details</label>
                    <textarea
                      id="add-interior-details"
                      rows={3}
                      placeholder="Enter interior details and features"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      id="add-notes"
                      rows={3}
                      placeholder="Enter additional notes about the property"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referral Source</label>
                    <input
                      id="add-referral-source"
                      type="text"
                      placeholder="Enter referral source (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Gallery</label>
                    <div className="space-y-4">
                      {/* Gallery Images Display */}
                      {addFormData.image_gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {addFormData.image_gallery.map((image, index) => (
                            <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
                              <img 
                                src={image} 
                                alt={`Gallery image ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Gallery Images Button */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group">
                        <div className="flex items-center justify-center space-x-2">
                          <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                            Add Gallery Images
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Click to add multiple images</p>
                        <input
                          ref={galleryImageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleGalleryImageUpload}
                        />
                        <button
                          type="button"
                          onClick={() => galleryImageInputRef.current?.click()}
                          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Choose Files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPropertyModal(false)
                      resetAddFormData()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Property
                  </button>
                </div>
              </form>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <input
                        type="text"
                        value={editFormData.reference_number || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, reference_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <select 
                        value={editFormData.category_id}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, category_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select 
                        value={editFormData.status_id}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, status_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Status</option>
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
                      <input
                        type="text"
                        value={editFormData.building_name || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, building_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name *</label>
                      <input
                        type="text"
                        value={editFormData.owner_name}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, owner_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={editFormData.phone_number || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, phone_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Surface Area (m²)</label>
                      <input
                        type="number"
                        value={editFormData.surface || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, surface: parseFloat(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Built Year</label>
                      <input
                        type="number"
                        value={editFormData.built_year || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, built_year: parseInt(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <input
                        type="number"
                        value={editFormData.price || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
                      <select
                        value={editFormData.view_type || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, view_type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select View Type</option>
                        <option value="open view">Open View</option>
                        <option value="sea view">Sea View</option>
                        <option value="mountain view">Mountain View</option>
                        <option value="no view">No View</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={editFormData.concierge}
                          onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, concierge: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Concierge Service</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Main Image Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300">
                      {editFormData.main_image ? (
                        <img 
                          src={editFormData.main_image} 
                          alt="Main property image" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {/* Camera icon for placeholder */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera h-12 w-12 text-gray-400"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => mainImageInputRef.current?.click()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 p-2 rounded-full shadow-lg hover:bg-opacity-100"
                        >
                          <Edit className="h-5 w-5 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {editFormData.image_gallery && editFormData.image_gallery.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {editFormData.image_gallery.map((image, index) => (
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
                                image_gallery: (prev.image_gallery || []).filter((_, i) => i !== index)
                              }))
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                  {/* Eye icon for view property */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye h-5 w-5 text-blue-600"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/></svg>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.reference_number}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.location}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.category_name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          viewingProperty.status_name === 'Active' ? 'bg-blue-100 text-blue-800' :
                          viewingProperty.status_name === 'Sold' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {viewingProperty.status_name}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-green-600 font-semibold">
                        {viewingProperty.price ? `$${viewingProperty.price.toLocaleString()}` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.agent_name || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Surface Area</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.surface ? `${viewingProperty.surface} m²` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Built Year</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.built_year || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewingProperty.view_type ? viewingProperty.view_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Concierge Service:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingProperty.concierge ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingProperty.concierge ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Image Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300">
                      {viewingProperty.main_image ? (
                        <img 
                          src={viewingProperty.main_image} 
                          alt="Main property image" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {/* Building icon for placeholder */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building-2 h-16 w-16 text-gray-400"><path d="M3 21v-6a9 9 0 0 1 9-9h3a9 9 0 0 1 9 9v6"/><path d="M7 10V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6"/><path d="M10 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/><path d="M10 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/></svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image Gallery Section */}
                {viewingProperty.image_gallery && viewingProperty.image_gallery.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {viewingProperty.image_gallery.map((image, index) => (
                        <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-colors">
                          <img 
                            src={image} 
                            alt={`Gallery image ${index + 1}`} 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              setSelectedImageState(image)
                              setAllImagesState(viewingProperty.image_gallery || [])
                              setCurrentImageIndexState(index)
                              setShowImageModal(true)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Gallery Images Message */}
                {(!viewingProperty.image_gallery || viewingProperty.image_gallery.length === 0) && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      {/* Camera icon for placeholder */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera h-8 w-8 text-gray-300 mb-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
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
            {allImagesState.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={onGoToPreviousImage}
                  disabled={currentImageIndexState === 0}
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${
                    currentImageIndexState === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                  }`}
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Next Button */}
                <button
                  onClick={onGoToNextImage}
                  disabled={currentImageIndexState === allImagesState.length - 1}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${
                    currentImageIndexState === allImagesState.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                  }`}
                  title="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndexState + 1} / {allImagesState.length}
                </div>
              </>
            )}

            {/* Image Display */}
            <div className="w-full h-full max-h-[80vh] overflow-auto">
              <img 
                src={selectedImageState} 
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
                    You are about to delete <span className="font-semibold text-gray-900">"{deletingProperty.reference_number}"</span>.
                  </p>
                  <p className="text-sm text-gray-500">
                    This will permanently remove the property and all associated data.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-semibold text-gray-900">"{deletingProperty.reference_number}"</span> to confirm
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
                disabled={deleteConfirmation !== deletingProperty.reference_number}
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
