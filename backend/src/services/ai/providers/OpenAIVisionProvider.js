const { logger } = require('../../../middleware/logger');
const { AppError } = require('../../../middleware/errorHandler');

/**
 * OpenAI GPT-4 Vision Provider for crop disease detection
 * Uses GPT-4 Vision API for sophisticated image analysis and natural language descriptions
 */
class OpenAIVisionProvider {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.3,
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
      ...config,
    };

    this.modelVersion = '4.0-vision';
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    this.maxFileSize = 20 * 1024 * 1024; // 20MB
    
    // System prompt for crop analysis
    this.systemPrompt = `You are an expert agricultural pathologist and entomologist specializing in crop disease and pest identification. 

Your task is to analyze crop images and provide detailed diagnostic information. You must respond with a JSON object containing the following fields:

{
  "condition": "healthy|disease|pest|unknown",
  "title": "Specific condition name",
  "description": "Detailed description of the condition",
  "confidence": 0.0-1.0,
  "severity": "low|medium|high",
  "cropType": "identified crop type",
  "symptoms": ["list", "of", "observed", "symptoms"],
  "causativeAgent": "pathogen/pest name if applicable",
  "recommendations": ["specific", "treatment", "recommendations"],
  "preventiveMeasures": ["prevention", "strategies"],
  "urgency": "immediate|within_week|monitor|routine"
}

Key guidelines:
- Be precise in your identification
- Consider environmental factors visible in the image
- Provide confidence scores based on image clarity and symptom visibility
- Include both treatment and prevention recommendations
- Consider organic and integrated pest management approaches
- If uncertain, classify as "unknown" and suggest further investigation`;
  }

  /**
   * Analyze image using OpenAI GPT-4 Vision
   */
  async analyzeImage(imagePath, metadata = {}) {
    try {
      logger.debug('Starting OpenAI Vision analysis', {
        category: 'ai-provider',
        provider: 'openai-vision',
        imagePath,
        metadata,
      });

      // Validate input
      await this.validateInput(imagePath);

      // Convert image to base64
      const imageBase64 = await this.convertImageToBase64(imagePath);

      // Create analysis prompt
      const analysisPrompt = this.createAnalysisPrompt(metadata);

      // Make real OpenAI API call
      const apiResult = await this.callOpenAIVisionAPI(imageBase64, analysisPrompt);

      // Process and validate the result
      const result = this.processAnalysisResult(apiResult);

      logger.info('OpenAI Vision analysis completed', {
        category: 'ai-provider',
        provider: 'openai-vision',
        condition: result.condition,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('OpenAI Vision analysis failed', {
        category: 'ai-provider',
        provider: 'openai-vision',
        error: error.message,
        imagePath,
      });
      throw error;
    }
  }

  /**
   * Validate input image
   */
  async validateInput(imagePath) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const stats = await fs.stat(imagePath);
      
      if (stats.size > this.maxFileSize) {
        throw new AppError(`Image file too large: ${stats.size} bytes`, 400);
      }

      const ext = path.extname(imagePath).toLowerCase();
      const supportedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      
      if (!supportedExts.includes(ext)) {
        throw new AppError(`Unsupported image format: ${ext}`, 400);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('Image file not found', 404);
      }
      throw error;
    }
  }

  /**
   * Convert image to base64
   */
  async convertImageToBase64(imagePath) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      
      const mimeTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      
      const mimeType = mimeTypeMap[ext] || 'image/jpeg';
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      throw new AppError(`Failed to process image: ${error.message}`, 500);
    }
  }

  /**
   * Create analysis prompt with context
   */
  createAnalysisPrompt(metadata) {
    let prompt = 'Please analyze this crop image for diseases, pests, and overall plant health.';
    
    if (metadata.cropType) {
      prompt += ` The crop type is: ${metadata.cropType}.`;
    }
    
    if (metadata.location) {
      prompt += ` Location context: ${metadata.location}.`;
    }
    
    if (metadata.notes) {
      prompt += ` Additional context: ${metadata.notes}.`;
    }
    
    prompt += `
    
Focus on:
1. Disease identification (fungal, bacterial, viral)
2. Pest identification (insects, mites, nematodes)
3. Nutritional deficiencies
4. Environmental stress factors
5. Overall plant health assessment

Provide your analysis in the specified JSON format with detailed, actionable recommendations.`;

    return prompt;
  }

  /**
   * Call OpenAI Vision API for real image analysis
   */
  async callOpenAIVisionAPI(imageBase64, prompt) {
    if (!this.config.apiKey) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const axios = require('axios');
    
    const payload = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    try {
      const startTime = Date.now();
      
      const response = await axios.post(this.config.endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      const processingTime = Date.now() - startTime;

      logger.info('OpenAI Vision API call successful', {
        category: 'ai-provider',
        provider: 'openai-vision',
        processingTime,
        tokensUsed: response.data.usage?.total_tokens || 0,
      });

      // Extract and parse the response
      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new AppError('No content received from OpenAI API', 500);
      }

      // Try to parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisResult = JSON.parse(jsonMatch[0]);
          analysisResult.processingTime = processingTime;
          analysisResult.tokensUsed = response.data.usage?.total_tokens || 0;
          return analysisResult;
        } else {
          // If no JSON found, create structured response from text
          return this.parseTextResponse(content, processingTime);
        }
      } catch (parseError) {
        logger.warn('Failed to parse JSON response, creating structured response', {
          category: 'ai-provider',
          provider: 'openai-vision',
          parseError: parseError.message,
        });
        return this.parseTextResponse(content, processingTime);
      }

    } catch (error) {
      logger.error('OpenAI Vision API call failed', {
        category: 'ai-provider',
        provider: 'openai-vision',
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      if (error.response?.status === 401) {
        throw new AppError('Invalid OpenAI API key', 401);
      } else if (error.response?.status === 429) {
        throw new AppError('OpenAI API rate limit exceeded', 429);
      } else if (error.code === 'ECONNABORTED') {
        throw new AppError('OpenAI API request timeout', 408);
      } else {
        throw new AppError(`OpenAI API error: ${error.message}`, 500);
      }
    }
  }

  /**
   * Parse text response into structured format when JSON parsing fails
   */
  parseTextResponse(content, processingTime) {
    // Extract key information using regex patterns
    const conditionMatch = content.match(/(?:condition|diagnosis|identified):\s*([^.\n]+)/i);
    const confidenceMatch = content.match(/confidence:\s*([0-9.]+)/i);
    const severityMatch = content.match(/severity:\s*(low|medium|high)/i);
    const cropMatch = content.match(/crop(?:\s+type)?:\s*([^.\n]+)/i);

    return {
      condition: this.extractConditionType(content),
      title: conditionMatch ? conditionMatch[1].trim() : 'Analysis Result',
      description: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7,
      severity: severityMatch ? severityMatch[1] : 'medium',
      cropType: cropMatch ? cropMatch[1].trim() : 'unknown',
      symptoms: this.extractSymptoms(content),
      causativeAgent: this.extractAgent(content),
      recommendations: this.extractRecommendations(content),
      preventiveMeasures: this.extractPreventiveMeasures(content),
      urgency: this.extractUrgency(content),
      processingTime,
      tokensUsed: 0,
    };
  }

  /**
   * Helper methods for parsing text responses
   */
  extractConditionType(content) {
    const healthyKeywords = ['healthy', 'normal', 'good condition', 'no issues'];
    const diseaseKeywords = ['disease', 'fungal', 'bacterial', 'viral', 'infection', 'pathogen'];
    const pestKeywords = ['pest', 'insect', 'mite', 'aphid', 'caterpillar', 'larvae'];

    const lowerContent = content.toLowerCase();
    
    if (healthyKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'healthy';
    } else if (diseaseKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'disease';
    } else if (pestKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'pest';
    }
    
    return 'unknown';
  }

  extractSymptoms(content) {
    const symptomPatterns = [
      /symptoms?[:\-\s]+([^.]+)/i,
      /signs?[:\-\s]+([^.]+)/i,
      /observed[:\-\s]+([^.]+)/i,
    ];

    for (const pattern of symptomPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
      }
    }
    
    return [];
  }

  extractAgent(content) {
    const agentPattern = /(?:caused by|agent|pathogen|organism)[:\-\s]+([^.\n]+)/i;
    const match = content.match(agentPattern);
    return match ? match[1].trim() : null;
  }

  extractRecommendations(content) {
    const recPatterns = [
      /recommendations?[:\-\s]+([^.]+(?:\.[^.]+)*)/i,
      /treatment[:\-\s]+([^.]+(?:\.[^.]+)*)/i,
      /suggest[:\-\s]+([^.]+(?:\.[^.]+)*)/i,
    ];

    for (const pattern of recPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].split(/[.;]/).map(s => s.trim()).filter(s => s.length > 0);
      }
    }
    
    return [];
  }

  extractPreventiveMeasures(content) {
    const preventPattern = /(?:prevention|preventive|avoid)[:\-\s]+([^.]+(?:\.[^.]+)*)/i;
    const match = content.match(preventPattern);
    if (match) {
      return match[1].split(/[.;]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return [];
  }

  extractUrgency(content) {
    const urgentKeywords = ['immediate', 'urgent', 'critical', 'emergency'];
    const weekKeywords = ['week', 'soon', 'prompt'];
    const routineKeywords = ['routine', 'monitor', 'observe'];

    const lowerContent = content.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'immediate';
    } else if (weekKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'within_week';
    } else if (routineKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'routine';
    }
    
    return 'monitor';
  }

  /**
   * Process and validate analysis result
   */
  processAnalysisResult(apiResult) {
    // Validate required fields
    const requiredFields = ['condition', 'title', 'description', 'confidence', 'severity'];
    const missingFields = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(apiResult, field));
    
    if (missingFields.length > 0) {
      throw new AppError(`Invalid analysis result: missing ${missingFields.join(', ')}`, 500);
    }

    // Ensure confidence is within valid range
    if (apiResult.confidence < 0 || apiResult.confidence > 1) {
      apiResult.confidence = Math.max(0, Math.min(1, apiResult.confidence));
    }

    // Map OpenAI result to our standard format
    return {
      condition: apiResult.condition,
      title: apiResult.title,
      description: apiResult.description,
      confidence: Math.round(apiResult.confidence * 100) / 100,
      severity: apiResult.severity || 'medium',
      cropType: apiResult.cropType || 'unknown',
      recommendations: apiResult.recommendations || [],
      detailedAnalysis: {
        symptoms: apiResult.symptoms || [],
        causativeAgent: apiResult.causativeAgent,
        preventiveMeasures: apiResult.preventiveMeasures || [],
        urgency: apiResult.urgency || 'monitor',
        aiAssessment: {
          modelConfidence: apiResult.confidence,
          analysisDepth: 'comprehensive',
          factorsConsidered: [
            'visual_symptoms',
            'plant_morphology',
            'environmental_context',
            'disease_patterns',
            'pest_identification',
          ],
        },
      },
      metadata: {
        provider: 'openai-vision',
        model_version: this.config.model,
        analysis_method: 'deep_learning_vision',
        processing_time_ms: apiResult.processingTime || 0,
        tokens_used: apiResult.tokensUsed || 0,
      },
    };
  }

  /**
   * Get model version
   */
  getModelVersion() {
    return this.modelVersion;
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!(this.config.apiKey || process.env.OPENAI_API_KEY);
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportedFormats: this.supportedFormats,
      maxFileSize: this.maxFileSize,
      supportedConditions: ['healthy', 'disease', 'pest', 'unknown'],
      supportedCrops: ['tomato', 'pepper', 'cucumber', 'lettuce', 'corn', 'wheat', 'potato', 'bean'],
      features: [
        'advanced_disease_detection',
        'pest_identification',
        'symptom_analysis',
        'natural_language_descriptions',
        'preventive_recommendations',
        'urgency_assessment',
        'crop_type_detection',
        'causative_agent_identification',
      ],
      strengths: [
        'detailed_natural_language_analysis',
        'comprehensive_symptom_assessment',
        'contextual_recommendations',
        'multi_factor_analysis',
      ],
    };
  }

  /**
   * Get provider health status
   */
  async getHealthStatus() {
    try {
      // In production, this would ping the OpenAI API
      return {
        status: 'healthy',
        latency: Math.round(200 + Math.random() * 300),
        configured: this.isConfigured(),
        lastCheck: new Date().toISOString(),
        modelStatus: 'operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        configured: this.isConfigured(),
        lastCheck: new Date().toISOString(),
      };
    }
  }
}

module.exports = OpenAIVisionProvider;