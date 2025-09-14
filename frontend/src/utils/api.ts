import { Property, Category, Status } from '@/types/property'
import { Lead, LeadFilters, LeadsResponse, LeadResponse, LeadStatsApiResponse, CreateLeadFormData } from '@/types/leads'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: any[]) {
    super(message)
    this.name = 'ApiError'
  }
}

// CSRF token cache
let csrfToken: string | null = null
let csrfTokenTimestamp: number = 0
const CSRF_TOKEN_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Get CSRF token from server
async function getCSRFToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now()
  
  // Return cached token if it's still valid and not forcing refresh
  if (csrfToken && !forceRefresh && (now - csrfTokenTimestamp) < CSRF_TOKEN_CACHE_DURATION) {
    return csrfToken
  }
  
  try {
    console.log('🔐 Fetching fresh CSRF token...')
    const response = await fetch(`${API_BASE_URL}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    
    if (response.ok) {
      const newToken = response.headers.get('X-CSRF-Token')
      if (newToken) {
        csrfToken = newToken
        csrfTokenTimestamp = now
        console.log('🔐 CSRF token refreshed successfully')
        return csrfToken
      }
    } else {
      console.error('🔐 Failed to get CSRF token, response status:', response.status)
    }
  } catch (error) {
    console.error('🔐 Failed to get CSRF token:', error)
  }
  
  return null
}

// Clear CSRF token cache (useful when getting 403 errors)
function clearCSRFToken() {
  csrfToken = null
  csrfTokenTimestamp = 0
  console.log('🔐 CSRF token cache cleared')
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Add debugging for lead updates
  if (endpoint.includes('/leads/') && options.method === 'PUT') {
    console.log('🌐 [API] Lead update request:', {
      url,
      method: options.method,
      body: options.body,
      hasToken: !!token
    })
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }
  
  // Auto-get token from localStorage if not provided
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    const csrf = await getCSRFToken()
    if (csrf) {
      headers['X-CSRF-Token'] = csrf
    }
  }
  
  const config: RequestInit = {
    headers,
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    // Add debugging for lead updates
    if (endpoint.includes('/leads/') && options.method === 'PUT') {
      console.log('🌐 [API] Lead update response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
    
    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = `HTTP error! status: ${response.status}`
      let validationErrors: any[] = []
      
      try {
        const errorData = await response.json()
        
        if (errorData.message) {
          errorMessage = errorData.message
        }
        
        // Extract validation errors if they exist
        if (errorData.errors && Array.isArray(errorData.errors)) {
          validationErrors = errorData.errors
        }
        
        // Add debugging for lead update errors
        if (endpoint.includes('/leads/') && options.method === 'PUT') {
          console.log('🌐 [API] Lead update validation errors:', validationErrors.length, 'errors')
        }
        
        // If CSRF token is invalid, try to get a new one and retry once
        if ((errorData.message === 'Invalid CSRF token' || errorData.message.includes('CSRF')) && options.method && options.method !== 'GET') {
          console.log('🔐 CSRF token invalid, getting new token and retrying...')
          clearCSRFToken() // Clear cached token
          const newCsrf = await getCSRFToken(true) // Force refresh
          if (newCsrf) {
            const retryHeaders = { ...headers, 'X-CSRF-Token': newCsrf }
            const retryConfig = { ...config, headers: retryHeaders }
            const retryResponse = await fetch(url, retryConfig)
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              console.log('🔐 Retry successful with new CSRF token')
              return retryData
            } else {
              console.log('🔐 Retry failed with new CSRF token, status:', retryResponse.status)
            }
          }
        }
      } catch (parseError) {
        // If we can't parse the response, use the default message
        console.warn('Could not parse error response:', parseError)
        console.warn('Response status:', response.status)
        console.warn('Response statusText:', response.statusText)
        
        // Try to get response as text to see what we're actually getting
        try {
          const responseText = await response.text()
          console.warn('Raw response text:', responseText)
        } catch (textError) {
          console.warn('Could not get response as text:', textError)
        }
      }
      throw new ApiError(response.status, errorMessage, validationErrors)
    }
    
    const data = await response.json()
    
    // Add debugging for successful lead updates
    if (endpoint.includes('/leads/') && options.method === 'PUT') {
      console.log('🌐 [API] Lead update success response:', data)
    }
    
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Authentication API
// Export CSRF utilities
export { clearCSRFToken }

export const apiClient = {
  // Login user
  login: (email: string, password: string) => 
    apiRequest<{ message: string; token: string; user: any }>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  // Register user
  register: (userData: any) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  // Get current user profile
  getProfile: () => 
    apiRequest<{ success: boolean; data: any }>('/users/profile'),
  
  // Update user profile
  updateProfile: (userData: any) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  
  // Change password
  changePassword: (currentPassword: string, newPassword: string) => 
    apiRequest<{ success: boolean; message: string }>('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  
  // Request password reset
  requestPasswordReset: (email: string) => 
    apiRequest<{ success: boolean; message: string }>('/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  // Reset password with token
  resetPassword: (email: string, code: string, newPassword: string) => 
    apiRequest<{ success: boolean; message: string }>('/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),
  
  // Verify reset code
  verifyResetCode: (email: string, code: string) => 
    apiRequest<{ success: boolean; message: string }>('/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  
  // Resend reset code
  resendResetCode: (email: string) => 
    apiRequest<{ success: boolean; message: string }>('/password-reset/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
}

// Users API
export const usersApi = {
  // Get all agents
  getAgents: () => apiRequest<{ success: boolean; agents: any[]; message?: string }>('/users/agents'),
  
  // Get user by ID
  getById: (id: number) => apiRequest<{ success: boolean; data: any }>(`/users/${id}`),
  
  // Get users by role
  getByRole: (role: string) => apiRequest<{ success: boolean; data: any[] }>(`/users/role/${role}`),
}

// Properties API
export const propertiesApi = {
  // Get all properties (requires authentication)
  getAll: () => apiRequest<{ success: boolean; data: any[] }>('/properties'),
  
  // Get properties for demo (no authentication required)
  getDemo: () => apiRequest<{ success: boolean; data: any[] }>('/properties/demo'),
  
  // Get properties with filters
  getWithFilters: (filters: any) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    return apiRequest<{ success: boolean; data: any[] }>(`/properties/filtered?${params.toString()}`)
  },
  
  // Get property by ID
  getById: (id: number) => apiRequest<{ success: boolean; data: any }>(`/properties/${id}`),
  
  // Create property
  create: (data: any) => apiRequest<{ success: boolean; data: any; message: string }>('/properties', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update property
  update: async (id: number, data: any) => {
    // First get a fresh CSRF token for this specific property
    console.log(`🔐 Getting CSRF token for property ${id}...`)
    try {
      const csrfResponse = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (csrfResponse.ok) {
        const newToken = csrfResponse.headers.get('X-CSRF-Token')
        if (newToken) {
          csrfToken = newToken
          csrfTokenTimestamp = Date.now()
          console.log('🔐 CSRF token updated for property update')
        }
      }
    } catch (error) {
      console.warn('🔐 Failed to get fresh CSRF token, using cached one:', error)
    }
    
    // Now make the update request
    return apiRequest<{ success: boolean; data: any; message: string }>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  
  // Delete property
  delete: (id: number) => apiRequest<{ success: boolean; message: string }>(`/properties/${id}`, {
    method: 'DELETE',
  }),
  
  // Get property statistics
  getStats: () => apiRequest<{ success: boolean; data: any }>('/properties/stats/overview'),
}

// Leads API
export const leadsApi = {
  // Get all leads (requires authentication)
  getAll: (token?: string) => apiRequest<LeadsResponse>('/leads', {}, token),
  
  // Get reference sources
  getReferenceSources: () => apiRequest<{ success: boolean; data: any[]; message?: string }>('/leads/reference-sources'),
  
  // Get operations users
  getOperationsUsers: () => apiRequest<{ success: boolean; data: any[]; message?: string }>('/leads/operations-users'),
  
  // Get leads with filters
  getWithFilters: (filters: LeadFilters, token?: string) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    return apiRequest<LeadsResponse>(`/leads/filtered?${params.toString()}`, {}, token)
  },
  
  // Get lead by ID
  getById: (id: number, token?: string) => apiRequest<LeadResponse>(`/leads/${id}`, {}, token),
  
  // Create lead
  create: (data: CreateLeadFormData, token?: string) => apiRequest<LeadResponse>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token),
  
  // Update lead
  update: (id: number, data: Partial<CreateLeadFormData>, token?: string) => apiRequest<LeadResponse>(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token),
  
  // Delete lead
  delete: (id: number, token?: string) => apiRequest<{ success: boolean; message: string }>(`/leads/${id}`, {
    method: 'DELETE',
  }, token),
  
  // Get leads by agent
  getByAgent: (agentId: number, token?: string) => apiRequest<LeadsResponse>(`/leads/agent/${agentId}`, {}, token),
  
  // Get lead statistics
  getStats: (token?: string) => apiRequest<LeadStatsApiResponse>('/leads/stats', {}, token),
}

// Categories API
export const categoriesApi = {
  getAll: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/categories', {}, token),
  getAllForAdmin: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/categories/admin', {}, token),
  getDemo: () => apiRequest<{ success: boolean; data: any[] }>('/categories/demo'),
  getWithCount: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/categories/with-count', {}, token),
  search: (query: string, token?: string) => apiRequest<{ success: boolean; data: any[] }>(`/categories/search?q=${encodeURIComponent(query)}`, {}, token),
  getById: (id: number, token?: string) => apiRequest<{ success: boolean; data: any }>(`/categories/${id}`, {}, token),
  create: (data: { name: string; code: string; description?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
  update: (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message: string }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  delete: (id: number, token?: string) => 
    apiRequest<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }, token),
}

// Statuses API
export const statusesApi = {
  getAll: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/statuses', {}, token),
  getAllForAdmin: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/statuses/admin', {}, token),
  getDemo: () => apiRequest<{ success: boolean; data: any[] }>('/statuses/demo'),
  getWithCount: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/statuses/with-count', {}, token),
  getStats: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/statuses/stats', {}, token),
  search: (query: string, token?: string) => apiRequest<{ success: boolean; data: any[] }>(`/statuses/search?q=${encodeURIComponent(query)}`, {}, token),
  getById: (id: number, token?: string) => apiRequest<{ success: boolean; data: any }>(`/statuses/${id}`, {}, token),
  create: (data: { name: string; code: string; description?: string; color?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/statuses', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
  update: (id: number, data: { name?: string; code?: string; description?: string; color?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message: string }>(`/statuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  delete: (id: number, token?: string) => 
    apiRequest<{ success: boolean; message: string }>(`/statuses/${id}`, {
      method: 'DELETE',
    }, token),
}

// Lead Statuses API
export const leadStatusesApi = {
  // Get all lead statuses (requires authentication)
  getAll: () => apiRequest<{ success: boolean; data: any[]; message?: string }>('/lead-statuses'),
  
  // Get lead status by ID
  getById: (id: number) => apiRequest<{ success: boolean; data: any; message?: string }>(`/lead-statuses/${id}`),
  
  // Create new lead status
  create: (data: { status_name: string; code: string; color?: string; description?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message?: string }>('/lead-statuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    }),
  
  // Update lead status
  update: (id: number, data: { status_name: string; code: string; color?: string; description?: string; is_active?: boolean }, token?: string) => 
    apiRequest<{ success: boolean; data: any; message?: string }>(`/lead-statuses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    }),
  
  // Delete lead status
  delete: (id: number, token?: string) => 
    apiRequest<{ success: boolean; data: any; message?: string }>(`/lead-statuses/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    })
}

// Mock data for development (when backend is not available)
export const mockProperties: Property[] = [
  {
    id: 1,
    reference_number: 'FA2025587',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'sale' as const,
    location: 'Beirut Central District, Lebanon',
    category_id: 1,
    category_name: 'Apartment',
    category_code: 'A',
    building_name: 'Marina Towers',
    owner_name: 'Ahmed Al-Masri',
    phone_number: '+961 70 123 456',
    surface: 150.5,
    details: { floor: 8, balcony: true, parking: 2, cave: true },
    interior_details: 'Fully furnished with modern appliances, marble floors, and sea view',
    built_year: 2020,
    view_type: 'sea view',
    concierge: true,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 450000,
    notes: 'Luxury apartment with stunning sea view, recently renovated',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 2,
    reference_number: 'FV2025856',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'sale' as const,
    location: 'Jounieh, Mount Lebanon',
    category_id: 18,
    category_name: 'Villa',
    category_code: 'V',
    building_name: 'Villa Paradise',
    owner_name: 'Marie Dubois',
    phone_number: '+961 71 987 654',
    surface: 350.0,
    details: { floor: 1, balcony: true, parking: 3, cave: true },
    interior_details: 'Spacious villa with garden, swimming pool, and mountain view',
    built_year: 2018,
    view_type: 'mountain view',
    concierge: false,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 1200000,
    notes: 'Beautiful villa perfect for families, close to beaches and amenities',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 3,
    reference_number: 'FO2025923',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'rent' as const,
    location: 'Hamra, Beirut',
    category_id: 3,
    category_name: 'Office',
    category_code: 'O',
    building_name: 'Business Center',
    owner_name: 'Samir Khoury',
    phone_number: '+961 76 555 123',
    surface: 200.0,
    details: { floor: 5, balcony: false, parking: 5, cave: false },
    interior_details: 'Modern office space with conference rooms and reception area',
    built_year: 2022,
    view_type: 'open view',
    concierge: true,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 800000,
    notes: 'Prime office location in Hamra district',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 4,
    reference_number: 'FL2025478',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'sale' as const,
    location: 'Bhamdoun, Mount Lebanon',
    category_id: 4,
    category_name: 'Land',
    category_code: 'L',
    building_name: undefined,
    owner_name: 'Elias Saba',
    phone_number: '+961 78 999 888',
    surface: 1000.0,
    details: { floor: undefined, balcony: undefined, parking: undefined, cave: undefined },
    interior_details: 'Beautiful mountain land with panoramic views',
    built_year: undefined,
    view_type: 'mountain view',
    concierge: false,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 2500000,
    notes: 'Development potential for residential or commercial use',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 5,
    reference_number: 'FR2025567',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'rent' as const,
    location: 'Gemmayze, Beirut',
    category_id: 5,
    category_name: 'Restaurant',
    category_code: 'R',
    building_name: 'Gemmayze Plaza',
    owner_name: 'Nadine Abou Khalil',
    phone_number: '+961 79 777 666',
    surface: 120.0,
    details: { floor: 1, balcony: true, parking: 3, cave: true },
    interior_details: 'Fully equipped restaurant with kitchen and dining area',
    built_year: 2019,
    view_type: 'open view',
    concierge: false,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 650000,
    notes: 'Perfect location for trendy restaurant in popular district',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 6,
    reference_number: 'FW2025890',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
    property_type: 'sale' as const,
    location: 'Dora, Beirut',
    category_id: 6,
    category_name: 'Warehouse',
    category_code: 'W',
    building_name: 'Industrial Zone Dora',
    owner_name: 'Georges Haddad',
    phone_number: '+961 81 444 333',
    surface: 800.0,
    details: { floor: 1, balcony: false, parking: 10, cave: false },
    interior_details: 'Large warehouse with loading docks and office space',
    built_year: 2017,
    view_type: 'no view',
    concierge: false,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 1800000,
    notes: 'Industrial warehouse perfect for logistics and storage',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 7,
    reference_number: 'FS2025123',
    status_id: 2,
    status_name: 'Sold',
    status_color: '#EF4444',
    property_type: 'sale' as const,
    location: 'Achrafieh, Beirut',
    category_id: 1,
    category_name: 'Apartment',
    category_code: 'A',
    building_name: 'Achrafieh Heights',
    owner_name: 'Rita Mansour',
    phone_number: '+961 70 111 222',
    surface: 180.0,
    details: { floor: 12, balcony: true, parking: 2, cave: true },
    interior_details: 'Luxury apartment with city views and modern amenities',
    built_year: 2021,
    view_type: 'open view',
    concierge: true,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 950000,
    notes: 'Recently sold - luxury apartment in prime location',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 8,
    reference_number: 'FV2025456',
    status_id: 3,
    status_name: 'Rented',
    status_color: '#8B5CF6',
    property_type: 'rent' as const,
    location: 'Badaro, Beirut',
    category_id: 18,
    category_name: 'Villa',
    category_code: 'V',
    building_name: 'Badaro Gardens',
    owner_name: 'Antoine Chahine',
    phone_number: '+961 71 333 444',
    surface: 280.0,
    details: { floor: 2, balcony: true, parking: 3, cave: true },
    interior_details: 'Family villa with garden and modern interior',
    built_year: 2016,
    view_type: 'open view',
    concierge: false,
    agent_id: undefined,
    agent_name: undefined,
    agent_role: undefined,
    price: 850000,
    notes: 'Currently rented - family villa in quiet neighborhood',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  }
]

export const mockCategories: Category[] = [
  { id: 1, name: 'Apartment', code: 'A', description: 'Residential apartment units', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Villa', code: 'V', description: 'Luxury residential villas', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 3, name: 'Office', code: 'O', description: 'Commercial office spaces', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 4, name: 'Land', code: 'L', description: 'Vacant land for development', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 5, name: 'Restaurant', code: 'R', description: 'Dining establishments', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 6, name: 'Warehouse', code: 'W', description: 'Storage and logistics facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 7, name: 'Chalet', code: 'C', description: 'Mountain chalets and cabins', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 8, name: 'Duplex', code: 'D', description: 'Two-story residential units', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 9, name: 'Factory', code: 'F', description: 'Industrial manufacturing facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 10, name: 'Cloud Kitchen', code: 'CK', description: 'Commercial kitchen facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 11, name: 'Polyclinic', code: 'P', description: 'Medical facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 12, name: 'Project', code: 'PR', description: 'Development projects', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 13, name: 'Pub', code: 'PB', description: 'Entertainment venues', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 14, name: 'Rooftop', code: 'RT', description: 'Rooftop spaces and terraces', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 15, name: 'Shop', code: 'S', description: 'Retail spaces', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 16, name: 'Showroom', code: 'SR', description: 'Display and exhibition spaces', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 17, name: 'Studio', code: 'ST', description: 'Creative and work spaces', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 18, name: 'Industrial Building', code: 'IB', description: 'Industrial facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 19, name: 'Pharmacy', code: 'PH', description: 'Pharmaceutical facilities', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 20, name: 'Bank', code: 'B', description: 'Financial institutions', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 21, name: 'Hangar', code: 'H', description: 'Aircraft and vehicle storage', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 22, name: 'Industrial Warehouse', code: 'IW', description: 'Specialized industrial storage', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }
]

export const mockStatuses: Status[] = [
  { id: 1, name: 'Active', code: 'active', description: 'Property is available for sale/rent', color: '#10B981', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Sold', code: 'sold', description: 'Property has been sold', color: '#EF4444', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 3, name: 'Rented', code: 'rented', description: 'Property has been rented', color: '#8B5CF6', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 4, name: 'Under Contract', code: 'under_contract', description: 'Property is under contract', color: '#F59E0B', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 5, name: 'Pending', code: 'pending', description: 'Property is pending approval', color: '#3B82F6', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }
]
