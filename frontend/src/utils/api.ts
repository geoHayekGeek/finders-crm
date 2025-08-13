const API_BASE_URL = 'http://localhost:10000/api'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getHeaders(requireAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requireAuth) {
      const token = localStorage.getItem('token')
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(requireAuth),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Request failed',
          error: data.error || 'Unknown error',
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getCurrentUser() {
    return this.request('/users/me')
  }

  // Password reset endpoints
  async requestPasswordReset(email: string) {
    return this.request('/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false) // No auth required
  }

  async verifyResetCode(email: string, code: string) {
    return this.request('/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }, false) // No auth required
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return this.request('/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }, false) // No auth required
  }

  async resendResetCode(email: string) {
    return this.request('/password-reset/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false) // No auth required
  }

  // Properties endpoints
  async getProperties() {
    return this.request('/properties')
  }

  async createProperty(propertyData: any) {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    })
  }

  async updateProperty(id: string, propertyData: any) {
    return this.request(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    })
  }

  async deleteProperty(id: string) {
    return this.request(`/properties/${id}`, {
      method: 'DELETE',
    })
  }

  // Clients endpoints
  async getClients() {
    return this.request('/clients')
  }

  async createClient(clientData: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    })
  }

  async updateClient(id: string, clientData: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    })
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    })
  }

  // Leads endpoints
  async getLeads() {
    return this.request('/leads')
  }

  async createLead(leadData: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    })
  }

  async updateLead(id: string, leadData: any) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    })
  }

  async deleteLead(id: string) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE',
    })
  }

  // Analytics endpoints
  async getAnalytics(timeRange: string = '6M') {
    return this.request(`/analytics?timeRange=${timeRange}`)
  }

  async getDashboardStats() {
    return this.request('/dashboard/stats')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient

// Export individual functions for easier imports
export const requestPasswordReset = (email: string) => apiClient.requestPasswordReset(email)
export const verifyResetCode = (email: string, code: string) => apiClient.verifyResetCode(email, code)
export const resetPassword = (email: string, code: string, newPassword: string) => apiClient.resetPassword(email, code, newPassword)
export const resendResetCode = (email: string) => apiClient.resendResetCode(email)
