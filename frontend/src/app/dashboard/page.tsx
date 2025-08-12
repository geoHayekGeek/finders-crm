'use client'

import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star,
  FileText
} from 'lucide-react'

const stats = [
  { name: 'Total Properties', value: '24', icon: Building2, change: '+12%', changeType: 'positive' },
  { name: 'Active Clients', value: '156', icon: Users, change: '+8%', changeType: 'positive' },
  { name: 'Monthly Revenue', value: '$45,230', icon: DollarSign, change: '+23%', changeType: 'positive' },
  { name: 'Conversion Rate', value: '12.5%', icon: TrendingUp, change: '+2.1%', changeType: 'positive' },
]

const recentProperties = [
  {
    id: 1,
    title: 'Modern Downtown Apartment',
    address: '123 Main St, Downtown',
    price: '$450,000',
    status: 'For Sale',
    image: '/api/placeholder/300/200',
    agent: 'Sarah Johnson',
    rating: 4.8,
  },
  {
    id: 2,
    title: 'Luxury Family Home',
    address: '456 Oak Ave, Suburbs',
    price: '$850,000',
    status: 'For Sale',
    image: '/api/placeholder/300/200',
    agent: 'Mike Chen',
    rating: 4.9,
  },
  {
    id: 3,
    title: 'Investment Property',
    address: '789 Pine Rd, Business District',
    price: '$320,000',
    status: 'For Rent',
    image: '/api/placeholder/300/200',
    agent: 'Lisa Rodriguez',
    rating: 4.7,
  },
]

const recentLeads = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    interest: 'Buying',
    budget: '$500,000 - $750,000',
    status: 'New',
    date: '2 hours ago',
  },
  {
    id: 2,
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '+1 (555) 987-6543',
    interest: 'Renting',
    budget: '$2,000 - $3,000/month',
    status: 'Contacted',
    date: '1 day ago',
  },
  {
    id: 3,
    name: 'Robert Wilson',
    email: 'robert.wilson@email.com',
    phone: '+1 (555) 456-7890',
    interest: 'Selling',
    budget: 'N/A',
    status: 'Qualified',
    date: '2 days ago',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your real estate business.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Properties and Leads */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Properties */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Properties</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentProperties.map((property) => (
              <div key={property.id} className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{property.title}</p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-green-600">{property.price}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        property.status === 'For Sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">{property.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Mail className="h-4 w-4 mr-1" />
                      {lead.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone className="h-4 w-4 mr-1" />
                      {lead.phone}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">{lead.interest}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{lead.date}</p>
                    <p className="text-sm text-gray-600 mt-1">{lead.budget}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <Building2 className="h-5 w-5 mr-2" />
              Add Property
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              Add Client
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <FileText className="h-5 w-5 mr-2" />
              Create Lead
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <Calendar className="h-5 w-5 mr-2" />
              Schedule Viewing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

