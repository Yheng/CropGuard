const { logger, appLogger } = require('../../middleware/logger');
const { AppError } = require('../../middleware/errorHandler');
const ImagePreprocessingService = require('./preprocessing/preprocessingService');

/**
 * AI Service Manager - Orchestrates multiple AI providers and handles failover
 */
class AIServiceManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.fallbackProviders = [];
    this.cache = new Map();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerStats: {},
    };
    
    // Initialize preprocessing service
    this.preprocessingService = new ImagePreprocessingService();
  }

  /**
   * Register an AI provider
   */
  registerProvider(name, provider, options = {}) {
    const providerConfig = {
      instance: provider,
      priority: options.priority || 1,
      enabled: options.enabled !== false,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      rateLimit: options.rateLimit || 100, // requests per minute
      lastUsed: 0,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      ...options,
    };

    this.providers.set(name, providerConfig);
    this.metrics.providerStats[name] = {
      requests: 0,
      successes: 0,
      failures: 0,
      averageResponseTime: 0,
    };

    // Set default provider if none exists
    if (!this.defaultProvider || providerConfig.priority > this.providers.get(this.defaultProvider).priority) {
      this.defaultProvider = name;
    }

    // Update fallback providers list
    this.updateFallbackProviders();

    logger.info(`AI provider registered: ${name}`, {
      category: 'ai-service',
      provider: name,
      priority: providerConfig.priority,
    });
  }

  /**
   * Update fallback providers based on priority
   */
  updateFallbackProviders() {
    this.fallbackProviders = Array.from(this.providers.entries())
      .filter(([name, config]) => config.enabled && name !== this.defaultProvider)
      .sort(([, a], [, b]) => b.priority - a.priority)
      .map(([name]) => name);
  }

  /**
   * Analyze image using the best available AI provider
   */
  async analyzeImage(imagePath, metadata = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Step 1: Preprocess image for optimal AI analysis
      logger.debug('Starting image preprocessing', {
        category: 'ai-service',
        imagePath,
        metadata,
      });
      
      const preprocessingResult = await this.preprocessingService.preprocessImage(imagePath, metadata);
      const processedImagePath = preprocessingResult.outputPath;
      
      logger.info('Image preprocessing completed', {
        category: 'ai-service',
        originalPath: imagePath,
        processedPath: processedImagePath,
        preprocessingTime: preprocessingResult.processingTime,
        qualityMetrics: preprocessingResult.qualityMetrics,
      });

      // Step 2: Check cache with processed image
      const cacheKey = await this.generateCacheKey(processedImagePath, {
        ...metadata,
        preprocessing: preprocessingResult.preprocessingApplied,
      });
      const cachedResult = this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        logger.debug('Returning cached AI analysis result', {
          category: 'ai-service',
          cacheKey: cacheKey.substring(0, 16) + '...',
          cacheHit: true,
        });
        // Add preprocessing info to cached result
        cachedResult.preprocessing = preprocessingResult;
        return cachedResult;
      }

      // Try primary provider first, then fallbacks
      const providersToTry = [this.defaultProvider, ...this.fallbackProviders];
      
      for (const providerName of providersToTry) {
        if (!this.isProviderAvailable(providerName)) {
          continue;
        }

        try {
          const result = await this.analyzeWithProvider(providerName, processedImagePath, metadata);
          
          // Add preprocessing information to result
          result.preprocessing = preprocessingResult;
          result.originalImagePath = imagePath;
          
          // Cache successful result
          this.setCachedResult(cacheKey, result);
          
          // Update metrics
          const responseTime = Date.now() - startTime;
          this.updateMetrics(providerName, true, responseTime);
          
          appLogger.aiAnalysis(result.id, result.confidence, responseTime, metadata.userId);
          
          return result;
        } catch (error) {
          logger.warn(`AI provider ${providerName} failed`, {
            category: 'ai-service',
            provider: providerName,
            error: error.message,
          });
          
          this.updateMetrics(providerName, false, Date.now() - startTime);
          
          // Continue to next provider
          continue;
        }
      }

      // All providers failed
      this.metrics.failedRequests++;
      throw new AppError('All AI providers are currently unavailable', 503);
      
    } catch (error) {
      this.metrics.failedRequests++;
      logger.error('AI analysis failed', {
        category: 'ai-service',
        error: error.message,
        imagePath,
        metadata,
      });
      throw error;
    }
  }

  /**
   * Analyze with specific provider
   */
  async analyzeWithProvider(providerName, imagePath, metadata) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new AppError(`AI provider ${providerName} not found`, 404);
    }

    const startTime = Date.now();
    
    try {
      // Check rate limiting
      if (!this.checkRateLimit(providerName)) {
        throw new AppError(`Rate limit exceeded for provider ${providerName}`, 429);
      }

      // Execute analysis with timeout
      const result = await Promise.race([
        provider.instance.analyzeImage(imagePath, metadata),
        this.createTimeoutPromise(provider.timeout),
      ]);

      // Validate result
      this.validateAnalysisResult(result);

      // Add provider metadata
      result.aiProvider = providerName;
      result.processingTime = Date.now() - startTime;
      result.aiModelVersion = provider.instance.getModelVersion();

      provider.requestCount++;
      provider.successCount++;
      provider.lastUsed = Date.now();

      return result;
    } catch (error) {
      provider.requestCount++;
      provider.failureCount++;
      throw error;
    }
  }

  /**
   * Check if provider is available and within rate limits
   */
  isProviderAvailable(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.enabled) {
      return false;
    }

    // Check if provider is healthy (success rate > 50% in last 10 requests)
    if (provider.requestCount >= 10) {
      const successRate = provider.successCount / provider.requestCount;
      if (successRate < 0.5) {
        logger.warn(`Provider ${providerName} has low success rate: ${(successRate * 100).toFixed(1)}%`, {
          category: 'ai-service',
          provider: providerName,
          successRate,
        });
        return false;
      }
    }

    return this.checkRateLimit(providerName);
  }

  /**
   * Check rate limiting for provider
   */
  checkRateLimit(providerName) {
    const provider = this.providers.get(providerName);
    const now = Date.now();
    const _oneMinuteAgo = now - 60000;

    // Simple rate limiting - could be enhanced with sliding window
    const recentRequests = provider.requestCount; // Simplified for this implementation
    return recentRequests < provider.rateLimit;
  }

  /**
   * Create timeout promise
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError(`AI analysis timeout after ${timeout}ms`, 408));
      }, timeout);
    });
  }

  /**
   * Validate analysis result structure
   */
  validateAnalysisResult(result) {
    const requiredFields = ['condition', 'title', 'description', 'confidence'];
    const missingFields = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(result, field));
    
    if (missingFields.length > 0) {
      throw new AppError(`Invalid AI result: missing fields ${missingFields.join(', ')}`, 500);
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new AppError('Invalid confidence score', 500);
    }

    const validConditions = ['healthy', 'disease', 'pest', 'unknown'];
    if (!validConditions.includes(result.condition)) {
      throw new AppError(`Invalid condition: ${result.condition}`, 500);
    }
  }

  /**
   * Generate cache key for analysis
   */
  async generateCacheKey(imagePath, metadata) {
    const crypto = require('crypto');
    const fs = require('fs').promises;
    
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      const metadataHash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
      
      return `ai_analysis_${imageHash}_${metadataHash}`;
    } catch (error) {
      // Fallback to path-based cache key
      return `ai_analysis_${crypto.createHash('sha256').update(imagePath + JSON.stringify(metadata)).digest('hex')}`;
    }
  }

  /**
   * Get cached result
   */
  getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Set cached result
   */
  setCachedResult(cacheKey, result) {
    this.cache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now(),
    });

    // Cleanup old cache entries (simple LRU)
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(providerName, success, responseTime) {
    const stats = this.metrics.providerStats[providerName];
    if (stats) {
      stats.requests++;
      if (success) {
        stats.successes++;
        this.metrics.successfulRequests++;
      } else {
        stats.failures++;
      }
      
      // Update average response time
      stats.averageResponseTime = (stats.averageResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
    }

    // Update global average
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
  }

  /**
   * Get provider health status
   */
  getProviderHealth() {
    const health = {};
    
    for (const [name, provider] of this.providers) {
      const stats = this.metrics.providerStats[name];
      health[name] = {
        enabled: provider.enabled,
        priority: provider.priority,
        requests: stats.requests,
        successRate: stats.requests > 0 ? (stats.successes / stats.requests * 100).toFixed(1) + '%' : 'N/A',
        averageResponseTime: Math.round(stats.averageResponseTime),
        lastUsed: provider.lastUsed,
        status: this.isProviderAvailable(name) ? 'healthy' : 'unhealthy',
      };
    }
    
    return health;
  }

  /**
   * Get overall metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      successRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(1) + '%' : 'N/A',
      preprocessing: this.preprocessingService.getStatistics(),
    };
  }

  /**
   * Get preprocessing service health
   */
  async getPreprocessingHealth() {
    return await this.preprocessingService.healthCheck();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('AI service cache cleared', { category: 'ai-service' });
  }

  /**
   * Enable/disable provider
   */
  setProviderEnabled(providerName, enabled) {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.enabled = enabled;
      this.updateFallbackProviders();
      
      logger.info(`AI provider ${enabled ? 'enabled' : 'disabled'}: ${providerName}`, {
        category: 'ai-service',
        provider: providerName,
        enabled,
      });
    }
  }
}

module.exports = AIServiceManager;