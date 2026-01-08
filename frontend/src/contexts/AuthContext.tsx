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
    console.error('🔐 Error decoding JWT:', error)
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
      console.log('🔐 Token decode failed, treating as invalid')
      return false
    }
    
    // Check if token has expiration claim
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = decoded.exp
      
      // If token is expired, return false
      if (now >= expiresAt) {
        console.log('🔐 Token expired locally:', {
          now,
          expiresAt,
          expiredSeconds: now - expiresAt
        })
        return false
      }
      
      // Token is not expired locally, consider it valid
      // Note: We only check expiration here, not server-side validation.
      // The API will validate the token signature and expiration on actual requests.
      // This prevents false logouts due to network errors or CSRF issues.
      return true
    }
    
    // If no expiration claim, treat as invalid (shouldn't happen with our tokens)
    console.warn('🔐 Token has no expiration claim, treating as invalid')
    return false
  } catch (error) {
    // If we can't decode the token, it's invalid
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
    // This is mainly for detecting if token was removed externally (e.g., from another tab)
    const checkTokenChange = () => {
      const currentToken = localStorage.getItem('token')
      if (lastTokenRef.current !== currentToken) {
        // Token was removed (null) - logout
        if (!currentToken && lastTokenRef.current) {
          console.log('🔐 Token removed externally, logging out...')
          logout()
          return
        }
        // Token was added or changed
        // Update ref to prevent repeated checks
        // If token was set via login(), it will be handled there
        // If token was added externally, we'll validate it
        if (currentToken) {
          // Only validate if token actually changed (not just initialized)
          if (lastTokenRef.current && currentToken !== lastTokenRef.current) {
            console.log('🔐 Token changed externally, validating...')
            validateToken(currentToken).then((isValid) => {
              if (!isValid) {
                console.log('🔐 Changed token is invalid, logging out...')
                logout()
              } else {
                lastTokenRef.current = currentToken
                setToken(currentToken)
                // Try to get user data from localStorage
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
            })
          } else {
            // Just update the ref if token was initialized
            lastTokenRef.current = currentToken
          }
        }
      }
    }

    // Initialize the ref
    lastTokenRef.current = storedToken

    // Poll for token changes less frequently (every 10 seconds) to avoid unnecessary checks
    // This is mainly to detect if token was removed by another tab/window
    tokenCheckIntervalRef.current = setInterval(checkTokenChange, 10000)

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
    
    // Update the last token ref to prevent false change detection
    lastTokenRef.current = newToken
    
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

