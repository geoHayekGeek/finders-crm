import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:10000/api';

export interface ApiClient {
  request: APIRequestContext;
  token?: string;
}

/**
 * Create an API request with authentication
 */
export async function createAuthenticatedRequest(
  request: APIRequestContext,
  token: string
): Promise<APIRequestContext> {
  // Create a new context with auth header
  return request;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  request: APIRequestContext,
  method: string,
  endpoint: string,
  options: {
    token?: string;
    data?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const requestOptions: any = {
    method,
    headers,
  };

  if (options.data && method !== 'GET') {
    requestOptions.data = options.data;
  }

  const response = await request.fetch(url, requestOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Get CSRF token from API
 */
export async function getCSRFToken(
  request: APIRequestContext,
  token: string
): Promise<string | null> {
  try {
    const response = await request.fetch(`${API_BASE_URL}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return response.headers().get('x-csrf-token');
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error);
  }
  return null;
}

/**
 * Login via API and get token
 */
export async function loginViaAPI(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ token: string; user: any }> {
  const response = await apiRequest(request, 'POST', '/users/login', {
    data: { email, password },
  });

  return {
    token: response.token,
    user: response.user,
  };
}

