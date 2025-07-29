const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { runQuery, getQuery, allQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { 
  validationSchemas, 
  validate, 
  sanitizeInput,
  createEndpointRateLimit 
} = require('../middleware/validation');
const { createImageUpload, defaultUploadHandler } = require('../middleware/upload');

const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Rate limiting for analysis endpoints
const analysisRateLimit = createEndpointRateLimit(10, 600); // 10 uploads per 10 minutes
const historyRateLimit = createEndpointRateLimit(30, 60); // 30 requests per minute

// Configure advanced image upload
const uploadMiddleware = createImageUpload({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  enableProgress: true,
  imageProcessing: true
});

// Mock AI analysis function (replace with actual AI service)
async function performAIAnalysis(imagePath) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  // Mock analysis results
  const conditions = [
    {
      condition: 'disease',
      title: 'Early Blight Detected',
      description: 'Early signs of early blight (Alternaria solani) detected on tomato leaves.',
      confidence: 0.92,
      severity: 'medium'
    },
    {
      condition: 'pest',
      title: 'Aphid Infestation',
      description: 'Green aphids detected on leaf undersides.',
      confidence: 0.88,
      severity: 'medium'
    },
    {
      condition: 'healthy',
      title: 'Healthy Crop',
      description: 'No signs of disease or pest damage detected.',
      confidence: 0.95,
      severity: 'low'
    },
    {
      condition: 'disease',
      title: 'Powdery Mildew',
      description: 'White powdery patches detected on leaf surfaces.',
      confidence: 0.85,
      severity: 'high'
    }
  ];

  const result = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Add some variation to confidence
  result.confidence = Math.max(0.7, Math.min(0.98, result.confidence + (Math.random() - 0.5) * 0.1));

  return {
    ...result,
    cropType: 'tomato', // Mock crop type detection
    recommendations: generateRecommendations(result.condition, result.severity),
    aiModelVersion: '1.0.0',
    metadata: {
      imageSize: await getImageSize(imagePath),
      processingTime: 2.5 + Math.random() * 2
    }
  };
}

// Generate recommendations based on condition
function generateRecommendations(condition, severity) {
  const recommendations = {
    disease: [
      'Remove affected leaves immediately and dispose away from garden',
      'Improve air circulation around plants',
      'Apply organic fungicide treatment',
      'Monitor closely for spread'
    ],
    pest: [
      'Spray affected areas with insecticidal soap',
      'Introduce beneficial insects',
      'Remove heavily infested leaves',
      'Monitor for population changes'
    ],
    healthy: [
      'Continue current care practices',
      'Regular monitoring for early detection',
      'Maintain proper plant spacing',
      'Monitor weather conditions'
    ]
  };

  return recommendations[condition] || recommendations.healthy;
}

// Get image dimensions
async function getImageSize(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    return null;
  }
}

// Process and optimize uploaded image
async function processImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(1024, 1024, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

// Upload and analyze image
router.post('/analyze', 
  authenticateToken,
  analysisRateLimit,
  ...uploadMiddleware,
  validate(validationSchemas.analyzeImage),
  asyncHandler(async (req, res) => {
    const { cropType, notes, location } = req.body;

  try {
    // Use processed images from upload middleware
    const processedImage = req.processedImages?.large || req.processedImages?.original;
    const imageUrl = processedImage?.url || `/uploads/images/${req.file.filename}`;

    // Perform AI analysis on the processed image
    const analysisResult = await performAIAnalysis(processedImage?.path || req.file.path);

    // Save analysis to database with enhanced metadata
    const enhancedMetadata = {
      ...analysisResult.metadata,
      imageMetadata: req.imageMetadata,
      processedImages: req.processedImages,
      uploadSession: req.uploadSessionId
    };

    const result = await runQuery(`
      INSERT INTO analyses (
        user_id, image_path, image_url, crop_type, condition, title, description,
        confidence, severity, recommendations, ai_model_version, processing_time,
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      processedImage?.path || req.file.path,
      imageUrl,
      cropType || analysisResult.cropType,
      analysisResult.condition,
      analysisResult.title,
      analysisResult.description,
      analysisResult.confidence,
      analysisResult.severity,
      JSON.stringify(analysisResult.recommendations),
      analysisResult.aiModelVersion,
      analysisResult.metadata.processingTime,
      JSON.stringify(enhancedMetadata)
    ]);

    // Original file cleanup is handled by the upload middleware

    // Get complete analysis record
    const analysis = await getQuery(`
      SELECT id, user_id, image_url, crop_type, condition, title, description,
             confidence, severity, recommendations, created_at
      FROM analyses WHERE id = ?
    `, [result.id]);

    // Parse JSON fields
    analysis.recommendations = JSON.parse(analysis.recommendations);

    res.status(201).json({
      success: true,
      message: 'Analysis completed successfully',
      data: { analysis }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    throw error;
  }
}));

// Get user's analysis history
router.get('/history', 
  authenticateToken,
  historyRateLimit,
  validate(validationSchemas.analysisQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, condition, cropType, startDate, endDate, severity } = req.query;
    const offset = (page - 1) * limit;

  let whereConditions = ['user_id = ?'];
  let queryParams = [req.user.id];

  if (condition) {
    whereConditions.push('condition = ?');
    queryParams.push(condition);
  }

  if (cropType) {
    whereConditions.push('crop_type = ?');
    queryParams.push(cropType);
  }

  if (startDate) {
    whereConditions.push('created_at >= ?');
    queryParams.push(startDate);
  }

  if (endDate) {
    whereConditions.push('created_at <= ?');
    queryParams.push(endDate);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM analyses WHERE ${whereConditions.join(' AND ')}`;
  const countResult = await getQuery(countQuery, queryParams);

  // Get analyses
  const analysesQuery = `
    SELECT id, image_url, crop_type, condition, title, confidence, 
           severity, created_at
    FROM analyses 
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const analyses = await allQuery(analysesQuery, [...queryParams, limit, offset]);

  res.json({
    success: true,
    data: {
      analyses,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    }
  });
}));

// Get specific analysis
router.get('/:id', 
  authenticateToken,
  validate(validationSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
  const analysis = await getQuery(`
    SELECT a.*, u.name as user_name, r.name as reviewer_name
    FROM analyses a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN users r ON a.reviewed_by = r.id
    WHERE a.id = ?
  `, [req.params.id]);

  if (!analysis) {
    throw new AppError('Analysis not found', 404);
  }

  // Check if user owns this analysis or is an agronomist/admin
  if (analysis.user_id !== req.user.id && !['agronomist', 'admin'].includes(req.user.role)) {
    throw new AppError('Access denied', 403);
  }

  // Parse JSON fields
  if (analysis.recommendations) {
    analysis.recommendations = JSON.parse(analysis.recommendations);
  }
  if (analysis.metadata) {
    analysis.metadata = JSON.parse(analysis.metadata);
  }

  res.json({
    success: true,
    data: { analysis }
  });
}));

// Request agronomist review
router.post('/:id/request-review', 
  authenticateToken,
  validate(validationSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
  const analysis = await getQuery('SELECT user_id, review_status FROM analyses WHERE id = ?', [req.params.id]);

  if (!analysis) {
    throw new AppError('Analysis not found', 404);
  }

  if (analysis.user_id !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  if (analysis.review_status !== 'pending') {
    throw new AppError('Analysis has already been reviewed', 400);
  }

  // Update review request
  await runQuery(`
    UPDATE analyses 
    SET review_status = 'pending', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [req.params.id]);

  res.json({
    success: true,
    message: 'Review requested successfully'
  });
}));

// Agronomist review analysis
router.post('/:id/review', 
  authenticateToken, 
  requireRole(['agronomist', 'admin']),
  validate(validationSchemas.idParam, 'params'),
  validate(validationSchemas.reviewAnalysis),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

  const analysis = await getQuery('SELECT id FROM analyses WHERE id = ?', [req.params.id]);
  if (!analysis) {
    throw new AppError('Analysis not found', 404);
  }

  await runQuery(`
    UPDATE analyses 
    SET review_status = ?, reviewed_by = ?, review_notes = ?, 
        reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [status, req.user.id, notes || null, req.params.id]);

  res.json({
    success: true,
    message: `Analysis ${status} successfully`
  });
}));

// Get upload progress
router.get('/upload-progress/:sessionId', 
  authenticateToken,
  defaultUploadHandler.getProgressHandler()
);

// Get analyses pending review (for agronomists)
router.get('/admin/pending-reviews', authenticateToken, requireRole(['agronomist', 'admin']), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await getQuery('SELECT COUNT(*) as total FROM analyses WHERE review_status = ?', ['pending']);

  // Get pending analyses
  const analyses = await allQuery(`
    SELECT a.id, a.image_url, a.crop_type, a.condition, a.title, 
           a.confidence, a.severity, a.created_at, u.name as farmer_name, u.email as farmer_email
    FROM analyses a
    JOIN users u ON a.user_id = u.id
    WHERE a.review_status = ?
    ORDER BY a.created_at ASC
    LIMIT ? OFFSET ?
  `, ['pending', limit, offset]);

  res.json({
    success: true,
    data: {
      analyses,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    }
  });
}));

module.exports = router;