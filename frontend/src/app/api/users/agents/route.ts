import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = request.headers.get('Authorization');
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/agents`;

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
    console.error('Error proxying agents request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch agents' }, 
      { status: 500 }
    );
  }
}
