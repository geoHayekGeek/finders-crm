'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Star, ChevronLeft, ChevronRight, Upload, RefreshCw, Building2, User, Calendar, Copy } from 'lucide-react'
import { Property, Category, Status, EditFormData, Referral } from '@/types/property'
import { compressAndConvertToBase64, getRecommendedCompressionOptions } from '@/utils/imageCompression'
import { uploadMainPropertyImage, uploadGalleryImages, validateImageFile, validateImageFiles, createImagePreview, getFullImageUrl } from '@/utils/imageUpload'

import { CategorySelector } from './CategorySelector'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { AgentSelector } from './AgentSelector'
import { OwnerSelector } from './OwnerSelector'
import { ReferralSelector } from './ReferralSelector'
import { ReferenceSourceSelector } from './ReferenceSourceSelector'
import { PropertyReferralsSection } from './PropertyReferralsSection'
import { PropertyShareMenu } from './PropertyShareMenu'
import { PropertyViewingsSection } from './PropertyViewingsSection'
import { ViewingsModals } from './ViewingsModals'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { isAgentRole, isTeamLeaderRole, isAgentManagerRole, isOperationsRole, isAdminRole } from '@/utils/roleUtils'
import { CreateViewingFormData, Viewing } from '@/types/viewing'
import { viewingsApi } from '@/utils/api'

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
  canManageProperties?: boolean
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
  setBackendValidationErrors,
  canManageProperties = true
}: PropertyModalsProps) {
  const { showSuccess, showError, showWarning } = useToast()
  const { user, token } = useAuth()
  const { canViewViewings } = usePermissions()
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  
  // Viewing modal state
  const [showAddViewingModal, setShowAddViewingModal] = useState(false)
  const [selectedPropertyForViewing, setSelectedPropertyForViewing] = useState<Property | null>(null)
  
  // Check if user can create viewings
  const canCreateViewings = () => {
    if (!user) return false
    const role = user.role
    return isAdminRole(role) || isOperationsRole(role) || isAgentManagerRole(role) || isTeamLeaderRole(role) || isAgentRole(role)
  }
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
    owner_id: undefined as number | undefined,
    owner_name: '',
    phone_number: '',
    surface: '',
    details: {
      floor_number: '',
      balcony: '',
      covered_parking: '',
      outdoor_parking: '',
      cave: ''
    } as { floor_number: string; balcony: string; covered_parking: string; outdoor_parking: string; cave: string },
    interior_details: {
      living_rooms: '',
      bedrooms: '',
      bathrooms: '',
      maid_room: ''
    } as { living_rooms: string; bedrooms: string; bathrooms: string; maid_room: string },
    payment_facilities: false,
    payment_facilities_specification: '',
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
        if (typeof value === 'object' && value !== null) {
          // Check if at least one field is filled
          const details = value as { floor_number?: string; balcony?: string; covered_parking?: string; outdoor_parking?: string; cave?: string }
          return !!(details.floor_number || details.balcony || details.covered_parking || details.outdoor_parking || details.cave)
        }
        return value && typeof value === 'string' && value.trim() !== ''
      case 'interior_details':
        if (typeof value === 'object' && value !== null) {
          // Check if at least one field is filled
          const interior = value as { living_rooms?: string; bedrooms?: string; bathrooms?: string; maid_room?: string }
          return !!(interior.living_rooms || interior.bedrooms || interior.bathrooms || interior.maid_room)
        }
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
        if (typeof value === 'object' && value !== null) {
          // Check if at least one field is filled
          const details = value as { floor_number?: string; balcony?: string; covered_parking?: string; outdoor_parking?: string; cave?: string }
          if (!details.floor_number && !details.balcony && !details.covered_parking && !details.outdoor_parking && !details.cave) {
            return 'At least one property detail is required'
          }
        }
        return 'Property details are required'
      case 'interior_details':
        if (typeof value === 'object' && value !== null) {
          // Check if at least one field is filled
          const interior = value as { living_rooms?: string; bedrooms?: string; bathrooms?: string; maid_room?: string }
          if (!interior.living_rooms && !interior.bedrooms && !interior.bathrooms && !interior.maid_room) {
            return 'At least one interior detail is required'
          }
        }
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
            console.log('🔍 Owner ID from API:', propertyData.owner_id, 'Type:', typeof propertyData.owner_id)
            console.log('🔍 Owner Name from API:', propertyData.owner_name)
            console.log('🔍 Details field value:', propertyData.details)
            console.log('🔍 Interior details field value:', propertyData.interior_details)
            console.log('🔍 Notes field value:', propertyData.notes)
            console.log('🔍 Referrals field value:', propertyData.referrals)
            console.log('🔍 Closed date field value:', propertyData.closed_date)
            console.log('🔍 Status ID:', propertyData.status_id)
            console.log('🔍 Status Code:', statuses.find(s => s.id === propertyData.status_id)?.code)
            
            // Format closed_date if it exists - convert from ISO timestamp to YYYY-MM-DD format for date input
            const formatClosedDate = (dateStr: string) => {
              if (!dateStr) return '';
              try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
              } catch (e) {
                return dateStr; // Return as-is if parsing fails
              }
            };

            // Format referral dates to YYYY-MM-DD format for date inputs
            const formatReferralDates = (referrals: any[]) => {
              if (!referrals || !Array.isArray(referrals)) return [];
              return referrals.map(ref => ({
                ...ref,
                date: formatClosedDate(ref.date || '')
              }));
            };

            const formData = {
              reference_number: propertyData.reference_number || '',
              status_id: propertyData.status_id || 0,
              property_type: propertyData.property_type || 'sale',
              location: propertyData.location || '',
              category_id: propertyData.category_id || 0,
              building_name: propertyData.building_name || '',
              owner_id: (() => {
                const rawOwnerId = propertyData.owner_id
                console.log('🔍 Raw owner_id from API:', rawOwnerId, 'Type:', typeof rawOwnerId, 'Is null:', rawOwnerId === null, 'Is undefined:', rawOwnerId === undefined)
                if (rawOwnerId !== null && rawOwnerId !== undefined) {
                  const parsed = parseInt(rawOwnerId.toString())
                  console.log('🔍 Parsed owner_id:', parsed, 'Type:', typeof parsed)
                  return parsed
                }
                console.log('🔍 Owner_id is null or undefined, returning undefined')
                return undefined
              })(),
              owner_name: propertyData.owner_name || '',
              phone_number: propertyData.phone_number || '',
              surface: propertyData.surface,
              details: (() => {
                if (typeof propertyData.details === 'object' && propertyData.details !== null) {
                  return {
                    floor_number: (propertyData.details as any).floor_number || '',
                    balcony: (propertyData.details as any).balcony || '',
                    covered_parking: (propertyData.details as any).covered_parking || '',
                    outdoor_parking: (propertyData.details as any).outdoor_parking || '',
                    cave: (propertyData.details as any).cave || ''
                  }
                }
                return { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }
              })(),
              interior_details: (() => {
                if (typeof propertyData.interior_details === 'object' && propertyData.interior_details !== null) {
                  return {
                    living_rooms: (propertyData.interior_details as any).living_rooms || '',
                    bedrooms: (propertyData.interior_details as any).bedrooms || '',
                    bathrooms: (propertyData.interior_details as any).bathrooms || '',
                    maid_room: (propertyData.interior_details as any).maid_room || ''
                  }
                }
                return { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }
              })(),
              payment_facilities: propertyData.payment_facilities || false,
              payment_facilities_specification: propertyData.payment_facilities_specification || '',
              built_year: propertyData.built_year,
              view_type: propertyData.view_type,
              concierge: propertyData.concierge || false,
              agent_id: propertyData.agent_id ? parseInt(propertyData.agent_id.toString()) : undefined,
              price: propertyData.price,
              notes: propertyData.notes || '',
              property_url: propertyData.property_url || '',
              closed_date: formatClosedDate(propertyData.closed_date || ''),
              sold_amount: propertyData.sold_amount,
              buyer_id: propertyData.buyer_id,
              commission: propertyData.commission,
              platform_id: propertyData.platform_id,
              referrals: formatReferralDates(propertyData.referrals || []),

              main_image: propertyData.main_image || '',
              image_gallery: galleryModified ? editFormData.image_gallery : (propertyData.image_gallery || [])
            }

            console.log('🎯 Setting editFormData:', formData)
            console.log('🎯 Owner ID from API:', propertyData.owner_id)
            console.log('🎯 Owner ID converted:', formData.owner_id)
            console.log('🎯 Owner ID type:', typeof formData.owner_id)
            console.log('🎯 Agent ID from API:', propertyData.agent_id)
            console.log('🎯 Agent ID converted:', formData.agent_id)
            console.log('🎯 Agent ID type:', typeof formData.agent_id)
            console.log('🎯 Full property data:', propertyData)
            setEditFormData(formData)
          } else {
            console.error('❌ Failed to fetch property details:', result.message)
            console.log('🎯 Using fallback data. Agent ID from editingProperty:', editingProperty.agent_id)
            // Format closed_date if it exists - convert from ISO timestamp to YYYY-MM-DD format for date input
            const formatClosedDate = (dateStr: string) => {
              if (!dateStr) return '';
              try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
              } catch (e) {
                return dateStr; // Return as-is if parsing fails
              }
            };

            // Format referral dates to YYYY-MM-DD format for date inputs
            const formatReferralDates = (referrals: any[]) => {
              if (!referrals || !Array.isArray(referrals)) return [];
              return referrals.map(ref => ({
                ...ref,
                date: formatClosedDate(ref.date || '')
              }));
            };

            // Fallback to existing property data
            setEditFormData({
              reference_number: editingProperty.reference_number || '',
              status_id: editingProperty.status_id || 0,
              property_type: editingProperty.property_type || 'sale',
              location: editingProperty.location || '',
              category_id: editingProperty.category_id || 0,
              building_name: editingProperty.building_name || '',
              owner_id: editingProperty.owner_id ? parseInt(editingProperty.owner_id.toString()) : undefined,
              owner_name: editingProperty.owner_name || '',
              phone_number: editingProperty.phone_number || '',
              surface: editingProperty.surface,
              details: (() => {
                if (typeof editingProperty.details === 'object' && editingProperty.details !== null) {
                  return {
                    floor_number: (editingProperty.details as any).floor_number || '',
                    balcony: (editingProperty.details as any).balcony || '',
                    covered_parking: (editingProperty.details as any).covered_parking || '',
                    outdoor_parking: (editingProperty.details as any).outdoor_parking || '',
                    cave: (editingProperty.details as any).cave || ''
                  }
                }
                return { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }
              })(),
              interior_details: (() => {
                if (typeof editingProperty.interior_details === 'object' && editingProperty.interior_details !== null) {
                  return {
                    living_rooms: (editingProperty.interior_details as any).living_rooms || '',
                    bedrooms: (editingProperty.interior_details as any).bedrooms || '',
                    bathrooms: (editingProperty.interior_details as any).bathrooms || '',
                    maid_room: (editingProperty.interior_details as any).maid_room || ''
                  }
                }
                return { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }
              })(),
              payment_facilities: (editingProperty as any).payment_facilities || false,
              payment_facilities_specification: (editingProperty as any).payment_facilities_specification || '',
              built_year: editingProperty.built_year,
              view_type: editingProperty.view_type,
              concierge: editingProperty.concierge || false,
              agent_id: editingProperty.agent_id ? parseInt(editingProperty.agent_id.toString()) : undefined,
              price: editingProperty.price,
              notes: editingProperty.notes || '',
              property_url: editingProperty.property_url || '',
              closed_date: formatClosedDate(editingProperty.closed_date || ''),
              sold_amount: editingProperty.sold_amount,
              buyer_id: editingProperty.buyer_id,
              commission: editingProperty.commission,
              platform_id: editingProperty.platform_id,
              referrals: formatReferralDates(editingProperty.referrals || []),

              main_image: editingProperty.main_image || '',
              image_gallery: editingProperty.image_gallery || []
            })
          }
        } catch (error) {
          console.error('❌ Error fetching property details:', error)
          // Format closed_date if it exists - convert from ISO timestamp to YYYY-MM-DD format for date input
          const formatClosedDate = (dateStr: string) => {
            if (!dateStr) return '';
            try {
              const date = new Date(dateStr);
              return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
            } catch (e) {
              return dateStr; // Return as-is if parsing fails
            }
          };

          // Format referral dates to YYYY-MM-DD format for date inputs
          const formatReferralDates = (referrals: any[]) => {
            if (!referrals || !Array.isArray(referrals)) return [];
            return referrals.map(ref => ({
              ...ref,
              date: formatClosedDate(ref.date || '')
            }));
          };

          // Fallback to existing property data
          setEditFormData({
            reference_number: editingProperty.reference_number || '',
            status_id: editingProperty.status_id || 0,
            property_type: editingProperty.property_type || 'sale',
            location: editingProperty.location || '',
            category_id: editingProperty.category_id || 0,
            building_name: editingProperty.building_name || '',
            owner_id: editingProperty.owner_id ? parseInt(editingProperty.owner_id.toString()) : undefined,
            owner_name: editingProperty.owner_name || '',
            phone_number: editingProperty.phone_number || '',
            surface: editingProperty.surface,
            details: (() => {
              if (typeof editingProperty.details === 'object' && editingProperty.details !== null) {
                return {
                  floor_number: (editingProperty.details as any).floor_number || '',
                  balcony: (editingProperty.details as any).balcony || '',
                  covered_parking: (editingProperty.details as any).covered_parking || '',
                  outdoor_parking: (editingProperty.details as any).outdoor_parking || '',
                  cave: (editingProperty.details as any).cave || ''
                }
              }
              return { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }
            })(),
            interior_details: (() => {
              if (typeof editingProperty.interior_details === 'object' && editingProperty.interior_details !== null) {
                return {
                  living_rooms: (editingProperty.interior_details as any).living_rooms || '',
                  bedrooms: (editingProperty.interior_details as any).bedrooms || '',
                  bathrooms: (editingProperty.interior_details as any).bathrooms || '',
                  maid_room: (editingProperty.interior_details as any).maid_room || ''
                }
              }
              return { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }
            })(),
            payment_facilities: (editingProperty as any).payment_facilities || false,
            payment_facilities_specification: (editingProperty as any).payment_facilities_specification || '',
            built_year: editingProperty.built_year,
            view_type: editingProperty.view_type,
            concierge: editingProperty.concierge || false,
            agent_id: editingProperty.agent_id,
            price: editingProperty.price,
            notes: editingProperty.notes || '',
            property_url: editingProperty.property_url || '',
            closed_date: formatClosedDate(editingProperty.closed_date || ''),
            sold_amount: editingProperty.sold_amount,
            buyer_id: editingProperty.buyer_id,
            commission: editingProperty.commission,
            platform_id: editingProperty.platform_id,
            referrals: formatReferralDates(editingProperty.referrals || []),

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
            console.log('🔍 View Owner ID from API:', result.data.owner_id, 'Type:', typeof result.data.owner_id)
            console.log('🔍 View Owner Name from API:', result.data.owner_name)
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
      owner_id: undefined as number | undefined,
      owner_name: '',
      phone_number: '',
      surface: '',
      details: {
        floor_number: '',
        balcony: '',
        covered_parking: '',
        outdoor_parking: '',
        cave: ''
      },
      interior_details: {
        living_rooms: '',
        bedrooms: '',
        bathrooms: '',
        maid_room: ''
      },
      payment_facilities: false,
      payment_facilities_specification: '',
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

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess('URL copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
      showError('Failed to copy URL to clipboard')
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
                    owner_id: addFormData.owner_id || undefined,
                    owner_name: addFormData.owner_name || undefined,
                    phone_number: addFormData.phone_number || undefined,
                    surface: parseFloat(addFormData.surface),
                    details: addFormData.details,
                    interior_details: addFormData.interior_details,
                    payment_facilities: addFormData.payment_facilities || false,
                    payment_facilities_specification: addFormData.payment_facilities ? addFormData.payment_facilities_specification : undefined,
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner (Lead) <span className="text-red-500">*</span>
                    </label>
                    <OwnerSelector
                      selectedOwnerId={addFormData.owner_id}
                      onOwnerChange={(owner) => {
                        console.log('Owner selected:', owner)
                        if (owner) {
                          setAddFormData(prev => ({
                            ...prev,
                            owner_id: owner.id,
                            owner_name: owner.customer_name,
                            phone_number: owner.phone_number || ''
                          }))
                          // Clear validation errors for owner fields
                          setValidationErrors(prev => ({
                            ...prev,
                            owner_name: '',
                            phone_number: ''
                          }))
                        } else {
                          setAddFormData(prev => ({
                            ...prev,
                            owner_id: undefined,
                            owner_name: '',
                            phone_number: ''
                          }))
                        }
                      }}
                      placeholder="Select owner from leads..."
                    />
                    {(validationErrors.owner_name || validationErrors.owner_id) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {validationErrors.owner_name || validationErrors.owner_id || 'Owner is required'}
                      </p>
                    )}
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
                  {/* Property Details Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Property Details <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="Floor #"
                        id="add-floor-number"
                        type="text"
                        value={addFormData.details.floor_number}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            details: { ...prev.details, floor_number: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('details', addFormData.details)}
                        placeholder="e.g., 5th Floor"
                        errorMessage={validationErrors.details}
                      />
                      <InputField
                        label="Balcony"
                        id="add-balcony"
                        type="text"
                        value={addFormData.details.balcony}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            details: { ...prev.details, balcony: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('details', addFormData.details)}
                        placeholder="e.g., Yes/No or details"
                        errorMessage=""
                      />
                      <InputField
                        label="Covered Parking"
                        id="add-covered-parking"
                        type="text"
                        value={addFormData.details.covered_parking}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            details: { ...prev.details, covered_parking: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('details', addFormData.details)}
                        placeholder="e.g., 2 spaces"
                        errorMessage=""
                      />
                      <InputField
                        label="Outdoor Parking"
                        id="add-outdoor-parking"
                        type="text"
                        value={addFormData.details.outdoor_parking}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            details: { ...prev.details, outdoor_parking: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('details', addFormData.details)}
                        placeholder="e.g., 1 space"
                        errorMessage=""
                      />
                      <InputField
                        label="Cave"
                        id="add-cave"
                        type="text"
                        value={addFormData.details.cave}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            details: { ...prev.details, cave: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('details', addFormData.details)}
                        placeholder="e.g., Yes/No or details"
                        errorMessage=""
                      />
                    </div>
                    {validationErrors.details && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {validationErrors.details}
                      </p>
                    )}
                  </div>

                  {/* Interior Details Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Interior Details <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="Living Rooms"
                        id="add-living-rooms"
                        type="text"
                        value={addFormData.interior_details.living_rooms}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            interior_details: { ...prev.interior_details, living_rooms: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('interior_details', addFormData.interior_details)}
                        placeholder="e.g., 2"
                        errorMessage=""
                      />
                      <InputField
                        label="Bedrooms"
                        id="add-bedrooms"
                        type="text"
                        value={addFormData.interior_details.bedrooms}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            interior_details: { ...prev.interior_details, bedrooms: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('interior_details', addFormData.interior_details)}
                        placeholder="e.g., 3"
                        errorMessage=""
                      />
                      <InputField
                        label="Bathrooms"
                        id="add-bathrooms"
                        type="text"
                        value={addFormData.interior_details.bathrooms}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            interior_details: { ...prev.interior_details, bathrooms: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('interior_details', addFormData.interior_details)}
                        placeholder="e.g., 2"
                        errorMessage=""
                      />
                      <InputField
                        label="Maid Room"
                        id="add-maid-room"
                        type="text"
                        value={addFormData.interior_details.maid_room}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            interior_details: { ...prev.interior_details, maid_room: e.target.value }
                          }))
                        }}
                        onBlur={() => validateField('interior_details', addFormData.interior_details)}
                        placeholder="e.g., Yes/No or details"
                        errorMessage=""
                      />
                    </div>
                    {validationErrors.interior_details && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {validationErrors.interior_details}
                      </p>
                    )}
                  </div>

                  {/* Payment Facilities Section */}
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        id="add-payment-facilities"
                        checked={addFormData.payment_facilities}
                        onChange={(e) => {
                          setAddFormData(prev => ({
                            ...prev,
                            payment_facilities: e.target.checked,
                            payment_facilities_specification: e.target.checked ? prev.payment_facilities_specification : ''
                          }))
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="add-payment-facilities" className="block text-sm font-medium text-gray-700">
                        Payment Facilities
                      </label>
                    </div>
                    {addFormData.payment_facilities && (
                      <div className="mt-2">
                        <InputField
                          label="Please specify:"
                          id="add-payment-facilities-specification"
                          type="text"
                          value={addFormData.payment_facilities_specification}
                          onChange={(e) => {
                            setAddFormData(prev => ({
                              ...prev,
                              payment_facilities_specification: e.target.value
                            }))
                          }}
                          placeholder="Enter payment facilities details"
                          errorMessage=""
                        />
                      </div>
                    )}
                  </div>

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
                          setEditFormData((prev: EditFormData) => {
                            const newStatus = statuses.find(s => s.id === statusId);
                            const shouldAutoFillClosedDate = newStatus && newStatus.code === 'closed';
                            
                            return {
                              ...prev, 
                              status_id: statusId,
                              // Auto-fill closed_date if changing to closed and it's empty
                              closed_date: shouldAutoFillClosedDate && !prev.closed_date 
                                ? new Date().toISOString().split('T')[0] 
                                : prev.closed_date,
                              // Clear closing fields if moving away from closed status
                              sold_amount: shouldAutoFillClosedDate ? prev.sold_amount : undefined,
                              buyer_id: shouldAutoFillClosedDate ? prev.buyer_id : undefined,
                              commission: shouldAutoFillClosedDate ? prev.commission : undefined,
                              platform_id: shouldAutoFillClosedDate ? prev.platform_id : undefined
                            };
                          });
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

                  {/* Closed Date and Closing Fields - only show when status is 'closed' */}
                  {(() => {
                    const selectedStatus = statuses.find(s => s.id === editFormData.status_id);
                    const shouldShowClosedFields = selectedStatus && selectedStatus.code === 'closed';
                    
                    console.log('🔍 Render check - Status ID:', editFormData.status_id, 'Selected Status:', selectedStatus?.code, 'Should Show:', shouldShowClosedFields, 'Closed Date Value:', editFormData.closed_date);
                    
                    if (shouldShowClosedFields) {
                      return (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Closing Details</h3>
                          
                          {/* Closed Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Calendar className="inline h-4 w-4 mr-1" />
                              Closed Date
                            </label>
                            <input
                              type="date"
                              value={editFormData.closed_date || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('📅 Closed date input changed:', newValue);
                                setEditFormData((prev: EditFormData) => ({ ...prev, closed_date: newValue }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                          </div>

                          {/* Sold Amount */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sold Amount ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.sold_amount || ''}
                              onChange={(e) => {
                                const newValue = e.target.value ? parseFloat(e.target.value) : undefined;
                                setEditFormData((prev: EditFormData) => ({ ...prev, sold_amount: newValue }));
                              }}
                              placeholder="Enter sold amount (optional)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                          </div>

                          {/* Buyer (Client) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Client (Buyer)
                            </label>
                            <OwnerSelector
                              selectedOwnerId={editFormData.buyer_id}
                              onOwnerChange={(owner) => {
                                console.log('Buyer selected:', owner)
                                if (owner) {
                                  setEditFormData((prev: EditFormData) => ({
                                    ...prev,
                                    buyer_id: owner.id
                                  }))
                                } else {
                                  setEditFormData((prev: EditFormData) => ({
                                    ...prev,
                                    buyer_id: undefined
                                  }))
                                }
                              }}
                              placeholder="Select buyer from leads..."
                            />
                          </div>

                          {/* Commission */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Commission ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.commission || ''}
                              onChange={(e) => {
                                const newValue = e.target.value ? parseFloat(e.target.value) : undefined;
                                setEditFormData((prev: EditFormData) => ({ ...prev, commission: newValue }));
                              }}
                              placeholder="Enter commission amount (optional)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                          </div>

                          {/* Platform */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Platform
                            </label>
                            <ReferenceSourceSelector
                              selectedReferenceSourceId={editFormData.platform_id}
                              onReferenceSourceChange={(sourceId) => {
                                setEditFormData((prev: EditFormData) => ({
                                  ...prev,
                                  platform_id: sourceId || undefined
                                }))
                              }}
                              placeholder="Select platform..."
                            />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner (Lead) <span className="text-red-500">*</span>
                    </label>
                    <OwnerSelector
                      selectedOwnerId={editFormData.owner_id}
                      onOwnerChange={(owner) => {
                        console.log('Owner selected in edit:', owner)
                        if (owner) {
                          setEditFormData((prev: EditFormData) => ({
                            ...prev,
                            owner_id: owner.id,
                            owner_name: owner.customer_name,
                            phone_number: owner.phone_number || ''
                          }))
                          // Clear validation errors for owner fields
                          setEditValidationErrors(prev => ({
                            ...prev,
                            owner_name: '',
                            phone_number: ''
                          }))
                          if (setBackendValidationErrors) {
                            setBackendValidationErrors({
                              ...backendValidationErrors,
                              owner_name: '',
                              phone_number: ''
                            })
                          }
                        } else {
                          setEditFormData((prev: EditFormData) => ({
                            ...prev,
                            owner_id: undefined,
                            owner_name: '',
                            phone_number: ''
                          }))
                        }
                      }}
                      placeholder="Select owner from leads..."
                    />
                    {(backendValidationErrors.owner_name || editValidationErrors.owner_name) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {backendValidationErrors.owner_name || editValidationErrors.owner_name || 'Owner is required'}
                      </p>
                    )}
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


                  {/* Property Details Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Property Details <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Floor #</label>
                        <input
                          type="text"
                          value={typeof editFormData.details === 'object' && editFormData.details !== null ? (editFormData.details as any).floor_number || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              details: {
                                ...(typeof prev.details === 'object' && prev.details !== null ? prev.details : { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }),
                                floor_number: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('details', editFormData.details, true)}
                          placeholder="e.g., 5th Floor"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Balcony</label>
                        <input
                          type="text"
                          value={typeof editFormData.details === 'object' && editFormData.details !== null ? (editFormData.details as any).balcony || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              details: {
                                ...(typeof prev.details === 'object' && prev.details !== null ? prev.details : { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }),
                                balcony: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('details', editFormData.details, true)}
                          placeholder="e.g., Yes/No or details"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Covered Parking</label>
                        <input
                          type="text"
                          value={typeof editFormData.details === 'object' && editFormData.details !== null ? (editFormData.details as any).covered_parking || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              details: {
                                ...(typeof prev.details === 'object' && prev.details !== null ? prev.details : { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }),
                                covered_parking: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('details', editFormData.details, true)}
                          placeholder="e.g., 2 spaces"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Outdoor Parking</label>
                        <input
                          type="text"
                          value={typeof editFormData.details === 'object' && editFormData.details !== null ? (editFormData.details as any).outdoor_parking || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              details: {
                                ...(typeof prev.details === 'object' && prev.details !== null ? prev.details : { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }),
                                outdoor_parking: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('details', editFormData.details, true)}
                          placeholder="e.g., 1 space"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cave</label>
                        <input
                          type="text"
                          value={typeof editFormData.details === 'object' && editFormData.details !== null ? (editFormData.details as any).cave || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              details: {
                                ...(typeof prev.details === 'object' && prev.details !== null ? prev.details : { floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' }),
                                cave: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('details', editFormData.details, true)}
                          placeholder="e.g., Yes/No or details"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>
                    {(backendValidationErrors.details || editValidationErrors.details) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {backendValidationErrors.details || editValidationErrors.details}
                      </p>
                    )}
                  </div>

                  {/* Interior Details Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Interior Details <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Living Rooms</label>
                        <input
                          type="text"
                          value={typeof editFormData.interior_details === 'object' && editFormData.interior_details !== null ? (editFormData.interior_details as any).living_rooms || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              interior_details: {
                                ...(typeof prev.interior_details === 'object' && prev.interior_details !== null ? prev.interior_details : { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }),
                                living_rooms: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('interior_details', editFormData.interior_details, true)}
                          placeholder="e.g., 2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                        <input
                          type="text"
                          value={typeof editFormData.interior_details === 'object' && editFormData.interior_details !== null ? (editFormData.interior_details as any).bedrooms || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              interior_details: {
                                ...(typeof prev.interior_details === 'object' && prev.interior_details !== null ? prev.interior_details : { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }),
                                bedrooms: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('interior_details', editFormData.interior_details, true)}
                          placeholder="e.g., 3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                        <input
                          type="text"
                          value={typeof editFormData.interior_details === 'object' && editFormData.interior_details !== null ? (editFormData.interior_details as any).bathrooms || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              interior_details: {
                                ...(typeof prev.interior_details === 'object' && prev.interior_details !== null ? prev.interior_details : { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }),
                                bathrooms: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('interior_details', editFormData.interior_details, true)}
                          placeholder="e.g., 2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maid Room</label>
                        <input
                          type="text"
                          value={typeof editFormData.interior_details === 'object' && editFormData.interior_details !== null ? (editFormData.interior_details as any).maid_room || '' : ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              interior_details: {
                                ...(typeof prev.interior_details === 'object' && prev.interior_details !== null ? prev.interior_details : { living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' }),
                                maid_room: e.target.value
                              }
                            }))
                          }}
                          onBlur={() => validateField('interior_details', editFormData.interior_details, true)}
                          placeholder="e.g., Yes/No or details"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>
                    {(backendValidationErrors.interior_details || editValidationErrors.interior_details) && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {backendValidationErrors.interior_details || editValidationErrors.interior_details}
                      </p>
                    )}
                  </div>

                  {/* Payment Facilities Section */}
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        id="edit-payment-facilities"
                        checked={editFormData.payment_facilities || false}
                        onChange={(e) => {
                          setEditFormData((prev: EditFormData) => ({
                            ...prev,
                            payment_facilities: e.target.checked,
                            payment_facilities_specification: e.target.checked ? prev.payment_facilities_specification : ''
                          }))
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit-payment-facilities" className="block text-sm font-medium text-gray-700">
                        Payment Facilities
                      </label>
                    </div>
                    {(editFormData.payment_facilities || false) && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Please specify:</label>
                        <input
                          type="text"
                          value={editFormData.payment_facilities_specification || ''}
                          onChange={(e) => {
                            setEditFormData((prev: EditFormData) => ({
                              ...prev,
                              payment_facilities_specification: e.target.value
                            }))
                          }}
                          placeholder="Enter payment facilities details"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-wrap gap-3">
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
              <div className="flex items-center gap-3">
                <PropertyShareMenu property={viewPropertyData} variant="button" />
                <button
                  onClick={() => setShowViewPropertyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
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

                  {/* Closed Date - only show if status is 'closed' */}
                  {(() => {
                    const selectedStatus = statuses.find(s => s.id === viewPropertyData.status_id);
                    if (selectedStatus && selectedStatus.code === 'closed') {
                      return (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Closing Details</h3>
                          
                          {viewPropertyData.closed_date && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Closed Date
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                {new Date(viewPropertyData.closed_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          )}

                          {viewPropertyData.sold_amount && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sold Amount
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                ${viewPropertyData.sold_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}

                          {viewPropertyData.buyer_id && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client (Buyer)
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                <div className="font-medium">{viewPropertyData.buyer_name || `Lead ID: ${viewPropertyData.buyer_id}`}</div>
                                {viewPropertyData.buyer_phone_number && (
                                  <div className="text-sm text-gray-600 mt-1">{viewPropertyData.buyer_phone_number}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {viewPropertyData.commission && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Commission
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                ${viewPropertyData.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}

                          {viewPropertyData.platform_id && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Platform
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                {viewPropertyData.platform_name || `Platform ID: ${viewPropertyData.platform_id}`}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                      {(() => {
                        const hasOwner = viewPropertyData && viewPropertyData.owner_id
                        const hasRole = isAdminRole(user?.role) || isOperationsRole(user?.role) || isAgentManagerRole(user?.role)
                        const notHidden = viewPropertyData?.owner_name !== 'Hidden'
                        const isClickable = hasOwner && hasRole && notHidden
                        
                        console.log('🔍 View Modal Owner Check:', {
                          hasOwner,
                          owner_id: viewPropertyData?.owner_id,
                          owner_id_type: typeof viewPropertyData?.owner_id,
                          hasRole,
                          userRole: user?.role,
                          notHidden,
                          owner_name: viewPropertyData?.owner_name,
                          isClickable
                        })
                        
                        return isClickable ? (
                          <div 
                            onClick={() => {
                              const url = `/dashboard/leads?view=${viewPropertyData.owner_id}`
                              console.log('🔗 Opening lead URL:', url)
                              window.open(url, '_blank')
                            }}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors text-gray-900"
                            title="Click to view lead details"
                          >
                            {viewPropertyData.owner_name || 'N/A'}
                      </div>
                        ) : (
                          <div className={`px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg ${viewPropertyData?.owner_name === 'Hidden' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                            {viewPropertyData?.owner_name === 'Hidden' ? 'Hidden' : (viewPropertyData?.owner_name || 'N/A')}
                          </div>
                        )
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className={`px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg ${viewPropertyData.phone_number === 'Hidden' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                        {viewPropertyData.phone_number === 'Hidden' ? 'Hidden' : (viewPropertyData.phone_number || 'N/A')}
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
                          typeof viewPropertyData.details === 'object' && viewPropertyData.details !== null ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(viewPropertyData.details as any).floor_number && (
                                <div><strong>Floor #:</strong> {(viewPropertyData.details as any).floor_number}</div>
                              )}
                              {(viewPropertyData.details as any).balcony && (
                                <div><strong>Balcony:</strong> {(viewPropertyData.details as any).balcony}</div>
                              )}
                              {(viewPropertyData.details as any).covered_parking && (
                                <div><strong>Covered Parking:</strong> {(viewPropertyData.details as any).covered_parking}</div>
                              )}
                              {(viewPropertyData.details as any).outdoor_parking && (
                                <div><strong>Outdoor Parking:</strong> {(viewPropertyData.details as any).outdoor_parking}</div>
                              )}
                              {(viewPropertyData.details as any).cave && (
                                <div><strong>Cave:</strong> {(viewPropertyData.details as any).cave}</div>
                              )}
                            </div>
                          ) : typeof viewPropertyData.details === 'string' ? (
                            <div className="whitespace-pre-wrap">{viewPropertyData.details}</div>
                          ) : (
                            <div className="text-gray-500">No details provided</div>
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
                          typeof viewPropertyData.interior_details === 'object' && viewPropertyData.interior_details !== null ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(viewPropertyData.interior_details as any).living_rooms && (
                                <div><strong>Living Rooms:</strong> {(viewPropertyData.interior_details as any).living_rooms}</div>
                              )}
                              {(viewPropertyData.interior_details as any).bedrooms && (
                                <div><strong>Bedrooms:</strong> {(viewPropertyData.interior_details as any).bedrooms}</div>
                              )}
                              {(viewPropertyData.interior_details as any).bathrooms && (
                                <div><strong>Bathrooms:</strong> {(viewPropertyData.interior_details as any).bathrooms}</div>
                              )}
                              {(viewPropertyData.interior_details as any).maid_room && (
                                <div><strong>Maid Room:</strong> {(viewPropertyData.interior_details as any).maid_room}</div>
                              )}
                            </div>
                          ) : typeof viewPropertyData.interior_details === 'string' ? (
                            <div className="whitespace-pre-wrap">{viewPropertyData.interior_details}</div>
                          ) : (
                            <div className="text-gray-500">No interior details provided</div>
                          )
                        ) : (
                          <div className="text-gray-500">No interior details provided</div>
                        )}
                      </div>
                    </div>

                    {/* Payment Facilities */}
                    {((viewPropertyData as any).payment_facilities || (viewPropertyData as any).payment_facilities_specification) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Facilities</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(viewPropertyData as any).payment_facilities ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {(viewPropertyData as any).payment_facilities ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {(viewPropertyData as any).payment_facilities_specification && (
                            <div className="mt-2">
                              <strong>Specification:</strong> {(viewPropertyData as any).payment_facilities_specification}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                          <div className="flex items-center justify-between">
                            <a 
                              href={viewPropertyData.property_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all flex-1 mr-2"
                            >
                              {viewPropertyData.property_url}
                            </a>
                            <button
                              onClick={() => viewPropertyData.property_url && copyToClipboard(viewPropertyData.property_url)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                              title="Copy URL to clipboard"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-gray-500">No URL provided</div>
                        )}
                      </div>
                    </div>

                    {/* Referrals Section */}
                    <PropertyReferralsSection
                      propertyId={viewPropertyData.id}
                      referrals={viewPropertyData.referrals || []}
                      isLoading={false}
                      canEdit={false}
                    />

                    {/* Viewings Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Property Viewings</label>
                      <PropertyViewingsSection
                        propertyId={viewPropertyData.id}
                        canEdit={canManageProperties}
                        canAddViewing={canViewViewings && canCreateViewings()}
                        propertyAgentId={viewPropertyData.agent_id}
                        onAddViewing={() => {
                          // Security: Double-check that agent can add viewing to this property
                          if (isAgentRole(user?.role) && viewPropertyData.agent_id !== user?.id && viewPropertyData.agent_id !== undefined) {
                            showError('You can only create viewings for properties assigned to you')
                            return
                          }
                          setSelectedPropertyForViewing(viewPropertyData)
                          setShowAddViewingModal(true)
                        }}
                      />
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
              {canManageProperties && (
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
              )}
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

      {/* Viewings Modals */}
      {showAddViewingModal && selectedPropertyForViewing && (
        <ViewingsModals
          showAddModal={showAddViewingModal}
          setShowAddModal={(show) => {
            setShowAddViewingModal(show)
            if (!show) {
              setSelectedPropertyForViewing(null)
            }
          }}
          onSaveAdd={async (viewingData: CreateViewingFormData) => {
            if (!token) {
              showError('You must be logged in to create viewings')
              return
            }
            
            // Security: For agents, ALWAYS ensure agent_id is set to their own ID
            // This prevents any manipulation of the viewing data
            let secureViewingData = { ...viewingData }
            if (isAgentRole(user?.role) && user?.id) {
              secureViewingData.agent_id = user.id
            }
            
            // Pre-fill property ID
            const dataWithProperty = {
              ...secureViewingData,
              property_id: selectedPropertyForViewing.id
            }
            
            try {
              const response = await viewingsApi.create(dataWithProperty, token)
              if (response.success) {
                showSuccess('Viewing created successfully')
                setShowAddViewingModal(false)
                setSelectedPropertyForViewing(null)
                // Refresh properties to show updated viewings
                if (onRefreshProperties) {
                  onRefreshProperties()
                }
                return response.data
              } else {
                showError(response.message || 'Failed to create viewing')
                throw new Error(response.message || 'Failed to create viewing')
              }
            } catch (error) {
              console.error('Error creating viewing:', error)
              showError(error instanceof Error ? error.message : 'Failed to create viewing')
              throw error
            }
          }}
          showEditModal={false}
          setShowEditModal={() => {}}
          editingViewing={null}
          onSaveEdit={async () => {}}
          showViewModal={false}
          setShowViewModal={() => {}}
          viewingViewing={null}
          onRefreshViewing={async () => null}
          showDeleteModal={false}
          setShowDeleteModal={() => {}}
          deletingViewing={null}
          deleteConfirmation=""
          setDeleteConfirmation={() => {}}
          onConfirmDelete={async () => {}}
          preSelectedPropertyId={selectedPropertyForViewing.id}
        />
      )}
    </>
  )
}
