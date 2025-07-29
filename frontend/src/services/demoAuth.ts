// Demo authentication service for testing without backend
export interface User {
  id: string
  name: string
  email: string
  role: 'farmer' | 'agronomist' | 'admin'
}

export interface LoginResponse {
  token: string
  user: User
}

// Demo users matching the backend seeded data
const DEMO_USERS = [
  {
    id: '1',
    name: 'System Administrator',
    email: 'admin@cropguard.com',
    password: 'admin123',
    role: 'admin' as const
  },
  {
    id: '2',
    name: 'Dr. Sarah Mitchell',
    email: 'agronomist@cropguard.com',
    password: 'agro123',
    role: 'agronomist' as const
  },
  {
    id: '3',
    name: 'John Peterson',
    email: 'farmer@cropguard.com',
    password: 'farmer123',
    role: 'farmer' as const
  },
  {
    id: '4',
    name: 'Maria Garcia',
    email: 'maria.garcia@farmland.com',
    password: 'demo123',
    role: 'farmer' as const
  },
  {
    id: '5',
    name: 'David Kim',
    email: 'david.kim@organicfarms.com',
    password: 'demo123',
    role: 'farmer' as const
  },
  {
    id: '6',
    name: 'Dr. Lisa Brown',
    email: 'lisa.brown@soilexperts.com',
    password: 'demo123',
    role: 'agronomist' as const
  }
]

export const demoAuthService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const user = DEMO_USERS.find(u => u.email === email && u.password === password)
    
    if (!user) {
      throw new Error('Invalid email or password')
    }
    
    const token = `demo_token_${user.id}_${Date.now()}`
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
    
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user_data', JSON.stringify(userData))
    
    return { token, user: userData }
  },
  
  signup: async (email: string, password: string): Promise<LoginResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if user already exists
    const existingUser = DEMO_USERS.find(u => u.email === email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }
    
    // Create new demo user
    const newUser = {
      id: `demo_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: 'farmer' as const
    }
    
    const token = `demo_token_${newUser.id}_${Date.now()}`
    
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user_data', JSON.stringify(newUser))
    
    return { token, user: newUser }
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
  }
}

// Export demo users for reference
export { DEMO_USERS }