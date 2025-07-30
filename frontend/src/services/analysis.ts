import axios from 'axios'
import { aiService } from './aiService'

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
      // Check if AI service is configured
      if (!aiService.isConfigured()) {
        throw new Error('AI service not configured. Please configure OpenAI API key in admin settings.')
      }

      // Use the configured AI service for analysis
      const aiResult = await aiService.analyzeImage(imageFile, 'Analyze this plant image for diseases, pests, or health issues.')
      
      // Transform AI service response to frontend format
      const condition = aiResult.disease ? 
        (aiResult.severity === 'high' ? 'disease' : 'pest') : 
        'healthy'
        
      const title = aiResult.disease || 'Healthy Plant'
      
      const description = aiResult.disease 
        ? `${aiResult.disease} detected with ${Math.round(aiResult.confidence * 100)}% confidence.`
        : 'No issues detected. Plant appears healthy.'
        
      // Create image URL from the file
      const imageUrl = URL.createObjectURL(imageFile)
      
      return {
        id: aiResult.id,
        confidence: aiResult.confidence,
        condition: condition as 'healthy' | 'pest' | 'disease' | 'unknown',
        title: title,
        description: description,
        severity: aiResult.severity || 'low',
        recommendations: aiResult.recommendations,
        timestamp: new Date(aiResult.timestamp),
        imageUrl: imageUrl,
        detectedIssues: aiResult.disease ? [{
          name: aiResult.disease,
          confidence: aiResult.confidence,
          description: description
        }] : undefined
      }
    } catch (error) {
      console.error('Analysis error:', error)
      if (error instanceof Error) {
        throw new Error(error.message)
      }
      throw new Error('Failed to analyze image. Please try again.')
    }
  },

  getAnalysisHistory: async (): Promise<AnalysisResult[]> => {
    try {
      const { userDataService } = await import('./userDataService')
      
      // Get all analyses from user data service
      const userData = userDataService.getCurrentUserData()
      const analyses = userData.analyses
      
      // Transform PlantAnalysis to AnalysisResult format
      const analysisResults: AnalysisResult[] = analyses.map(analysis => ({
        id: analysis.id,
        confidence: analysis.confidence / 100, // Convert back to decimal
        condition: analysis.status === 'healthy' ? 'healthy' :
                  analysis.status === 'disease-detected' ? 'disease' :
                  'pest' as 'healthy' | 'pest' | 'disease' | 'unknown',
        title: analysis.plantType,
        description: analysis.notes || `${analysis.plantType} analysis from ${analysis.location}`,
        severity: analysis.status === 'healthy' ? 'low' :
                 analysis.status === 'disease-detected' ? 'high' :
                 'medium' as 'low' | 'medium' | 'high',
        recommendations: analysis.notes ? [analysis.notes] : ['Monitor plant condition'],
        timestamp: new Date(analysis.timestamp),
        imageUrl: analysis.imageUrl
      }))
      
      return analysisResults
    } catch (error) {
      console.warn('Failed to load analysis history:', error)
      // Return empty array for new users or on error
      return []
    }
  },

  saveAnalysis: async (analysisResult: AnalysisResult): Promise<void> => {
    try {
      const { userDataService } = await import('./userDataService')
      
      // Transform AnalysisResult to PlantAnalysis format
      const plantAnalysis = {
        plantType: analysisResult.title === 'Healthy Plant' ? 'Unknown Plant' : analysisResult.title,
        location: 'Field Analysis', // Default location, could be enhanced with GPS
        timestamp: analysisResult.timestamp.toISOString(),
        status: analysisResult.condition === 'healthy' ? 'healthy' as const :
                analysisResult.condition === 'disease' ? 'disease-detected' as const :
                'needs-care' as const,
        confidence: Math.round(analysisResult.confidence * 100),
        imageUrl: analysisResult.imageUrl,
        notes: analysisResult.description
      }
      
      // Save to user data service
      const savedAnalysis = userDataService.addAnalysis(plantAnalysis)
      
      console.log('Analysis saved successfully:', savedAnalysis)
    } catch (error) {
      console.error('Failed to save analysis:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to save analysis')
    }
  }
}