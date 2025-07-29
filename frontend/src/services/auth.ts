import axios from 'axios'

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: 'farmer' | 'agronomist' | 'admin'
  }
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      // Simulate API call for now - replace with actual backend
      if (email === 'demo@cropguard.com' && password === 'demo123') {
        const mockResponse: LoginResponse = {
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            id: '1',
            name: 'Demo User',
            email: 'demo@cropguard.com',
            role: 'farmer'
          }
        }
        
        localStorage.setItem('auth_token', mockResponse.token)
        localStorage.setItem('user_data', JSON.stringify(mockResponse.user))
        
        return mockResponse
      } else {
        throw new Error('Invalid credentials. Try demo@cropguard.com / demo123')
      }
      
      // TODO: Replace with actual API call when backend is ready
      // const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      //   email,
      //   password
      // })
      // 
      // const { token, user } = response.data
      // localStorage.setItem('auth_token', token)
      // localStorage.setItem('user_data', JSON.stringify(user))
      // 
      // return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Login failed')
      }
      throw error
    }
  },
  
  signup: async (email: string, _password: string): Promise<LoginResponse> => {
    try {
      // Simulate API call for now - replace with actual backend
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
      
      const mockResponse: LoginResponse = {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: Date.now().toString(),
          name: email.split('@')[0], // Use email prefix as name
          email: email,
          role: 'farmer'
        }
      }
      
      localStorage.setItem('auth_token', mockResponse.token)
      localStorage.setItem('user_data', JSON.stringify(mockResponse.user))
      
      return mockResponse
      
      // TODO: Replace with actual API call when backend is ready
      // const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
      //   email,
      //   password
      // })
      // 
      // const { token, user } = response.data
      // localStorage.setItem('auth_token', token)
      // localStorage.setItem('user_data', JSON.stringify(user))
      // 
      // return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Signup failed')
      }
      throw error
    }
  },
  
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
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