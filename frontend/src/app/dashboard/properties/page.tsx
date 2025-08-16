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
      {totalPages > 1 && (
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
      )}
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
          <p className="text-gray-600">Manage your property listings and track their performance</p>
        </div>
                 <button 
           onClick={() => setShowAddPropertyModal(true)}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
         >
           <Plus className="h-4 w-4" />
           <span>Add Property</span>
         </button>
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

        {/* Export and Import Buttons */}
        {viewMode === 'table' && (
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

       {/* Import Modal */}
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

               {/* File Info (hidden by default, would show when file is selected) */}
               <div className="mt-4 p-4 bg-gray-50 rounded-lg hidden">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="p-2 bg-green-100 rounded-lg">
                       <CheckCircle className="h-4 w-4 text-green-600" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-900">properties_import.csv</p>
                       <p className="text-xs text-gray-500">2.4 KB • CSV file</p>
                     </div>
                   </div>
                   <button className="text-red-500 hover:text-red-700 transition-colors">
                     <X className="h-4 w-4" />
                   </button>
                 </div>
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
                         placeholder="e.g., Modern Downtown Apartment"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                       <input
                         type="text"
                         placeholder="e.g., 123 Main St, Downtown"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                       <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
                         <option value="">Select type</option>
                         <option value="Single Family">Single Family</option>
                         <option value="Apartment">Apartment</option>
                         <option value="Condo">Condo</option>
                         <option value="Townhouse">Townhouse</option>
                         <option value="Commercial">Commercial</option>
                       </select>
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                       <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
                         <option value="">Select status</option>
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
                           placeholder="450,000"
                           className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                       <input
                         type="text"
                         placeholder="e.g., Sarah Johnson"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                       <input
                         type="number"
                         placeholder="2"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                       <input
                         type="number"
                         placeholder="2"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                       <input
                         type="number"
                         placeholder="1200"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>
                   </div>

                   <div className="flex items-center space-x-6 mt-4">
                     <label className="flex items-center">
                       <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                       <span className="ml-2 text-sm text-gray-700">Featured Property</span>
                     </label>
                   </div>
                 </div>

                 {/* Main Image Section */}
                 <div>
                   <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Main Image</h4>
                   <div className="relative group">
                     <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300">
                       <div className="w-full h-full flex items-center justify-center">
                         <Camera className="h-12 w-12 text-gray-400" />
                       </div>
                     </div>
                     
                     {/* Upload Button */}
                     <button
                       onClick={() => {
                         const input = document.createElement('input')
                         input.type = 'file'
                         input.accept = 'image/*'
                         input.onchange = (e) => {
                           const files = (e.target as HTMLInputElement).files
                           if (files && files[0]) {
                             // Handle file upload logic here
                             console.log('File selected:', files[0])
                           }
                         }
                         input.click()
                       }}
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
                       onClick={() => {
                         const input = document.createElement('input')
                         input.type = 'file'
                         input.multiple = true
                         input.accept = 'image/*'
                         input.onchange = (e) => {
                           const files = (e.target as HTMLInputElement).files
                           if (files && files.length > 0) {
                             // Handle multiple file upload logic here
                             console.log('Files selected:', files)
                           }
                         }
                         input.click()
                       }}
                       className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                     >
                       <Plus className="h-4 w-4" />
                       <span>Add Images</span>
                     </button>
                   </div>
                   
                   <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                     <Camera className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                     <p className="text-sm">No additional images</p>
                     <p className="text-xs text-gray-400">Click "Add Images" to upload more photos</p>
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
                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                      <select 
                        value={editFormData.type}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
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
                        onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
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
                          onChange={(e) => setEditFormData(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <input
                        type="text"
                        value={editFormData.agent}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, agent: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <input
                        type="number"
                        value={editFormData.beds}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, beds: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <input
                        type="number"
                        value={editFormData.baths}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, baths: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <input
                        type="number"
                        value={editFormData.sqft}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, sqft: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-4">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={editFormData.featured}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, featured: e.target.checked }))}
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
                    <div 
                      className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-dashed border-gray-300"
                      onClick={() => {
                        if (editFormData.mainImage) {
                          // Create a combined array with main image first, then gallery images
                          const allImages = [editFormData.mainImage, ...editFormData.galleryImages]
                          viewImage(editFormData.mainImage, allImages, 0)
                        }
                      }}
                    >
                      {editFormData.mainImage ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <img 
                            src={editFormData.mainImage} 
                            alt="Main property image" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Edit Button - Pen Icon */}
                    <button
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files
                          if (files && files[0]) {
                            const newImage = URL.createObjectURL(files[0])
                            setEditFormData(prev => ({
                              ...prev,
                              mainImage: newImage
                            }))
                          }
                        }
                        input.click()
                      }}
                      className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      title="Edit main image"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Image Gallery Slider */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Image Gallery</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Additional images</span>
                    <button
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.multiple = true
                        input.accept = 'image/*'
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files
                          if (files && files.length > 0) {
                            const newImages = Array.from(files).map(file => URL.createObjectURL(file))
                            setEditFormData(prev => ({
                              ...prev,
                              galleryImages: [...prev.galleryImages, ...newImages]
                            }))
                          }
                        }
                        input.click()
                      }}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Images</span>
                    </button>
                  </div>
                  
                  {/* Drag & Drop Area */}

                  {editFormData.galleryImages.length > 0 ? (
                    <div className="relative">
                      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide gallery-scroll-container">
                        {editFormData.galleryImages.map((image, index) => (
                          <div key={index} className="relative group flex-shrink-0">
                            <div 
                              className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200 hover:border-blue-300"
                              onClick={() => {
                                // Create a combined array with main image first, then gallery images
                                const allImages = [editFormData.mainImage, ...editFormData.galleryImages]
                                // Adjust index to account for main image being first
                                const adjustedIndex = editFormData.mainImage ? index + 1 : index
                                viewImage(image, allImages, adjustedIndex)
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <img 
                                  src={image} 
                                  alt={`Gallery image ${index + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeGalleryImage(index)
                                }}
                                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                                title="Remove image"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Navigation Buttons */}
                      {editFormData.galleryImages.length > 3 && (
                        <>
                          {/* Previous Button */}
                          <button
                            onClick={() => {
                              const galleryContainer = document.querySelector('.gallery-scroll-container')
                              if (galleryContainer) {
                                galleryContainer.scrollLeft -= 100
                              }
                            }}
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
                            title="Previous images"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          {/* Next Button */}
                          <button
                            onClick={() => {
                              const galleryContainer = document.querySelector('.gallery-scroll-container')
                              if (galleryContainer) {
                                galleryContainer.scrollLeft += 100
                              }
                            }}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
                            title="Next images"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {/* Scroll indicators */}
                      <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
                      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
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
                onClick={handleSaveEdit}
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
                    <div 
                      className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-300"
                      onClick={() => {
                        if (viewingProperty.image) {
                          // Create a combined array with main image first, then gallery images
                          const allImages = [viewingProperty.image, ...(viewingProperty.images || [])]
                          viewImage(viewingProperty.image, allImages, 0)
                        }
                      }}
                    >
                      {viewingProperty.image ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <img 
                            src={viewingProperty.image} 
                            alt="Main property image" 
                            className="w-full h-full object-cover"
                          />
                        </div>
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
                    <div className="relative">
                      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide gallery-scroll-container">
                        {viewingProperty.images.map((image, index) => (
                          <div key={index} className="relative group flex-shrink-0">
                            <div 
                              className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200 hover:border-blue-300"
                              onClick={() => {
                                // Create a combined array with main image first, then gallery images
                                const allImages = [viewingProperty.image, ...(viewingProperty.images || [])]
                                // Adjust index to account for main image being first
                                const adjustedIndex = viewingProperty.image ? index + 1 : index
                                viewImage(image, allImages, adjustedIndex)
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <img 
                                  src={image} 
                                  alt={`Gallery image ${index + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Navigation Buttons */}
                      {viewingProperty.images.length > 3 && (
                        <>
                          {/* Previous Button */}
                          <button
                            onClick={() => {
                              const galleryContainer = document.querySelector('.gallery-scroll-container')
                              if (galleryContainer) {
                                galleryContainer.scrollLeft -= 100
                              }
                            }}
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
                            title="Previous images"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          {/* Next Button */}
                          <button
                            onClick={() => {
                              const galleryContainer = document.querySelector('.gallery-scroll-container')
                              if (galleryContainer) {
                                galleryContainer.scrollLeft += 100
                              }
                            }}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-blue-600 rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
                            title="Next images"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {/* Scroll indicators */}
                      <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
                      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
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
                  handleEditProperty(viewingProperty)
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
                  onClick={goToPreviousImage}
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
                  onClick={goToNextImage}
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
                onClick={confirmDelete}
                disabled={deleteConfirmation !== deletingProperty.title}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}