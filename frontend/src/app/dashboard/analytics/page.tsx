'use client'

import { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

const monthlyData = [
  { month: 'Jan', properties: 12, clients: 45, revenue: 32000, leads: 28 },
  { month: 'Feb', properties: 15, clients: 52, revenue: 38000, leads: 32 },
  { month: 'Mar', properties: 18, clients: 58, revenue: 42000, leads: 35 },
  { month: 'Apr', properties: 22, clients: 65, revenue: 48000, leads: 42 },
  { month: 'May', properties: 25, clients: 72, revenue: 55000, leads: 48 },
  { month: 'Jun', properties: 28, clients: 78, revenue: 62000, leads: 55 },
]

const topAgents = [
  { name: 'Sarah Johnson', properties: 24, clients: 45, revenue: 125000, rating: 4.9 },
  { name: 'Mike Chen', properties: 18, clients: 38, revenue: 98000, rating: 4.8 },
  { name: 'Lisa Rodriguez', properties: 15, clients: 32, revenue: 85000, rating: 4.7 },
  { name: 'David Wilson', properties: 12, clients: 28, revenue: 72000, rating: 4.6 },
  { name: 'Jennifer Lee', properties: 10, clients: 25, revenue: 65000, rating: 4.5 },
]

const propertyTypes = [
  { type: 'Single Family', count: 45, percentage: 35 },
  { type: 'Apartment', count: 32, percentage: 25 },
  { type: 'Condo', count: 28, percentage: 22 },
  { type: 'Townhouse', count: 15, percentage: 12 },
  { type: 'Commercial', count: 8, percentage: 6 },
]

const leadSources = [
  { source: 'Website', count: 45, percentage: 40 },
  { source: 'Referral', count: 32, percentage: 28 },
  { source: 'Social Media', count: 18, percentage: 16 },
  { source: 'Cold Call', count: 12, percentage: 11 },
  { source: 'Other', count: 5, percentage: 5 },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('6M')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance and key metrics</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="1M">Last Month</option>
          <option value="3M">Last 3 Months</option>
          <option value="6M">Last 6 Months</option>
          <option value="1Y">Last Year</option>
        </select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">128</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$62,450</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+23%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">12.5%</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+2.1%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 w-12">{data.month}</span>
                <div className="flex-1 mx-4">
                  <div className="flex space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(data.properties / 30) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(data.clients / 80) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(data.revenue / 70000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 w-20 text-right">
                  {data.properties} | {data.clients} | ${data.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
              Properties
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
              Clients
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-600 rounded mr-1"></div>
              Revenue
            </div>
          </div>
        </div>

        {/* Top performing agents */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Agents</h3>
          <div className="space-y-4">
            {topAgents.map((agent, index) => (
              <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">⭐ {agent.rating}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${agent.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{agent.properties} properties</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property and lead breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property types */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Types</h3>
          <div className="space-y-3">
            {propertyTypes.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead sources */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Sources</h3>
          <div className="space-y-3">
            {leadSources.map((item) => (
              <div key={item.source} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.source}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance insights */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">Strong Growth</p>
            <p className="text-xs text-blue-700">Properties and revenue growing consistently</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">Client Retention</p>
            <p className="text-xs text-green-700">High client satisfaction and repeat business</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900">Lead Quality</p>
            <p className="text-xs text-purple-700">Website and referrals driving quality leads</p>
          </div>
        </div>
      </div>
    </div>
  )
}
