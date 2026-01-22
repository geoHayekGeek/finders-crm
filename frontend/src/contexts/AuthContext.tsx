'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo } from 'react'

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

// Helper function to decode JWT without verification (just to check expiration)
function decodeJWT(token: string): { exp?: number; id?: number; role?: string } | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    // Silently fail - invalid token will be caught by validateToken
    return null
  }
}

// Token validation function - checks if token is still valid
// This only checks expiration locally to avoid unnecessary API calls and prevent
// false negatives from network errors or CSRF issues
async function validateToken(token: string): Promise<boolean> {
  try {
    // Decode JWT to check expiration locally
    const decoded = decodeJWT(token)
    if (!decoded) {
      return false
    }
    
    // Check if token has expiration claim
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = decoded.exp
      
      // If token is expired, return false
      if (now >= expiresAt) {
        return false
      }
      
      // Token is not expired locally, consider it valid
      // Note: We only check expiration here, not server-side validation.
      // The API will validate the token signature and expiration on actual requests.
      // This prevents false logouts due to network errors or CSRF issues.
      return true
    }
    
    // If no expiration claim, treat as invalid (shouldn't happen with our tokens)
    return false
  } catch (error) {
    // If we can't decode the token, it's invalid
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
        lastTokenRef.current = storedToken
        
        // Validate token on app load
        validateToken(storedToken).then((isValid) => {
          if (!isValid) {
            logout()
          } else {
            setIsLoading(false)
          }
        }).catch((error) => {
          console.error('Token validation failed:', error)
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

    // Consolidated token validation - single interval that checks both expiration and changes
    // Check every 60 seconds (1 minute) - more efficient than multiple intervals
    const tokenValidationInterval = setInterval(async () => {
      const currentToken = localStorage.getItem('token')
      
      // Check if token was removed
      if (!currentToken && lastTokenRef.current) {
        logout()
        return
      }
      
      // Check if token changed
      if (currentToken && currentToken !== lastTokenRef.current) {
        lastTokenRef.current = currentToken
        setToken(currentToken)
        
        // Try to get user data
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setUser(userData)
          } catch (e) {
            console.error('Error parsing user data:', e)
          }
        }
      }
      
      // Validate token expiration
      if (currentToken) {
        const isValid = await validateToken(currentToken)
        if (!isValid) {
          logout()
        }
      }
    }, 60000) // Check every 60 seconds

    validationIntervalRef.current = tokenValidationInterval

    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue !== e.oldValue) {
        const newToken = e.newValue
        if (newToken) {
          validateToken(newToken).then((isValid) => {
            if (!isValid) {
              logout()
            } else {
              setToken(newToken)
            }
          })
        } else {
          logout()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Cleanup on unmount
    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current)
        validationIntervalRef.current = null
      }
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const login = (newToken: string, userData: User) => {
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Update the last token ref to prevent false change detection
    lastTokenRef.current = newToken
    
    // Clear existing interval if any (should already be set by useEffect)
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current)
    }
    
    // Set up consolidated token validation (same as in useEffect)
    validationIntervalRef.current = setInterval(async () => {
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        const isValid = await validateToken(currentToken)
        if (!isValid) {
          logout()
        }
      }
    }, 60000) // Check every 60 seconds
  }

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
    loading: isLoading // Add this for compatibility
  }), [user, token, isLoading])

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

