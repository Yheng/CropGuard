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
      })
      
      const { token, user } = response.data.data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_data', JSON.stringify(user))
      dispatchAuthChange()
      
      return { token, user }
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
      })
      
      const { token, user } = response.data.data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_data', JSON.stringify(user))
      dispatchAuthChange()
      
      return { token, user }
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
  
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    dispatchAuthChange()
  },
  
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('auth_token')
    return !!token
  },
  
  getToken: (): string | null => {
    return localStorage.getItem('auth_token')
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  },
  
  // Set up axios interceptor for authentication
  setupAxiosInterceptors: () => {
    axios.interceptors.request.use(
      (config) => {
        const token = authService.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
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