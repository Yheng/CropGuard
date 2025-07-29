const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { AppError } = require('./errorHandler');

// Enhanced file upload middleware with progress tracking and resumable uploads
class AdvancedUploadHandler {
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: options.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/webp'],
      uploadDir: options.uploadDir || path.join(__dirname, '../../uploads'),
      enableProgress: options.enableProgress || true,
      enableResumable: options.enableResumable || false,
      imageProcessing: options.imageProcessing || true,
      ...options
    };

    this.uploadProgress = new Map(); // Track upload progress
    this.resumableUploads = new Map(); // Track resumable upload sessions
  }

  // Generate unique upload session ID
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Initialize upload directory
  async initializeUploadDir() {
    const dirs = ['images', 'temp', 'processed'];
    for (const dir of dirs) {
      const fullPath = path.join(this.options.uploadDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  // Enhanced file filter with detailed validation
  createFileFilter() {
    return (req, file, cb) => {
      const errors = [];

      // Check MIME type
      if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed: ${this.options.allowedMimeTypes.join(', ')}`);
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = this.options.allowedMimeTypes.map(type => {
        const extMap = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp'
        };
        return extMap[type] || '';
      }).filter(Boolean);

      if (!allowedExts.includes(ext)) {
        errors.push(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`);
      }

      // Validate filename for security
      if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
        errors.push('Filename contains invalid characters');
      }

      if (errors.length > 0) {
        return cb(new AppError(errors.join('; '), 400));
      }

      cb(null, true);
    };
  }

  // Enhanced storage configuration
  createStorage() {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await this.initializeUploadDir();
          const uploadPath = path.join(this.options.uploadDir, 'images');
          cb(null, uploadPath);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const filename = `crop-${timestamp}-${randomString}${ext}`;
        
        // Store original filename in request for later use
        req.uploadMetadata = req.uploadMetadata || {};
        req.uploadMetadata.originalName = file.originalname;
        req.uploadMetadata.generatedName = filename;
        
        cb(null, filename);
      }
    });
  }

  // Create multer instance with enhanced options
  createMulterInstance() {
    return multer({
      storage: this.createStorage(),
      fileFilter: this.createFileFilter(),
      limits: {
        fileSize: this.options.maxFileSize,
        files: 1,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 // 1MB for other fields
      }
    });
  }

  // Upload progress tracking middleware
  createProgressMiddleware() {
    return (req, res, next) => {
      if (!this.options.enableProgress) {
        return next();
      }

      const sessionId = req.headers['x-upload-session-id'] || this.generateSessionId();
      
      // Set up progress tracking
      let bytesReceived = 0;
      const contentLength = parseInt(req.headers['content-length'] || '0');

      // Track progress
      req.on('data', (chunk) => {
        bytesReceived += chunk.length;
        const progress = contentLength > 0 ? (bytesReceived / contentLength) * 100 : 0;
        
        this.uploadProgress.set(sessionId, {
          bytesReceived,
          totalBytes: contentLength,
          progress: Math.round(progress),
          timestamp: Date.now()
        });
      });

      req.on('end', () => {
        // Keep progress data for a short time after completion
        setTimeout(() => {
          this.uploadProgress.delete(sessionId);
        }, 30000); // 30 seconds
      });

      req.uploadSessionId = sessionId;
      res.setHeader('X-Upload-Session-ID', sessionId);
      
      next();
    };
  }

  // Get upload progress
  getProgress(sessionId) {
    return this.uploadProgress.get(sessionId) || null;
  }

  // Image processing middleware
  createImageProcessor() {
    return async (req, res, next) => {
      if (!this.options.imageProcessing || !req.file) {
        return next();
      }

      try {
        const inputPath = req.file.path;
        const outputDir = path.join(this.options.uploadDir, 'processed');
        const outputFilename = `processed-${req.file.filename}`;
        const outputPath = path.join(outputDir, outputFilename);

        // Get image metadata
        const metadata = await sharp(inputPath).metadata();
        
        // Validate image
        if (!metadata.width || !metadata.height) {
          throw new AppError('Invalid image file', 400);
        }

        // Process image with multiple sizes
        const sizes = [
          { name: 'original', width: null, height: null },
          { name: 'large', width: 1024, height: 1024 },
          { name: 'medium', width: 512, height: 512 },
          { name: 'thumbnail', width: 150, height: 150 }
        ];

        const processedImages = {};

        for (const size of sizes) {
          let processor = sharp(inputPath);
          
          if (size.width && size.height) {
            processor = processor.resize(size.width, size.height, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }

          const sizeOutputPath = outputPath.replace('.', `_${size.name}.`);
          await processor
            .jpeg({ quality: 85, progressive: true })
            .toFile(sizeOutputPath);

          processedImages[size.name] = {
            path: sizeOutputPath,
            url: `/uploads/processed/${path.basename(sizeOutputPath)}`,
            width: size.width,
            height: size.height
          };
        }

        // Add processed images to request
        req.processedImages = processedImages;
        req.imageMetadata = {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          format: metadata.format,
          fileSize: req.file.size,
          hasAlpha: metadata.hasAlpha,
          orientation: metadata.orientation
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Cleanup middleware for failed uploads
  createCleanupMiddleware() {
    return (error, req, res, next) => {
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(() => {}); // Silent cleanup
      }
      
      if (req.processedImages) {
        Object.values(req.processedImages).forEach(img => {
          fs.unlink(img.path).catch(() => {}); // Silent cleanup
        });
      }
      
      next(error);
    };
  }

  // Create complete upload middleware chain
  createUploadMiddleware(fieldName = 'image') {
    const multerInstance = this.createMulterInstance();
    
    return [
      this.createProgressMiddleware(),
      multerInstance.single(fieldName),
      this.createImageProcessor(),
      this.createCleanupMiddleware()
    ];
  }

  // Progress endpoint handler
  getProgressHandler() {
    return (req, res) => {
      const sessionId = req.params.sessionId || req.query.sessionId;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }

      const progress = this.getProgress(sessionId);
      if (!progress) {
        return res.status(404).json({
          success: false,
          error: 'Upload session not found'
        });
      }

      res.json({
        success: true,
        data: progress
      });
    };
  }
}

// Create default instance
const defaultUploadHandler = new AdvancedUploadHandler();

// Utility functions for common use cases
const createImageUpload = (options = {}) => {
  const handler = new AdvancedUploadHandler({
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    imageProcessing: true,
    enableProgress: true,
    ...options
  });
  
  return handler.createUploadMiddleware();
};

const createDocumentUpload = (options = {}) => {
  const handler = new AdvancedUploadHandler({
    allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    imageProcessing: false,
    enableProgress: true,
    ...options
  });
  
  return handler.createUploadMiddleware();
};

module.exports = {
  AdvancedUploadHandler,
  defaultUploadHandler,
  createImageUpload,
  createDocumentUpload
};