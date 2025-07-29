const rateLimit = require('rate-limiter-flexible');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');
const { securityLogger } = require('./logger');

// Enhanced rate limiting configurations
const rateLimiters = {
  // Global API rate limiter
  global: new rateLimit.RateLimiterMemory({
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }),

  // Strict rate limiter for auth endpoints
  auth: new rateLimit.RateLimiterMemory({
    points: 5, // 5 attempts
    duration: 300, // Per 5 minutes
    blockDuration: 900, // Block for 15 minutes
  }),

  // Password change rate limiter
  passwordChange: new rateLimit.RateLimiterMemory({
    points: 3, // 3 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 1800, // Block for 30 minutes
  }),

  // File upload rate limiter
  upload: new rateLimit.RateLimiterMemory({
    points: 10, // 10 uploads
    duration: 600, // Per 10 minutes
    blockDuration: 300, // Block for 5 minutes
  }),

  // API endpoint rate limiter
  api: new rateLimit.RateLimiterMemory({
    points: 50, // 50 requests
    duration: 60, // Per minute
    blockDuration: 120, // Block for 2 minutes
  }),

  // Consecutive failed attempts
  consecutiveFails: new rateLimit.RateLimiterMemory({
    points: 3, // Max 3 consecutive failures
    duration: 300, // Reset counter after 5 minutes
    blockDuration: 900, // Block for 15 minutes after limit
  })
};

// IP-based rate limiting middleware
const createRateLimitMiddleware = (limiterType, options = {}) => {
  return async (req, res, next) => {
    const limiter = rateLimiters[limiterType];
    if (!limiter) {
      return next(new AppError('Invalid rate limiter type', 500));
    }

    try {
      const key = options.useUserId && req.user?.id 
        ? `user:${req.user.id}` 
        : `ip:${req.ip}`;
      
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000);
      
      // Log rate limit violation
      securityLogger.rateLimitExceeded({
        limiterType,
        key: options.useUserId && req.user?.id ? req.user.id : req.ip,
        retryAfter
      }, req);

      res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        message: `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter,
        type: limiterType
      });
    }
  };
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    // Path traversal patterns
    /\.\.\//g,
    // Command injection patterns
    /[;&|`]/g,
    // Base64 encoded payloads
    /[A-Za-z0-9+\/]{50,}={0,2}/g
  ];

  const checkString = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj) => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  // Check request body, query params, and headers
  const suspicious = 
    checkObject(req.body) ||
    checkObject(req.query) ||
    checkString(req.get('User-Agent') || '') ||
    checkString(req.get('Referer') || '');

  if (suspicious) {
    securityLogger.suspiciousActivity('malicious_pattern_detected', {
      body: req.body,
      query: req.query,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    }, req);

    return res.status(400).json({
      success: false,
      error: 'Invalid Request',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

// Request size validation
const requestSizeValidator = (options = {}) => {
  const maxBodySize = options.maxBodySize || 1024 * 1024; // 1MB default
  const maxQueryParams = options.maxQueryParams || 50;
  const maxHeaders = options.maxHeaders || 100;

  return (req, res, next) => {
    // Check body size
    const bodySize = JSON.stringify(req.body || {}).length;
    if (bodySize > maxBodySize) {
      securityLogger.suspiciousActivity('oversized_request_body', {
        size: bodySize,
        limit: maxBodySize
      }, req);

      return res.status(413).json({
        success: false,
        error: 'Request Too Large',
        message: 'Request body exceeds maximum allowed size'
      });
    }

    // Check query parameters count
    const queryParamCount = Object.keys(req.query || {}).length;
    if (queryParamCount > maxQueryParams) {
      securityLogger.suspiciousActivity('excessive_query_params', {
        count: queryParamCount,
        limit: maxQueryParams
      }, req);

      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Too many query parameters'
      });
    }

    // Check headers count
    const headerCount = Object.keys(req.headers || {}).length;
    if (headerCount > maxHeaders) {
      securityLogger.suspiciousActivity('excessive_headers', {
        count: headerCount,
        limit: maxHeaders
      }, req);

      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Too many headers'
      });
    }

    next();
  };
};

// Advanced input sanitization
const advancedSanitization = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        // Remove potential XSS
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Remove SQL injection attempts
        .replace(/('|(\\'))+/g, '')
        .replace(/(;|--|\b(DROP|DELETE|INSERT|UPDATE|SELECT)\b)/gi, '')
        // Remove path traversal
        .replace(/\.\.\//g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Trim whitespace
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names too
        const sanitizedKey = sanitizeValue(key);
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return sanitizeValue(obj);
  };

  // Sanitize all input
  req.body = sanitizeObject(req.body || {});
  req.query = sanitizeObject(req.query || {});
  req.params = sanitizeObject(req.params || {});

  next();
};

// CORS security headers
const securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// Request ID generation for tracking
const requestIdMiddleware = (req, res, next) => {
  req.requestId = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Brute force protection
const bruteForceProtection = async (req, res, next) => {
  const key = `bf:${req.ip}`;
  
  try {
    await rateLimiters.consecutiveFails.consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.round(rejRes.msBeforeNext / 1000);
    
    securityLogger.suspiciousActivity('brute_force_detected', {
      consecutiveFailures: rejRes.hits,
      retryAfter
    }, req);

    res.status(429).json({
      success: false,
      error: 'Brute Force Protection',
      message: 'Too many failed attempts. Account temporarily locked.',
      retryAfter
    });
  }
};

// Reset brute force counter on successful auth
const resetBruteForceCounter = (req, res, next) => {
  if (req.user) {
    rateLimiters.consecutiveFails.delete(`bf:${req.ip}`);
  }
  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  if (req.file) {
    const file = req.file;
    
    // Check for executable file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.js', '.vbs', '.sh'];
    const fileExt = require('path').extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(fileExt)) {
      securityLogger.suspiciousActivity('dangerous_file_upload', {
        filename: file.originalname,
        extension: fileExt,
        mimetype: file.mimetype
      }, req);

      return res.status(400).json({
        success: false,
        error: 'File Not Allowed',
        message: 'File type not permitted for security reasons'
      });
    }

    // Check file content matches extension
    const allowedMimeTypes = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp']
    };

    if (allowedMimeTypes[fileExt] && !allowedMimeTypes[fileExt].includes(file.mimetype)) {
      securityLogger.suspiciousActivity('mime_type_mismatch', {
        filename: file.originalname,
        extension: fileExt,
        mimetype: file.mimetype,
        expectedMimeTypes: allowedMimeTypes[fileExt]
      }, req);

      return res.status(400).json({
        success: false,
        error: 'File Validation Failed',
        message: 'File content does not match extension'
      });
    }
  }

  next();
};

module.exports = {
  rateLimiters,
  createRateLimitMiddleware,
  suspiciousActivityDetector,
  requestSizeValidator,
  advancedSanitization,
  securityHeaders,
  requestIdMiddleware,
  bruteForceProtection,
  resetBruteForceCounter,
  fileUploadSecurity
};