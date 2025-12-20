import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = request.headers.get('Authorization');
  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:10000'}/api/lead-statuses`;

  try {
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying lead statuses request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch lead statuses' }, 
      { status: 500 }
    );
  }
}
