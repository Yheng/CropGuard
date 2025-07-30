import { authService } from './auth'

export interface PlantAnalysis {
  id: string
  plantType: string
  location: string
  timestamp: string
  status: 'healthy' | 'needs-care' | 'disease-detected'
  confidence: number
  imageUrl?: string
  notes?: string
}

export interface UserStats {
  totalAnalyses: number
  healthyPlants: number
  plantsNeedingCare: number
  diseasedPlants: number
  lastAnalysisDate?: string
}

export interface UserData {
  userId: string
  analyses: PlantAnalysis[]
  stats: UserStats
  preferences: {
    favoriteFields: string[]
    notifications: boolean
    autoSave: boolean
  }
}

// Demo data for existing demo users
const DEMO_USER_DATA: Record<string, UserData> = {
  '1': { // Admin
    userId: '1',
    analyses: [],
    stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
    preferences: { favoriteFields: [], notifications: true, autoSave: true }
  },
  '2': { // Agronomist
    userId: '2',
    analyses: [],
    stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
    preferences: { favoriteFields: [], notifications: true, autoSave: true }
  },
  '3': { // John Peterson (farmer with demo data)
    userId: '3',
    analyses: [
      {
        id: '1',
        plantType: 'Tomato',
        location: 'Field A, Row 12',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'healthy',
        confidence: 95
      },
      {
        id: '2',
        plantType: 'Corn',
        location: 'Field B, Row 8',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'needs-care',
        confidence: 87
      },
      {
        id: '3',
        plantType: 'Wheat',
        location: 'Field C, Row 5',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        status: 'healthy',
        confidence: 92
      }
    ],
    stats: { 
      totalAnalyses: 12, 
      healthyPlants: 8, 
      plantsNeedingCare: 3, 
      diseasedPlants: 1,
      lastAnalysisDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    preferences: { favoriteFields: ['Field A', 'Field B'], notifications: true, autoSave: true }
  },
  '4': { // Maria Garcia
    userId: '4',
    analyses: [],
    stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
    preferences: { favoriteFields: [], notifications: true, autoSave: true }
  },
  '5': { // David Kim
    userId: '5',
    analyses: [],
    stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
    preferences: { favoriteFields: [], notifications: true, autoSave: true }
  },
  '6': { // Dr. Lisa Brown
    userId: '6',
    analyses: [],
    stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
    preferences: { favoriteFields: [], notifications: true, autoSave: true }
  }
}

class UserDataService {
  private getStorageKey(userId: string, dataType: string): string {
    return `cropguard_user_${userId}_${dataType}`
  }

  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser()
    return user?.id || null
  }

  // Initialize user data if it doesn't exist
  private initializeUserData(userId: string): UserData {
    const existingData = this.getUserData(userId)
    if (existingData) {
      return existingData
    }

    // Use demo data if available, otherwise create empty data
    const userData: UserData = DEMO_USER_DATA[userId] || {
      userId,
      analyses: [],
      stats: { totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 },
      preferences: { favoriteFields: [], notifications: true, autoSave: true }
    }

    this.saveUserData(userId, userData)
    return userData
  }

  // Get user data from localStorage
  getUserData(userId?: string): UserData | null {
    const targetUserId = userId || this.getCurrentUserId()
    if (!targetUserId) return null

    try {
      const key = this.getStorageKey(targetUserId, 'data')
      const data = localStorage.getItem(key)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.warn('Failed to load user data:', error)
    }
    return null
  }

  // Save user data to localStorage
  saveUserData(userId: string, userData: UserData): void {
    try {
      const key = this.getStorageKey(userId, 'data')
      localStorage.setItem(key, JSON.stringify(userData))
    } catch (error) {
      console.error('Failed to save user data:', error)
    }
  }

  // Get current user's data, initializing if needed
  getCurrentUserData(): UserData {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('No authenticated user found')
    }
    return this.initializeUserData(userId)
  }

  // Add a new plant analysis
  addAnalysis(analysis: Omit<PlantAnalysis, 'id'>): PlantAnalysis {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('No authenticated user found')
    }

    console.log('UserDataService: Adding new analysis for user:', userId)
    const userData = this.getCurrentUserData()
    const newAnalysis: PlantAnalysis = {
      ...analysis,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    console.log('UserDataService: New analysis created:', newAnalysis)
    userData.analyses.unshift(newAnalysis) // Add to beginning
    
    // Update stats
    const oldStats = { ...userData.stats }
    userData.stats.totalAnalyses += 1
    userData.stats.lastAnalysisDate = newAnalysis.timestamp
    
    switch (newAnalysis.status) {
      case 'healthy':
        userData.stats.healthyPlants += 1
        break
      case 'needs-care':
        userData.stats.plantsNeedingCare += 1
        break
      case 'disease-detected':
        userData.stats.diseasedPlants += 1
        break
    }

    console.log('UserDataService: Stats updated:', {
      old: oldStats,
      new: userData.stats,
      totalAnalyses: userData.analyses.length
    })

    this.saveUserData(userId, userData)
    console.log('UserDataService: Analysis saved successfully')
    return newAnalysis
  }

  // Get recent analyses
  getRecentAnalyses(limit: number = 5): PlantAnalysis[] {
    const userData = this.getCurrentUserData()
    return userData.analyses.slice(0, limit)
  }

  // Get user statistics
  getUserStats(): UserStats {
    const userData = this.getCurrentUserData()
    return userData.stats
  }

  // Update user preferences
  updatePreferences(preferences: Partial<UserData['preferences']>): void {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('No authenticated user found')
    }

    const userData = this.getCurrentUserData()
    userData.preferences = { ...userData.preferences, ...preferences }
    this.saveUserData(userId, userData)
  }

  // Clear all user data (for logout)
  clearUserData(userId?: string): void {
    const targetUserId = userId || this.getCurrentUserId()
    if (!targetUserId) return

    const key = this.getStorageKey(targetUserId, 'data')
    localStorage.removeItem(key)
  }

  // Get analytics data for charts
  getAnalyticsData(): {
    monthlyAnalyses: { month: string; count: number }[]
    statusDistribution: { status: string; count: number; percentage: number }[]
    fieldActivity: { field: string; count: number }[]
  } {
    const userData = this.getCurrentUserData()
    const analyses = userData.analyses

    // Monthly analyses (last 6 months)
    const monthlyData = new Map<string, number>()
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthlyData.set(monthKey, 0)
    }

    analyses.forEach(analysis => {
      const date = new Date(analysis.timestamp)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, monthlyData.get(monthKey)! + 1)
      }
    })

    const monthlyAnalyses = Array.from(monthlyData.entries()).map(([month, count]) => ({
      month,
      count
    }))

    // Status distribution
    const statusCounts = {
      healthy: userData.stats.healthyPlants,
      'needs-care': userData.stats.plantsNeedingCare,
      'disease-detected': userData.stats.diseasedPlants
    }

    const total = userData.stats.totalAnalyses || 1
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace('-', ' '),
      count,
      percentage: Math.round((count / total) * 100)
    }))

    // Field activity
    const fieldCounts = new Map<string, number>()
    analyses.forEach(analysis => {
      const field = analysis.location.split(',')[0] // Extract field name
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1)
    })

    const fieldActivity = Array.from(fieldCounts.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 fields

    return {
      monthlyAnalyses,
      statusDistribution,
      fieldActivity
    }
  }
}

export const userDataService = new UserDataService()