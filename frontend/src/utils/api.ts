import { Property, Category, Status } from '@/types/property'
import { Lead, LeadFilters, LeadsResponse, LeadResponse, LeadStatsApiResponse, CreateLeadFormData, LeadReferralsResponse, AgentReferralStatsResponse, LeadNotesResponse, LeadNote } from '@/types/leads'
import { User, UserFilters, CreateUserFormData, EditUserFormData, UserDocument, UploadDocumentData } from '@/types/user'
import { Viewing, ViewingFilters, ViewingsResponse, ViewingResponse, ViewingStatsApiResponse, CreateViewingFormData, ViewingUpdatesResponse, ViewingUpdateInput } from '@/types/viewing'
import { MonthlyAgentReport, ReportFilters, CreateReportData, UpdateReportData, DCSRMonthlyReport, DCSRReportFilters, CreateDCSRData, UpdateDCSRData, OperationsCommissionReport, OperationsCommissionFilters, CreateOperationsCommissionData, UpdateOperationsCommissionData, SaleRentSourceRow, SaleRentSourceFilters, OperationsDailyReport, OperationsDailyFilters, CreateOperationsDailyData, UpdateOperationsDailyData } from '@/types/reports'

// NEXT_PUBLIC_* variables are embedded at build time
// For client-side code, only NEXT_PUBLIC_* variables are available
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'
const API_BASE_URL = `${BACKEND_URL}/api`

// Debug: Log the actual values being used
if (typeof window !== 'undefined') {
  console.log('🔍 Environment Debug:', {
    'process.env.NEXT_PUBLIC_BACKEND_URL': process.env.NEXT_PUBLIC_BACKEND_URL,
    'BACKEND_URL (final)': BACKEND_URL,
    'API_BASE_URL': API_BASE_URL,
    'window.location.hostname': window.location.hostname,
    'isLocalhost': window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  })
}

// Warn if using default localhost URL in production (check if we're using the default and not on localhost)
if (typeof window !== 'undefined' && BACKEND_URL === 'http://localhost:10000' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.error('❌ NEXT_PUBLIC_BACKEND_URL is not set or was not set at build time!')
  console.error('❌ Using default localhost URL. This will not work in production!')
  console.error('❌ Please set NEXT_PUBLIC_BACKEND_URL in Railway and REDEPLOY the frontend service')
  console.error('❌ Current API URL being used:', API_BASE_URL)
  console.error('❌ Production hostname:', window.location.hostname)
  console.error('❌ Expected NEXT_PUBLIC_BACKEND_URL value:', 'https://finders-crm-backend.up.railway.app')
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: any[]) {
    super(message)
    this.name = 'ApiError'
  }
}

// Token type that accepts string, null, or undefined (for useAuth compatibility)
type AuthToken = string | null | undefined

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
  token?: AuthToken
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Add debugging for notification requests
  if (endpoint.includes('/notifications/')) {
    console.log('🔔 [API] Notification request:', {
      url,
      method: options.method,
      endpoint,
      hasToken: !!token
    })
  }
  
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
  // Convert null to undefined for consistency (localStorage.getItem returns null, but we prefer undefined)
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const authToken = token ?? storedToken ?? undefined
  console.log('🔑 Token check:', { 
    hasToken: !!token, 
    hasLocalStorageToken: !!storedToken, 
    authToken: authToken ? 'present' : 'missing',
    tokenLength: authToken ? authToken.length : 0
  })
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
    console.log('✅ Authorization header set')
  } else {
    console.error('❌ No authentication token found!')
    console.error('❌ Available localStorage keys:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'N/A')
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

  // Add debugging for notification requests
  if (endpoint.includes('/notifications/')) {
    console.log('🔔 [API] Final request config:', {
      url,
      method: options.method,
      headers: Object.keys(headers),
      hasAuth: !!headers['Authorization']
    })
  }

  try {
    const response = await fetch(url, config)
    
    // Add debugging for notification requests
    if (endpoint.includes('/notifications/')) {
      console.log('🔔 [API] Notification response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
    
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
interface UsersResponse {
  success: boolean
  users: User[]
  message?: string
}

interface UserResponse {
  success: boolean
  user: User
  message?: string
}

export const usersApi = {
  // Get all agents (with token for authentication)
  getAgents: (token?: AuthToken) => apiRequest<{ success: boolean; agents: any[]; message?: string }>('/users/agents', {
    method: 'GET',
  }, token),
  
  // Get user by ID (legacy)
  getById: (id: number) => apiRequest<{ success: boolean; data: any }>(`/users/${id}`),
  
  // Get users by role (with token for authentication)
  getByRole: (role: string, token?: AuthToken, teamLeaderId?: number, forAssignment: boolean = false) => {
    let url = `/users/role/${role}`;
    const params = new URLSearchParams();
    
    if (forAssignment) {
      params.append('forAssignment', 'true');
    }
    
    if (teamLeaderId) {
      params.append('teamLeaderId', teamLeaderId.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return apiRequest<{ success: boolean; data: any[] }>(url, {
      method: 'GET',
    }, token);
  },
  
  // Get all users (new - with token)
  async getAll(token: string): Promise<UsersResponse> {
    return apiRequest<UsersResponse>('/users/all', {
      method: 'GET',
    }, token)
  },

  // Get users with filters
  async getWithFilters(filters: UserFilters, token: string): Promise<UsersResponse> {
    const queryParams = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })
    
    const queryString = queryParams.toString()
    const endpoint = `/users/all${queryString ? `?${queryString}` : ''}`
    
    return apiRequest<UsersResponse>(endpoint, {
      method: 'GET',
    }, token)
  },

  // Create a new user
  async create(userData: CreateUserFormData, token: string): Promise<UserResponse> {
    return apiRequest<UserResponse>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, token)
  },

  // Update a user
  async update(userId: number, userData: EditUserFormData, token: string): Promise<UserResponse> {
    return apiRequest<UserResponse>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }, token)
  },

  // Delete a user
  async delete(userId: number, token: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    }, token)
  },

  // Get team leader's agents
  async getTeamLeaderAgents(teamLeaderId: number, token: string): Promise<{ success: boolean; agents: any[] }> {
    return apiRequest(`/users/team-leaders/${teamLeaderId}/agents`, {
      method: 'GET',
    }, token)
  },

  // Assign agent to team leader
  async assignAgentToTeamLeader(teamLeaderId: number, agentId: number, token: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/users/assign-agent`, {
      method: 'POST',
      body: JSON.stringify({ teamLeaderId, agentId }),
    }, token)
  },

  // Remove agent from team leader
  async removeAgentFromTeamLeader(teamLeaderId: number, agentId: number, token: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/users/team-leaders/${teamLeaderId}/agents/${agentId}`, {
      method: 'DELETE',
    }, token)
  },
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
  getAll: (token?: AuthToken) => apiRequest<LeadsResponse>('/leads', {}, token),
  
  // Get reference sources
  getReferenceSources: () => apiRequest<{ success: boolean; data: any[]; message?: string }>('/leads/reference-sources'),
  
  // Get operations users
  getOperationsUsers: () => apiRequest<{ success: boolean; data: any[]; message?: string }>('/leads/operations-users'),
  
  // Get leads with filters
  getWithFilters: (filters: LeadFilters, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    return apiRequest<LeadsResponse>(`/leads/filtered?${params.toString()}`, {}, token)
  },
  
  // Get lead by ID
  getById: (id: number, token?: AuthToken) => apiRequest<LeadResponse>(`/leads/${id}`, {}, token),
  
  // Create lead
  create: (data: CreateLeadFormData, token?: AuthToken) => apiRequest<LeadResponse>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token),
  
  // Update lead
  update: (id: number, data: Partial<CreateLeadFormData>, token?: AuthToken) => apiRequest<LeadResponse>(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token),
  
  // Delete lead
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(`/leads/${id}`, {
    method: 'DELETE',
  }, token),
  
  // Get leads by agent
  getByAgent: (agentId: number, token?: AuthToken) => apiRequest<LeadsResponse>(`/leads/agent/${agentId}`, {}, token),
  
  // Get lead statistics
  getStats: (token?: AuthToken) => apiRequest<LeadStatsApiResponse>('/leads/stats', {}, token),
  
  // Get referrals for a specific lead
  getReferrals: (leadId: number, token?: AuthToken) => apiRequest<LeadReferralsResponse>(`/leads/${leadId}/referrals`, {}, token),
  
  // Add a referral to a lead
  addReferral: (leadId: number, referralData: { name: string; type: 'employee' | 'custom'; employee_id?: number; date: string }, token?: AuthToken) => apiRequest<{ success: boolean; data: any; message: string }>(`/leads/${leadId}/referrals`, {
    method: 'POST',
    body: JSON.stringify(referralData),
  }, token),
  
  // Delete a referral from a lead
  deleteReferral: (leadId: number, referralId: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(`/leads/${leadId}/referrals/${referralId}`, {
    method: 'DELETE',
  }, token),
  
  // Get referral statistics for an agent
  getAgentReferralStats: (agentId: number, token?: AuthToken) => apiRequest<AgentReferralStatsResponse>(`/leads/agent/${agentId}/referral-stats`, {}, token),
  
  // Get viewings for a lead
  getViewings: (leadId: number, token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>(`/leads/${leadId}/viewings`, {}, token),
  
  // Get owned properties for a lead
  getOwnedProperties: (leadId: number, token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>(`/leads/${leadId}/owned-properties`, {}, token),
}

// Viewings API
export const viewingsApi = {
  // Get all viewings (requires authentication)
  getAll: (token?: AuthToken) => apiRequest<ViewingsResponse>('/viewings', {}, token),
  
  // Get viewings with filters
  getWithFilters: (filters: ViewingFilters, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    return apiRequest<ViewingsResponse>(`/viewings/filtered?${params.toString()}`, {}, token)
  },
  
  // Get viewing by ID
  getById: (id: number, token?: AuthToken) => apiRequest<ViewingResponse>(`/viewings/${id}`, {}, token),
  
  // Create viewing
  create: (data: CreateViewingFormData, token?: AuthToken) => apiRequest<ViewingResponse>('/viewings', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token),
  
  // Update viewing
  update: (id: number, data: Partial<CreateViewingFormData>, token?: AuthToken) => apiRequest<ViewingResponse>(`/viewings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token),
  
  // Delete viewing
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(`/viewings/${id}`, {
    method: 'DELETE',
  }, token),
  
  // Get viewings by agent
  getByAgent: (agentId: number, token?: AuthToken) => apiRequest<ViewingsResponse>(`/viewings/agent/${agentId}`, {}, token),
  
  // Get viewing statistics
  getStats: (token?: AuthToken) => apiRequest<ViewingStatsApiResponse>('/viewings/stats', {}, token),
  
  // Get follow-up viewings for a specific viewing (replaces old getUpdates)
  // Returns sub_viewings (follow-up viewings) instead of text updates
  getUpdates: (viewingId: number, token?: AuthToken) => apiRequest<ViewingUpdatesResponse>(`/viewings/${viewingId}/updates`, {}, token),
  
  // Add follow-up viewing to a viewing (replaces old addUpdate)
  // Use new format: { viewing_date, viewing_time, status, notes }
  // Old format (update_text, update_date) still supported for backward compatibility
  addUpdate: (viewingId: number, data: ViewingUpdateInput, token?: AuthToken) => apiRequest<{ success: boolean; data: any; message?: string }>(`/viewings/${viewingId}/updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token),

  // Update a follow-up viewing (replaces old updateViewingUpdate)
  // The updateId is now a follow-up viewing ID
  updateUpdate: (viewingId: number, updateId: number, data: ViewingUpdateInput, token?: AuthToken) => apiRequest<{ success: boolean; data: any; message?: string }>(`/viewings/${viewingId}/updates/${updateId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token),
  
  // Delete follow-up viewing (replaces old deleteViewingUpdate)
  // The updateId is now a follow-up viewing ID
  deleteUpdate: (viewingId: number, updateId: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(`/viewings/${viewingId}/updates/${updateId}`, {
    method: 'DELETE',
  }, token),
}

// Lead Notes API
export const leadNotesApi = {
  getForLead: (leadId: number, token?: AuthToken) =>
    apiRequest<LeadNotesResponse>(`/leads/${leadId}/notes`, {}, token),
  create: (leadId: number, note_text: string, token?: AuthToken) =>
    apiRequest<{ success: boolean; data: LeadNote; message?: string }>(`/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text }),
    }, token),
  update: (leadId: number, noteId: number, note_text: string, token?: AuthToken) =>
    apiRequest<{ success: boolean; data: LeadNote; message?: string }>(`/leads/${leadId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ note_text }),
    }, token),
  delete: (leadId: number, noteId: number, token?: AuthToken) =>
    apiRequest<{ success: boolean; message?: string }>(`/leads/${leadId}/notes/${noteId}`, {
      method: 'DELETE',
    }, token),
}

// Categories API
export const categoriesApi = {
  getAll: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/categories', {}, token),
  getAllForAdmin: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/categories/admin', {}, token),
  getDemo: () => apiRequest<{ success: boolean; data: any[] }>('/categories/demo'),
  getWithCount: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/categories/with-count', {}, token),
  search: (query: string, token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>(`/categories/search?q=${encodeURIComponent(query)}`, {}, token),
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: any }>(`/categories/${id}`, {}, token),
  create: (data: { name: string; code: string; description?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
  update: (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message: string }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  delete: (id: number, token?: AuthToken) => 
    apiRequest<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }, token),
}

// Statuses API
export const statusesApi = {
  getAll: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/statuses', {}, token),
  getAllForAdmin: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/statuses/admin', {}, token),
  getDemo: () => apiRequest<{ success: boolean; data: any[] }>('/statuses/demo'),
  getWithCount: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/statuses/with-count', {}, token),
  getStats: (token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>('/statuses/stats', {}, token),
  search: (query: string, token?: AuthToken) => apiRequest<{ success: boolean; data: any[] }>(`/statuses/search?q=${encodeURIComponent(query)}`, {}, token),
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: any }>(`/statuses/${id}`, {}, token),
  create: (data: { name: string; code: string; description?: string; color?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message: string }>('/statuses', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
  update: (id: number, data: { name?: string; code?: string; description?: string; color?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message: string }>(`/statuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  delete: (id: number, token?: AuthToken) => 
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
  create: (data: { status_name: string; code: string; color?: string; description?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message?: string }>('/lead-statuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    }),
  
  // Update lead status
  update: (id: number, data: { status_name: string; code: string; color?: string; description?: string; is_active?: boolean }, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message?: string }>(`/lead-statuses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    }),
  
  // Delete lead status
  delete: (id: number, token?: AuthToken) => 
    apiRequest<{ success: boolean; data: any; message?: string }>(`/lead-statuses/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    })
}

// Notifications API
export const notificationsApi = {
  // Get all notifications for the authenticated user
  getAll: (params?: { limit?: number; offset?: number; unreadOnly?: boolean; entityType?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.unreadOnly) queryParams.append('unreadOnly', params.unreadOnly.toString())
    if (params?.entityType) queryParams.append('entityType', params.entityType)
    
    const queryString = queryParams.toString()
    return apiRequest<{ success: boolean; data: any[]; unreadCount: number; total: number }>(`/notifications${queryString ? `?${queryString}` : ''}`)
  },
  
  // Get notification statistics
  getStats: () => apiRequest<{ success: boolean; data: any }>('/notifications/stats'),
  
  // Get unread notification count
  getUnreadCount: () => apiRequest<{ success: boolean; unreadCount: number }>('/notifications/unread-count'),
  
  // Mark a specific notification as read
  markAsRead: (notificationId: number) => apiRequest<{ success: boolean; message: string; data: any }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  
  // Mark all notifications as read
  markAllAsRead: () => apiRequest<{ success: boolean; message: string; updatedCount: number }>('/notifications/mark-all-read', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  
  // Delete a specific notification
  delete: (notificationId: number) => apiRequest<{ success: boolean; message: string; data: any }>(`/notifications/${notificationId}`, {
    method: 'DELETE',
  }),
  
  // Create test notification (for development)
  createTest: (data: { title?: string; message?: string; type?: string }) => apiRequest<{ success: boolean; message: string; data: any }>('/notifications/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
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

// ======================
// HR / User Documents API
// ======================

interface DocumentsResponse {
  success: boolean
  data: UserDocument[]
  message?: string
}

// Reports API
export const reportsApi = {
  // Get all monthly reports with optional filters
  getAll: (filters: ReportFilters = {}, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    return apiRequest<{ success: boolean; data: MonthlyAgentReport[]; count: number; message: string }>(
      `/reports/monthly${queryString ? `?${queryString}` : ''}`,
      {},
      token
    )
  },

  // Get a single report by ID
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: MonthlyAgentReport; message: string }>(
    `/reports/monthly/${id}`,
    {},
    token
  ),

  // Create a new monthly report
  create: (data: CreateReportData, token?: AuthToken) => apiRequest<{ success: boolean; data: MonthlyAgentReport; message: string }>(
    '/reports/monthly',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  ),

  // Update a report (mainly manual fields like boosts)
  update: (id: number, data: UpdateReportData, token?: AuthToken) => apiRequest<{ success: boolean; data: MonthlyAgentReport; message: string }>(
    `/reports/monthly/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  ),

  // Recalculate report automatic values
  recalculate: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: MonthlyAgentReport; message: string }>(
    `/reports/monthly/${id}/recalculate`,
    {
      method: 'POST',
    },
    token
  ),

  // Delete a report
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(
    `/reports/monthly/${id}`,
    {
      method: 'DELETE',
    },
    token
  ),

  // Get available lead sources
  getLeadSources: (token?: AuthToken) => apiRequest<{ success: boolean; data: string[]; message: string }>(
    '/reports/lead-sources',
    {},
    token
  ),

  // Export report to Excel
  exportToExcel: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/reports/monthly/${id}/export/excel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export report to Excel')
    }

    return response.blob()
  },

  // Export report to PDF
  exportToPDF: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/reports/monthly/${id}/export/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export report to PDF')
    }

    return response.blob()
  },
}

// Sale & Rent Source Report API
export const saleRentSourceApi = {
  // Get rows for Sale & Rent Source report
  getAll: (filters: SaleRentSourceFilters, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    return apiRequest<{ success: boolean; data: SaleRentSourceRow[]; count: number; message: string }>(
      `/reports/sale-rent-source${queryString ? `?${queryString}` : ''}`,
      {},
      token
    )
  },

  // Export to Excel
  exportToExcel: async (filters: SaleRentSourceFilters, token?: AuthToken): Promise<Blob> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''

    const response = await fetch(`${API_BASE_URL}/reports/sale-rent-source/export/excel${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export Sale & Rent Source report' }))
      throw new Error(errorData.message || 'Failed to export Sale & Rent Source report to Excel')
    }

    return response.blob()
  },

  // Export to PDF
  exportToPDF: async (filters: SaleRentSourceFilters, token?: AuthToken): Promise<Blob> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''

    const response = await fetch(`${API_BASE_URL}/reports/sale-rent-source/export/pdf${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export Sale & Rent Source report' }))
      throw new Error(errorData.message || 'Failed to export Sale & Rent Source report to PDF')
    }

    return response.blob()
  },
}

// DCSR Reports API
export const dcsrApi = {
  // Get all DCSR reports with optional filters
  getAll: (filters: DCSRReportFilters = {}, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    return apiRequest<{ success: boolean; data: DCSRMonthlyReport[]; message: string }>(
      `/dcsr-reports/monthly${queryString ? `?${queryString}` : ''}`,
      {},
      token
    )
  },

  // Get a single DCSR report by ID
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: DCSRMonthlyReport; message: string }>(
    `/dcsr-reports/monthly/${id}`,
    {},
    token
  ),

  // Create a new DCSR report
  create: (data: CreateDCSRData, token?: AuthToken) => apiRequest<{ success: boolean; data: DCSRMonthlyReport; message: string }>(
    '/dcsr-reports/monthly',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  ),

  // Update a DCSR report
  update: (id: number, data: UpdateDCSRData, token?: AuthToken) => apiRequest<{ success: boolean; data: DCSRMonthlyReport; message: string }>(
    `/dcsr-reports/monthly/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  ),

  // Recalculate DCSR report automatic values
  recalculate: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: DCSRMonthlyReport; message: string }>(
    `/dcsr-reports/monthly/${id}/recalculate`,
    {
      method: 'POST',
    },
    token
  ),

  // Delete a DCSR report
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(
    `/dcsr-reports/monthly/${id}`,
    {
      method: 'DELETE',
    },
    token
  ),

  // Export DCSR report to Excel
  exportToExcel: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/dcsr-reports/monthly/${id}/export/excel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export DCSR report to Excel')
    }

    return response.blob()
  },

  // Export DCSR report to PDF
  exportToPDF: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/dcsr-reports/monthly/${id}/export/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export DCSR report to PDF')
    }

    return response.blob()
  },

  // Get team-level DCSR breakdown
  getTeamBreakdown: (teamLeaderId: number, startDate: string, endDate: string, token?: AuthToken) => {
    const params = new URLSearchParams()
    params.append('team_leader_id', String(teamLeaderId))
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    return apiRequest<{ 
      success: boolean
      data: {
        team_leader_id: number
        team_leader_name: string
        team_leader_code: string | null
        team_members: Array<{
          id: number
          name: string
          user_code: string | null
          role: string
        }>
        listings_count: number
        leads_count: number
        sales_count: number
        rent_count: number
        viewings_count: number
      }
      message: string 
    }>(
      `/dcsr-reports/team-breakdown?${params.toString()}`,
      {},
      token
    )
  },

  // Get all teams breakdown (includes unassigned)
  getAllTeamsBreakdown: (startDate: string, endDate: string, token?: AuthToken) => {
    const params = new URLSearchParams()
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    return apiRequest<{ 
      success: boolean
      data: {
        teams: Array<{
          team_leader_id: number
          team_leader_name: string
          team_leader_code: string | null
          team_members: Array<{
            id: number
            name: string
            user_code: string | null
            role: string
          }>
          listings_count: number
          leads_count: number
          sales_count: number
          rent_count: number
          viewings_count: number
        }>
        unassigned_listings: number
        total_teams: number
      }
      message: string 
    }>(
      `/dcsr-reports/teams-breakdown?${params.toString()}`,
      {},
      token
    )
  },

  // Get detailed team properties
  getTeamProperties: (teamLeaderId: number, startDate: string, endDate: string, filters?: {
    property_type?: string
    status_id?: number
    category_id?: number
    agent_id?: number
  }, token?: AuthToken) => {
    const params = new URLSearchParams()
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    if (filters?.property_type) params.append('property_type', filters.property_type)
    if (filters?.status_id) params.append('status_id', String(filters.status_id))
    if (filters?.category_id) params.append('category_id', String(filters.category_id))
    if (filters?.agent_id) params.append('agent_id', String(filters.agent_id))
    return apiRequest<{ 
      success: boolean
      data: Array<{
        id: number
        reference_number: string
        status_id: number
        status_name: string
        status_color: string
        property_type: string
        location: string
        category_id: number
        category_name: string
        category_code: string
        building_name: string | null
        owner_name: string
        phone_number: string
        surface: number
        price: number
        agent_id: number | null
        agent_name: string | null
        agent_code: string | null
        agent_role: string | null
        closed_date: string | null
        sold_amount: number | null
        created_at: string
        updated_at: string
      }>
      message: string 
    }>(
      `/dcsr-reports/team/${teamLeaderId}/properties?${params.toString()}`,
      {},
      token
    )
  },

  // Get detailed team leads
  getTeamLeads: (teamLeaderId: number, startDate: string, endDate: string, filters?: {
    status?: string
    agent_id?: number
  }, token?: AuthToken) => {
    const params = new URLSearchParams()
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.agent_id) params.append('agent_id', String(filters.agent_id))
    return apiRequest<{ 
      success: boolean
      data: Array<{
        id: number
        date: string
        customer_name: string
        phone_number: string | null
        agent_id: number | null
        agent_name: string | null
        agent_code: string | null
        agent_role: string | null
        status: string
        notes: string | null
        created_at: string
        updated_at: string
      }>
      message: string 
    }>(
      `/dcsr-reports/team/${teamLeaderId}/leads?${params.toString()}`,
      {},
      token
    )
  },

  // Get detailed team viewings
  getTeamViewings: (teamLeaderId: number, startDate: string, endDate: string, filters?: {
    status?: string
    agent_id?: number
  }, token?: AuthToken) => {
    const params = new URLSearchParams()
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.agent_id) params.append('agent_id', String(filters.agent_id))
    return apiRequest<{ 
      success: boolean
      data: Array<{
        id: number
        viewing_date: string
        viewing_time: string | null
        status: string
        agent_id: number | null
        agent_name: string | null
        agent_code: string | null
        property_id: number | null
        property_reference: string | null
        property_location: string | null
        lead_id: number | null
        lead_name: string | null
        lead_phone: string | null
        created_at: string
        updated_at: string
      }>
      message: string 
    }>(
      `/dcsr-reports/team/${teamLeaderId}/viewings?${params.toString()}`,
      {},
      token
    )
  }
}

// Operations Commission Reports API
export const operationsCommissionApi = {
  // Get all operations commission reports with optional filters
  getAll: (filters: OperationsCommissionFilters = {}, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    return apiRequest<{ success: boolean; data: OperationsCommissionReport[]; message: string }>(
      `/operations-commission/monthly${queryString ? `?${queryString}` : ''}`,
      {},
      token
    )
  },

  // Get a single operations commission report by ID
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsCommissionReport; message: string }>(
    `/operations-commission/monthly/${id}`,
    {},
    token
  ),

  // Create a new operations commission report
  create: (data: CreateOperationsCommissionData, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsCommissionReport; message: string }>(
    '/operations-commission/monthly',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  ),

  // Update an existing operations commission report
  update: (id: number, data: UpdateOperationsCommissionData, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsCommissionReport; message: string }>(
    `/operations-commission/monthly/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  ),

  // Recalculate an operations commission report
  recalculate: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsCommissionReport; message: string }>(
    `/operations-commission/monthly/${id}/recalculate`,
    {
      method: 'POST',
    },
    token
  ),

  // Delete an operations commission report
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(
    `/operations-commission/monthly/${id}`,
    {
      method: 'DELETE',
    },
    token
  ),

  // Export operations commission report to Excel
  exportToExcel: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/operations-commission/monthly/${id}/export/excel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export operations commission report to Excel')
    }

    return response.blob()
  },

  // Export operations commission report to PDF
  exportToPDF: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/operations-commission/monthly/${id}/export/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export operations commission report to PDF')
    }

    return response.blob()
  },
}

export const operationsDailyApi = {
  // Get all operations daily reports with optional filters
  getAll: (filters: OperationsDailyFilters = {}, token?: AuthToken) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    return apiRequest<{ success: boolean; data: OperationsDailyReport[]; message: string }>(
      `/operations-daily${queryString ? `?${queryString}` : ''}`,
      {},
      token
    )
  },

  // Get a single operations daily report by ID
  getById: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsDailyReport; message: string }>(
    `/operations-daily/${id}`,
    {},
    token
  ),

  // Create a new operations daily report
  create: (data: CreateOperationsDailyData, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsDailyReport; message: string }>(
    '/operations-daily',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  ),

  // Update an existing operations daily report
  update: (id: number, data: UpdateOperationsDailyData, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsDailyReport; message: string }>(
    `/operations-daily/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  ),

  // Recalculate an operations daily report
  recalculate: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; data: OperationsDailyReport; message: string }>(
    `/operations-daily/${id}/recalculate`,
    {
      method: 'POST',
    },
    token
  ),

  // Delete an operations daily report
  delete: (id: number, token?: AuthToken) => apiRequest<{ success: boolean; message: string }>(
    `/operations-daily/${id}`,
    {
      method: 'DELETE',
    },
    token
  ),

  // Export operations daily report to Excel
  exportToExcel: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/operations-daily/${id}/export/excel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export operations daily report to Excel')
    }

    return response.blob()
  },

  // Export operations daily report to PDF
  exportToPDF: async (id: number, token?: AuthToken): Promise<Blob> => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authToken = (token ?? storedToken ?? undefined) ?? ''
    
    const response = await fetch(`${API_BASE_URL}/operations-daily/${id}/export/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export report' }))
      throw new Error(errorData.message || 'Failed to export operations daily report to PDF')
    }

    return response.blob()
  },
}

interface DocumentResponse {
  success: boolean
  data: UserDocument
  message?: string
}

export const userDocumentsApi = {
  /**
   * Upload a document for a user
   */
  async upload(userId: number, data: UploadDocumentData, token: string): Promise<DocumentResponse> {
    const formData = new FormData()
    formData.append('document', data.document)
    formData.append('document_label', data.document_label)
    if (data.notes) {
      formData.append('notes', data.notes)
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(response.status, error.message || 'Upload failed', error.errors)
    }

    return response.json()
  },

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: number, token: string): Promise<DocumentsResponse> {
    return apiRequest<DocumentsResponse>(`/users/${userId}/documents`, {
      method: 'GET',
    }, token)
  },

  /**
   * Get a specific document
   */
  async getDocument(documentId: number, token: string): Promise<DocumentResponse> {
    return apiRequest<DocumentResponse>(`/users/documents/${documentId}`, {
      method: 'GET',
    }, token)
  },

  /**
   * Update document metadata
   */
  async update(documentId: number, data: { document_label: string; notes?: string }, token: string): Promise<DocumentResponse> {
    return apiRequest<DocumentResponse>(`/users/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token)
  },

  /**
   * Delete a document
   */
  async delete(documentId: number, hardDelete: boolean, token: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/users/documents/${documentId}?hardDelete=${hardDelete}`, {
      method: 'DELETE',
    }, token)
  },

  /**
   * Download a document
   */
  getDownloadUrl(documentId: number): string {
    return `${API_BASE_URL}/users/documents/${documentId}/download`
  },
}
