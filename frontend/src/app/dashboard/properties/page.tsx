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
  Upload
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
    image: '/api/placeholder/400/300',
    agent: 'Sarah Johnson',
    rating: 4.8,
    featured: true,
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
    image: '/api/placeholder/400/300',
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
    image: '/api/placeholder/400/300',
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
    image: '/api/placeholder/400/300',
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
    image: '/api/placeholder/400/300',
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
    image: '/api/placeholder/400/300',
    agent: 'Robert Brown',
    rating: 4.5,
    featured: false,
  },
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
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)

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
            <button className="text-blue-600 hover:text-blue-900 transition-colors">
              <Eye className="h-4 w-4" />
            </button>
            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              <Edit className="h-4 w-4" />
            </button>
            <button className="text-red-600 hover:text-red-900 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProperties.map((property) => (
        <div key={property.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Property image */}
          <div className="relative">
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <Building2 className="h-16 w-16 text-gray-400" />
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
              <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900">
                <Edit className="h-4 w-4" />
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-red-600 hover:text-red-900">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderTableView = () => (
    <DataTable 
      columns={columns} 
      data={filteredProperties}
    />
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
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
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
                       <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-900">properties_import.csv</p>
                       <p className="text-xs text-gray-500">2.4 KB • CSV file</p>
                     </div>
                   </div>
                   <button className="text-red-500 hover:text-red-700 transition-colors">
                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
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
           <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             {/* Modal Body */}
             <div className="p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Basic Information */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">Basic Information</h4>
                   
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
                 </div>

                 {/* Property Details */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">Property Details</h4>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                     <div className="relative input-with-icon">
                       <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                       <input
                         type="number"
                         placeholder="450,000"
                         className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
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
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                     <input
                       type="number"
                       placeholder="1200"
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                     <input
                       type="text"
                       placeholder="e.g., Sarah Johnson"
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                     />
                   </div>
                 </div>
               </div>

               {/* Additional Options */}
               <div className="mt-6 space-y-4">
                 <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">Additional Options</h4>
                 
                 <div className="flex items-center space-x-6">
                   <label className="flex items-center">
                     <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                     <span className="ml-2 text-sm text-gray-700">Featured Property</span>
                   </label>
                   <label className="flex items-center">
                     <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                     <span className="ml-2 text-sm text-gray-700">Include in Newsletter</span>
                   </label>
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
     </div>
   )
 }
