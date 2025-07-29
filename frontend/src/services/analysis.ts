import axios from 'axios'

export interface AnalysisResult {
  id: string
  confidence: number
  condition: 'healthy' | 'pest' | 'disease' | 'unknown'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
  timestamp: Date
  imageUrl?: string
  detectedIssues?: {
    name: string
    confidence: number
    description: string
  }[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Mock analysis results removed - using real backend API

export const analysisService = {
  analyzeImage: async (imageFile: File): Promise<AnalysisResult> => {
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('cropType', 'tomato') // Default crop type
      
      const response = await axios.post(`${API_BASE_URL}/analysis/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const analysis = response.data.data.analysis
      
      // Transform backend response to frontend format
      return {
        id: analysis.id.toString(),
        confidence: analysis.confidence,
        condition: analysis.condition,
        title: analysis.title,
        description: analysis.description,
        severity: analysis.severity,
        recommendations: analysis.recommendations,
        timestamp: new Date(analysis.created_at),
        imageUrl: `http://localhost:3000${analysis.image_url}`
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Analysis failed')
      }
      throw new Error('Failed to analyze image. Please try again.')
    }
  },

  getAnalysisHistory: async (): Promise<AnalysisResult[]> => {
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Return mock historical data
      const mockHistory: AnalysisResult[] = [
        {
          id: 'analysis_001',
          confidence: 0.89,
          condition: 'disease',
          title: 'Leaf Spot Disease',
          description: 'Bacterial leaf spot detected on tomato plant.',
          severity: 'medium',
          recommendations: ['Apply copper spray', 'Improve drainage'],
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          id: 'analysis_002',
          confidence: 0.94,
          condition: 'healthy',
          title: 'Healthy Plant',
          description: 'No issues detected. Plant appears healthy.',
          severity: 'low',
          recommendations: ['Continue current care'],
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ]
      
      return mockHistory
      
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API_BASE_URL}/analysis/history`)
      // return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch analysis history')
      }
      throw error
    }
  },

  saveAnalysis: async (_analysisId: string): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // TODO: Replace with actual API call
      // await axios.post(`${API_BASE_URL}/analysis/${analysisId}/save`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to save analysis')
      }
      throw error
    }
  }
}