// Analytics service for generating chart data
import axios from 'axios'

export interface HealthDataPoint {
  date: string
  healthScore: number
  condition: 'healthy' | 'warning' | 'critical'
  cropType: string
}

export interface AnalysisHistoryData {
  month: string
  healthy: number
  pest: number
  disease: number
  total: number
}

export interface CropTypeData {
  name: string
  count: number
  healthScore: number
  color: string
}

export interface AnalyticsData {
  healthTrend: HealthDataPoint[]
  analysisHistory: AnalysisHistoryData[]
  cropDistribution: CropTypeData[]
}

// Generate mock health trend data
const generateHealthTrendData = (days: number): HealthDataPoint[] => {
  const data: HealthDataPoint[] = []
  const crops = ['Tomato', 'Corn', 'Wheat', 'Lettuce', 'Pepper']
  
  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Generate realistic health scores with some variation
    let baseScore = 75 + Math.random() * 20
    
    // Add seasonal variation
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 10
    baseScore += seasonalFactor
    
    // Add some random events (diseases, pests)
    if (Math.random() < 0.1) baseScore -= 20 // Disease outbreak
    if (Math.random() < 0.05) baseScore -= 30 // Severe pest issue
    
    baseScore = Math.max(20, Math.min(100, baseScore))
    
    const condition = baseScore >= 80 ? 'healthy' : baseScore >= 50 ? 'warning' : 'critical'
    
    data.push({
      date: date.toISOString().split('T')[0],
      healthScore: Math.round(baseScore),
      condition,
      cropType: crops[Math.floor(Math.random() * crops.length)]
    })
  }
  
  return data
}

// Generate mock analysis history data
const generateAnalysisHistoryData = (months: number): AnalysisHistoryData[] => {
  const data: AnalysisHistoryData[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  for (let i = months; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    
    const monthName = monthNames[date.getMonth()]
    const year = date.getFullYear()
    
    // Generate analysis counts with seasonal variation
    const baseCount = 15 + Math.random() * 10
    const seasonalMultiplier = 0.8 + (Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.4)
    const totalAnalyses = Math.round(baseCount * seasonalMultiplier)
    
    // Distribute between healthy, pest, and disease
    const healthyRate = 0.6 + Math.random() * 0.2 // 60-80% healthy
    const pestRate = Math.random() * 0.2 // 0-20% pest issues
    
    const healthy = Math.round(totalAnalyses * healthyRate)
    const pest = Math.round(totalAnalyses * pestRate)
    const disease = totalAnalyses - healthy - pest
    
    data.push({
      month: `${monthName} ${year}`,
      healthy,
      pest,
      disease,
      total: totalAnalyses
    })
  }
  
  return data.reverse()
}

// Generate mock crop distribution data
const generateCropDistributionData = (): CropTypeData[] => {
  const crops = [
    { name: 'Tomato', color: '#EF4444', baseCount: 25 },
    { name: 'Corn', color: '#F59E0B', baseCount: 20 },
    { name: 'Wheat', color: '#10B981', baseCount: 18 },
    { name: 'Lettuce', color: '#06B6D4', baseCount: 15 },
    { name: 'Pepper', color: '#8B5CF6', baseCount: 12 },
    { name: 'Carrot', color: '#F97316', baseCount: 8 },
    { name: 'Other', color: '#6B7280', baseCount: 5 }
  ]
  
  return crops.map(crop => ({
    name: crop.name,
    count: crop.baseCount + Math.floor(Math.random() * 10),
    healthScore: 70 + Math.floor(Math.random() * 25), // 70-95% health score
    color: crop.color
  }))
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const analyticsService = {
  getHealthTrend: async (timeRange: '7d' | '30d' | '90d' | '1y'): Promise<HealthDataPoint[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/health-trend`, {
        params: { timeRange }
      })
      return response.data.data.healthTrend
    } catch {
      // Fallback to mock data if backend fails
      console.warn('Failed to fetch health trend from backend, using mock data')
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[timeRange]
      return generateHealthTrendData(days)
    }
  },

  getAnalysisHistory: async (timeRange: '6m' | '1y' | '2y'): Promise<AnalysisHistoryData[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/analysis-history`, {
        params: { timeRange }
      })
      return response.data.data.analysisHistory
    } catch {
      // Fallback to mock data if backend fails
      console.warn('Failed to fetch analysis history from backend, using mock data')
      const months = { '6m': 6, '1y': 12, '2y': 24 }[timeRange]
      return generateAnalysisHistoryData(months)
    }
  },

  getCropDistribution: async (): Promise<CropTypeData[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/crop-distribution`)
      return response.data.data.cropDistribution
    } catch {
      // Fallback to mock data if backend fails
      console.warn('Failed to fetch crop distribution from backend, using mock data')
      return generateCropDistributionData()
    }
  },

  getAnalyticsDashboard: async (): Promise<AnalyticsData> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`)
      return response.data.data
    } catch {
      // Fallback to mock data if backend fails
      console.warn('Failed to fetch analytics dashboard from backend, using mock data')
      return {
        healthTrend: generateHealthTrendData(30),
        analysisHistory: generateAnalysisHistoryData(6),
        cropDistribution: generateCropDistributionData()
      }
    }
  },

  exportData: async (format: 'csv' | 'pdf' | 'xlsx'): Promise<Blob> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock export - in real implementation, this would generate actual files
    const mockData = `Data exported in ${format.toUpperCase()} format\nTimestamp: ${new Date().toISOString()}`
    return new Blob([mockData], { type: 'text/plain' })
  }
}