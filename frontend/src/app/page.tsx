'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { apiClient, ApiError } from '@/utils/api'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  Home, 
  BarChart3, 
  ArrowRight, 
  Shield, 
  Zap, 
  Target,
  Eye,
  EyeOff
} from 'lucide-react'

interface LoginResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: string
    location?: string
    phone?: string
  }
}

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const { settings } = useSettings()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/properties')
    }
  }, [authLoading, isAuthenticated, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      console.log('Attempting login...')
      const response = await apiClient.login(email, password)
      console.log('Login response:', response)

      // Backend returns: { message, token, user }
      if (response.token && response.user) {
        const loginData = response as LoginResponse
        console.log('Login data:', loginData)
        
        // Use the login function from auth context
        login(loginData.token, loginData.user)
        console.log('User logged in, redirecting to properties...')
        
        // Add a small delay to ensure state is updated, then redirect
        setTimeout(() => {
          router.replace('/properties')
          console.log('Router.replace called')
        }, 100)
      } else {
        console.log('Login failed:', response.message)
        setError(response.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      // Check if it's an ApiError with a specific message
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error && err.message) {
        setError(err.message)
      } else {
        setError('Network error. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!authLoading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center text-gray-600">Redirecting to properties...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              {settings.company_logo ? (
                <img 
                  src={settings.company_logo} 
                  alt={settings.company_name} 
                  className="h-8 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <>
                  <Building2 className="h-8 w-8" style={{ color: settings.primary_color }} />
                  <span className="text-xl font-bold text-gray-900">{settings.company_name}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin access only</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your
            <span className="text-blue-600"> Real Estate</span>
            <br />
            Business
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your property management, enhance client relationships, and boost sales with our comprehensive CRM solution designed specifically for real estate professionals.
          </p>
          
          {/* Login Form */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100 login-form">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Admin Login
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-12 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <a
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Contact your administrator for access credentials
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our comprehensive platform provides all the tools real estate professionals need to manage properties, clients, and transactions efficiently.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Property Management</h3>
            <p className="text-gray-600">Easily manage your property portfolio with detailed listings, photos, and market analysis.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Client CRM</h3>
            <p className="text-gray-600">Build lasting relationships with comprehensive client profiles and communication tracking.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
            <p className="text-gray-600">Get insights into your performance with detailed analytics and customizable reports.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead Management</h3>
            <p className="text-gray-600">Track and nurture leads through the entire sales pipeline with automated workflows.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Compliant</h3>
            <p className="text-gray-600">Bank-level security with full compliance for real estate regulations and data protection.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
            <p className="text-gray-600">Built with modern technology for lightning-fast performance and 99.9% uptime.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">Finders CRM</span>
          </div>
          <p className="text-gray-400 mb-4">
            Empowering real estate professionals with powerful tools for success
          </p>
          <p className="text-gray-500 text-sm">
            © 2025 Ctrly Agency. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
