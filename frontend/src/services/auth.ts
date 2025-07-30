import axios from 'axios'
import { demoAuthService } from './demoAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// Demo mode when backend is not available
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

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
    // Use demo mode if enabled or if backend is not available
    if (DEMO_MODE) {
      const result = await demoAuthService.login(email, password)
      dispatchAuthChange()
      return result
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      }, { withCredentials: true })
      
      const { user } = response.data.data
      localStorage.setItem('user_data', JSON.stringify(user))
      dispatchAuthChange()
      
      return { token: 'cookie', user }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          console.warn('Backend not available, falling back to demo mode')
          return demoAuthService.login(email, password)
        }
        throw new Error(error.response?.data?.message || 'Login failed')
      }
      throw error
    }
  },
  
  signup: async (email: string, password: string): Promise<LoginResponse> => {
    // Use demo mode if enabled or if backend is not available
    if (DEMO_MODE) {
      return demoAuthService.signup(email, password)
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name: email.split('@')[0], // Use email prefix as name
        role: 'farmer'
      }, { withCredentials: true })
      
      const { user } = response.data.data
      localStorage.setItem('user_data', JSON.stringify(user))
      dispatchAuthChange()
      
      return { token: 'cookie', user }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          console.warn('Backend not available, falling back to demo mode')
          return demoAuthService.signup(email, password)
        }
        throw new Error(error.response?.data?.message || 'Signup failed')
      }
      throw error
    }
  },
  
  logout: async () => {
    // Clear user-specific data on logout
    const userData = localStorage.getItem('user_data')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        // Clear user-specific localStorage keys
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(`cropguard_user_${user.id}_`)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        console.warn('Failed to clear user-specific data:', error)
      }
    }
    
    // Send logout request to clear httpOnly cookie
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true })
    } catch (error) {
      console.warn('Logout request failed:', error)
    }
    
    localStorage.removeItem('user_data')
    dispatchAuthChange()
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