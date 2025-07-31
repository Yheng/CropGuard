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
const DEFAULT_DEMO_USERS = [
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

// Get all users (default + registered)
const getAllUsers = () => {
  try {
    const savedUsers = localStorage.getItem('cropguard_demo_users')
    const registeredUsers = savedUsers ? JSON.parse(savedUsers) : []
    return [...DEFAULT_DEMO_USERS, ...registeredUsers]
  } catch (error) {
    console.warn('Failed to load registered users:', error)
    return DEFAULT_DEMO_USERS
  }
}

// Save a new registered user
const saveRegisteredUser = (user: User & { password?: string }) => {
  try {
    const savedUsers = localStorage.getItem('cropguard_demo_users')
    const registeredUsers = savedUsers ? JSON.parse(savedUsers) : []
    
    // Check if user already exists in registered users
    const existingIndex = registeredUsers.findIndex((u: User & { password?: string }) => u.email === user.email)
    if (existingIndex >= 0) {
      registeredUsers[existingIndex] = user // Update existing
    } else {
      registeredUsers.push(user) // Add new
    }
    
    localStorage.setItem('cropguard_demo_users', JSON.stringify(registeredUsers))
    console.log('DemoAuth: Saved registered user:', user.email)
  } catch (error) {
    console.error('DemoAuth: Failed to save registered user:', error)
  }
}

export const demoAuthService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('DemoAuth: login called with', { email, password }) // Debug log
    
    const allUsers = getAllUsers()
    console.log('DemoAuth: Available users:', allUsers.map(u => ({ email: u.email, role: u.role }))) // Debug log
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const user = allUsers.find(u => u.email === email && u.password === password)
    console.log('DemoAuth: Found user:', user) // Debug log
    
    if (!user) {
      console.log('DemoAuth: Login failed - user not found') // Debug log
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
    console.log('DemoAuth: signup called with', { email }) // Debug log
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if user already exists in all users
    const allUsers = getAllUsers()
    const existingUser = allUsers.find(u => u.email === email)
    if (existingUser) {
      console.log('DemoAuth: Signup failed - user already exists') // Debug log
      throw new Error('User with this email already exists')
    }
    
    // Create new demo user with password
    const newUser = {
      id: `demo_${Date.now()}`,
      name: email.split('@')[0],
      email,
      password, // Store password for future logins
      role: 'farmer' as const
    }
    
    console.log('DemoAuth: Creating new user:', { email: newUser.email, id: newUser.id }) // Debug log
    
    // Save the new user to persistent storage
    saveRegisteredUser(newUser)
    
    const token = `demo_token_${newUser.id}_${Date.now()}`
    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
    
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user_data', JSON.stringify(userData))
    
    console.log('DemoAuth: Signup successful for:', email) // Debug log
    return { token, user: userData }
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

// Helper function to restore a lost user (for debugging)
export const restoreUser = (email: string, password: string, name?: string) => {
  const newUser = {
    id: `demo_${Date.now()}`,
    name: name || email.split('@')[0],
    email,
    password,
    role: 'farmer' as const
  }
  
  console.log('DemoAuth: Manually restoring user:', email)
  saveRegisteredUser(newUser)
  return newUser
}

// Export demo users for reference
export { DEFAULT_DEMO_USERS as DEMO_USERS }