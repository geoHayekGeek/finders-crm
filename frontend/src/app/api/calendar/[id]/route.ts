import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to fetch event from backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/calendar/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully fetched event from backend')
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown backend error'
      console.log('⚠️ Backend connection failed:', errorMessage)
      
      return NextResponse.json({
        success: false,
        message: 'Event not found'
      }, { status: 404 })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch event'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to update event via backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/calendar/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully updated event via backend')
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown backend error'
      console.log('⚠️ Backend connection failed:', errorMessage)
      
      return NextResponse.json({
        success: false,
        message: 'Failed to update event'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update event'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Try to connect to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
    console.log('🔗 Attempting to delete event via backend at:', backendUrl)
    
    try {
      const response = await fetch(`${backendUrl}/api/calendar/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Successfully deleted event via backend')
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown backend error'
      console.log('⚠️ Backend connection failed:', errorMessage)
      
      return NextResponse.json({
        success: false,
        message: 'Failed to delete event'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to delete event'
    }, { status: 500 })
  }
}
