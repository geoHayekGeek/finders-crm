import { Property, Category, Status } from '@/types/property'
import { Lead, LeadFilters, LeadsResponse, LeadResponse, LeadStatsApiResponse, CreateLeadFormData } from '@/types/leads'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }
  
  // Auto-get token from localStorage if not provided
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  const config: RequestInit = {
    headers,
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (parseError) {
        // If we can't parse the response, use the default message
        console.warn('Could not parse error response:', parseError)
      }
      throw new ApiError(response.status, errorMessage)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Authentication API
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
  update: (id: number, data: any) => apiRequest<{ success: boolean; data: any; message: string }>(`/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
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
}

// Mock data for development (when backend is not available)
export const mockProperties: Property[] = [
  {
    id: 1,
    reference_number: 'FA2025587',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'External referral from local real estate agent',
    referral_dates: ['2025-01-15'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 2,
    reference_number: 'FV2025856',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'Internal referral from agent',
    referral_dates: ['2025-01-10', '2025-01-18'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 3,
    reference_number: 'FO2025923',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'Direct inquiry',
    referral_dates: ['2025-01-12'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 4,
    reference_number: 'FL2025478',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'Local real estate agent',
    referral_dates: ['2025-01-08'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 5,
    reference_number: 'FR2025567',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'Direct inquiry',
    referral_dates: ['2025-01-14'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 6,
    reference_number: 'FW2025890',
    status_id: 1,
    status_name: 'Active',
    status_color: '#10B981',
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
    referral_source: 'Commercial real estate referral',
    referral_dates: ['2025-01-16'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 7,
    reference_number: 'FS2025123',
    status_id: 2,
    status_name: 'Sold',
    status_color: '#EF4444',
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
    referral_source: 'Internal referral',
    referral_dates: ['2025-01-05'],
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  },
  {
    id: 8,
    reference_number: 'FV2025456',
    status_id: 3,
    status_name: 'Rented',
    status_color: '#8B5CF6',
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
    referral_source: 'External referral',
    referral_dates: ['2025-01-03'],
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
