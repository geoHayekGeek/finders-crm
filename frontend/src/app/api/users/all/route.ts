import { NextRequest, NextResponse } from 'next/server'

// Mock users data for development/testing
const mockUsers = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@finders.com',
    role: 'Real Estate Agent',
    location: 'Downtown',
    phone: '+1 (555) 123-4567'
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@finders.com',
    role: 'Senior Agent',
    location: 'Westside',
    phone: '+1 (555) 234-5678'
  },
  {
    id: 3,
    name: 'Michael Chen',
    email: 'michael.chen@finders.com',
    role: 'Property Manager',
    location: 'Eastside',
    phone: '+1 (555) 345-6789'
  },
  {
    id: 4,
    name: 'Emily Davis',
    email: 'emily.davis@finders.com',
    role: 'Real Estate Agent',
    location: 'Northside',
    phone: '+1 (555) 456-7890'
  },
  {
    id: 5,
    name: 'David Wilson',
    email: 'david.wilson@finders.com',
    role: 'Senior Agent',
    location: 'Southside',
    phone: '+1 (555) 567-8901'
  },
  {
    id: 6,
    name: 'Lisa Brown',
    email: 'lisa.brown@finders.com',
    role: 'Property Manager',
    location: 'Central',
    phone: '+1 (555) 678-9012'
  },
  {
    id: 7,
    name: 'Robert Taylor',
    email: 'robert.taylor@finders.com',
    role: 'Real Estate Agent',
    location: 'Downtown',
    phone: '+1 (555) 789-0123'
  },
  {
    id: 8,
    name: 'Jennifer Garcia',
    email: 'jennifer.garcia@finders.com',
    role: 'Senior Agent',
    location: 'Westside',
    phone: '+1 (555) 890-1234'
  },
  {
    id: 9,
    name: 'Christopher Martinez',
    email: 'christopher.martinez@finders.com',
    role: 'Property Manager',
    location: 'Eastside',
    phone: '+1 (555) 901-2345'
  },
  {
    id: 10,
    name: 'Amanda Rodriguez',
    email: 'amanda.rodriguez@finders.com',
    role: 'Real Estate Agent',
    location: 'Northside',
    phone: '+1 (555) 012-3456'
  }
]

export async function GET(_request: NextRequest) {
  try {
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to connect to backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/users/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully fetched users from backend:', data.users?.length || 0, 'users')
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown backend error'
      console.log('⚠️ Backend connection failed, using mock data:', errorMessage)
      
      // Return mock data when backend is not available
      return NextResponse.json({
        success: true,
        users: mockUsers,
        message: 'Using mock data - Backend server not available',
        isMock: true
      })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    // Fallback to mock data
    return NextResponse.json({
      success: true,
      users: mockUsers,
      message: 'Using mock data due to error',
      isMock: true
    })
  }
}
