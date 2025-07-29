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

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Mock analysis results for demonstration
const mockAnalysisResults: Omit<AnalysisResult, 'id' | 'timestamp'>[] = [
  {
    confidence: 0.92,
    condition: 'disease',
    title: 'Early Blight Detected',
    description: 'Early signs of early blight (Alternaria solani) detected on tomato leaves. This fungal disease appears as dark spots with concentric rings and can spread rapidly in warm, humid conditions.',
    severity: 'medium',
    recommendations: [
      'Remove affected leaves immediately and dispose of them away from garden',
      'Improve air circulation around plants by proper spacing',
      'Apply copper-based organic fungicide every 7-10 days',
      'Water at soil level to avoid wetting leaves',
      'Mulch around plants to prevent soil splash onto leaves'
    ]
  },
  {
    confidence: 0.88,
    condition: 'pest',
    title: 'Aphid Infestation',
    description: 'Green aphids detected on leaf undersides. These small insects can multiply rapidly and weaken plants by sucking sap, while also transmitting viral diseases.',
    severity: 'medium',
    recommendations: [
      'Spray affected areas with insecticidal soap solution',
      'Introduce beneficial insects like ladybugs or lacewings',
      'Use neem oil spray in early morning or evening',
      'Remove heavily infested leaves',
      'Install reflective mulch to deter aphids'
    ]
  },
  {
    confidence: 0.95,
    condition: 'healthy',
    title: 'Healthy Crop',
    description: 'No signs of disease or pest damage detected. The crop appears healthy with good leaf color and structure. Continue current care practices.',
    severity: 'low',
    recommendations: [
      'Maintain current watering and fertilization schedule',
      'Continue regular monitoring for early detection of issues',
      'Ensure proper plant spacing for good air circulation',
      'Monitor weather conditions for potential disease pressure'
    ]
  },
  {
    confidence: 0.85,
    condition: 'disease',
    title: 'Powdery Mildew',
    description: 'White powdery patches detected on leaf surfaces, indicating powdery mildew infection. This fungal disease thrives in warm days and cool nights with high humidity.',
    severity: 'high',
    recommendations: [
      'Apply baking soda solution (1 tsp per quart water) weekly',
      'Improve air circulation by pruning dense growth',
      'Apply organic sulfur-based fungicide',
      'Remove and destroy severely affected leaves',
      'Avoid overhead watering, especially in evening'
    ]
  }
]

export const analysisService = {
  analyzeImage: async (imageFile: File): Promise<AnalysisResult> => {
    try {
      // Simulate API processing time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
      
      // For demo purposes, randomly select a mock result
      const mockResult = mockAnalysisResults[Math.floor(Math.random() * mockAnalysisResults.length)]
      
      const result: AnalysisResult = {
        ...mockResult,
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        imageUrl: URL.createObjectURL(imageFile)
      }
      
      // Add some variation to confidence for realism
      result.confidence = Math.max(0.7, Math.min(0.98, result.confidence + (Math.random() - 0.5) * 0.1))
      
      return result
      
      // TODO: Replace with actual API call when backend is ready
      // const formData = new FormData()
      // formData.append('image', imageFile)
      // 
      // const response = await axios.post(`${API_BASE_URL}/analysis/analyze`, formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data'
      //   }
      // })
      // 
      // return response.data
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