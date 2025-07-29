const AIServiceManager = require('./AIServiceManager');
const GoogleVisionProvider = require('./providers/GoogleVisionProvider');
const OpenAIVisionProvider = require('./providers/OpenAIVisionProvider');
const LocalAIProvider = require('./providers/LocalAIProvider');
const { logger, appLogger } = require('../../middleware/logger');

/**
 * AI Service Factory and Configuration
 * Initializes and configures all AI providers with proper fallback chains
 */
class AIService {
  constructor() {
    this.manager = new AIServiceManager();
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize AI service with all providers
   */
  async initialize() {
    if (this.initialized) {
      return this.manager;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  async performInitialization() {
    try {
      logger.info('Initializing AI service with multiple providers', {
        category: 'ai-service'
      });

      // Initialize providers based on configuration
      await this.initializeProviders();

      // Verify at least one provider is available
      if (this.manager.providers.size === 0) {
        throw new Error('No AI providers could be initialized');
      }

      this.initialized = true;

      logger.info('AI service initialized successfully', {
        category: 'ai-service',
        providerCount: this.manager.providers.size,
        providers: Array.from(this.manager.providers.keys())
      });

      appLogger.systemEvent('ai_service_initialized', {
        providers: Array.from(this.manager.providers.keys()),
        defaultProvider: this.manager.defaultProvider
      });

      return this.manager;
    } catch (error) {
      logger.error('Failed to initialize AI service', {
        category: 'ai-service',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize AI providers based on environment and configuration
   */
  async initializeProviders() {
    const providerConfigs = [
      {
        name: 'google-vision',
        provider: GoogleVisionProvider,
        config: {
          apiKey: process.env.GOOGLE_VISION_API_KEY,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        },
        options: {
          priority: 10,
          enabled: !!process.env.GOOGLE_VISION_API_KEY,
          timeout: 30000,
          rateLimit: 1000
        }
      },
      {
        name: 'openai-vision',
        provider: OpenAIVisionProvider,
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview'
        },
        options: {
          priority: 9,
          enabled: !!process.env.OPENAI_API_KEY,
          timeout: 45000,
          rateLimit: 200
        }
      },
      {
        name: 'local-ai',
        provider: LocalAIProvider,
        config: {
          modelPath: process.env.LOCAL_AI_MODEL_PATH || './models/crop-disease-detection.tflite',
          useGPU: process.env.LOCAL_AI_USE_GPU === 'true'
        },
        options: {
          priority: 5, // Lower priority but always available
          enabled: true, // Always enable local fallback
          timeout: 10000,
          rateLimit: 500
        }
      }
    ];

    // Initialize each provider
    for (const providerConfig of providerConfigs) {
      try {
        if (!providerConfig.options.enabled) {
          logger.info(`Skipping disabled provider: ${providerConfig.name}`, {
            category: 'ai-service',
            provider: providerConfig.name
          });
          continue;
        }

        const providerInstance = new providerConfig.provider(providerConfig.config);
        
        // Test provider health before registering
        const healthStatus = await providerInstance.getHealthStatus();
        
        if (healthStatus.status === 'healthy' || providerConfig.name === 'local-ai') {
          this.manager.registerProvider(
            providerConfig.name,
            providerInstance,
            providerConfig.options
          );

          logger.info(`AI provider registered successfully: ${providerConfig.name}`, {
            category: 'ai-service',
            provider: providerConfig.name,
            priority: providerConfig.options.priority,
            health: healthStatus.status
          });
        } else {
          logger.warn(`AI provider failed health check: ${providerConfig.name}`, {
            category: 'ai-service',
            provider: providerConfig.name,
            health: healthStatus
          });
        }
      } catch (error) {
        logger.error(`Failed to initialize AI provider: ${providerConfig.name}`, {
          category: 'ai-service',
          provider: providerConfig.name,
          error: error.message
        });
        
        // Don't fail initialization if optional providers fail
        if (providerConfig.name !== 'local-ai') {
          continue;
        }
        
        // For local AI, create a basic fallback
        try {
          const fallbackProvider = new LocalAIProvider({ ...providerConfig.config, fallbackMode: true });
          this.manager.registerProvider(providerConfig.name, fallbackProvider, {
            ...providerConfig.options,
            priority: 1 // Lowest priority for fallback mode
          });
        } catch (fallbackError) {
          logger.error('Failed to create local AI fallback', {
            category: 'ai-service',
            error: fallbackError.message
          });
        }
      }
    }
  }

  /**
   * Analyze image using the best available AI provider
   */
  async analyzeImage(imagePath, metadata = {}) {
    try {
      // Ensure service is initialized
      await this.initialize();

      logger.debug('Starting AI image analysis', {
        category: 'ai-service',
        imagePath,
        metadata: {
          cropType: metadata.cropType,
          userId: metadata.userId,
          location: metadata.location
        }
      });

      // Use AI service manager to handle provider selection and fallback
      const result = await this.manager.analyzeImage(imagePath, metadata);

      // Add service-level metadata
      result.serviceMetadata = {
        totalProviders: this.manager.providers.size,
        availableProviders: Array.from(this.manager.providers.keys()),
        requestId: this.generateRequestId(),
        analysisTimestamp: new Date().toISOString()
      };

      logger.info('AI image analysis completed successfully', {
        category: 'ai-service',
        provider: result.metadata?.provider,
        condition: result.condition,
        confidence: result.confidence,
        processingTime: result.metadata?.processing_time_ms
      });

      return result;
    } catch (error) {
      logger.error('AI image analysis failed', {
        category: 'ai-service',
        error: error.message,
        imagePath,
        metadata
      });
      throw error;
    }
  }

  /**
   * Get AI service health status
   */
  async getHealthStatus() {
    try {
      await this.initialize();

      const providerHealth = this.manager.getProviderHealth();
      const metrics = this.manager.getMetrics();

      return {
        status: this.initialized ? 'healthy' : 'initializing',
        initialized: this.initialized,
        providersCount: this.manager.providers.size,
        defaultProvider: this.manager.defaultProvider,
        providers: providerHealth,
        metrics: {
          totalRequests: metrics.totalRequests,
          successRate: metrics.successRate,
          averageResponseTime: metrics.averageResponseTime,
          cacheSize: metrics.cacheSize
        },
        capabilities: await this.getCapabilities(),
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        initialized: this.initialized,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Get combined capabilities from all providers
   */
  async getCapabilities() {
    const capabilities = {
      supportedFormats: new Set(),
      supportedConditions: new Set(),
      supportedCrops: new Set(),
      features: new Set(),
      maxFileSize: 0
    };

    for (const [name, provider] of this.manager.providers) {
      try {
        const providerCaps = provider.instance.getCapabilities();
        
        providerCaps.supportedFormats?.forEach(format => capabilities.supportedFormats.add(format));
        providerCaps.supportedConditions?.forEach(condition => capabilities.supportedConditions.add(condition));
        providerCaps.supportedCrops?.forEach(crop => capabilities.supportedCrops.add(crop));
        providerCaps.features?.forEach(feature => capabilities.features.add(feature));
        
        if (providerCaps.maxFileSize > capabilities.maxFileSize) {
          capabilities.maxFileSize = providerCaps.maxFileSize;
        }
      } catch (error) {
        logger.warn(`Failed to get capabilities for provider ${name}`, {
          category: 'ai-service',
          provider: name,
          error: error.message
        });
      }
    }

    return {
      supportedFormats: Array.from(capabilities.supportedFormats),
      supportedConditions: Array.from(capabilities.supportedConditions),
      supportedCrops: Array.from(capabilities.supportedCrops),
      features: Array.from(capabilities.features),
      maxFileSize: capabilities.maxFileSize,
      offlineCapable: this.manager.providers.has('local-ai'),
      multiProvider: this.manager.providers.size > 1
    };
  }

  /**
   * Get service metrics and statistics
   */
  getMetrics() {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }

    return this.manager.getMetrics();
  }

  /**
   * Clear service cache
   */
  clearCache() {
    if (this.initialized) {
      this.manager.clearCache();
    }
  }

  /**
   * Enable or disable specific provider
   */
  setProviderEnabled(providerName, enabled) {
    if (this.initialized) {
      this.manager.setProviderEnabled(providerName, enabled);
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Process batch of images
   */
  async analyzeImageBatch(imagePaths, metadata = {}) {
    const results = [];
    const errors = [];

    logger.info(`Starting batch analysis of ${imagePaths.length} images`, {
      category: 'ai-service',
      batchSize: imagePaths.length
    });

    // Process images in parallel with controlled concurrency
    const concurrency = Math.min(imagePaths.length, 3); // Max 3 concurrent analyses
    const chunks = this.chunkArray(imagePaths, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (imagePath, index) => {
        try {
          const result = await this.analyzeImage(imagePath, {
            ...metadata,
            batchIndex: index,
            batchTotal: imagePaths.length
          });
          return { imagePath, result, success: true };
        } catch (error) {
          return { imagePath, error: error.message, success: false };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      chunkResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
    }

    logger.info(`Batch analysis completed`, {
      category: 'ai-service',
      successful: results.length,
      failed: errors.length,
      total: imagePaths.length
    });

    return {
      results,
      errors,
      summary: {
        total: imagePaths.length,
        successful: results.length,
        failed: errors.length,
        successRate: ((results.length / imagePaths.length) * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * Utility function to chunk array
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;