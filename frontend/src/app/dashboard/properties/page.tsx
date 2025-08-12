'use client'

import { useState } from 'react'
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
  Star
} from 'lucide-react'

const properties = [
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

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'All' || property.status === selectedStatus
    const matchesType = selectedType === 'All' || property.type === selectedType
    
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your property listings and track their performance</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Properties grid */}
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
                <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
