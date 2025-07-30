import axios from 'axios'
import { demoAuthService } from './demoAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// Smart backend detection - try backend first, fallback to demo mode
let BACKEND_AVAILABLE = false
let DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// Test backend connectivity on service initialization
const testBackendConnectivity = async () => {
  if (DEMO_MODE) {
    console.log('AuthService: Demo mode enabled, skipping backend connectivity test')
    return false
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      timeout: 3000 // 3 second timeout
    })
    BACKEND_AVAILABLE = response.ok
    console.log('AuthService: Backend connectivity test result:', BACKEND_AVAILABLE)
    return BACKEND_AVAILABLE
  } catch (error) {
    console.warn('AuthService: Backend not available, using demo mode:', error.message)
    BACKEND_AVAILABLE = false
    return false
  }
}

// Initialize backend connectivity test
testBackendConnectivity()

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: 'farmer' | 'agronomist' | 'admin'
  }
}

// Custom event for auth state changes
export const AUTH_CHANGE_EVENT = 'authStateChange'

const dispatchAuthChange = () => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT))
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('AuthService: login called with', { email, DEMO_MODE, BACKEND_AVAILABLE }) // Debug log
    
    // Try backend first if demo mode is disabled
    if (!DEMO_MODE) {
      try {
        console.log('AuthService: Attempting backend login') // Debug log
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password
        }, { withCredentials: true })
        
        const { user } = response.data.data
        localStorage.setItem('user_data', JSON.stringify(user))
        dispatchAuthChange()
        
        console.log('AuthService: Backend login successful') // Debug log
        return { token: 'cookie', user }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            console.warn('AuthService: Backend not available, falling back to demo mode')
            // Fall through to demo mode
          } else {
            // Backend error (invalid credentials, etc.)
            throw new Error(error.response?.data?.message || 'Login failed')
          }
        } else {
          console.error('AuthService: Unexpected login error:', error)
          throw error
        }
      }
    }
    
    // Use demo mode (either enabled or backend fallback)
    console.log('AuthService: Using demo mode for login') // Debug log
    const result = await demoAuthService.login(email, password)
    console.log('AuthService: Demo login result', result) // Debug log
    dispatchAuthChange()
    return result
  },
  
  signup: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('AuthService: signup called with', { email, DEMO_MODE, BACKEND_AVAILABLE }) // Debug log
    
    // Try backend first if demo mode is disabled
    if (!DEMO_MODE) {
      try {
        console.log('AuthService: Attempting backend signup') // Debug log
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
          email,
          password,
          name: email.split('@')[0], // Use email prefix as name
          role: 'farmer'
        }, { withCredentials: true })
        
        const { user } = response.data.data
        localStorage.setItem('user_data', JSON.stringify(user))
        dispatchAuthChange()
        
        console.log('AuthService: Backend signup successful') // Debug log
        return { token: 'cookie', user }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            console.warn('AuthService: Backend not available, falling back to demo mode')
            // Fall through to demo mode
          } else {
            // Backend error (user exists, validation error, etc.)
            throw new Error(error.response?.data?.message || 'Signup failed')
          }
        } else {
          console.error('AuthService: Unexpected signup error:', error)
          throw error
        }
      }
    }
    
    // Use demo mode (either enabled or backend fallback)
    console.log('AuthService: Using demo mode for signup') // Debug log
    const result = await demoAuthService.signup(email, password)
    console.log('AuthService: Demo signup result', result) // Debug log
    dispatchAuthChange()
    return result
  },
  
  logout: () => {
    console.log('AuthService: Starting logout process')
    
    try {
      // Clear user-specific data on logout
      const userData = localStorage.getItem('user_data')
      if (userData) {
        try {
          const user = JSON.parse(userData)
          console.log('AuthService: Clearing user-specific data for user:', user.id)
          
          // Clear user-specific localStorage keys
          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(`cropguard_user_${user.id}_`)) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => {
            console.log('AuthService: Removing key:', key)
            localStorage.removeItem(key)
          })
        } catch (error) {
          console.warn('AuthService: Failed to clear user-specific data:', error)
        }
      }
      
      // Clear main auth data immediately (don't wait for async)
      console.log('AuthService: Removing user_data from localStorage')
      localStorage.removeItem('user_data')
      
      // Dispatch auth change event immediately
      console.log('AuthService: Dispatching auth change event')
      dispatchAuthChange()
      
      // Send logout request to clear httpOnly cookie (non-blocking)
      axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true })
        .then(() => console.log('AuthService: Server logout successful'))
        .catch(error => console.warn('AuthService: Server logout failed:', error))
        
    } catch (error) {
      console.error('AuthService: Logout error:', error)
      // Ensure we still clear the main auth data even if other steps fail
      localStorage.removeItem('user_data')
      localStorage.removeItem('auth_token') // Also clear auth token
      dispatchAuthChange()
    }
  },
  
  isAuthenticated: (): boolean => {
    // Check if user data exists (cookie auth doesn't allow JS access to token)
    const userData = localStorage.getItem('user_data')
    return !!userData
  },
  
  getToken: (): string | null => {
    // With httpOnly cookies, we can't access the token from JS
    // Return null as the cookie is sent automatically
    return null
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  },
  
  // Manual mode switching for development
  setDemoMode: (enabled: boolean) => {
    console.log('AuthService: Manually setting demo mode to:', enabled)
    DEMO_MODE = enabled
    if (!enabled) {
      // Re-test backend connectivity when disabling demo mode
      testBackendConnectivity()
    }
  },
  
  // Get current connection status
  getConnectionStatus: () => ({
    demoMode: DEMO_MODE,
    backendAvailable: BACKEND_AVAILABLE,
    apiBaseUrl: API_BASE_URL
  }),
  
  // Set up axios interceptor for authentication
  setupAxiosInterceptors: () => {
    axios.interceptors.request.use(
      (config) => {
        // No need to manually set Authorization header with httpOnly cookies
        // The cookie will be sent automatically with credentials: 'include'
        config.withCredentials = true
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          authService.logout()
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }
}