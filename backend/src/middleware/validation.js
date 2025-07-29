const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Common validation schemas
const commonSchemas = {
  id: Joi.number().integer().positive(),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(8).max(128),
  name: Joi.string().min(2).max(100).trim(),
  phone: Joi.string().pattern(/^[+]?[(]?[\d\s\-\(\)]{10,}$/).optional(),
  role: Joi.string().valid('farmer', 'agronomist', 'admin'),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0)
  },
  search: Joi.string().max(255).trim().optional(),
  dateRange: {
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }
};

// Validation schemas for different endpoints
const validationSchemas = {
  // Authentication schemas
  register: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    name: commonSchemas.name.required(),
    role: commonSchemas.role.default('farmer'),
    phone: commonSchemas.phone,
    location: Joi.string().max(255).trim().optional()
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: commonSchemas.name.optional(),
    phone: commonSchemas.phone,
    location: Joi.string().max(255).trim().optional(),
    avatar_url: Joi.string().uri().optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  }),

  // Analysis schemas
  analyzeImage: Joi.object({
    cropType: Joi.string().max(50).trim().optional(),
    notes: Joi.string().max(1000).trim().optional(),
    location: Joi.string().max(255).trim().optional()
  }),

  analysisQuery: Joi.object({
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit,
    condition: Joi.string().valid('healthy', 'pest', 'disease', 'unknown').optional(),
    cropType: Joi.string().max(50).trim().optional(),
    startDate: commonSchemas.dateRange.startDate.optional(),
    endDate: commonSchemas.dateRange.endDate.optional(),
    severity: Joi.string().valid('low', 'medium', 'high').optional()
  }),

  reviewAnalysis: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    notes: Joi.string().max(1000).trim().optional()
  }),

  // Treatment schemas
  treatmentQuery: Joi.object({
    type: Joi.string().valid('organic', 'biological', 'cultural', 'preventive').optional(),
    condition: Joi.string().max(100).trim().optional(),
    effectiveness: Joi.number().min(0).max(1).optional()
  }),

  saveTreatment: Joi.object({
    notes: Joi.string().max(500).trim().optional()
  }),

  createTreatment: Joi.object({
    name: Joi.string().max(255).trim().required(),
    type: Joi.string().valid('organic', 'biological', 'cultural', 'preventive').required(),
    description: Joi.string().max(2000).trim().required(),
    ingredients: Joi.array().items(Joi.string().max(255).trim()).min(1).required(),
    instructions: Joi.array().items(Joi.string().max(500).trim()).min(1).required(),
    effectiveness: Joi.number().min(0).max(1).required(),
    applicationMethod: Joi.string().max(255).trim().required(),
    frequency: Joi.string().max(100).trim().required(),
    safetyPeriod: Joi.string().max(100).trim().required(),
    cost: Joi.string().valid('low', 'medium', 'high').required(),
    difficulty: Joi.string().valid('easy', 'moderate', 'advanced').required(),
    seasonalNotes: Joi.string().max(500).trim().optional(),
    warnings: Joi.array().items(Joi.string().max(255).trim()).optional(),
    targetConditions: Joi.array().items(Joi.string().max(100).trim()).min(1).required()
  }),

  // Analytics schemas
  analyticsQuery: Joi.object({
    timeRange: Joi.string().valid('7d', '30d', '90d', '1y', '6m', '2y').optional(),
    cropType: Joi.string().max(50).trim().optional(),
    userId: commonSchemas.id.optional()
  }),

  // User management schemas
  updateUser: Joi.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    role: commonSchemas.role.optional(),
    phone: commonSchemas.phone,
    location: Joi.string().max(255).trim().optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional()
  }),

  userQuery: Joi.object({
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit,
    role: commonSchemas.role.optional(),
    search: commonSchemas.search,
    isActive: Joi.boolean().optional()
  }),

  // Common parameter schemas
  idParam: Joi.object({
    id: commonSchemas.id.required()
  })
};

// Validation middleware factory
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'params' ? req.params : 
                  source === 'query' ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new AppError(`Validation failed: ${errors.map(e => e.message).join(', ')}`, 400, true));
    }

    // Replace the original data with validated and sanitized data
    if (source === 'params') {
      req.params = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
}

// Helper function to validate file uploads
function validateFileUpload(options = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxSize = 10 * 1024 * 1024, // 10MB
    required = true
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return next(new AppError('File upload is required', 400));
    }

    if (req.file) {
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(new AppError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 
          400
        ));
      }

      // Check file size
      if (req.file.size > maxSize) {
        return next(new AppError(
          `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`, 
          400
        ));
      }

      // Validate file name
      const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      req.file.sanitizedName = sanitizedName;
    }

    next();
  };
}

// Input sanitization middleware
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potential XSS characters
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize body, query, and params
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
}

// Rate limiting per endpoint
const createEndpointRateLimit = (points, duration) => {
  const { RateLimiterMemory } = require('rate-limiter-flexible');
  
  const limiter = new RateLimiterMemory({
    points,
    duration
  });

  return async (req, res, next) => {
    try {
      const key = `${req.ip}:${req.route.path}`;
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded for this endpoint. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds.`,
        retryAfter: Math.round(rejRes.msBeforeNext / 1000)
      });
    }
  };
};

module.exports = {
  validationSchemas,
  validate,
  validateFileUpload,
  sanitizeInput,
  createEndpointRateLimit,
  commonSchemas
};