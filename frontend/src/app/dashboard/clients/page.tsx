'use client'

import { useState } from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin,
  Building2,
  Calendar,
  Star
} from 'lucide-react'

const clients = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    location: 'Downtown',
    status: 'Active',
    type: 'Buyer',
    budget: '$500,000 - $750,000',
    propertiesViewed: 8,
    lastContact: '2 days ago',
    rating: 4.8,
    notes: 'Interested in downtown apartments and condos',
  },
  {
    id: 2,
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '+1 (555) 987-6543',
    location: 'Suburbs',
    status: 'Active',
    type: 'Renter',
    budget: '$2,000 - $3,000/month',
    propertiesViewed: 12,
    lastContact: '1 week ago',
    rating: 4.9,
    notes: 'Looking for family homes in good school districts',
  },
  {
    id: 3,
    name: 'Robert Wilson',
    email: 'robert.wilson@email.com',
    phone: '+1 (555) 456-7890',
    location: 'Midtown',
    status: 'Qualified',
    type: 'Seller',
    budget: 'N/A',
    propertiesViewed: 3,
    lastContact: '3 days ago',
    rating: 4.7,
    notes: 'Selling family home, looking to downsize',
  },
  {
    id: 4,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 789-0123',
    location: 'Waterfront',
    status: 'Active',
    type: 'Investor',
    budget: '$800,000 - $1,200,000',
    propertiesViewed: 15,
    lastContact: '5 days ago',
    rating: 4.6,
    notes: 'Interested in waterfront properties and investment opportunities',
  },
  {
    id: 5,
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 321-6540',
    location: 'Business District',
    status: 'Prospect',
    type: 'Buyer',
    budget: '$300,000 - $450,000',
    propertiesViewed: 5,
    lastContact: '2 weeks ago',
    rating: 4.5,
    notes: 'First-time homebuyer, needs guidance through the process',
  },
  {
    id: 6,
    name: 'Lisa Rodriguez',
    email: 'lisa.rodriguez@email.com',
    phone: '+1 (555) 654-3210',
    location: 'Suburbs',
    status: 'Active',
    type: 'Renter',
    budget: '$1,500 - $2,500/month',
    propertiesViewed: 10,
    lastContact: '4 days ago',
    rating: 4.8,
    notes: 'Relocating for work, needs temporary housing solution',
  },
]

const statuses = ['All', 'Active', 'Qualified', 'Prospect', 'Inactive']
const types = ['All', 'Buyer', 'Seller', 'Renter', 'Investor']

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedType, setSelectedType] = useState('All')

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'All' || client.status === selectedStatus
    const matchesType = selectedType === 'All' || client.type === selectedType
    
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client relationships and track their preferences</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
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

      {/* Clients grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Client header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{client.rating}</span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.status === 'Active' ? 'bg-green-100 text-green-800' :
                  client.status === 'Qualified' ? 'bg-blue-100 text-blue-800' :
                  client.status === 'Prospect' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {client.status}
                </span>
              </div>
              
              <div className="flex items-center text-gray-500 mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{client.location}</span>
              </div>
              
              <div className="flex items-center text-gray-500 mb-2">
                <Building2 className="h-4 w-4 mr-1" />
                <span className="text-sm">{client.type}</span>
              </div>
              
              {client.budget !== 'N/A' && (
                <div className="text-sm font-medium text-green-600">{client.budget}</div>
              )}
            </div>

            {/* Client details */}
            <div className="p-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                <span>{client.email}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                <span>{client.phone}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>Last contact: {client.lastContact}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Properties viewed: <span className="font-medium">{client.propertiesViewed}</span>
              </div>
              
              <div className="text-sm text-gray-500 italic">
                "{client.notes}"
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6">
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
      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
