const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../../middleware/logger');
const { AppError } = require('../../../middleware/errorHandler');

/**
 * Image Preprocessing Service for CropGuard
 * Integrates with Python image processor for optimal AI analysis preparation
 */
class ImagePreprocessingService {
  constructor(config = {}) {
    this.config = {
      pythonExecutable: config.pythonExecutable || 'python',
      processorScript: config.processorScript || path.join(__dirname, 'image_processor.py'),
      tempDir: config.tempDir || path.join(__dirname, '../../../../uploads/temp'),
      processedDir: config.processedDir || path.join(__dirname, '../../../../uploads/processed'),
      timeout: config.timeout || 30000, // 30 seconds
      maxConcurrentProcessing: config.maxConcurrentProcessing || 5,
      ...config
    };

    // Processing queue and statistics
    this.processingQueue = [];
    this.activeProcessing = 0;
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      avgProcessingTime: 0,
      lastProcessingTime: null
    };

    // Ensure directories exist
    this.initializeDirectories();
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
      await fs.mkdir(this.config.processedDir, { recursive: true });
      logger.info('Preprocessing directories initialized', {
        category: 'preprocessing',
        tempDir: this.config.tempDir,
        processedDir: this.config.processedDir
      });
    } catch (error) {
      logger.error('Failed to initialize preprocessing directories', {
        category: 'preprocessing',
        error: error.message
      });
    }
  }

  /**
   * Preprocess image for AI analysis
   * 
   * @param {string} inputPath - Path to original image
   * @param {Object} metadata - Image metadata (crop type, location, etc.)
   * @returns {Promise<Object>} Preprocessing result with processed image path
   */
  async preprocessImage(inputPath, metadata = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting image preprocessing', {
        category: 'preprocessing',
        inputPath,
        metadata
      });

      // Validate input
      await this.validateInput(inputPath);

      // Generate output path
      const outputPath = await this.generateOutputPath(inputPath);

      // Check if we need to queue the processing
      if (this.activeProcessing >= this.config.maxConcurrentProcessing) {
        logger.info('Queuing preprocessing request', {
          category: 'preprocessing',
          queueSize: this.processingQueue.length
        });
        return await this.queueProcessing(inputPath, outputPath, metadata);
      }

      // Process immediately
      const result = await this.processImageWithPython(inputPath, outputPath, metadata);
      
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStatistics(processingTime, true);

      logger.info('Image preprocessing completed', {
        category: 'preprocessing',
        inputPath,
        outputPath: result.outputPath,
        processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStatistics(processingTime, false);
      
      logger.error('Image preprocessing failed', {
        category: 'preprocessing',
        inputPath,
        error: error.message,
        processingTime
      });
      
      throw error;
    }
  }

  /**
   * Validate input image
   */
  async validateInput(inputPath) {
    try {
      const stats = await fs.stat(inputPath);
      
      if (!stats.isFile()) {
        throw new AppError('Input path is not a file', 400);
      }

      // Check file size (max 20MB)
      if (stats.size > 20 * 1024 * 1024) {
        throw new AppError('Image file too large (max 20MB)', 400);
      }

      // Check file extension
      const ext = path.extname(inputPath).toLowerCase();
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'];
      
      if (!supportedFormats.includes(ext)) {
        throw new AppError(`Unsupported image format: ${ext}`, 400);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('Input image file not found', 404);
      }
      throw error;
    }
  }

  /**
   * Generate output path for processed image
   */
  async generateOutputPath(inputPath) {
    const inputName = path.basename(inputPath, path.extname(inputPath));
    const timestamp = Date.now();
    const outputName = `${inputName}_processed_${timestamp}.jpg`;
    return path.join(this.config.processedDir, outputName);
  }

  /**
   * Queue processing request when at capacity
   */
  async queueProcessing(inputPath, outputPath, metadata) {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({
        inputPath,
        outputPath,
        metadata,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Process queue when capacity becomes available
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    while (this.processingQueue.length > 0 && this.activeProcessing < this.config.maxConcurrentProcessing) {
      const request = this.processingQueue.shift();
      
      // Check if request hasn't timed out (5 minutes max queue time)
      if (Date.now() - request.timestamp > 300000) {
        request.reject(new AppError('Processing request timed out in queue', 408));
        continue;
      }

      // Process the request
      this.processImageWithPython(request.inputPath, request.outputPath, request.metadata)
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          // Continue processing queue
          this.processQueue();
        });
    }
  }

  /**
   * Process image using Python service
   */
  async processImageWithPython(inputPath, outputPath, metadata) {
    this.activeProcessing++;
    
    return new Promise((resolve, reject) => {
      const args = [
        this.config.processorScript,
        inputPath,
        outputPath
      ];

      // Add metadata as JSON string if provided
      if (metadata && Object.keys(metadata).length > 0) {
        args.push('--metadata', JSON.stringify(metadata));
      }

      logger.debug('Spawning Python processor', {
        category: 'preprocessing',
        command: this.config.pythonExecutable,
        args
      });

      const pythonProcess = spawn(this.config.pythonExecutable, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new AppError('Image preprocessing timeout', 408));
      }, this.config.timeout);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcessing--;

        if (code === 0) {
          try {
            // Parse JSON output from Python script
            const result = JSON.parse(stdout);
            
            if (result.success) {
              resolve({
                success: true,
                inputPath: result.input_path,
                outputPath: result.output_path,
                originalSize: result.original_size,
                processedSize: result.processed_size,
                processingTime: result.processing_time,
                fileSizeBefore: result.file_size_before,
                fileSizeAfter: result.file_size_after,
                preprocessingApplied: result.preprocessing_applied,
                qualityMetrics: result.quality_metrics,
                timestamp: result.timestamp
              });
            } else {
              reject(new AppError(`Preprocessing failed: ${result.error}`, 500));
            }
          } catch (parseError) {
            logger.error('Failed to parse Python processor output', {
              category: 'preprocessing',
              stdout,
              stderr,
              parseError: parseError.message
            });
            reject(new AppError('Failed to parse preprocessing result', 500));
          }
        } else {
          logger.error('Python processor exited with error', {
            category: 'preprocessing',
            code,
            stderr
          });
          reject(new AppError(`Image preprocessing failed (exit code: ${code})`, 500));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcessing--;
        
        logger.error('Failed to spawn Python processor', {
          category: 'preprocessing',
          error: error.message
        });
        
        reject(new AppError(`Failed to start image preprocessing: ${error.message}`, 500));
      });
    });
  }

  /**
   * Batch preprocess multiple images
   */
  async preprocessBatch(imagePaths, metadata = {}) {
    const results = [];
    const batchSize = Math.min(this.config.maxConcurrentProcessing, imagePaths.length);
    
    logger.info('Starting batch preprocessing', {
      category: 'preprocessing',
      imageCount: imagePaths.length,
      batchSize
    });

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < imagePaths.length; i += batchSize) {
      const batch = imagePaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (imagePath, index) => {
        try {
          const imageMetadata = {
            ...metadata,
            batchIndex: i + index,
            batchId: `batch_${Date.now()}`
          };
          
          return await this.preprocessImage(imagePath, imageMetadata);
        } catch (error) {
          return {
            success: false,
            inputPath: imagePath,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    logger.info('Batch preprocessing completed', {
      category: 'preprocessing',
      totalImages: results.length,
      successCount,
      errorCount
    });

    return {
      success: errorCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      }
    };
  }

  /**
   * Update processing statistics
   */
  updateStatistics(processingTime, success) {
    if (success) {
      this.stats.totalProcessed++;
      this.stats.avgProcessingTime = (
        (this.stats.avgProcessingTime * (this.stats.totalProcessed - 1) + processingTime) 
        / this.stats.totalProcessed
      );
    } else {
      this.stats.totalErrors++;
    }
    
    this.stats.lastProcessingTime = new Date().toISOString();
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      queueLength: this.processingQueue.length,
      activeProcessing: this.activeProcessing,
      config: {
        maxConcurrentProcessing: this.config.maxConcurrentProcessing,
        timeout: this.config.timeout
      }
    };
  }

  /**
   * Health check for the preprocessing service
   */
  async healthCheck() {
    try {
      // Check if Python executable is available
      const testProcess = spawn(this.config.pythonExecutable, ['--version'], {
        stdio: 'pipe'
      });

      return new Promise((resolve) => {
        let versionOutput = '';
        
        testProcess.stdout.on('data', (data) => {
          versionOutput += data.toString();
        });

        testProcess.on('close', (code) => {
          const isHealthy = code === 0;
          resolve({
            status: isHealthy ? 'healthy' : 'unhealthy',
            pythonVersion: isHealthy ? versionOutput.trim() : null,
            processorScript: this.config.processorScript,
            directoriesAccessible: true, // We'll assume directories are accessible if service starts
            statistics: this.getStatistics()
          });
        });

        testProcess.on('error', () => {
          resolve({
            status: 'unhealthy',
            error: 'Python executable not found',
            pythonExecutable: this.config.pythonExecutable
          });
        });
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Cleanup processed files older than specified age
   */
  async cleanupProcessedFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.config.processedDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.config.processedDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Processed files cleanup completed', {
        category: 'preprocessing',
        deletedCount,
        maxAgeHours
      });

      return { deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup processed files', {
        category: 'preprocessing',
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ImagePreprocessingService;