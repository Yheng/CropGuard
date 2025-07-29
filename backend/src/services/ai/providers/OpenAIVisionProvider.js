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
      model: config.model || 'gpt-4-vision-preview',
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.3,
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
      ...config
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
        metadata
      });

      // Validate input
      await this.validateInput(imagePath);

      // Convert image to base64
      const imageBase64 = await this.convertImageToBase64(imagePath);

      // Create analysis prompt
      const analysisPrompt = this.createAnalysisPrompt(metadata);

      // For demo purposes, simulate the OpenAI API call
      const mockResult = await this.simulateOpenAIAnalysis(imageBase64, analysisPrompt, metadata);

      // Process and validate the result
      const result = this.processAnalysisResult(mockResult);

      logger.info('OpenAI Vision analysis completed', {
        category: 'ai-provider',
        provider: 'openai-vision',
        condition: result.condition,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('OpenAI Vision analysis failed', {
        category: 'ai-provider',
        provider: 'openai-vision',
        error: error.message,
        imagePath
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
        '.webp': 'image/webp'
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
    let prompt = `Please analyze this crop image for diseases, pests, and overall plant health.`;
    
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
   * Simulate OpenAI API analysis (replace with actual API call in production)
   */
  async simulateOpenAIAnalysis(imageBase64, prompt, metadata) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Generate sophisticated mock responses based on different scenarios
    const mockResponses = [
      {
        condition: "healthy",
        title: "Healthy Plant Development",
        description: "The plant exhibits robust, healthy growth with vibrant green foliage, proper leaf structure, and no visible signs of disease or pest damage. The leaf color and texture indicate adequate nutrition and water management.",
        confidence: 0.94,
        severity: "low",
        cropType: metadata.cropType || "tomato",
        symptoms: ["vibrant_green_color", "proper_leaf_structure", "no_visible_damage"],
        causativeAgent: null,
        recommendations: [
          "Continue current care regimen",
          "Maintain consistent watering schedule",
          "Monitor for early signs of stress",
          "Ensure adequate air circulation"
        ],
        preventiveMeasures: [
          "Regular plant inspection",
          "Proper plant spacing",
          "Balanced fertilization",
          "Integrated pest management practices"
        ],
        urgency: "routine"
      },
      {
        condition: "disease",
        title: "Early Blight (Alternaria solani)",
        description: "Dark brown to black spots with characteristic concentric rings (target spots) are visible on the lower leaves. This fungal disease typically starts on older foliage and can spread upward if environmental conditions remain favorable.",
        confidence: 0.89,
        severity: "medium",
        cropType: metadata.cropType || "tomato",
        symptoms: ["concentric_ring_spots", "yellowing_around_lesions", "leaf_browning", "target_spot_pattern"],
        causativeAgent: "Alternaria solani",
        recommendations: [
          "Remove affected leaves immediately",
          "Apply copper-based fungicide",
          "Improve air circulation",
          "Avoid overhead watering",
          "Mulch around plants to prevent soil splash"
        ],
        preventiveMeasures: [
          "Crop rotation (3-year cycle)",
          "Drip irrigation instead of overhead watering",
          "Adequate plant spacing",
          "Remove plant debris at season end"
        ],
        urgency: "within_week"
      },
      {
        condition: "pest",
        title: "Aphid Infestation",
        description: "Small, soft-bodied insects are visible clustering on young shoots and leaf undersides. These sap-sucking pests can cause leaf curling, yellowing, and honeydew production, which may lead to sooty mold development.",
        confidence: 0.86,
        severity: "medium",
        cropType: metadata.cropType || "pepper",
        symptoms: ["small_green_insects", "leaf_curling", "honeydew_presence", "yellowing_leaves"],
        causativeAgent: "Aphididae species",
        recommendations: [
          "Spray with insecticidal soap solution",
          "Release beneficial insects (ladybugs, lacewings)",
          "Use reflective mulch to deter aphids",
          "Prune heavily infested shoots",
          "Monitor for natural predator activity"
        ],
        preventiveMeasures: [
          "Encourage beneficial insect habitat",
          "Avoid excessive nitrogen fertilization",
          "Regular monitoring and early detection",
          "Use row covers during vulnerable periods"
        ],
        urgency: "within_week"
      },
      {
        condition: "disease",
        title: "Powdery Mildew",
        description: "White, powdery fungal growth is evident on leaf surfaces, particularly on upper leaf sides. This fungal disease thrives in moderate temperatures with high humidity and can reduce photosynthesis and overall plant vigor.",
        confidence: 0.92,
        severity: "medium",
        cropType: metadata.cropType || "cucumber",
        symptoms: ["white_powdery_coating", "leaf_yellowing", "reduced_photosynthesis", "fungal_spores"],
        causativeAgent: "Erysiphales species",
        recommendations: [
          "Apply horticultural oil or neem oil",
          "Improve air circulation around plants",
          "Remove severely affected leaves",
          "Apply baking soda solution (1 tsp per quart)",
          "Avoid overhead watering"
        ],
        preventiveMeasures: [
          "Select resistant varieties",
          "Proper plant spacing",
          "Avoid overhead irrigation",
          "Remove plant debris"
        ],
        urgency: "within_week"
      },
      {
        condition: "pest",
        title: "Spider Mite Damage",
        description: "Fine webbing and stippled, yellowish spots on leaves indicate spider mite activity. These microscopic pests thrive in hot, dry conditions and can rapidly multiply, causing significant damage to plant tissues.",
        confidence: 0.81,
        severity: "high",
        cropType: metadata.cropType || "tomato",
        symptoms: ["fine_webbing", "stippled_leaves", "yellowing", "bronze_coloration"],
        causativeAgent: "Tetranychidae species",
        recommendations: [
          "Increase humidity around plants",
          "Release predatory mites",
          "Apply neem oil or insecticidal soap",
          "Remove heavily damaged leaves",
          "Improve air circulation"
        ],
        preventiveMeasures: [
          "Maintain adequate humidity",
          "Regular plant inspection",
          "Avoid water stress",
          "Encourage beneficial insects"
        ],
        urgency: "immediate"
      }
    ];

    // Select response based on metadata or random
    let selectedResponse;
    if (metadata.forceCondition) {
      selectedResponse = mockResponses.find(r => r.condition === metadata.forceCondition) || mockResponses[0];
    } else {
      selectedResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }

    // Add some realistic variation to confidence
    selectedResponse.confidence = Math.max(0.65, Math.min(0.98, 
      selectedResponse.confidence + (Math.random() - 0.5) * 0.15));

    return selectedResponse;
  }

  /**
   * Process and validate analysis result
   */
  processAnalysisResult(mockResult) {
    // Validate required fields
    const requiredFields = ['condition', 'title', 'description', 'confidence', 'severity'];
    const missingFields = requiredFields.filter(field => !mockResult.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      throw new AppError(`Invalid analysis result: missing ${missingFields.join(', ')}`, 500);
    }

    // Ensure confidence is within valid range
    if (mockResult.confidence < 0 || mockResult.confidence > 1) {
      mockResult.confidence = Math.max(0, Math.min(1, mockResult.confidence));
    }

    // Map OpenAI result to our standard format
    return {
      condition: mockResult.condition,
      title: mockResult.title,
      description: mockResult.description,
      confidence: Math.round(mockResult.confidence * 100) / 100,
      severity: mockResult.severity || 'medium',
      cropType: mockResult.cropType || 'unknown',
      recommendations: mockResult.recommendations || [],
      detailedAnalysis: {
        symptoms: mockResult.symptoms || [],
        causativeAgent: mockResult.causativeAgent,
        preventiveMeasures: mockResult.preventiveMeasures || [],
        urgency: mockResult.urgency || 'monitor',
        aiAssessment: {
          modelConfidence: mockResult.confidence,
          analysisDepth: 'comprehensive',
          factorsConsidered: [
            'visual_symptoms',
            'plant_morphology',
            'environmental_context',
            'disease_patterns',
            'pest_identification'
          ]
        }
      },
      metadata: {
        provider: 'openai-vision',
        model_version: this.modelVersion,
        analysis_method: 'deep_learning_vision',
        processing_time_ms: Math.round(2000 + Math.random() * 3000)
      }
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
        'causative_agent_identification'
      ],
      strengths: [
        'detailed_natural_language_analysis',
        'comprehensive_symptom_assessment',
        'contextual_recommendations',
        'multi_factor_analysis'
      ]
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
        modelStatus: 'operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        configured: this.isConfigured(),
        lastCheck: new Date().toISOString()
      };
    }
  }
}

module.exports = OpenAIVisionProvider;