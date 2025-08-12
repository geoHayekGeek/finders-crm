'use client'

import { useState } from 'react'
import { 
  FileText, 
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
  Target,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'

const leads = [
  {
    id: 1,
    name: 'Alex Thompson',
    email: 'alex.thompson@email.com',
    phone: '+1 (555) 111-2222',
    source: 'Website',
    status: 'New',
    priority: 'High',
    interest: 'Buying',
    budget: '$600,000 - $800,000',
    location: 'Downtown',
    assignedTo: 'Sarah Johnson',
    lastContact: 'Never',
    nextFollowUp: 'Today',
    notes: 'Interested in modern apartments, first-time buyer',
  },
  {
    id: 2,
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+1 (555) 333-4444',
    source: 'Referral',
    status: 'Contacted',
    priority: 'Medium',
    interest: 'Renting',
    budget: '$2,500 - $3,500/month',
    location: 'Suburbs',
    assignedTo: 'Mike Chen',
    lastContact: '2 days ago',
    nextFollowUp: 'Tomorrow',
    notes: 'Looking for family home, relocating from out of state',
  },
  {
    id: 3,
    name: 'David Kim',
    email: 'david.kim@email.com',
    phone: '+1 (555) 555-6666',
    source: 'Social Media',
    status: 'Qualified',
    priority: 'High',
    interest: 'Buying',
    budget: '$400,000 - $600,000',
    location: 'Midtown',
    assignedTo: 'Lisa Rodriguez',
    lastContact: '1 week ago',
    nextFollowUp: 'Next week',
    notes: 'Interested in investment properties, has cash ready',
  },
  {
    id: 4,
    name: 'Jennifer Lee',
    email: 'jennifer.lee@email.com',
    phone: '+1 (555) 777-8888',
    source: 'Cold Call',
    status: 'Proposal',
    priority: 'Medium',
    interest: 'Selling',
    budget: 'N/A',
    location: 'Waterfront',
    assignedTo: 'David Wilson',
    lastContact: '3 days ago',
    nextFollowUp: 'Friday',
    notes: 'Selling waterfront property, needs market analysis',
  },
  {
    id: 5,
    name: 'Robert Brown',
    email: 'robert.brown@email.com',
    phone: '+1 (555) 999-0000',
    source: 'Website',
    status: 'Negotiation',
    priority: 'High',
    interest: 'Buying',
    budget: '$750,000 - $1,000,000',
    location: 'Suburbs',
    assignedTo: 'Sarah Johnson',
    lastContact: 'Yesterday',
    nextFollowUp: 'Today',
    notes: 'Ready to make offer, needs property tour',
  },
  {
    id: 6,
    name: 'Amanda Wilson',
    email: 'amanda.wilson@email.com',
    phone: '+1 (555) 123-7890',
    source: 'Referral',
    status: 'Closed',
    priority: 'Low',
    interest: 'Renting',
    budget: '$1,800 - $2,200/month',
    location: 'Business District',
    assignedTo: 'Mike Chen',
    lastContact: '1 month ago',
    nextFollowUp: 'N/A',
    notes: 'Successfully closed rental agreement',
  },
]

const statuses = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed']
const priorities = ['All', 'High', 'Medium', 'Low']
const sources = ['All', 'Website', 'Referral', 'Social Media', 'Cold Call', 'Other']

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-800'
    case 'Contacted': return 'bg-yellow-100 text-yellow-800'
    case 'Qualified': return 'bg-purple-100 text-purple-800'
    case 'Proposal': return 'bg-indigo-100 text-indigo-800'
    case 'Negotiation': return 'bg-orange-100 text-orange-800'
    case 'Closed': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'bg-red-100 text-red-800'
    case 'Medium': return 'bg-yellow-100 text-yellow-800'
    case 'Low': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [selectedSource, setSelectedSource] = useState('All')

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'All' || lead.status === selectedStatus
    const matchesPriority = selectedPriority === 'All' || lead.priority === selectedPriority
    const matchesSource = selectedSource === 'All' || lead.source === selectedSource
    
    return matchesSearch && matchesStatus && matchesPriority && matchesSource
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Track and manage your sales pipeline and lead conversion</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{leads.filter(l => l.status === 'New').length}</div>
          <div className="text-sm text-gray-600">New</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-600">{leads.filter(l => l.status === 'Contacted').length}</div>
          <div className="text-sm text-gray-600">Contacted</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-purple-600">{leads.filter(l => l.status === 'Qualified').length}</div>
          <div className="text-sm text-gray-600">Qualified</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-indigo-600">{leads.filter(l => l.status === 'Proposal').length}</div>
          <div className="text-sm text-gray-600">Proposal</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-orange-600">{leads.filter(l => l.status === 'Negotiation').length}</div>
          <div className="text-sm text-gray-600">Negotiation</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">{leads.filter(l => l.status === 'Closed').length}</div>
          <div className="text-sm text-gray-600">Closed</div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
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
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorities.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Leads table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lead Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Follow-up</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                        <div className="text-sm text-gray-500">{lead.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.assignedTo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {lead.nextFollowUp === 'Today' ? (
                        <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                      ) : lead.nextFollowUp === 'N/A' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      )}
                      {lead.nextFollowUp}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
