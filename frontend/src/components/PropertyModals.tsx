'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Star, ChevronLeft, ChevronRight, Upload, RefreshCw, Building2 } from 'lucide-react'
import { Property, Category, Status, EditFormData } from '@/types/property'
import { compressAndConvertToBase64, getRecommendedCompressionOptions } from '@/utils/imageCompression'
import { uploadMainPropertyImage, uploadGalleryImages, validateImageFile, validateImageFiles, createImagePreview, getFullImageUrl } from '@/utils/imageUpload'
import { ReferralSelector } from './ReferralSelector'

interface ReferralItem {
  source: string
  date: string
  isCustom: boolean
}

interface Agent {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
  user_code?: string
}

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
  onSaveAdd: (propertyData: any) => Promise<any>
  categories: Category[]
  statuses: Status[]
  onRefreshCategories?: () => void
  onRefreshStatuses?: () => void
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
  statuses,
  onRefreshCategories,
  onRefreshStatuses
}: PropertyModalsProps) {
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [selectedImageState, setSelectedImageState] = useState<string>('')
  const [allImagesState, setAllImagesState] = useState<string[]>([])
  const [currentImageIndexState, setCurrentImageIndexState] = useState<number>(0)
  const [updateExisting, setUpdateExisting] = useState(false)

  // State for agents
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentsError, setAgentsError] = useState('')

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
    agent_id: 0, // Add agent_id field
    price: '',
    notes: '',
    referral_source: '',
    referrals: [] as ReferralItem[],
    main_image: '',
    main_image_file: null as File | null, // New: File object for upload
    main_image_preview: '', // New: Preview URL for display
    image_gallery: [] as string[],
    gallery_files: [] as File[], // New: File objects for upload
    gallery_previews: [] as string[] // New: Preview URLs for display
  })

  // Debug useEffect to monitor main_image changes
  useEffect(() => {
    console.log('addFormData.main_image changed:', addFormData.main_image ? 'has image' : 'no image')
  }, [addFormData.main_image])

  // Fetch agents when the add property modal or edit modal opens
  useEffect(() => {
    if (showAddPropertyModal || showEditPropertyModal) {
      fetchAgents()
    }
  }, [showAddPropertyModal, showEditPropertyModal])

  // Fetch complete property details from backend when editing property changes
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (editingProperty && showEditPropertyModal) {
        try {
          console.log('🔧 Fetching complete property details for ID:', editingProperty.id)
          
          // Make API call to get complete property details
          const response = await fetch(`http://localhost:10000/api/properties/${editingProperty.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const result = await response.json()
          
          if (result.success && result.data) {
            const propertyData = result.data
            console.log('✅ Property details fetched from backend:', propertyData)
            console.log('🔍 Details field value:', propertyData.details)
            console.log('🔍 Referral dates value:', propertyData.referral_dates)
            
            const formData = {
              reference_number: propertyData.reference_number || '',
              status_id: propertyData.status_id || 0,
              location: propertyData.location || '',
              category_id: propertyData.category_id || 0,
              building_name: propertyData.building_name || '',
              owner_name: propertyData.owner_name || '',
              phone_number: propertyData.phone_number || '',
              surface: propertyData.surface,
              details: typeof propertyData.details === 'string' ? propertyData.details : (propertyData.details ? JSON.stringify(propertyData.details, null, 2) : ''),
              interior_details: propertyData.interior_details || '',
              built_year: propertyData.built_year,
              view_type: propertyData.view_type,
              concierge: propertyData.concierge || false,
              agent_id: propertyData.agent_id,
              price: propertyData.price,
              notes: propertyData.notes || '',
              referral_source: propertyData.referral_source || '',
              referral_dates: (propertyData.referral_dates || []).map((date: string) => {
                // Convert ISO date to YYYY-MM-DD format for the form
                if (typeof date === 'string' && date.includes('T')) {
                  return date.split('T')[0]
                }
                return date
              }),
              main_image: propertyData.main_image || '',
              image_gallery: propertyData.image_gallery || []
            }
            
            console.log('🎯 Setting editFormData:', formData)
            setEditFormData(formData)
          } else {
            console.error('❌ Failed to fetch property details:', result.message)
            // Fallback to existing property data
            setEditFormData({
              reference_number: editingProperty.reference_number || '',
              status_id: editingProperty.status_id || 0,
              location: editingProperty.location || '',
              category_id: editingProperty.category_id || 0,
              building_name: editingProperty.building_name || '',
              owner_name: editingProperty.owner_name || '',
              phone_number: editingProperty.phone_number || '',
              surface: editingProperty.surface,
              details: typeof editingProperty.details === 'string' ? editingProperty.details : (editingProperty.details ? JSON.stringify(editingProperty.details, null, 2) : ''),
              interior_details: editingProperty.interior_details || '',
              built_year: editingProperty.built_year,
              view_type: editingProperty.view_type,
              concierge: editingProperty.concierge || false,
              agent_id: editingProperty.agent_id,
              price: editingProperty.price,
              notes: editingProperty.notes || '',
              referral_source: editingProperty.referral_source || '',
              referral_dates: (editingProperty.referral_dates || []).map((date: string) => {
                // Convert ISO date to YYYY-MM-DD format for the form
                if (typeof date === 'string' && date.includes('T')) {
                  return date.split('T')[0]
                }
                return date
              }),
              main_image: editingProperty.main_image || '',
              image_gallery: editingProperty.image_gallery || []
            })
          }
        } catch (error) {
          console.error('❌ Error fetching property details:', error)
          // Fallback to existing property data
          setEditFormData({
            reference_number: editingProperty.reference_number || '',
            status_id: editingProperty.status_id || 0,
            location: editingProperty.location || '',
            category_id: editingProperty.category_id || 0,
            building_name: editingProperty.building_name || '',
            owner_name: editingProperty.owner_name || '',
            phone_number: editingProperty.phone_number || '',
            surface: editingProperty.surface,
            details: typeof editingProperty.details === 'string' ? editingProperty.details : (editingProperty.details ? JSON.stringify(editingProperty.details, null, 2) : ''),
            interior_details: editingProperty.interior_details || '',
            built_year: editingProperty.built_year,
            view_type: editingProperty.view_type,
            concierge: editingProperty.concierge || false,
            agent_id: editingProperty.agent_id,
            price: editingProperty.price,
            notes: editingProperty.notes || '',
            referral_source: editingProperty.referral_source || '',
            referral_dates: (editingProperty.referral_dates || []).map(date => {
              // Convert ISO date to YYYY-MM-DD format for the form
              if (typeof date === 'string' && date.includes('T')) {
                return date.split('T')[0]
              }
              return date
            }),
            main_image: editingProperty.main_image || '',
            image_gallery: editingProperty.image_gallery || []
          })
        }
      }
    }

    fetchPropertyDetails()
  }, [editingProperty, showEditPropertyModal, setEditFormData])

  // Fetch complete property details for view modal as well
  const [viewPropertyData, setViewPropertyData] = useState<Property | null>(null)
  
  useEffect(() => {
    const fetchViewPropertyDetails = async () => {
      if (viewingProperty && showViewPropertyModal) {
        try {
          console.log('👁️ Fetching complete property details for viewing ID:', viewingProperty.id)
          
          // Make API call to get complete property details
          const response = await fetch(`http://localhost:10000/api/properties/${viewingProperty.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const result = await response.json()
          
          if (result.success && result.data) {
            console.log('✅ View property details fetched from backend:', result.data)
            setViewPropertyData(result.data)
          } else {
            console.error('❌ Failed to fetch view property details:', result.message)
            setViewPropertyData(viewingProperty) // Fallback to existing data
          }
        } catch (error) {
          console.error('❌ Error fetching view property details:', error)
          setViewPropertyData(viewingProperty) // Fallback to existing data
        }
      } else {
        setViewPropertyData(null)
      }
    }

    fetchViewPropertyDetails()
  }, [viewingProperty, showViewPropertyModal])

  // Function to fetch agents
  const fetchAgents = async () => {
    setAgentsLoading(true)
    setAgentsError('')
    try {
      const response = await fetch('http://localhost:10000/api/users/agents')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAgents(data.agents)
        } else {
          setAgentsError('Failed to fetch agents')
        }
      } else {
        setAgentsError('Failed to fetch agents')
      }
    } catch (err) {
      setAgentsError('Failed to fetch agents')
      console.error('Error fetching agents:', err)
    } finally {
      setAgentsLoading(false)
    }
  }

  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const galleryImageInputRef = useRef<HTMLInputElement>(null)
  const editMainImageInputRef = useRef<HTMLInputElement>(null)
  const editGalleryImageInputRef = useRef<HTMLInputElement>(null)

  // Handle main image upload for add property modal (NEW FILE-BASED APPROACH)
  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleMainImageUpload called', event.target.files)
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.size, file.type)

      try {
        // Validate the file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          alert(validation.error)
          return
        }

        // Create preview URL
        const previewUrl = await createImagePreview(file)

        console.log('Image preview created successfully')

        setAddFormData((prev) => ({
          ...prev,
          main_image_file: file,
          main_image_preview: previewUrl,
          main_image: '' // Clear old Base64 data
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

  // Handle gallery image upload for add property modal (NEW FILE-BASED APPROACH)
  const handleGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      try {
        const fileArray = Array.from(files)

        // Validate all files
        const validation = validateImageFiles(fileArray)
        if (!validation.valid) {
          alert('File validation errors:\n' + validation.errors.join('\n'))
          return
        }

        // Create preview URLs for all files
        const newPreviews: string[] = []
        for (const file of fileArray) {
          console.log('Processing gallery image:', file.name, file.size, file.type)
          const previewUrl = await createImagePreview(file)
          newPreviews.push(previewUrl)
        }

        setAddFormData((prev) => ({
          ...prev,
          gallery_files: [...prev.gallery_files, ...fileArray],
          gallery_previews: [...prev.gallery_previews, ...newPreviews],
          image_gallery: [] // Clear old Base64 data
        }))

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

  // Remove image from gallery (NEW FILE-BASED APPROACH)
  const removeGalleryImage = (index: number) => {
    setAddFormData((prev) => ({
      ...prev,
      gallery_files: prev.gallery_files.filter((_, i) => i !== index),
      gallery_previews: prev.gallery_previews.filter((_, i) => i !== index),
      image_gallery: prev.image_gallery.filter((_, i) => i !== index) // For backward compatibility
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
      agent_id: 0, // Reset agent_id
      price: '',
      notes: '',
      referral_source: '',
      referrals: [] as ReferralItem[],
      main_image: '',
      main_image_file: null as File | null,
      main_image_preview: '',
      image_gallery: [],
      gallery_files: [] as File[],
      gallery_previews: [] as string[]
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
              <form onSubmit={async (e) => {
                e.preventDefault()

                try {
                  // Create property data object (WITHOUT IMAGES)
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
                    agent_id: parseInt((document.getElementById('add-agent') as HTMLSelectElement).value) || undefined, // Add agent_id
                    price: parseFloat((document.getElementById('add-price') as HTMLInputElement).value) || undefined,
                    notes: (document.getElementById('add-notes') as HTMLTextAreaElement).value || undefined,
                    referral_source: addFormData.referrals.length > 0 ? addFormData.referrals[0].source : undefined, // For backward compatibility
                    referral_dates: addFormData.referrals.map(r => r.date), // For backward compatibility
                    referral_sources: addFormData.referrals, // New structure
                    // Note: Images will be uploaded separately after property creation
                    hasImages: addFormData.main_image_file || addFormData.gallery_files.length > 0 // Flag to indicate if we need to upload images
                  }

                  // Step 1: Create the property without images
                  console.log('Step 1: Creating property without images...')
                  const newProperty = await onSaveAdd(propertyData)

                  // Step 2: Upload images if any (only if property creation was successful)
                  if (newProperty && newProperty.id && (addFormData.main_image_file || addFormData.gallery_files.length > 0)) {
                    console.log('Step 2: Uploading images to property ID:', newProperty.id)

                    try {
                      // Upload main image if present
                      if (addFormData.main_image_file) {
                        console.log('Uploading main image...')
                        const mainImageResult = await uploadMainPropertyImage(newProperty.id, addFormData.main_image_file)
                        if (!mainImageResult.success) {
                          console.error('Main image upload failed:', mainImageResult.message)
                          alert('Property created but main image upload failed: ' + mainImageResult.message)
                        } else {
                          console.log('Main image uploaded successfully')
                        }
                      }

                      // Upload gallery images if present
                      if (addFormData.gallery_files.length > 0) {
                        console.log('Uploading', addFormData.gallery_files.length, 'gallery images...')
                        const galleryResult = await uploadGalleryImages(newProperty.id, addFormData.gallery_files)
                        if (!galleryResult.success) {
                          console.error('Gallery upload failed:', galleryResult.message)
                          alert('Property created but gallery upload failed: ' + galleryResult.message)
                        } else {
                          console.log('Gallery images uploaded successfully')
                        }
                      }

                      console.log('✅ Property creation and image upload completed successfully!')

                    } catch (imageError) {
                      console.error('Error uploading images:', imageError)
                      alert('Property created successfully, but there was an error uploading images. You can add images later by editing the property.')
                    }
                  }

                  setShowAddPropertyModal(false)
                  resetAddFormData()

                } catch (error) {
                  console.error('Error in property creation process:', error)
                  alert('Error creating property: ' + (error instanceof Error ? error.message : 'Unknown error'))
                }
              }}>

                {/* Main Image Section - Top of Modal */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                      {addFormData.main_image_preview || addFormData.main_image ? (
                        <div className="w-full h-full flex items-center justify-center relative z-300">
                          <img
                            key={(addFormData.main_image_preview || addFormData.main_image).substring(0, 100)} // Force re-render when image changes
                            src={addFormData.main_image_preview || addFormData.main_image}
                            alt="Main property image"
                            className="w-full h-full object-contain relative z-20"
                            onLoad={(event) => {
                              console.log('✅ Image loaded successfully')
                              console.log('Image dimensions:', (event.target as HTMLImageElement).naturalWidth, 'x', (event.target as HTMLImageElement).naturalHeight)
                            }}
                            onError={(e) => {
                              console.error('❌ Image failed to load:', e)
                              // If image fails to load, clear the preview
                              setAddFormData((prev) => ({
                                ...prev,
                                main_image_preview: '',
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
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Status <span className="text-red-500">*</span>
                        </label>
                        {onRefreshStatuses && (
                          <button
                            type="button"
                            onClick={onRefreshStatuses}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Refresh statuses list"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Category <span className="text-red-500">*</span>
                        </label>
                        {onRefreshCategories && (
                          <button
                            type="button"
                            onClick={onRefreshCategories}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Refresh categories list"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Assigned Agent</label>
                        <button
                          type="button"
                          onClick={fetchAgents}
                          disabled={agentsLoading}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh agents list"
                        >
                          <RefreshCw className={`h-4 w-4 ${agentsLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <select
                        id="add-agent"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Agent (Optional)</option>
                        {agentsLoading ? (
                          <option value="" disabled>Loading agents...</option>
                        ) : agentsError ? (
                          <option value="" disabled>Error loading agents</option>
                        ) : (
                          agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} - {agent.location || 'No location'}
                            </option>
                          ))
                        )}
                      </select>
                      {agentsError && (
                        <p className="text-xs text-red-500 mt-1">{agentsError}</p>
                      )}
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
                    <ReferralSelector
                      referrals={addFormData.referrals}
                      onReferralsChange={(referrals) => setAddFormData(prev => ({ ...prev, referrals }))}
                      placeholder="Click to add referral sources..."
                    />
                  </div>

                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Gallery</label>
                    <div className="space-y-4">
                      {/* Gallery Images Display (NEW FILE-BASED APPROACH) */}
                      {(addFormData.gallery_previews.length > 0 || addFormData.image_gallery.length > 0) && (
                        <div className="grid grid-cols-4 gap-3">
                          {/* Show new file previews first */}
                          {addFormData.gallery_previews.map((preview, index) => (
                            <div key={`preview-${index}`} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
                              <img
                                src={preview}
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
                              <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                                NEW
                              </div>
                            </div>
                          ))}
                          {/* Show existing Base64 images for backward compatibility */}
                          {addFormData.image_gallery.map((image, index) => (
                            <div key={`legacy-${index}`} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
                              <img
                                src={image}
                                alt={`Gallery image ${addFormData.gallery_previews.length + index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(addFormData.gallery_previews.length + index)}
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
              <form onSubmit={(e) => {
                e.preventDefault()
                onSaveEdit()
              }}>
                {/* Main Image Section - Top of Modal */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                      {editFormData.main_image ? (
                        <img
                          src={getFullImageUrl(editFormData.main_image)}
                          alt="Main property image"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Edit className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Click to upload main image</p>
                            <p className="text-xs text-gray-400">Recommended: 16:9 aspect ratio</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 opacity-0 group-hover:opacity-100 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            // Create a file input element for main image
                            const fileInput = document.createElement('input')
                            fileInput.type = 'file'
                            fileInput.accept = 'image/*'
                            fileInput.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string
                                  setEditFormData((prev: EditFormData) => ({
                                    ...prev,
                                    main_image: base64
                                  }))
                                }
                                reader.readAsDataURL(file)
                              }
                            }
                            fileInput.click()
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
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Assigned Agent</label>
                        <button
                          type="button"
                          onClick={fetchAgents}
                          disabled={agentsLoading}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh agents list"
                        >
                          <RefreshCw className={`h-4 w-4 ${agentsLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <select
                        value={editFormData.agent_id || ''}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, agent_id: parseInt(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Agent (Optional)</option>
                        {agentsLoading ? (
                          <option value="" disabled>Loading agents...</option>
                        ) : agentsError ? (
                          <option value="" disabled>Error loading agents</option>
                        ) : (
                          agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} - {agent.location || 'No location'}
                            </option>
                          ))
                        )}
                      </select>
                      {agentsError && (
                        <p className="text-xs text-red-500 mt-1">{agentsError}</p>
                      )}
                    </div>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                    <textarea
                      rows={3}
                      value={typeof editFormData.details === 'string' ? editFormData.details : (editFormData.details ? JSON.stringify(editFormData.details, null, 2) : '')}
                      onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, details: e.target.value }))}
                      placeholder="Enter property details (floor, balcony, parking, cave, etc.)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interior Details</label>
                    <textarea
                      rows={3}
                      value={editFormData.interior_details || ''}
                      onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, interior_details: e.target.value }))}
                      placeholder="Enter interior details and features"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      rows={3}
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter additional notes about the property"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <ReferralSelector
                      referrals={(() => {
                        // Create referral objects from the stored data
                        if (editFormData.referral_dates && editFormData.referral_dates.length > 0) {
                          return editFormData.referral_dates.map(date => ({
                            source: editFormData.referral_source || '',
                            date: date,
                            isCustom: false
                          }))
                        }
                        // If no dates but there's a source, create one entry
                        if (editFormData.referral_source) {
                          return [{
                            source: editFormData.referral_source,
                            date: new Date().toISOString().split('T')[0], // Today's date
                            isCustom: false
                          }]
                        }
                        return []
                      })()}
                      onReferralsChange={(referrals) => {
                        const referralSource = referrals.length > 0 ? referrals[0].source : ''
                        const referralDates = referrals.map(r => r.date)
                        setEditFormData((prev: EditFormData) => ({ 
                          ...prev, 
                          referral_source: referralSource,
                          referral_dates: referralDates
                        }))
                      }}
                      placeholder="Click to edit referral sources..."
                    />
                  </div>

                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Gallery</label>
                    <div className="space-y-4">
                      {/* Gallery Images Display */}
                      {editFormData.image_gallery && editFormData.image_gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {editFormData.image_gallery.map((image, index) => (
                            <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
                              <img
                                src={getFullImageUrl(image)}
                                alt={`Gallery image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedGallery = editFormData.image_gallery?.filter((_, i) => i !== index)
                                  setEditFormData((prev: EditFormData) => ({ ...prev, image_gallery: updatedGallery }))
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Gallery Images Button */}
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                        onClick={() => {
                          // Create a file input element
                          const fileInput = document.createElement('input')
                          fileInput.type = 'file'
                          fileInput.multiple = true
                          fileInput.accept = 'image/*'
                          fileInput.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files
                            if (files) {
                              // Handle multiple file selection
                              Array.from(files).forEach(file => {
                                const reader = new FileReader()
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string
                                  setEditFormData((prev: EditFormData) => ({
                                    ...prev,
                                    image_gallery: [...(prev.image_gallery || []), base64]
                                  }))
                                }
                                reader.readAsDataURL(file)
                              })
                            }
                          }
                          fileInput.click()
                        }}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                            Add Gallery Images
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Click to add multiple images</p>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
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
      {showViewPropertyModal && viewPropertyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {/* Eye icon for view property */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye h-5 w-5 text-blue-600"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" /><circle cx="12" cy="12" r="3" /></svg>
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
                {/* Main Image Section - Top of Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
                  <div className="relative">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-200">
                      {viewPropertyData.main_image ? (
                        <img
                          src={getFullImageUrl(viewPropertyData.main_image)}
                          alt="Main property image"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">No main image</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="space-y-6">
                  {/* Reference Number at the top */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-semibold">
                      {viewPropertyData.reference_number}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: viewPropertyData.status_color }}
                        >
                          {viewPropertyData.status_name}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.category_name}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.location}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.building_name || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.owner_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.phone_number || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Surface Area (m²)</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.surface ? `${viewPropertyData.surface} m²` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Built Year</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.built_year || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Agent</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.agent_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.view_type ? viewPropertyData.view_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-green-600 font-semibold">
                        {viewPropertyData.price ? `$${viewPropertyData.price.toLocaleString()}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Concierge Service:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewPropertyData.concierge ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {viewPropertyData.concierge ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Details and Notes Section */}
                  {(viewPropertyData.details || viewPropertyData.interior_details || viewPropertyData.notes) && (
                    <div className="space-y-4">
                      {viewPropertyData.details && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Property Details</label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                            {typeof viewPropertyData.details === 'string' ? (
                              <div className="whitespace-pre-wrap">{viewPropertyData.details}</div>
                            ) : typeof viewPropertyData.details === 'object' && viewPropertyData.details !== null ? (
                              <div className="grid grid-cols-2 gap-2">
                                {(viewPropertyData.details as any).floor && (
                                  <div><strong>Floor:</strong> {(viewPropertyData.details as any).floor}</div>
                                )}
                                {(viewPropertyData.details as any).balcony !== undefined && (
                                  <div><strong>Balcony:</strong> {(viewPropertyData.details as any).balcony ? 'Yes' : 'No'}</div>
                                )}
                                {(viewPropertyData.details as any).parking !== undefined && (
                                  <div><strong>Parking:</strong> {(viewPropertyData.details as any).parking}</div>
                                )}
                                {(viewPropertyData.details as any).cave !== undefined && (
                                  <div><strong>Cave:</strong> {(viewPropertyData.details as any).cave ? 'Yes' : 'No'}</div>
                                )}
                              </div>
                            ) : (
                              <div>Details unavailable</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {viewPropertyData.interior_details && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Interior Details</label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap">
                            {viewPropertyData.interior_details}
                          </div>
                        </div>
                      )}
                      
                      {viewPropertyData.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap">
                            {viewPropertyData.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Referral Information */}
                  {(viewPropertyData.referral_source || viewPropertyData.referral_dates) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Referral Information</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.referral_source && (
                          <div className="mb-2">
                            <strong>Source:</strong> {viewPropertyData.referral_source}
                          </div>
                        )}
                        {viewPropertyData.referral_dates && viewPropertyData.referral_dates.length > 0 && (
                          <div>
                            <strong>Dates:</strong>
                            <div className="flex flex-wrap gap-2 ms-1 inline-block">
                              {viewPropertyData.referral_dates.map((date, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {new Date(date).toLocaleDateString()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-6 mt-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Concierge Service:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewPropertyData.concierge ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {viewPropertyData.concierge ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Image Gallery Section */}
                {viewPropertyData.image_gallery && viewPropertyData.image_gallery.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images</label>
                    <div className="grid grid-cols-4 gap-3">
                      {viewPropertyData.image_gallery.map((image, index) => (
                        <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-colors">
                          <img
                            src={getFullImageUrl(image)}
                            alt={`Gallery image ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              setSelectedImageState(getFullImageUrl(image))
                              setAllImagesState(viewPropertyData.image_gallery?.map(img => getFullImageUrl(img)) || [])
                              setCurrentImageIndexState(index)
                              setShowImageModal(true)
                            }}
                          />
                        </div>
                      ))}
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
                  if (viewingProperty) {
                    setShowEditPropertyModal(true)
                  }
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
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${currentImageIndexState === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                    }`}
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Next Button */}
                <button
                  onClick={onGoToNextImage}
                  disabled={currentImageIndexState === allImagesState.length - 1}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${currentImageIndexState === allImagesState.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
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
