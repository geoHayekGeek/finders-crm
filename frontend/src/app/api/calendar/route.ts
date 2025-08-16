import { NextRequest, NextResponse } from 'next/server'

// Mock events data for development/testing when backend is not available
const mockEvents = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync meeting',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
    allDay: false,
    color: 'blue',
    type: 'meeting',
    location: 'Conference Room A',
    attendees: ['John Smith', 'Sarah Johnson'],
    notes: 'Bring project updates',
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Property Showing',
    description: 'Show downtown apartment to potential client',
    start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
    end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // Day after tomorrow + 1.5 hours
    allDay: false,
    color: 'green',
    type: 'showing',
    location: '123 Main St, Downtown',
    attendees: ['Michael Chen', 'Emily Davis'],
    notes: 'Client is interested in 2-bedroom units',
    createdBy: '2',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    title: 'Client Consultation',
    description: 'Initial consultation with new client',
    start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 3 days from now + 45 minutes
    allDay: false,
    color: 'purple',
    type: 'meeting',
    location: 'Office',
    attendees: ['David Wilson'],
    notes: 'Prepare property portfolio',
    createdBy: '3',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export async function GET(request: NextRequest) {
  try {
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to connect to backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/calendar/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully fetched events from backend:', data.events?.length || 0, 'events')
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
        events: mockEvents,
        message: 'Using mock data - Backend server not available',
        isMock: true
      })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    // Fallback to mock data
    return NextResponse.json({
      success: true,
      events: mockEvents,
      message: 'Using mock data due to error',
      isMock: true
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to create event via backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully created event via backend')
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown backend error'
      console.log('⚠️ Backend connection failed, using mock response:', errorMessage)
      
      // Return mock response when backend is not available
      const mockEvent = {
        id: Date.now().toString(),
        ...body,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      return NextResponse.json({
        success: true,
        message: 'Event created successfully (mock)',
        event: mockEvent,
        isMock: true
      })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create event'
    }, { status: 500 })
  }
}
