'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  Grid3X3,
  List,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Camera,
  Image as ImageIcon,
  Check,
  CheckCircle
} from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import { usePermissions, RequirePropertyManagement } from '@/contexts/PermissionContext'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Property {
  id: number
  title: string
  address: string
  price: string
  status: string
  type: string
  beds: number
  baths: number
  sqft: number
  image: string
  agent: string
  rating: number
  featured: boolean
  images?: string[] // Add images array for gallery
}

const properties: Property[] = [
  {
    id: 1,
    title: 'Modern Downtown Apartment',
    address: '123 Main St, Downtown',
    price: '$450,000',
    status: 'For Sale',
    type: 'Apartment',
    beds: 2,
    baths: 2,
    sqft: 1200,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Sarah Johnson',
    rating: 4.8,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
    ]
  },
  {
    id: 2,
    title: 'Luxury Family Home',
    address: '456 Oak Ave, Suburbs',
    price: '$850,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 4,
    baths: 3,
    sqft: 2800,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Mike Chen',
    rating: 4.9,
    featured: true,
  },
  {
    id: 3,
    title: 'Investment Property',
    address: '789 Pine Rd, Business District',
    price: '$320,000',
    status: 'For Rent',
    type: 'Commercial',
    beds: 0,
    baths: 1,
    sqft: 800,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    agent: 'Lisa Rodriguez',
    rating: 4.7,
    featured: false,
  },
  {
    id: 4,
    title: 'Cozy Townhouse',
    address: '321 Elm St, Midtown',
    price: '$380,000',
    status: 'For Sale',
    type: 'Townhouse',
    beds: 3,
    baths: 2.5,
    sqft: 1600,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'David Wilson',
    rating: 4.6,
    featured: false,
  },
  {
    id: 5,
    title: 'Waterfront Condo',
    address: '654 Harbor Dr, Waterfront',
    price: '$650,000',
    status: 'For Sale',
    type: 'Condo',
    beds: 2,
    baths: 2,
    sqft: 1400,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Jennifer Lee',
    rating: 4.9,
    featured: true,
  },
  {
    id: 6,
    title: 'Suburban Ranch',
    address: '987 Maple Ln, Suburbs',
    price: '$420,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 3,
    baths: 2,
    sqft: 2000,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Robert Brown',
    rating: 4.5,
    featured: false,
  },
  {
    id: 7,
    title: 'Urban Loft',
    address: '555 Industrial Blvd, Arts District',
    price: '$580,000',
    status: 'For Sale',
    type: 'Apartment',
    beds: 1,
    baths: 1.5,
    sqft: 1100,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Emma Thompson',
    rating: 4.4,
    featured: false,
  },
  {
    id: 8,
    title: 'Mountain Retreat',
    address: '777 Summit Way, Highlands',
    price: '$1,200,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 5,
    baths: 4,
    sqft: 3500,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'James Wilson',
    rating: 4.9,
    featured: true,
  },
  {
    id: 9,
    title: 'Garden Studio',
    address: '888 Green Thumb Ln, Botanical Gardens',
    price: '$280,000',
    status: 'For Sale',
    type: 'Condo',
    beds: 1,
    baths: 1,
    sqft: 800,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    agent: 'Maria Garcia',
    rating: 4.3,
    featured: false,
  },
  {
    id: 10,
    title: 'Executive Penthouse',
    address: '999 Skyline Dr, Financial District',
    price: '$2,500,000',
    status: 'For Sale',
    type: 'Apartment',
    beds: 3,
    baths: 3.5,
    sqft: 2800,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Alexander Chen',
    rating: 5.0,
    featured: true,
  },
  {
    id: 11,
    title: 'Historic Victorian',
    address: '111 Heritage St, Old Town',
    price: '$750,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 4,
    baths: 2.5,
    sqft: 2200,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Victoria Smith',
    rating: 4.7,
    featured: false,
  },
  {
    id: 12,
    title: 'Beachfront Bungalow',
    address: '222 Ocean Dr, Coastal Village',
    price: '$1,800,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 3,
    baths: 2,
    sqft: 1800,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Carlos Rodriguez',
    rating: 4.8,
    featured: true,
  },
  {
    id: 13,
    title: 'Tech Hub Office',
    address: '333 Innovation Ave, Startup District',
    price: '$450,000',
    status: 'For Rent',
    type: 'Commercial',
    beds: 0,
    baths: 2,
    sqft: 1200,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    agent: 'Sophie Kim',
    rating: 4.6,
    featured: false,
  },
  {
    id: 14,
    title: 'Modern Farmhouse',
    address: '444 Country Rd, Rural Valley',
    price: '$950,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 4,
    baths: 3,
    sqft: 3200,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Michael O\'Connor',
    rating: 4.8,
    featured: false,
  },
  {
    id: 15,
    title: 'Luxury Penthouse Suite',
    address: '555 Premium Heights, Luxury District',
    price: '$3,200,000',
    status: 'For Sale',
    type: 'Apartment',
    beds: 4,
    baths: 4.5,
    sqft: 3800,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Isabella Martinez',
    rating: 5.0,
    featured: true,
  },
  {
    id: 16,
    title: 'Cozy Cottage',
    address: '666 Quaint Lane, Village Center',
    price: '$320,000',
    status: 'For Sale',
    type: 'Single Family',
    beds: 2,
    baths: 1,
    sqft: 900,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Patrick O\'Malley',
    rating: 4.4,
    featured: false,
  },
  {
    id: 17,
    title: 'Urban Warehouse Conversion',
    address: '777 Industrial Way, Creative Quarter',
    price: '$680,000',
    status: 'For Sale',
    type: 'Commercial',
    beds: 0,
    baths: 2,
    sqft: 1500,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    agent: 'Rachel Green',
    rating: 4.5,
    featured: false,
  },
  {
    id: 18,
    title: 'Mountain View Condo',
    address: '888 Vista Point, Scenic Heights',
    price: '$520,000',
    status: 'For Sale',
    type: 'Condo',
    beds: 2,
    baths: 2,
    sqft: 1300,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Daniel Park',
    rating: 4.7,
    featured: false,
  },
  {
    id: 19,
    title: 'Eco-Friendly Townhouse',
    address: '999 Green Living Blvd, Sustainable Community',
    price: '$580,000',
    status: 'For Sale',
    type: 'Townhouse',
    beds: 3,
    baths: 2.5,
    sqft: 1700,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    agent: 'Eco Specialist',
    rating: 4.9,
    featured: true,
  },
     {
     id: 20,
     title: 'Downtown Office Space',
     address: '1000 Business Center Dr, Corporate Plaza',
     price: '$380,000',
     status: 'For Rent',
     type: 'Commercial',
     beds: 0,
     baths: 1,
     sqft: 1000,
     image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
     agent: 'Corporate Realty',
     rating: 4.6,
     featured: false,
   },
   {
     id: 21,
     title: 'Lakeside Villa',
     address: '555 Serenity Lake Dr, Waterfront Estates',
     price: '$2,800,000',
     status: 'For Sale',
     type: 'Single Family',
     beds: 6,
     baths: 5,
     sqft: 4200,
     image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
     agent: 'Luxury Realty Group',
     rating: 5.0,
     featured: true,
     images: [
       'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
     ]
   },
   {
     id: 22,
     title: 'Modern Studio Loft',
     address: '777 Creative Quarter Ave, Arts District',
     price: '$420,000',
     status: 'For Sale',
     type: 'Apartment',
     beds: 1,
     baths: 1,
     sqft: 950,
     image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
     agent: 'Urban Living Specialists',
     rating: 4.3,
     featured: false,
   },
   {
     id: 23,
     title: 'Historic Brownstone',
     address: '888 Heritage Lane, Historic District',
     price: '$1,150,000',
     status: 'For Sale',
     type: 'Townhouse',
     beds: 4,
     baths: 3.5,
     sqft: 2800,
     image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
     agent: 'Heritage Properties',
     rating: 4.8,
     featured: true,
     images: [
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
     ]
   },
   {
     id: 24,
     title: 'Tech Startup Office',
     address: '999 Innovation Blvd, Tech Hub',
     price: '$650,000',
     status: 'For Rent',
     type: 'Commercial',
     beds: 0,
     baths: 3,
     sqft: 1800,
     image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
     agent: 'Tech Real Estate Partners',
     rating: 4.7,
     featured: false,
   },
   {
     id: 25,
     title: 'Coastal Beach House',
     address: '111 Ocean View Dr, Beachfront Community',
     price: '$3,500,000',
     status: 'For Sale',
     type: 'Single Family',
     beds: 5,
     baths: 4,
     sqft: 3800,
     image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
     agent: 'Coastal Luxury Realty',
     rating: 5.0,
     featured: true,
     images: [
       'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
     ]
   },
   {
     id: 26,
     title: 'Garden Apartment Complex',
     address: '222 Green Meadows Ln, Suburban Gardens',
     price: '$280,000',
     status: 'For Sale',
     type: 'Apartment',
     beds: 2,
     baths: 1.5,
     sqft: 1100,
     image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
     agent: 'Garden Realty Group',
     rating: 4.4,
     featured: false,
   },
   {
     id: 27,
     title: 'Mountain Cabin Retreat',
     address: '333 Alpine Trail Rd, Mountain Highlands',
     price: '$890,000',
     status: 'For Sale',
     type: 'Single Family',
     beds: 3,
     baths: 2,
     sqft: 1600,
     image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
     agent: 'Mountain Properties',
     rating: 4.9,
     featured: true,
     images: [
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
     ]
   },
   {
     id: 28,
     title: 'Urban Retail Space',
     address: '444 Main Street Plaza, Downtown Shopping',
     price: '$520,000',
     status: 'For Rent',
     type: 'Commercial',
     beds: 0,
     baths: 1,
     sqft: 1200,
     image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
     agent: 'Retail Real Estate',
     rating: 4.5,
     featured: false,
   },
   {
     id: 29,
     title: 'Luxury Penthouse Suite',
     address: '555 Skyline Tower, Premium Heights',
     price: '$4,200,000',
     status: 'For Sale',
     type: 'Apartment',
     beds: 4,
     baths: 5,
     sqft: 4500,
     image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
     agent: 'Elite Properties International',
     rating: 5.0,
     featured: true,
     images: [
       'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
       'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
     ]
   },
   {
     id: 30,
     title: 'Family-Friendly Townhouse',
     address: '666 Community Circle, Family Estates',
     price: '$680,000',
     status: 'For Sale',
     type: 'Townhouse',
     beds: 4,
     baths: 3,
     sqft: 2200,
     image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
     agent: 'Family Realty Partners',
     rating: 4.6,
     featured: false,
   }
]

const statuses = ['All', 'For Sale', 'For Rent', 'Sold', 'Rented']
const types = ['All', 'Single Family', 'Apartment', 'Condo', 'Townhouse', 'Commercial']

export default function PropertiesPage() {
  const { role, canManageProperties } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [bedRange, setBedRange] = useState({ min: '', max: '' })
  const [bathRange, setBathRange] = useState({ min: '', max: '' })
  const [sqftRange, setSqftRange] = useState({ min: '', max: '' })
  const [selectedLocation, setSelectedLocation] = useState('All')
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showViewPropertyModal, setShowViewPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [allImages, setAllImages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [editFormData, setEditFormData] = useState({
    title: '',
    address: '',
    price: '',
    status: '',
    type: '',
    beds: '',
    baths: '',
    sqft: '',
    agent: '',
    featured: false,
    mainImage: '',
    galleryImages: [] as string[]
  })

  // Extract unique locations from properties
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(properties.map(property => {
      // Extract location from address (e.g., "Downtown", "Suburbs", "Business District")
      const addressParts = property.address.split(', ')
      return addressParts.length > 1 ? addressParts[1] : 'Other'
    }))]
    return ['All', ...uniqueLocations.sort()]
  }, [])

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.export-dropdown')) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

  // Keyboard navigation for image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showImageModal) return
      
      switch (event.key) {
        case 'Escape':
          setShowImageModal(false)
          break
        case 'ArrowLeft':
          if (allImages.length > 1) {
            goToPreviousImage()
          }
          break
        case 'ArrowRight':
          if (allImages.length > 1) {
            goToNextImage()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showImageModal, allImages.length, currentImageIndex])

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Basic search
      const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.agent.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Basic filters
      const matchesStatus = selectedStatus === 'All' || property.status === selectedStatus
      const matchesType = selectedType === 'All' || property.type === selectedType
      
      // Location filter
      const propertyLocation = property.address.split(', ')[1] || 'Other'
      const matchesLocation = selectedLocation === 'All' || propertyLocation === selectedLocation
      
      // Advanced filters
      const price = parseInt(property.price.replace(/[$,]/g, ''))
      const matchesPrice = (!priceRange.min || price >= parseInt(priceRange.min)) &&
                          (!priceRange.max || price <= parseInt(priceRange.max))
      
      const matchesBeds = (!bedRange.min || property.beds >= parseInt(bedRange.min)) &&
                         (!bedRange.max || property.beds <= parseInt(bedRange.max))
      
      const matchesBaths = (!bathRange.min || property.baths >= parseFloat(bathRange.min)) &&
                          (!bathRange.max || property.baths <= parseFloat(bathRange.max))
      
      const matchesSqft = (!sqftRange.min || property.sqft >= parseInt(sqftRange.min)) &&
                         (!sqftRange.max || property.sqft <= parseInt(sqftRange.max))
      
      return matchesSearch && matchesStatus && matchesType && matchesLocation &&
             matchesPrice && matchesBeds && matchesBaths && matchesSqft
    })
  }, [searchTerm, selectedStatus, selectedType, selectedLocation, priceRange, bedRange, bathRange, sqftRange])

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex)
  
  // For grid view: show all properties up to current page
  const gridViewProperties = filteredProperties.slice(0, currentPage * itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedType, selectedLocation, priceRange, bedRange, bathRange, sqftRange])

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    setEditFormData({
      title: property.title,
      address: property.address,
      price: property.price.replace(/[$,]/g, ''),
      status: property.status,
      type: property.type,
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: property.sqft.toString(),
      agent: property.agent,
      featured: property.featured,
      mainImage: property.image,
      galleryImages: property.images || []
    })
    setShowEditPropertyModal(true)
  }

  const handleViewProperty = (property: Property) => {
    setViewingProperty(property)
    setShowViewPropertyModal(true)
  }

  const handleDeleteProperty = (property: Property) => {
    setDeletingProperty(property)
    setDeleteConfirmation('')
    setShowDeletePropertyModal(true)
  }

  const confirmDelete = () => {
    if (deleteConfirmation === deletingProperty?.title) {
      // Here you would typically delete the property from your backend
      // For now, we'll just close the modal
      setShowDeletePropertyModal(false)
      setDeletingProperty(null)
      setDeleteConfirmation('')
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file))
      setEditFormData(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...newImages]
      }))
    }
  }

  const removeGalleryImage = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index)
    }))
  }

  const viewImage = (image: string, images?: string[], startIndex?: number) => {
    setSelectedImage(image)
    if (images && startIndex !== undefined) {
      setAllImages(images)
      setCurrentImageIndex(startIndex)
    } else {
      setAllImages([image])
      setCurrentImageIndex(0)
    }
    setShowImageModal(true)
  }

  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1
      setCurrentImageIndex(newIndex)
      setSelectedImage(allImages[newIndex])
    }
  }

  const goToNextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      const newIndex = currentImageIndex + 1
      setCurrentImageIndex(newIndex)
      setSelectedImage(allImages[newIndex])
    }
  }

  const handleSaveEdit = () => {
    // Here you would typically save the changes to your backend
    // For now, we'll just close the modal
    setShowEditPropertyModal(false)
    setEditingProperty(null)
    setEditFormData({
      title: '',
      address: '',
      price: '',
      status: '',
      type: '',
      beds: '',
      baths: '',
      sqft: '',
      agent: '',
      featured: false,
      mainImage: '',
      galleryImages: []
    })
  }

  // Column definitions for the data table
  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: 'title',
      header: 'Property',
      cell: ({ row }) => {
        const property = row.original
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{property.title}</div>
              <div className="text-sm text-gray-500 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {property.address}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'For Sale' ? 'bg-blue-100 text-blue-800' :
            status === 'For Rent' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span className="text-sm text-gray-900">{row.getValue('type')}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => <span className="text-sm font-medium text-green-600">{row.getValue('price')}</span>,
    },
    {
      accessorKey: 'beds',
      header: 'Details',
      cell: ({ row }) => {
        const property = row.original
        return (
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Bed className="h-4 w-4 mr-1 text-gray-400" />
              {property.beds}
            </span>
            <span className="flex items-center">
              <Bath className="h-4 w-4 mr-1 text-gray-400" />
              {property.baths}
            </span>
            <span className="flex items-center">
              <Square className="h-4 w-4 mr-1 text-gray-400" />
              {property.sqft}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'agent',
      header: 'Agent',
      cell: ({ row }) => <span className="text-sm text-gray-900">{row.getValue('agent')}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const property = row.original
        return (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleViewProperty(property)}
              className="text-blue-600 hover:text-blue-900 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button 
              onClick={() => handleEditProperty(property)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
                         <button 
               onClick={() => handleDeleteProperty(property)}
               className="text-red-600 hover:text-red-900 transition-colors"
             >
               <Trash2 className="h-4 w-4" />
             </button>
          </div>
        )
      },
    },
  ]

  const renderGridView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gridViewProperties.map((property) => (
        <div key={property.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Property image */}
          <div className="relative">
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
              {property.image ? (
                <img 
                  src={property.image} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-16 w-16 text-gray-400" />
              )}
            </div>
            {property.featured && (
              <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                Featured
              </div>
            )}
            <div className="absolute top-3 right-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                property.status === 'For Sale' ? 'bg-blue-100 text-blue-800' :
                property.status === 'For Rent' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {property.status}
              </span>
            </div>
          </div>

          {/* Property details */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{property.rating}</span>
              </div>
            </div>
            
            <div className="flex items-center text-gray-500 mb-3">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{property.address}</span>
            </div>
            
            <div className="text-2xl font-bold text-green-600 mb-4">{property.price}</div>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.beds} beds</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.baths} baths</span>
              </div>
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.sqft} sqft</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              Listed by <span className="font-medium text-gray-700">{property.agent}</span>
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-2">
                          <button 
              onClick={() => handleViewProperty(property)}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </button>
              <button 
                onClick={() => handleEditProperty(property)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
              >
                <Edit className="h-4 w-4" />
              </button>
                           <button 
               onClick={() => handleDeleteProperty(property)}
               className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-red-600 hover:text-red-900"
             >
               <Trash2 className="h-4 w-4" />
             </button>
            </div>
          </div>
        </div>
      ))}
      </div>
      
             {/* Load More Button for Grid View */}
       {currentPage < totalPages ? (
         <div className="flex justify-center">
           <button
             onClick={() => setCurrentPage(prev => prev + 1)}
             className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
           >
             <span>Load More Properties</span>
             <ChevronDown className="h-4 w-4" />
           </button>
         </div>
       ) : (
         <div className="flex justify-center">
           <div className="text-center text-sm text-gray-500 bg-gray-50 px-6 py-3 rounded-lg border border-gray-200">
             <span>All properties loaded</span>
           </div>
         </div>
       )}
      
             {/* Pagination Info for Grid View - Always show */}
       <div className="text-center text-sm text-gray-600">
         Showing {Math.min(filteredProperties.length, currentPage * itemsPerPage)} of {filteredProperties.length} properties
         {currentPage >= totalPages && (
           <span className="block mt-1 text-green-600 font-medium">✓ All properties loaded</span>
         )}
       </div>
    </div>
  )

  const renderTableView = () => (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={paginatedProperties}
      />
      
      {/* Pagination Controls for Table View */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-700">entries</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm border rounded font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Next
          </button>
        </div>
        
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length} entries
        </div>
      </div>
    </div>
  )

  const renderAdvancedFilters = () => (
    <div className="bg-white p-6 rounded-lg shadow mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Bedrooms Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={bedRange.min}
              onChange={(e) => setBedRange(prev => ({ ...prev, min: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={bedRange.max}
              onChange={(e) => setBedRange(prev => ({ ...prev, max: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Bathrooms Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={bathRange.min}
              onChange={(e) => setBathRange(prev => ({ ...prev, min: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={bathRange.max}
              onChange={(e) => setBathRange(prev => ({ ...prev, max: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Square Footage Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={sqftRange.min}
              onChange={(e) => setSqftRange(prev => ({ ...prev, min: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={sqftRange.max}
              onChange={(e) => setSqftRange(prev => ({ ...prev, max: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('All')
    setSelectedType('All')
    setSelectedLocation('All')
    setPriceRange({ min: '', max: '' })
    setBedRange({ min: '', max: '' })
    setBathRange({ min: '', max: '' })
    setSqftRange({ min: '', max: '' })
  }

  const exportToCSV = () => {
    const headers = ['Title', 'Address', 'Price', 'Status', 'Type', 'Beds', 'Baths', 'Square Feet', 'Agent', 'Rating']
    const csvContent = [
      headers.join(','),
      ...filteredProperties.map(property => [
        `"${property.title}"`,
        `"${property.address}"`,
        property.price,
        property.status,
        property.type,
        property.beds,
        property.baths,
        property.sqft,
        `"${property.agent}"`,
        property.rating
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `properties_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = () => {
    // For Excel export, we'll use a simple approach that creates a downloadable file
    // In a production app, you might want to use a library like 'xlsx' for proper Excel formatting
    const headers = ['Title', 'Address', 'Price', 'Status', 'Type', 'Beds', 'Baths', 'Square Feet', 'Agent', 'Rating']
    const excelContent = [
      headers.join('\t'),
      ...filteredProperties.map(property => [
        property.title,
        property.address,
        property.price,
        property.status,
        property.type,
        property.beds,
        property.baths,
        property.sqft,
        property.agent,
        property.rating
      ].join('\t'))
    ].join('\n')

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `properties_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Custom CSS for scrollbar hiding */}
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Page header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">
              Manage your property listings and track their performance
              {role && <span className="ml-2 text-sm text-blue-600">Role: {role}</span>}
            </p>
          </div>
          <RequirePropertyManagement>
            <button 
              onClick={() => setShowAddPropertyModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Property</span>
            </button>
          </RequirePropertyManagement>
        </div>

        {/* Consolidated Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative input-with-icon">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties, addresses, agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                showAdvancedFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-900'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>{showAdvancedFilters ? 'Hide' : 'Advanced'} Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && renderAdvancedFilters()}
        </div>

        {/* View toggle, export, and content */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Export and Import Buttons - Only for users who can manage properties */}
          {viewMode === 'table' && canManageProperties && (
            <div className="flex items-center space-x-2">
              {/* Import Button */}
              <button 
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                <Download className="h-4 w-4" />
              </button>
              
              {/* Export Dropdown */}
              <div className="relative export-dropdown">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <Upload className="h-4 w-4" />
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showExportDropdown && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          exportToCSV()
                          setShowExportDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => {
                          exportToExcel()
                          setShowExportDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Export as Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'} found
          </div>
        </div>

        {/* Properties content */}
        {viewMode === 'grid' ? renderGridView() : renderTableView()}

        {/* Empty state */}
        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Role-based access notice */}
        {!canManageProperties && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">View-Only Access</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>As a {role}, you have view-only access to properties. You can view property details but cannot add, edit, or delete properties. Contact your administrator if you need additional permissions.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal - Only for users who can manage properties */}
        <RequirePropertyManagement>
          {showImportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Import Properties</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload CSV/Excel File
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </RequirePropertyManagement>

        {/* Add Property Modal - Only for users who can manage properties */}
        <RequirePropertyManagement>
          {showAddPropertyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add New Property</h3>
                  <button
                    onClick={() => setShowAddPropertyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Property title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Property address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="$0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>For Sale</option>
                        <option>For Rent</option>
                        <option>Sold</option>
                        <option>Rented</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Single Family</option>
                        <option>Apartment</option>
                        <option>Commercial</option>
                        <option>Condo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddPropertyModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Property
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </RequirePropertyManagement>

        {/* Edit Property Modal - Only for users who can manage properties */}
        <RequirePropertyManagement>
          {showEditPropertyModal && editingProperty && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Edit Property</h3>
                  <button
                    onClick={() => setShowEditPropertyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        defaultValue={editingProperty.title}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        defaultValue={editingProperty.address}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="text"
                        defaultValue={editingProperty.price}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select 
                        defaultValue={editingProperty.status}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option>For Sale</option>
                        <option>For Rent</option>
                        <option>Sold</option>
                        <option>Rented</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select 
                        defaultValue={editingProperty.type}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option>Single Family</option>
                        <option>Apartment</option>
                        <option>Commercial</option>
                        <option>Condo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                      <input
                        type="number"
                        defaultValue={editingProperty.beds}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                      <input
                        type="number"
                        defaultValue={editingProperty.baths}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                      <input
                        type="number"
                        defaultValue={editingProperty.sqft}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEditPropertyModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Update Property
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </RequirePropertyManagement>

        {/* View Property Modal - Available to all users */}
        {showViewPropertyModal && viewingProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Property Details</h3>
                <button
                  onClick={() => setShowViewPropertyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={viewingProperty.image}
                    alt={viewingProperty.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <p className="text-gray-900">{viewingProperty.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-gray-900">{viewingProperty.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <p className="text-gray-900">{viewingProperty.price}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-gray-900">{viewingProperty.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{viewingProperty.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
                    <p className="text-gray-900">{viewingProperty.agent}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                    <p className="text-gray-900">{viewingProperty.beds}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                    <p className="text-gray-900">{viewingProperty.baths}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                    <p className="text-gray-900">{viewingProperty.sqft}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <p className="text-gray-900">{viewingProperty.rating}/5</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowViewPropertyModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image View Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="h-8 w-8" />
              </button>
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt={`Property image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                      {currentImageIndex + 1} of {allImages.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}