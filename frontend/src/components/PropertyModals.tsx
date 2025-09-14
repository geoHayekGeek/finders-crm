'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Star, ChevronLeft, ChevronRight, Upload, RefreshCw, Building2, User, Calendar } from 'lucide-react'
import { Property, Category, Status, EditFormData, Referral } from '@/types/property'
import { compressAndConvertToBase64, getRecommendedCompressionOptions } from '@/utils/imageCompression'
import { uploadMainPropertyImage, uploadGalleryImages, validateImageFile, validateImageFiles, createImagePreview, getFullImageUrl } from '@/utils/imageUpload'

import { CategorySelector } from './CategorySelector'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { AgentSelector } from './AgentSelector'
import { ReferralSelector } from './ReferralSelector'
import { useToast } from '@/contexts/ToastContext'

// Reusable Input Field Component with Validation
const InputField = ({ 
  label, 
  id, 
  type = 'text', 
  value, 
  onChange, 
  onBlur,
  required = false, 
  placeholder = '', 
  className = '', 
  errorMessage = '',
  disabled = false 
}: {
  label: string
  id: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
  className?: string
  errorMessage?: string
  disabled?: boolean
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
        errorMessage 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300'
      } ${disabled ? 'bg-gray-50 text-gray-500' : ''} ${className}`}
    />
    {errorMessage && (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <span className="mr-1">⚠️</span>
        {errorMessage}
      </p>
    )}
  </div>
)

// Reusable Select Field Component with Validation
const SelectField = ({ 
  label, 
  id, 
  value, 
  onChange, 
  onBlur,
  required = false, 
  className = '', 
  errorMessage = '',
  children 
}: {
  label: string
  id: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
  required?: boolean
  className?: string
  errorMessage?: string
  children: React.ReactNode
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required={required}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
        errorMessage 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300'
      } ${className}`}
    >
      {children}
    </select>
    {errorMessage && (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <span className="mr-1">⚠️</span>
        {errorMessage}
      </p>
    )}
  </div>
)

// Reusable Textarea Field Component with Validation
const TextareaField = ({ 
  label, 
  id, 
  value, 
  onChange, 
  onBlur,
  required = false, 
  placeholder = '', 
  className = '', 
  errorMessage = '',
  rows = 3 
}: {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  required?: boolean
  placeholder?: string
  className?: string
  errorMessage?: string
  rows?: number
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required={required}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-vertical ${
        errorMessage 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300'
      } ${className}`}
    />
    {errorMessage && (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <span className="mr-1">⚠️</span>
        {errorMessage}
      </p>
    )}
  </div>
)

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
  onSaveEdit: () => void
  onConfirmDelete: () => void
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSaveAdd: (propertyData: any) => Promise<any>
  categories: Category[]
  statuses: Status[]
  onRefreshCategories?: () => void
  onRefreshStatuses?: () => void
  onRefreshProperties?: () => void
  backendValidationErrors?: Record<string, string>
  setBackendValidationErrors?: (errors: Record<string, string>) => void
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
  onSaveEdit,
  onConfirmDelete,
  onImageUpload,
  onSaveAdd,
  categories,
  statuses,
  onRefreshCategories,
  onRefreshStatuses,
  onRefreshProperties,
  backendValidationErrors = {},
  setBackendValidationErrors
}: PropertyModalsProps) {
  const { showSuccess, showError, showWarning } = useToast()
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [selectedImageState, setSelectedImageState] = useState<string>('')
  const [allImagesState, setAllImagesState] = useState<string[]>([])
  const [currentImageIndexState, setCurrentImageIndexState] = useState<number>(0)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [employees, setEmployees] = useState<Agent[]>([])

  // Validation error state for form fields
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({})
  
  // Track if user has modified the image gallery to prevent overwriting
  const [galleryModified, setGalleryModified] = useState(false)
  
  // Local gallery state for edit form - only uploaded when user clicks save
  const [localEditGallery, setLocalEditGallery] = useState<File[]>([])

  // Local state for add property modal
  const [addFormData, setAddFormData] = useState({
    status_id: undefined as number | undefined,
    property_type: 'sale' as 'sale' | 'rent',
    location: '',
    category_id: undefined as number | undefined,
    building_name: '',
    owner_name: '',
    phone_number: '',
    surface: '',
    details: '',
    interior_details: '',
    built_year: '' as string | undefined,
    view_type: '',
    concierge: false,
    agent_id: undefined as number | undefined, // Add agent_id field
    price: '',
    notes: '',
    property_url: '',
    main_image: '',
    main_image_file: null as File | null, // New: File object for upload
    main_image_preview: '', // New: Preview URL for display
    image_gallery: [] as string[],
    gallery_files: [] as File[], // New: File objects for upload
    gallery_previews: [] as string[], // New: Preview URLs for display
    referrals: [] as Referral[]
  })

  // Debug useEffect to monitor main_image changes
  useEffect(() => {
    console.log('addFormData.main_image changed:', addFormData.main_image ? 'has image' : 'no image')
  }, [addFormData.main_image])

  // Reset image modal state when modal is closed
  useEffect(() => {
    if (!showImageModal) {
      setSelectedImageState('')
      setAllImagesState([])
      setCurrentImageIndexState(0)
    }
  }, [showImageModal])

  // Fetch employees for referral selection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        console.log('🔍 Fetching employees for referrals...')
        const response = await fetch('http://localhost:10000/api/users/all')
        console.log('📡 Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('📊 Response data:', data)

          if (data.success) {
            console.log('✅ Employees fetched successfully:', data.users)
            setEmployees(data.users)
          } else {
            console.error('❌ API returned success: false:', data.message)
          }
        } else {
          console.error('❌ HTTP error:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Error fetching employees:', error)
      }
    }

    fetchEmployees()
  }, [])

  // Comprehensive validation function for all fields
  const isFieldValid = (fieldName: string, value: any) => {
    switch (fieldName) {
      // Required fields
      case 'status_id':
        return value !== undefined && value !== null && value !== 0
      case 'category_id':
        return value !== undefined && value !== null && value !== 0
      case 'location':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'owner_name':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'phone_number':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'surface':
        // Handle both string and number types
        if (typeof value === 'number') {
          return !isNaN(value) && value > 0
        }
        return value && typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)) && Number(value) > 0
      case 'view_type':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'price':
        // Handle both string and number types
        if (typeof value === 'number') {
          return !isNaN(value) && value > 0
        }
        return value && typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)) && Number(value) > 0
      case 'concierge':
        return value !== undefined && value !== null
      case 'details':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'interior_details':
        return value && typeof value === 'string' && value.trim() !== ''
      case 'building_name':
        return true // Optional field
      case 'agent_id':
        return value !== undefined && value !== null && value !== 0
      // Optional fields with validation
      case 'built_year':
        if (!value || (typeof value === 'string' && value.trim() === '')) return true // Optional field
        const year = Number(value)
        const currentYear = new Date().getFullYear()
        return !isNaN(year) && year >= 1800 && year <= currentYear
      case 'notes':
        return true // Optional field
      case 'property_url':
        // If empty, it's valid (optional field)
        if (!value || (typeof value === 'string' && value.trim() === '')) return true
        // If not empty, validate URL format - must start with http:// or https://
        const trimmedValue = typeof value === 'string' ? value.trim() : String(value)
        if (!trimmedValue.startsWith('http://') && !trimmedValue.startsWith('https://')) {
          return false
        }
        try {
          const url = new URL(trimmedValue)
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      default:
        return true
    }
  }

  // Get detailed validation errors
  const getValidationErrors = () => {
    const errors: string[] = [];
    
    if (!isFieldValid('status_id', addFormData.status_id)) {
      errors.push('Status is required and must be a valid selection');
    }
    if (!isFieldValid('category_id', addFormData.category_id)) {
      errors.push('Category is required and must be a valid selection');
    }
    if (!isFieldValid('location', addFormData.location)) {
      errors.push('Location is required');
    }
    if (!isFieldValid('owner_name', addFormData.owner_name)) {
      errors.push('Owner name is required');
    }
    if (!isFieldValid('phone_number', addFormData.phone_number)) {
      errors.push('Phone number is required');
    }
    if (!isFieldValid('surface', addFormData.surface)) {
      errors.push('Surface area is required and must be a positive number');
    }
    if (!isFieldValid('view_type', addFormData.view_type)) {
      errors.push('View type is required');
    }
    if (!isFieldValid('price', addFormData.price)) {
      errors.push('Price is required and must be a positive number');
    }
    if (!isFieldValid('concierge', addFormData.concierge)) {
      errors.push('Concierge service status is required');
    }
    if (!isFieldValid('details', addFormData.details)) {
      errors.push('Property details are required');
    }
    if (!isFieldValid('interior_details', addFormData.interior_details)) {
      errors.push('Interior details are required');
    }
    // Building name is optional - no validation needed
    if (!isFieldValid('agent_id', addFormData.agent_id)) {
      errors.push('Agent is required and must be a valid selection');
    }
    if (!isFieldValid('built_year', addFormData.built_year)) {
      errors.push('Built year must be between 1800 and current year');
    }
    if (!isFieldValid('property_url', addFormData.property_url)) {
      errors.push('Property URL must be a valid URL starting with http:// or https://');
    }
    
    return errors;
  };


  // Helper function to get field-specific error message
  const getFieldErrorMessage = (fieldName: string, value: any): string => {
    if (isFieldValid(fieldName, value)) return ''
    
    switch (fieldName) {
      case 'status_id':
        return 'Please select a status'
      case 'category_id':
        return 'Please select a category'
      case 'location':
        return 'Location is required'
      case 'owner_name':
        return 'Owner name is required'
      case 'phone_number':
        return 'Phone number is required'
      case 'surface':
        if (!value || value.trim() === '') {
          return 'Surface area is required'
        }
        if (isNaN(Number(value)) || Number(value) <= 0) {
          return 'Surface area must be a positive number'
        }
        return 'Surface area is required'
      case 'view_type':
        return 'View type is required'
      case 'price':
        if (!value || value.trim() === '') {
          return 'Price is required'
        }
        if (isNaN(Number(value)) || Number(value) <= 0) {
          return 'Price must be a positive number'
        }
        return 'Price is required'
      case 'concierge':
        return 'Concierge service status is required'
      case 'details':
        return 'Property details are required'
      case 'interior_details':
        return 'Interior details are required'
      case 'building_name':
        return '' // Optional field - no error message
      case 'agent_id':
        return 'Please select an agent'
      case 'built_year':
        if (value && value.trim() !== '') {
          const year = Number(value)
          if (isNaN(year)) {
            return 'Built year must be a valid number'
          }
          if (year < 1800) {
            return 'Built year must be 1800 or later'
          }
          if (year > new Date().getFullYear()) {
            return 'Built year cannot be in the future'
          }
        }
        return 'Built year must be between 1800 and current year'
      case 'property_url':
        return 'Please enter a valid URL starting with http:// or https:// (e.g., https://example.com)'
      default:
        return ''
    }
  }

  // Validate a single field and update error state
  const validateField = (fieldName: string, value: any, isEditForm = false) => {
    const isValid = isFieldValid(fieldName, value)
    const errorMessage = isValid ? '' : getFieldErrorMessage(fieldName, value)
    
    console.log(`🔍 validateField called: field="${fieldName}", value="${value}", isValid=${isValid}, errorMessage="${errorMessage}", isEditForm=${isEditForm}`)
    
    if (isEditForm) {
      setEditValidationErrors(prev => {
        const newErrors = {
          ...prev,
          [fieldName]: errorMessage
        }
        console.log('🔍 Updated editValidationErrors:', newErrors)
        return newErrors
      })
    } else {
      setValidationErrors(prev => {
        const newErrors = {
          ...prev,
          [fieldName]: errorMessage
        }
        console.log('🔍 Updated validationErrors:', newErrors)
        return newErrors
      })
    }
  }

  // Clear validation error for a field
  const clearFieldError = (fieldName: string, isEditForm = false) => {
    if (isEditForm) {
      setEditValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Reset gallery modification flag and local gallery when edit modal opens
  useEffect(() => {
    if (showEditPropertyModal && editingProperty) {
      setGalleryModified(false)
      setLocalEditGallery([])
    }
  }, [showEditPropertyModal, editingProperty?.id])

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
            console.log('🔍 Interior details field value:', propertyData.interior_details)
            console.log('🔍 Notes field value:', propertyData.notes)
            console.log('🔍 Referrals field value:', propertyData.referrals)


            const formData = {
              reference_number: propertyData.reference_number || '',
              status_id: propertyData.status_id || 0,
              property_type: propertyData.property_type || 'sale',
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
              agent_id: propertyData.agent_id ? parseInt(propertyData.agent_id.toString()) : undefined,
              price: propertyData.price,
              notes: propertyData.notes || '',
              property_url: propertyData.property_url || '',
              referrals: propertyData.referrals || [],

              main_image: propertyData.main_image || '',
              image_gallery: galleryModified ? editFormData.image_gallery : (propertyData.image_gallery || [])
            }

            console.log('🎯 Setting editFormData:', formData)
            console.log('🎯 Agent ID from API:', propertyData.agent_id)
            console.log('🎯 Agent ID converted:', formData.agent_id)
            console.log('🎯 Agent ID type:', typeof formData.agent_id)
            console.log('🎯 Full property data:', propertyData)
            setEditFormData(formData)
          } else {
            console.error('❌ Failed to fetch property details:', result.message)
            console.log('🎯 Using fallback data. Agent ID from editingProperty:', editingProperty.agent_id)
            // Fallback to existing property data
            setEditFormData({
              reference_number: editingProperty.reference_number || '',
              status_id: editingProperty.status_id || 0,
              property_type: editingProperty.property_type || 'sale',
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
              agent_id: editingProperty.agent_id ? parseInt(editingProperty.agent_id.toString()) : undefined,
              price: editingProperty.price,
              notes: editingProperty.notes || '',
              property_url: editingProperty.property_url || '',
              referrals: editingProperty.referrals || [],

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
            property_type: editingProperty.property_type || 'sale',
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
            property_url: editingProperty.property_url || '',
            referrals: editingProperty.referrals || [],

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
          showError(validation.error || 'Invalid image file')
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
        showError('Something went wrong processing the image. Please try again.')
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
          showError(`File validation errors: ${validation.errors.join(', ')}`)
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
        showError('Something went wrong processing gallery images. Please try again.')
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
      status_id: undefined as number | undefined,
      property_type: 'sale' as 'sale' | 'rent',
      location: '',
      category_id: undefined as number | undefined,
      building_name: '',
      owner_name: '',
      phone_number: '',
      surface: '',
      details: '',
      interior_details: '',
      built_year: '' as string | undefined,
      view_type: '',
      concierge: false,
      agent_id: undefined as number | undefined, // Reset agent_id
      price: '',
      notes: '',
      property_url: '',

      main_image: '',
      main_image_file: null as File | null,
      main_image_preview: '',
      image_gallery: [],
      gallery_files: [] as File[],
      gallery_previews: [] as string[],
      referrals: [] as Referral[]
    })
  }

  // Handle main image upload for edit property modal
  const handleEditMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Validate the file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          showError(validation.error || 'Invalid image file')
          return
        }

        // Create preview URL
        const previewUrl = await createImagePreview(file)

        // Store the file for upload (no Base64 conversion)
        setEditFormData((prev: EditFormData) => ({
          ...prev,
          main_image_file: file,
          main_image_preview: previewUrl
        }))

        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing edit image:', error)
        showError('Something went wrong processing the image. Please try again.')
      }
    }
  }

  // Handle gallery image upload for edit property modal
  const handleEditGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      try {
        const fileArray = Array.from(files)
        console.log('Processing edit gallery images:', fileArray.length, 'files')

        // Validate files
        const validation = validateImageFiles(fileArray)
        if (!validation.valid) {
          showError(validation.errors.join(', '))
          return
        }

        // Store File objects directly instead of converting to Base64
        setLocalEditGallery(prev => [...prev, ...fileArray])
        setGalleryModified(true)

        // Clear the file input
        if (event.target) {
          event.target.value = ''
        }
      } catch (error) {
        console.error('Error processing edit gallery images:', error)
        showError('Something went wrong processing gallery images. Please try again.')
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

                // Validate all required fields and optional fields with format requirements
                const fieldsToValidate = ['status_id', 'category_id', 'location', 'owner_name', 'phone_number', 'surface', 'price', 'details', 'interior_details', 'agent_id', 'view_type', 'concierge', 'built_year', 'property_url']
                
                console.log('🔍 Form data before validation:', addFormData)
                console.log('🔍 Validation errors before validation:', validationErrors)
                console.log('🔍 Fields to validate:', fieldsToValidate)

                // Force validation on all fields and collect errors
                const newValidationErrors: Record<string, string> = {}
                let hasErrors = false
                
                fieldsToValidate.forEach(field => {
                  const value = addFormData[field as keyof typeof addFormData]
                  const isValid = isFieldValid(field, value)
                  const errorMessage = isValid ? '' : getFieldErrorMessage(field, value)
                  
                  console.log(`🔍 Validating field "${field}": value="${value}", isValid=${isValid}, errorMessage="${errorMessage}"`)
                  
                  newValidationErrors[field] = errorMessage
                  
                  if (!isValid) {
                    console.log(`🔍 Field "${field}" is invalid, marking as error`)
                    hasErrors = true
                  }
                })

                // Update validation errors state
                setValidationErrors(newValidationErrors)

                console.log('🔍 Validation complete. hasErrors:', hasErrors)
                console.log('🔍 New validation errors:', newValidationErrors)
                
                // If there are validation errors, don't submit
                if (hasErrors) {
                  console.log('🔍 Form submission blocked due to validation errors')
                  showError('Please fill in all required fields before submitting')
                  return
                }
                
                console.log('🔍 Form validation passed, proceeding with submission')

                try {
                  // Debug: Log the form data being sent
                  console.log('🔍 Form data being submitted:', addFormData)
                  console.log('🔍 Required fields check:')
                  console.log('  - status_id:', addFormData.status_id, typeof addFormData.status_id)
                  console.log('  - property_type:', addFormData.property_type, typeof addFormData.property_type)
                  console.log('  - location:', addFormData.location, typeof addFormData.location)
                  console.log('  - category_id:', addFormData.category_id, typeof addFormData.category_id)
                  console.log('  - owner_name:', addFormData.owner_name, typeof addFormData.owner_name)
                  console.log('  - phone_number:', addFormData.phone_number, typeof addFormData.phone_number)
                  console.log('  - surface:', addFormData.surface, typeof addFormData.surface)
                  console.log('  - view_type:', addFormData.view_type, typeof addFormData.view_type)
                  console.log('  - price:', addFormData.price, typeof addFormData.price)
                  console.log('  - concierge:', addFormData.concierge, typeof addFormData.concierge)
                  console.log('  - details:', addFormData.details, typeof addFormData.details)
                  console.log('  - interior_details:', addFormData.interior_details, typeof addFormData.interior_details)

                  // Create property data object (WITHOUT IMAGES)
                  const propertyData = {
                    status_id: addFormData.status_id,
                    property_type: addFormData.property_type,
                    location: addFormData.location,
                    category_id: addFormData.category_id,
                    building_name: addFormData.building_name || undefined,
                    owner_name: addFormData.owner_name,
                    phone_number: addFormData.phone_number,
                    surface: parseFloat(addFormData.surface),
                    details: addFormData.details,
                    interior_details: addFormData.interior_details,
                    built_year: addFormData.built_year ? parseInt(addFormData.built_year) : undefined,
                    view_type: addFormData.view_type,
                    concierge: addFormData.concierge,
                    agent_id: addFormData.agent_id || undefined,
                    price: parseFloat(addFormData.price),
                    notes: addFormData.notes || undefined,
                    property_url: addFormData.property_url || undefined,
                    referrals: addFormData.referrals || [],

                    // Note: Images will be uploaded separately after property creation
                    hasImages: addFormData.main_image_file || addFormData.gallery_files.length > 0 // Flag to indicate if we need to upload images
                  }

                  // Debug: Log the exact data being sent
                  console.log('🚀 Property data to be sent:', JSON.stringify(propertyData, null, 2))
                  console.log('🔍 Data types:', {
                    status_id: typeof propertyData.status_id,
                    category_id: typeof propertyData.category_id,
                    location: typeof propertyData.location,
                    owner_name: typeof propertyData.owner_name,
                    phone_number: typeof propertyData.phone_number,
                    surface: typeof propertyData.surface,
                    view_type: typeof propertyData.view_type,
                    price: typeof propertyData.price,
                    concierge: typeof propertyData.concierge,
                    details: typeof propertyData.details,
                    interior_details: typeof propertyData.interior_details
                  })

                  console.log('🚀 Final property data being sent to backend:', propertyData)

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
                          showWarning('Property created but main image upload failed: ' + mainImageResult.message)
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
                          
                          // If it's a CSRF error, suggest refreshing the page
                          if (galleryResult.message?.includes('Security token expired')) {
                            showError('Security token expired. Please refresh the page and try uploading images again.')
                          } else {
                            showWarning('Property created but gallery upload failed: ' + galleryResult.message)
                          }
                        } else {
                          console.log('Gallery images uploaded successfully')
                        }
                      }

                      console.log('✅ Property creation and image upload completed successfully!')
                      
                      // Refresh the property list to show updated images
                      if (onRefreshProperties) {
                        console.log('🔄 Refreshing property list after image upload...')
                        await onRefreshProperties()
                      }

                    } catch (imageError) {
                      console.error('Error uploading images:', imageError)
                      showWarning('Property created successfully, but there was an error uploading images. You can add images later by editing the property.')
                    }
                  }

                  setShowAddPropertyModal(false)
                  resetAddFormData()
                  showSuccess('Property created successfully!')

                } catch (error) {
                  console.error('Error in property creation process:', error)
                  showError('Something went wrong creating property: ' + (error instanceof Error ? error.message : 'Unknown error'))
                }
              }}>

                {/* Main Image Section - Top of Modal */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image (Optional)</label>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                      {addFormData.main_image_preview || addFormData.main_image ? (
                        <div className="relative w-full h-full flex items-center justify-center z-300">
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
                          {/* Remove Image Button */}
                          <button
                            type="button"
                            onClick={() => setAddFormData((prev) => ({
                              ...prev,
                              main_image_preview: '',
                              main_image: '',
                              main_image_file: null
                            }))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg z-30"
                            title="Remove main image"
                          >
                            <X className="h-4 w-4" />
                          </button>
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
                      <div>
                        <PropertyStatusSelector
                          selectedStatusId={addFormData.status_id}
                          onStatusChange={(statusId) => {
                            setAddFormData(prev => ({ ...prev, status_id: statusId }))
                          }}
                          placeholder="Select status..."
                        />
                        {validationErrors.status_id && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {validationErrors.status_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="add-property-type"
                        value={addFormData.property_type}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, property_type: e.target.value as 'sale' | 'rent' }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div>
                        <CategorySelector
                          selectedCategoryId={addFormData.category_id}
                          onCategoryChange={(categoryId) => {
                            setAddFormData(prev => ({ ...prev, category_id: categoryId }))
                          }}
                          placeholder="Select category..."
                        />
                        {validationErrors.category_id && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {validationErrors.category_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <input
                        type="text"
                        value="Auto-generated"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Location"
                        id="add-location"
                        type="text"
                        value={addFormData.location}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, location: newValue }))
                      }}
                      onBlur={(e) => validateField('location', e.target.value)}
                        placeholder="Enter property location"
                      errorMessage={validationErrors.location}
                    />
                    <InputField
                      label="Building Name (Optional)"
                      id="add-building-name"
                      type="text"
                      value={addFormData.building_name}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, building_name: newValue }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('building_name', value)
                      }}
                      required={false}
                      placeholder="Enter building name (optional)"
                      errorMessage={validationErrors.building_name}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Owner Name"
                        id="add-owner-name"
                        type="text"
                        value={addFormData.owner_name}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, owner_name: newValue }))
                      }}
                      onBlur={(e) => validateField('owner_name', e.target.value)}
                        placeholder="Enter owner name"
                      errorMessage={validationErrors.owner_name}
                    />
                    <InputField
                      label="Phone Number"
                        id="add-phone"
                        type="tel"
                        value={addFormData.phone_number}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, phone_number: newValue }))
                      }}
                      onBlur={(e) => validateField('phone_number', e.target.value)}
                        placeholder="Enter phone number"
                      errorMessage={validationErrors.phone_number}
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Surface Area (m²)"
                        id="add-surface"
                        type="number"
                        value={addFormData.surface}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, surface: newValue === '' ? '' : newValue }))
                      }}
                      onBlur={(e) => validateField('surface', e.target.value)}
                        placeholder="Enter surface area"
                      errorMessage={validationErrors.surface}
                      className="[&>input]:step-0.01"
                    />
                    <InputField
                      label="Built Year (Optional)"
                        id="add-built-year"
                        type="number"
                        value={addFormData.built_year || ''}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, built_year: newValue === '' ? undefined : newValue }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('built_year', value)
                      }}
                      required={false}
                        placeholder="Enter built year (optional)"
                      errorMessage={validationErrors.built_year}
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Agent <span className="text-red-500">*</span></label>
                      <AgentSelector
                        selectedAgentId={addFormData.agent_id}
                        onAgentChange={(agent) => {
                          const agentId = agent?.id
                          setAddFormData(prev => ({ ...prev, agent_id: agentId }))
                        }}
                        placeholder="Select agent..."
                      />
                      {validationErrors.agent_id && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.agent_id}</p>
                      )}
                    </div>
                    <SelectField
                      label="View Type"
                        id="add-view-type"
                        value={addFormData.view_type}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, view_type: newValue }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('view_type', value)
                      }}
                      errorMessage={validationErrors.view_type}
                      >
                        <option value="">Select View Type</option>
                        <option value="open view">Open View</option>
                        <option value="sea view">Sea View</option>
                        <option value="mountain view">Mountain View</option>
                        <option value="no view">No View</option>
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Price"
                        id="add-price"
                        type="number"
                        value={addFormData.price}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, price: newValue === '' ? '' : newValue }))
                      }}
                      onBlur={(e) => validateField('price', e.target.value)}
                        placeholder="Enter price"
                      errorMessage={validationErrors.price}
                      className="[&>input]:step-0.01"
                      />

                  </div>
                  <div className="flex items-center space-x-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Concierge Service <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                      <input
                        id="add-concierge"
                        type="checkbox"
                        checked={addFormData.concierge}
                          onChange={(e) => {
                            const newValue = e.target.checked
                            setAddFormData(prev => ({ ...prev, concierge: newValue }))
                          }}
                          onBlur={() => validateField('concierge', addFormData.concierge)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                        <span className="ml-2 text-sm text-gray-700">
                          {addFormData.concierge ? 'Yes' : 'No'}
                      </span>
                  </div>
                      {validationErrors.concierge && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.concierge}</p>
                      )}
                    </div>
                  </div>
                  <TextareaField
                    label="Details"
                      id="add-details"
                      value={addFormData.details}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAddFormData(prev => ({ ...prev, details: newValue }))
                    }}
                    onBlur={(e) => validateField('details', e.target.value)}
                      placeholder="Enter property details (floor, balcony, parking, cave, etc.)"
                    errorMessage={validationErrors.details}
                    rows={3}
                  />

                  <TextareaField
                    label="Interior Details"
                      id="add-interior-details"
                      value={addFormData.interior_details}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAddFormData(prev => ({ ...prev, interior_details: newValue }))
                    }}
                    onBlur={(e) => validateField('interior_details', e.target.value)}
                      placeholder="Enter interior details and features"
                    errorMessage={validationErrors.interior_details}
                    rows={3}
                    />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      id="add-notes"
                      rows={3}
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter additional notes about the property (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <InputField
                      label="Property URL (Optional)"
                      id="add-property-url"
                      type="url"
                      value={addFormData.property_url}
                      onChange={(e) => {
                        let newValue = e.target.value
                        setAddFormData(prev => ({ ...prev, property_url: newValue }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        console.log('🔍 Add Property URL onBlur triggered with value:', value)
                        validateField('property_url', value)
                      }}
                      required={false}
                      placeholder="https://example.com/property-listing"
                      errorMessage={validationErrors.property_url}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the URL of the property listing (e.g., from external real estate sites)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referrals (Optional)</label>
                    <ReferralSelector
                      referrals={addFormData.referrals}
                      onReferralsChange={(referrals) => setAddFormData(prev => ({ ...prev, referrals }))}
                      employees={employees}
                      placeholder="Add property referrals (optional)..."
                    />
                  </div>



                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Gallery (Optional)</label>
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
              <form onSubmit={async (e) => {
                e.preventDefault()
                
                // Validate required fields and optional fields with format requirements for edit form
                const fieldsToValidate = ['status_id', 'category_id', 'location', 'owner_name', 'phone_number', 'surface', 'price', 'details', 'interior_details', 'agent_id', 'view_type', 'concierge', 'built_year', 'property_url']
                let hasErrors = false
                
                console.log('🔍 Edit form data before validation:', editFormData)
                console.log('🔍 Edit validation errors before validation:', editValidationErrors)

                fieldsToValidate.forEach(field => {
                  const value = editFormData[field as keyof EditFormData]
                  const isValid = isFieldValid(field, value)
                  console.log(`🔍 Validating edit field "${field}": value="${value}", isValid=${isValid}`)
                  if (!isValid) {
                    console.log(`🔍 Edit field "${field}" is invalid, calling validateField`)
                    validateField(field, value, true)
                    hasErrors = true
                  }
                })

                // If there are validation errors, don't submit
                if (hasErrors) {
                  console.log('🔍 Edit form submission blocked due to validation errors')
                  showError('Please fix the validation errors before saving')
                  return
                }
                
                console.log('🔍 Edit form validation passed, proceeding with submission')

                // Save property first and wait for completion
                await onSaveEdit()
                
                // Upload main image if present
                if (editFormData.main_image_file) {
                  try {
                    console.log('Uploading main image...')
                    const mainImageResult = await uploadMainPropertyImage(editingProperty!.id, editFormData.main_image_file)
                    if (!mainImageResult.success) {
                      console.error('Main image upload failed:', mainImageResult.message)
                      
                      // If it's a CSRF error, suggest refreshing the page
                      if (mainImageResult.message?.includes('Security token expired')) {
                        showError('Security token expired. Please refresh the page and try uploading images again.')
                      } else {
                        showWarning('Property updated but main image upload failed: ' + mainImageResult.message)
                      }
                    } else {
                      console.log('Main image uploaded successfully')
                    }
                  } catch (error) {
                    console.error('Error uploading main image:', error)
                    showError('Failed to upload main image: ' + (error instanceof Error ? error.message : 'Unknown error'))
                  }
                }
                
                // Then upload local gallery files if any exist
                if (localEditGallery.length > 0) {
                  try {
                    console.log('Uploading', localEditGallery.length, 'gallery images...')
                    const galleryResult = await uploadGalleryImages(editingProperty!.id, localEditGallery)
                    if (!galleryResult.success) {
                      console.error('Gallery upload failed:', galleryResult.message)
                      
                      // If it's a CSRF error, suggest refreshing the page
                      if (galleryResult.message?.includes('Security token expired')) {
                        showError('Security token expired. Please refresh the page and try uploading images again.')
                      } else {
                        showWarning('Property updated but gallery upload failed: ' + galleryResult.message)
                      }
                    } else {
                      console.log('Gallery images uploaded successfully')
                    }
                    setLocalEditGallery([]) // Clear local gallery after upload
                  } catch (error) {
                    console.error('Error uploading gallery images:', error)
                    showError('Failed to upload gallery images: ' + (error instanceof Error ? error.message : 'Unknown error'))
                  }
                }
              }}>
                {/* Main Image Section - Top of Modal */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image (Optional)</label>
                  <div className="relative group">
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                      {editFormData.main_image_preview || editFormData.main_image ? (
                        <div className="relative w-full h-full">
                          <img
                            src={editFormData.main_image_preview || (editFormData.main_image ? getFullImageUrl(editFormData.main_image) : '')}
                            alt="Main property image"
                            className="w-full h-full object-cover"
                          />
                          {/* Remove Image Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditFormData((prev: EditFormData) => ({ 
                                ...prev, 
                                main_image: '', 
                                main_image_preview: '',
                                main_image_file: undefined
                              }));
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg z-10"
                            title="Remove main image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
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
                            fileInput.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              console.log('🖼️ Edit Modal - File selected:', file?.name, file?.size)
                              
                              if (!file) {
                                console.error('❌ No file selected')
                                return
                              }

                              try {
                                // Validate the file
                                const validation = validateImageFile(file)
                                if (!validation.valid) {
                                  showError(validation.error || 'Invalid image file')
                                  return
                                }

                                // Create preview URL
                                const previewUrl = await createImagePreview(file)

                                // Store the file for upload (same as add property flow)
                                setEditFormData((prev: EditFormData) => ({
                                  ...prev,
                                  main_image_file: file,
                                  main_image_preview: previewUrl
                                }))

                                showSuccess('Image selected! It will be uploaded when you save the property.')
                              } catch (error) {
                                console.error('❌ Error processing image:', error)
                                showError('Failed to process image: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <PropertyStatusSelector
                        selectedStatusId={editFormData.status_id}
                        onStatusChange={(statusId) => {
                          setEditFormData((prev: EditFormData) => ({ ...prev, status_id: statusId }))
                        }}
                        placeholder="Select status..."
                        required={true}
                      />
                      {editValidationErrors.status_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.status_id}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editFormData.property_type}
                        onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, property_type: e.target.value as 'sale' | 'rent' }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <CategorySelector
                        selectedCategoryId={editFormData.category_id}
                        onCategoryChange={(categoryId) => {
                          setEditFormData((prev: EditFormData) => ({ ...prev, category_id: categoryId }))
                        }}
                        placeholder="Select category..."
                        required={true}
                      />
                      {editValidationErrors.category_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.category_id}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <input
                        type="text"
                        value={editFormData.reference_number || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Location"
                      id="edit-location"
                        type="text"
                        value={editFormData.location}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditFormData((prev: EditFormData) => ({ ...prev, location: newValue }))
                        clearFieldError('location', true)
                      }}
                      onBlur={(e) => validateField('location', e.target.value, true)}
                      required={true}
                      placeholder="Enter property location"
                      errorMessage={editValidationErrors.location}
                    />
                    <InputField
                      label="Building Name (Optional)"
                      id="edit-building-name"
                      type="text"
                      value={editFormData.building_name || ''}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditFormData((prev: EditFormData) => ({ ...prev, building_name: newValue }))
                        clearFieldError('building_name', true)
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('building_name', value, true)
                      }}
                      required={false}
                      placeholder="Enter building name (optional)"
                      errorMessage={backendValidationErrors.building_name || editValidationErrors.building_name}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Owner Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.owner_name}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData((prev: EditFormData) => ({ ...prev, owner_name: newValue }))
                        }}
                        onBlur={(e) => validateField('owner_name', e.target.value, true)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      {(backendValidationErrors.owner_name || editValidationErrors.owner_name) && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {backendValidationErrors.owner_name || editValidationErrors.owner_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={editFormData.phone_number || ''}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData((prev: EditFormData) => ({ ...prev, phone_number: newValue }))
                        }}
                        onBlur={(e) => validateField('phone_number', e.target.value, true)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      {(backendValidationErrors.phone_number || editValidationErrors.phone_number) && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {backendValidationErrors.phone_number || editValidationErrors.phone_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Surface Area (m²) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.surface || ''}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData((prev: EditFormData) => ({ ...prev, surface: parseFloat(newValue) || undefined }))
                        }}
                        onBlur={(e) => validateField('surface', e.target.value, true)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      {(backendValidationErrors.surface || editValidationErrors.surface) && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {backendValidationErrors.surface || editValidationErrors.surface}
                        </p>
                      )}
                    </div>
                    <InputField
                      label="Built Year (Optional)"
                      id="edit-built-year"
                        type="number"
                        value={editFormData.built_year || ''}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditFormData((prev: EditFormData) => ({ ...prev, built_year: newValue === '' ? undefined : newValue }))
                        clearFieldError('built_year', true)
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('built_year', value, true)
                      }}
                      required={false}
                        placeholder="Enter built year (optional)"
                      errorMessage={backendValidationErrors.built_year || editValidationErrors.built_year}
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Agent <span className="text-red-500">*</span></label>
                      <AgentSelector
                        selectedAgentId={editFormData.agent_id}
                        onAgentChange={(agent) => {
                          console.log('🔍 Agent selected in edit form:', agent)
                          const agentId = agent?.id
                          setEditFormData((prev: EditFormData) => ({ ...prev, agent_id: agentId }))
                        }}
                        placeholder="Select agent..."
                      />
                      {(backendValidationErrors.agent_id || editValidationErrors.agent_id) && (
                        <p className="mt-1 text-sm text-red-600">{backendValidationErrors.agent_id || editValidationErrors.agent_id}</p>
                      )}
                    </div>
                    <SelectField
                      label="View Type"
                      id="edit-view-type"
                        value={editFormData.view_type || ''}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData((prev: EditFormData) => ({ ...prev, view_type: newValue as 'open view' | 'sea view' | 'mountain view' | 'no view' }))
                        }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        validateField('view_type', value, true)
                      }}
                      required={true}
                      errorMessage={backendValidationErrors.view_type || editValidationErrors.view_type}
                      >
                        <option value="">Select View Type</option>
                        <option value="open view">Open View</option>
                        <option value="sea view">Sea View</option>
                        <option value="mountain view">Mountain View</option>
                        <option value="no view">No View</option>
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.price || ''}
                        onChange={(e) => {
                          const newValue = e.target.value
                          setEditFormData((prev: EditFormData) => ({ ...prev, price: parseFloat(newValue) || undefined }))
                        }}
                        onBlur={(e) => validateField('price', e.target.value, true)}
                        required
                        placeholder="Enter price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      {(backendValidationErrors.price || editValidationErrors.price) && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {backendValidationErrors.price || editValidationErrors.price}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Concierge Service <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editFormData.concierge}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({ ...prev, concierge: e.target.checked }))
                            clearFieldError('concierge', true)
                          }}
                          onBlur={() => validateField('concierge', editFormData.concierge, true)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                        <span className="ml-2 text-sm text-gray-700">
                          {editFormData.concierge ? 'Yes' : 'No'}
                      </span>
                      </div>
                      {(backendValidationErrors.concierge || editValidationErrors.concierge) && (
                        <p className="mt-1 text-sm text-red-600">{backendValidationErrors.concierge || editValidationErrors.concierge}</p>
                      )}
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={typeof editFormData.details === 'string' ? editFormData.details : (editFormData.details ? JSON.stringify(editFormData.details, null, 2) : '')}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditFormData((prev: EditFormData) => ({ ...prev, details: newValue }))
                      }}
                      onBlur={(e) => validateField('details', e.target.value, true)}
                      required
                      placeholder="Enter property details (floor, balcony, parking, cave, etc.)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    {(backendValidationErrors.details || editValidationErrors.details) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {backendValidationErrors.details || editValidationErrors.details}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interior Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editFormData.interior_details || ''}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditFormData((prev: EditFormData) => ({ ...prev, interior_details: newValue }))
                      }}
                      onBlur={(e) => validateField('interior_details', e.target.value, true)}
                      required
                      placeholder="Enter interior details and features"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    {(backendValidationErrors.interior_details || editValidationErrors.interior_details) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {backendValidationErrors.interior_details || editValidationErrors.interior_details}
                      </p>
                    )}
                  </div>

                  <InputField
                    label="Property URL (Optional)"
                    id="edit-property-url"
                      type="url"
                      value={editFormData.property_url || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setEditFormData((prev: EditFormData) => ({ ...prev, property_url: newValue }))
                      clearFieldError('property_url', true)
                      // Clear backend validation error when user starts typing
                      if (setBackendValidationErrors && backendValidationErrors.property_url) {
                        setBackendValidationErrors({ ...backendValidationErrors, property_url: '' })
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      console.log('🔍 Property URL onBlur triggered with value:', value)
                      validateField('property_url', value, true)
                    }}
                    required={false}
                    placeholder="https://example.com/property-listing"
                    errorMessage={backendValidationErrors.property_url || editValidationErrors.property_url}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      rows={3}
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData((prev: EditFormData) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter additional notes about the property (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referrals (Optional)</label>
                    <ReferralSelector
                      referrals={editFormData.referrals || []}
                      onReferralsChange={(referrals) => setEditFormData((prev: EditFormData) => ({ ...prev, referrals }))}
                      employees={employees}
                      placeholder="Add property referrals (optional)..."
                    />
                  </div>



                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Gallery (Optional)</label>
                    <div className="space-y-4">
                      {/* Gallery Images Display */}
                      {(editFormData.image_gallery && editFormData.image_gallery.length > 0) || localEditGallery.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                          {/* Show original gallery images */}
                          {editFormData.image_gallery && editFormData.image_gallery.map((image, index) => (
                            <div key={`original-${index}`} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
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
                                  setGalleryModified(true)
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Show local gallery images */}
                          {localEditGallery.map((file, index) => (
                            <div key={`local-${index}`} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-blue-300">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`New gallery image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalEditGallery(prev => prev.filter((_, i) => i !== index))
                                  setGalleryModified(true)
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                                NEW
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Add Gallery Images Button */}
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                        onClick={() => {
                          editGalleryImageInputRef.current?.click()
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
                onClick={async () => {
                  console.log('🔍 Save Changes button clicked - validating form...')
                  console.log('🔍 Current property_url value:', editFormData.property_url)
                  
                  // Validate required fields and optional fields with format requirements for edit form
                  const fieldsToValidate = ['status_id', 'category_id', 'location', 'owner_name', 'phone_number', 'surface', 'price', 'details', 'interior_details', 'agent_id', 'view_type', 'concierge', 'built_year', 'property_url']
                  let hasErrors = false

                  fieldsToValidate.forEach(field => {
                    const value = editFormData[field as keyof EditFormData]
                    const isValid = isFieldValid(field, value)
                    console.log(`🔍 Field ${field}: value="${value}", isValid=${isValid}`)
                    
                    if (!isValid) {
                      validateField(field, value, true)
                      hasErrors = true
                    }
                  })

                  console.log('🔍 Validation complete. HasErrors:', hasErrors)

                  // If there are validation errors, don't save
                  if (hasErrors) {
                    console.log('🚫 Validation failed - showing error message')
                    showError('Please fix the validation errors before saving')
                    return
                  }

                  console.log('✅ Validation passed - calling onSaveEdit()')
                  
                  // Save property first and wait for completion
                  await onSaveEdit()
                  
                  // Upload main image if present
                  if (editFormData.main_image_file) {
                    try {
                      console.log('Uploading main image...')
                      const mainImageResult = await uploadMainPropertyImage(editingProperty!.id, editFormData.main_image_file)
                      if (!mainImageResult.success) {
                        console.error('Main image upload failed:', mainImageResult.message)
                        
                        // If it's a CSRF error, suggest refreshing the page
                        if (mainImageResult.message?.includes('Security token expired')) {
                          showError('Security token expired. Please refresh the page and try uploading images again.')
                        } else {
                          showWarning('Property updated but main image upload failed: ' + mainImageResult.message)
                        }
                      } else {
                        console.log('Main image uploaded successfully')
                      }
                    } catch (error) {
                      console.error('Error uploading main image:', error)
                      showError('Failed to upload main image: ' + (error instanceof Error ? error.message : 'Unknown error'))
                    }
                  }
                  
                  // Then upload local gallery files if any exist
                  if (localEditGallery.length > 0) {
                    try {
                      console.log('Uploading', localEditGallery.length, 'gallery images...')
                      const galleryResult = await uploadGalleryImages(editingProperty!.id, localEditGallery)
                      if (!galleryResult.success) {
                        console.error('Gallery upload failed:', galleryResult.message)
                        
                        // If it's a CSRF error, suggest refreshing the page
                        if (galleryResult.message?.includes('Security token expired')) {
                          showError('Security token expired. Please refresh the page and try uploading images again.')
                        } else {
                          showWarning('Property updated but gallery upload failed: ' + galleryResult.message)
                        }
                      } else {
                        console.log('Gallery images uploaded successfully')
                      }
                      setLocalEditGallery([]) // Clear local gallery after upload
                    } catch (error) {
                      console.error('Error uploading gallery images:', error)
                      showError('Failed to upload gallery images: ' + (error instanceof Error ? error.message : 'Unknown error'))
                    }
                  }
                }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image (Optional)</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {viewPropertyData.property_type === 'sale' ? 'Sale' : 'Rent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.category_name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-semibold">
                        {viewPropertyData.reference_number}
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

                  {/* Details, Interior Details, Notes, and Referrals Section */}
                  <div className="space-y-4">
                    {/* Property Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Details</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.details ? (
                          typeof viewPropertyData.details === 'string' ? (
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
                          )
                        ) : (
                          <div className="text-gray-500">No details provided</div>
                        )}
                      </div>
                    </div>

                    {/* Interior Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interior Details</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.interior_details ? (
                          <div className="whitespace-pre-wrap">{viewPropertyData.interior_details}</div>
                        ) : (
                          <div className="text-gray-500">No interior details provided</div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.notes ? (
                          <div className="whitespace-pre-wrap">{viewPropertyData.notes}</div>
                        ) : (
                          <div className="text-gray-500">No notes provided</div>
                        )}
                      </div>
                    </div>

                    {/* Property URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property URL</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {viewPropertyData.property_url ? (
                          <a 
                            href={viewPropertyData.property_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {viewPropertyData.property_url}
                          </a>
                        ) : (
                          <div className="text-gray-500">No URL provided</div>
                        )}
                      </div>
                    </div>

                    {/* Referrals Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Referrals</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {viewPropertyData.referrals && viewPropertyData.referrals.length > 0 ? (
                          <div className="space-y-2">
                            {viewPropertyData.referrals.map((referral, index) => (
                              <div key={index} className="px-3 py-2 bg-white border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1 rounded-full ${referral.type === 'employee' ? 'bg-blue-100' : 'bg-green-100'
                                      }`}>
                                      <User className={`h-3 w-3 ${referral.type === 'employee' ? 'text-blue-600' : 'text-green-600'
                                        }`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {referral.name}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-black">
                                      {referral.type === 'employee' ? 'Employee' : 'Custom'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(referral.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-500">No referrals provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Gallery Section */}
                {viewPropertyData.image_gallery && viewPropertyData.image_gallery.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images (Optional)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {viewPropertyData.image_gallery.map((image, index) => (
                        <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-colors">
                          <img
                            src={getFullImageUrl(image)}
                            alt={`Gallery image ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              const fullImageUrl = getFullImageUrl(image)
                              const allImages = viewPropertyData.image_gallery?.map(img => getFullImageUrl(img)) || []
                              console.log('Opening image modal. Index:', index, 'Image URL:', fullImageUrl, 'All images:', allImages.length)
                              setSelectedImageState(fullImageUrl)
                              setAllImagesState(allImages)
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
                  onClick={() => {
                    console.log('Previous button clicked. Current index:', currentImageIndexState, 'Total images:', allImagesState.length)
                    if (currentImageIndexState > 0) {
                      const newIndex = currentImageIndexState - 1
                      console.log('Moving to index:', newIndex, 'Image URL:', allImagesState[newIndex])
                      setCurrentImageIndexState(newIndex)
                      setSelectedImageState(allImagesState[newIndex])
                    }
                  }}
                  disabled={currentImageIndexState === 0}
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all z-10 ${currentImageIndexState === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-100'
                    }`}
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Next Button */}
                <button
                  onClick={() => {
                    console.log('Next button clicked. Current index:', currentImageIndexState, 'Total images:', allImagesState.length)
                    if (currentImageIndexState < allImagesState.length - 1) {
                      const newIndex = currentImageIndexState + 1
                      console.log('Moving to index:', newIndex, 'Image URL:', allImagesState[newIndex])
                      setCurrentImageIndexState(newIndex)
                      setSelectedImageState(allImagesState[newIndex])
                    }
                  }}
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
