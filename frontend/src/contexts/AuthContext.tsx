'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'

interface User {
  id: number
  name: string
  email: string
  role: string
  location?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  loading: boolean // Add this for compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token validation function - checks if token is still valid
async function validateToken(token: string): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL 
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
      : 'http://localhost:10000/api'
    
    const response = await fetch(`${API_BASE_URL}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    // If we get a 403, token is invalid/expired
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}))
      const message = (errorData.message || '').toLowerCase()
      // Don't treat CSRF errors as token expiration
      if (!message.includes('csrf')) {
        return false
      }
    }
    
    return response.ok
  } catch (error) {
    console.error('🔐 Token validation error:', error)
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTokenRef = useRef<string | null>(null)

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current)
      validationIntervalRef.current = null
    }
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current)
      tokenCheckIntervalRef.current = null
    }
    lastTokenRef.current = null
    window.location.href = '/'
  }

  useEffect(() => {
    // Check for existing token and user data on app load
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(userData)
        
        // Validate token on app load
        console.log('🔐 Validating token on app load...')
        validateToken(storedToken).then((isValid) => {
          if (!isValid) {
            console.log('🔐 Token invalid on app load, logging out...')
            logout()
          } else {
            console.log('🔐 Token valid on app load')
            setIsLoading(false)
            
            // Set up periodic token validation (every 5 minutes)
            validationIntervalRef.current = setInterval(async () => {
              const currentToken = localStorage.getItem('token')
              if (currentToken) {
                console.log('🔐 Periodic token validation...')
                const isValid = await validateToken(currentToken)
                if (!isValid) {
                  console.log('🔐 Token invalid during periodic check, logging out...')
                  logout()
                }
              }
            }, 5 * 60 * 1000) // Check every 5 minutes
          }
        }).catch((error) => {
          console.error('🔐 Token validation failed:', error)
          logout()
        })
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }

    // Listen for localStorage changes (when token is manually modified)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue !== e.oldValue) {
        console.log('🔐 Token changed in localStorage, validating...')
        const newToken = e.newValue
        if (newToken) {
          validateToken(newToken).then((isValid) => {
            if (!isValid) {
              console.log('🔐 Changed token is invalid, logging out...')
              logout()
            } else {
              console.log('🔐 Changed token is valid')
              setToken(newToken)
            }
          })
        } else {
          // Token was removed
          logout()
        }
      }
    }

    // Also check for token changes via direct localStorage manipulation (same-origin)
    const checkTokenChange = () => {
      const currentToken = localStorage.getItem('token')
      if (lastTokenRef.current !== currentToken) {
        console.log('🔐 Token changed (detected via polling), validating...')
        lastTokenRef.current = currentToken
        if (currentToken) {
          validateToken(currentToken).then((isValid) => {
            if (!isValid) {
              console.log('🔐 Changed token is invalid, logging out...')
              logout()
            } else {
              setToken(currentToken)
            }
          })
        } else {
          logout()
        }
      }
    }

    // Initialize the ref
    lastTokenRef.current = storedToken

    // Poll for token changes every 2 seconds (for same-origin changes)
    tokenCheckIntervalRef.current = setInterval(checkTokenChange, 2000)

    window.addEventListener('storage', handleStorageChange)

    // Cleanup interval on unmount
    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current)
      }
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
      }
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const login = (newToken: string, userData: User) => {
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Set up periodic token validation after login
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current)
    }
    validationIntervalRef.current = setInterval(async () => {
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        console.log('🔐 Periodic token validation...')
        const isValid = await validateToken(currentToken)
        if (!isValid) {
          console.log('🔐 Token invalid during periodic check, logging out...')
          logout()
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
    loading: isLoading // Add this for compatibility
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

