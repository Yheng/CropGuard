// Performance optimization imports
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

// Configuration interface
export interface AIConfiguration {
  openaiApiKey: string
  model: string
  confidenceThreshold: number
  maxTokens: number
  temperature: number
  backupModel: string
  rateLimitPerHour: number
  costLimitPerDay: number
  enableAutoFallback?: boolean
  enableRetryLogic?: boolean
  enableDetailedLogging?: boolean
}

// Analysis result interface
export interface AIAnalysisResult {
  id: string
  timestamp: string
  confidence: number
  disease: string | null
  severity: 'low' | 'medium' | 'high' | null
  recommendations: string[]
  treatmentPlan?: {
    immediate: string[]
    followUp: string[]
    prevention: string[]
  }
  cost: number
  processingTime: number
  modelUsed: string
}

// Rate limiting and cost tracking
interface UsageStats {
  requestsThisHour: number
  costToday: number
  lastResetHour: number
  lastResetDay: number
}

// Response cache interface
interface CacheEntry {
  result: AIAnalysisResult
  timestamp: number
  imageHash: string
}

class AIService {
  private config: AIConfiguration | null = null
  private usage: UsageStats = {
    requestsThisHour: 0,
    costToday: 0,
    lastResetHour: new Date().getHours(),
    lastResetDay: new Date().getDate()
  }
  private responseCache = new Map<string, CacheEntry>()
  private requestQueue: Array<() => Promise<unknown>> = []
  private isProcessingQueue = false

  // Configuration management
  public setConfiguration(config: AIConfiguration): void {
    this.config = config
    // Save to localStorage for persistence
    localStorage.setItem('cropguard_ai_config', JSON.stringify(config))
    
    if (config.enableDetailedLogging) {
      console.log('🤖 AI Service configured:', {
        model: config.model,
        backupModel: config.backupModel,
        rateLimitPerHour: config.rateLimitPerHour,
        costLimitPerDay: config.costLimitPerDay
      })
    }
  }

  public getConfiguration(): AIConfiguration | null {
    if (!this.config) {
      // Try to load from localStorage
      const saved = localStorage.getItem('cropguard_ai_config')
      if (saved) {
        try {
          this.config = JSON.parse(saved)
        } catch (error) {
          console.warn('Failed to load AI configuration:', error)
        }
      }
    }
    return this.config
  }

  public isConfigured(): boolean {
    const config = this.getConfiguration()
    return !!(config && config.openaiApiKey)
  }

  // Usage tracking and rate limiting
  private resetUsageIfNeeded(): void {
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDate()

    // Reset hourly counter
    if (currentHour !== this.usage.lastResetHour) {
      this.usage.requestsThisHour = 0
      this.usage.lastResetHour = currentHour
    }

    // Reset daily counter
    if (currentDay !== this.usage.lastResetDay) {
      this.usage.costToday = 0
      this.usage.lastResetDay = currentDay
    }
  }

  private checkRateLimits(): { allowed: boolean; reason?: string } {
    if (!this.config) {
      return { allowed: false, reason: 'AI service not configured' }
    }

    this.resetUsageIfNeeded()

    // Check hourly rate limit
    if (this.usage.requestsThisHour >= this.config.rateLimitPerHour) {
      return { 
        allowed: false, 
        reason: `Hourly rate limit exceeded (${this.config.rateLimitPerHour} requests/hour)` 
      }
    }

    // Check daily cost limit
    if (this.usage.costToday >= this.config.costLimitPerDay) {
      return { 
        allowed: false, 
        reason: `Daily cost limit exceeded ($${this.config.costLimitPerDay})` 
      }
    }

    return { allowed: true }
  }

  private recordUsage(cost: number): void {
    this.usage.requestsThisHour++
    this.usage.costToday += cost
    
    // Save usage stats
    localStorage.setItem('cropguard_ai_usage', JSON.stringify(this.usage))
  }

  // Cost estimation
  private estimateCost(model: string, tokens: number): number {
    const costPerToken = {
      'gpt-4o': 0.005 / 1000,
      'gpt-4o-mini': 0.00015 / 1000,
      'gpt-4-vision-preview': 0.01 / 1000,
      'gpt-4-turbo': 0.01 / 1000
    }
    
    return (costPerToken[model as keyof typeof costPerToken] || 0.005 / 1000) * tokens
  }

  // Test API connection
  public async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const config = this.getConfiguration()
    if (!config || !config.openaiApiKey) {
      return { success: false, message: 'API key not configured' }
    }

    const startTime = Date.now()
    
    try {
      // First test with models endpoint
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        const models = await response.json()
        const hasVisionModel = models.data.some((model: { id: string }) => 
          model.id === 'gpt-4o' || model.id === 'gpt-4-vision-preview'
        )
        
        return { 
          success: true, 
          message: hasVisionModel ? 
            'Connection successful with vision support' : 
            'Connection successful (limited vision support)', 
          latency 
        }
      } else {
        const errorText = await response.text()
        let errorMessage = 'API connection failed'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error?.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        return { 
          success: false, 
          message: errorMessage 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  // Test vision analysis with a simple request
  public async testVisionAPI(): Promise<{ success: boolean; message: string }> {
    const config = this.getConfiguration()
    if (!config || !config.openaiApiKey) {
      return { success: false, message: 'API key not configured' }
    }

    try {
      const testMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What do you see in this image? Please respond briefly.'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
              detail: 'low'
            }
          }
        ]
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [testMessage],
          max_tokens: 50
        })
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          message: `Vision API working: ${data.choices[0]?.message?.content?.substring(0, 50)}...`
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          message: `Vision API test failed: ${response.status} - ${errorText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Vision API test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Main analysis function
  public async analyzeImage(
    imageFile: File, 
    additionalContext?: string
  ): Promise<AIAnalysisResult> {
    const config = this.getConfiguration()
    if (!config) {
      throw new Error('AI service not configured. Please configure OpenAI API key in admin settings.')
    }

    // Check rate limits
    const rateLimitCheck = this.checkRateLimits()
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason)
    }

    const startTime = Date.now()
    let modelUsed = config.model

    try {
      // Optimize image first for better performance
      const optimizedFile = await this.optimizeImage(imageFile)
      
      // Generate hash for caching
      const imageHash = await this.generateImageHash(optimizedFile)
      
      // Check cache first
      const cachedResult = this.getCachedResult(imageHash)
      if (cachedResult && config.enableDetailedLogging) {
        console.log('🚀 Using cached result for image:', imageHash.substring(0, 8))
        return {
          ...cachedResult,
          id: `cached_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }
      }

      // Convert optimized image to base64
      const base64Image = await this.fileToBase64(optimizedFile)
      
      // Prepare the analysis request with simplified format for better API compatibility
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert agricultural AI specializing in plant disease detection. Please analyze this plant image for diseases, pests, or health issues.

Provide your response with the following information:
- Your confidence level (as a decimal between 0 and 1)
- Name of any disease detected (or null if healthy)
- Severity level: low, medium, or high
- Treatment recommendations as a list
- A brief treatment plan

Focus on organic, sustainable treatment options when possible. ${additionalContext || ''}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ]

      // Make API request with primary model
      let result = await this.makeOpenAIRequest(messages, modelUsed, config)
      
      // Try backup model if primary fails and auto-fallback is enabled
      if (!result && config.enableAutoFallback) {
        if (config.enableDetailedLogging) {
          console.log(`🔄 Falling back to backup model: ${config.backupModel}`)
        }
        modelUsed = config.backupModel
        result = await this.makeOpenAIRequest(messages, modelUsed, config)
      }

      if (!result) {
        throw new Error('Failed to get response from AI models')
      }

      // Parse and validate the result
      const analysisData = this.parseAIResponse(result.content)
      const processingTime = Date.now() - startTime
      const estimatedCost = this.estimateCost(modelUsed, result.usage?.total_tokens || 1500)

      // Record usage
      this.recordUsage(estimatedCost)

      const analysisResult: AIAnalysisResult = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        confidence: analysisData.confidence || 0,
        disease: analysisData.disease,
        severity: analysisData.severity,
        recommendations: analysisData.recommendations || [],
        treatmentPlan: analysisData.treatmentPlan,
        cost: estimatedCost,
        processingTime,
        modelUsed
      }

      if (config.enableDetailedLogging) {
        console.log('🌱 AI Analysis completed:', {
          id: analysisResult.id,
          confidence: analysisResult.confidence,
          disease: analysisResult.disease,
          cost: estimatedCost,
          processingTime,
          modelUsed
        })
      }

      // Cache the result for future requests
      this.setCachedResult(imageHash, analysisResult)

      return analysisResult

    } catch (error) {
      if (config.enableDetailedLogging) {
        console.error('❌ AI Analysis failed:', error)
      }
      throw error
    }
  }

  private async makeOpenAIRequest(
    messages: unknown[], 
    _model: string, 
    config: AIConfiguration
  ): Promise<{ content: string; usage?: unknown } | null> {
    try {
      // Use gpt-4o for vision tasks as it supports multimodal input
      const visionModel = 'gpt-4o'
      
      console.log('Making OpenAI Vision request with model:', visionModel)
      console.log('API Key (first 10 chars):', config.openaiApiKey.substring(0, 10) + '...')
      
      const requestBody = {
        model: visionModel,
        messages,
        max_tokens: Math.min(config.maxTokens, 4096), // Cap at 4096 for vision models
        temperature: config.temperature
      }
      
      console.log('Request body (without full API key):', {
        model: requestBody.model,
        messages: requestBody.messages.map(msg => ({
          role: msg.role,
          content: Array.isArray(msg.content) ? 
            msg.content.map(item => ({ type: item.type, text: item.text || '[image data]' })) : 
            msg.content
        })),
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature
      })
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API Error Response:', errorText)
        
        let errorMessage = 'Request failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error?.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(`OpenAI API Error (${response.status}): ${errorMessage}`)
      }

      const data = await response.json()
      console.log('OpenAI API Success:', {
        model: data.model,
        usage: data.usage,
        choices: data.choices?.length
      })
      
      return {
        content: data.choices[0]?.message?.content,
        usage: data.usage
      }
    } catch (error) {
      console.error('Request failed:', error)
      
      // Only retry on network errors, not API errors
      if (config.enableRetryLogic && error instanceof TypeError) {
        console.log('Retrying request after network error...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        try {
          const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages,
              max_tokens: Math.min(config.maxTokens, 4096),
              temperature: config.temperature
            })
          })

          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            return {
              content: retryData.choices[0]?.message?.content,
              usage: retryData.usage
            }
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError)
        }
      }
      
      return null
    }
  }

  private parseAIResponse(content: string): {
    confidence: number;
    disease: string | null;
    severity: 'low' | 'medium' | 'high' | null;
    recommendations: string[];
    treatmentPlan: {
      immediate: string[];
      followUp: string[];
      prevention: string[];
    };
  } {
    try {
      // Try to parse as JSON first
      return JSON.parse(content)
    } catch {
      console.log('Failed to parse JSON, attempting to extract structured data from text response:', content)
      
      // Try to extract structured information from text response
      // lines variable removed as unused
      const result = {
        confidence: 0.7,
        disease: null,
        severity: null,
        recommendations: [],
        treatmentPlan: {
          immediate: [],
          followUp: [],
          prevention: []
        }
      }
      
      // Look for disease mentions
      const diseaseMatch = content.match(/disease[:\s]+([^.\n]+)/i)
      if (diseaseMatch) {
        result.disease = diseaseMatch[1].trim()
      }
      
      // Look for severity mentions
      const severityMatch = content.match(/severity[:\s]+(low|medium|high)/i)
      if (severityMatch) {
        result.severity = severityMatch[1].toLowerCase()
      }
      
      // Extract recommendations (look for bullet points or numbered lists)
      const recommendationMatches = content.match(/[-•*]\s*([^.\n]+)/g)
      if (recommendationMatches) {
        result.recommendations = recommendationMatches.map(match => 
          match.replace(/^[-•*]\s*/, '').trim()
        ).slice(0, 5) // Limit to 5 recommendations
      }
      
      // If no structured data found, use the whole response as a recommendation
      if (result.recommendations.length === 0) {
        result.recommendations = [content.substring(0, 200) + '...']
      }
      
      return result
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Usage statistics
  public getUsageStats(): {
    requestsThisHour: number
    costToday: number
    rateLimitPerHour: number
    costLimitPerDay: number
    utilizationPercent: {
      requests: number
      cost: number
    }
  } {
    this.resetUsageIfNeeded()
    const config = this.getConfiguration()
    
    return {
      requestsThisHour: this.usage.requestsThisHour,
      costToday: this.usage.costToday,
      rateLimitPerHour: config?.rateLimitPerHour || 0,
      costLimitPerDay: config?.costLimitPerDay || 0,
      utilizationPercent: {
        requests: config ? (this.usage.requestsThisHour / config.rateLimitPerHour) * 100 : 0,
        cost: config ? (this.usage.costToday / config.costLimitPerDay) * 100 : 0
      }
    }
  }

  // Clear usage stats (admin function)
  public resetUsageStats(): void {
    this.usage = {
      requestsThisHour: 0,
      costToday: 0,
      lastResetHour: new Date().getHours(),
      lastResetDay: new Date().getDate()
    }
    localStorage.removeItem('cropguard_ai_usage')
  }

  // Performance optimization methods
  private async generateImageHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private getCachedResult(imageHash: string): AIAnalysisResult | null {
    const cached = this.responseCache.get(imageHash)
    if (!cached) return null

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.responseCache.delete(imageHash)
      return null
    }

    return cached.result
  }

  private setCachedResult(imageHash: string, result: AIAnalysisResult): void {
    // Clean old cache entries if we're at max size
    if (this.responseCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.responseCache.keys())[0]
      this.responseCache.delete(oldestKey)
    }

    this.responseCache.set(imageHash, {
      result,
      timestamp: Date.now(),
      imageHash
    })
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return

    this.isProcessingQueue = true

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()
        if (request) {
          await request()
          // Add small delay between requests to prevent API rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  private queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      // Start processing queue if not already processing
      this.processRequestQueue()
    })
  }

  // Optimized image preprocessing
  private async optimizeImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Calculate optimal dimensions (max 1024x1024 for better API performance)
        const maxSize = 1024
        let { width, height } = img
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(optimizedFile)
          } else {
            resolve(file) // Fallback to original
          }
        }, 'image/jpeg', 0.85) // 85% quality for good balance
      }

      img.onerror = () => resolve(file) // Fallback to original
      img.src = URL.createObjectURL(file)
    })
  }
}

// Export singleton instance
export const aiService = new AIService()

// Load saved configuration on startup
const savedConfig = localStorage.getItem('cropguard_ai_config')
if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig)
    aiService.setConfiguration(config)
  } catch (error) {
    console.warn('Failed to load saved AI configuration:', error)
  }
}

// Load saved usage stats
const savedUsage = localStorage.getItem('cropguard_ai_usage')
if (savedUsage) {
  try {
    const usage = JSON.parse(savedUsage)
    // Private property access through any type
    ;(aiService as { usage: typeof usage }).usage = usage
  } catch (error) {
    console.warn('Failed to load saved usage stats:', error)
  }
}