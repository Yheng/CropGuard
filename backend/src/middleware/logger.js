const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, userId, endpoint, duration, error, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: service || 'cropguard-api',
      message,
      ...(userId && { userId }),
      ...(endpoint && { endpoint }),
      ...(duration && { duration }),
      ...(error && { error }),
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, userId, endpoint, duration }) => {
    let logMessage = `${timestamp} [${level}]`;
    if (service) logMessage += ` [${service}]`;
    if (userId) logMessage += ` [User:${userId}]`;
    if (endpoint) logMessage += ` [${endpoint}]`;
    if (duration) logMessage += ` [${duration}ms]`;
    logMessage += `: ${message}`;
    return logMessage;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'cropguard-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Access log for API requests
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const userId = req.user?.id || null;
  
  // Log request start
  logger.http('Request received', {
    method,
    url,
    ip,
    userAgent,
    userId,
    endpoint: `${method} ${url}`,
    requestId: req.id || generateRequestId()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    // Log response
    logger.http('Request completed', {
      method,
      url,
      ip,
      userId,
      statusCode,
      duration,
      endpoint: `${method} ${url}`,
      responseSize: JSON.stringify(data).length
    });
    
    return originalJson.call(this, data);
  };

  next();
};

// API Performance monitoring middleware
const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    if (duration > 1000) { // Log slow requests (>1s)
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: Math.round(duration),
        userId: req.user?.id,
        endpoint: `${req.method} ${req.url}`,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

// Database query logging
const dbLogger = {
  query: (sql, params, duration) => {
    logger.debug('Database query executed', {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params?.length || 0,
      duration: Math.round(duration || 0),
      category: 'database'
    });
  },
  
  slowQuery: (sql, params, duration) => {
    logger.warn('Slow database query detected', {
      sql: sql.substring(0, 500) + (sql.length > 500 ? '...' : ''),
      params,
      duration: Math.round(duration),
      category: 'database'
    });
  },
  
  error: (error, sql, params) => {
    logger.error('Database query failed', {
      error: error.message,
      sql: sql?.substring(0, 200) + (sql?.length > 200 ? '...' : ''),
      params,
      category: 'database',
      stack: error.stack
    });
  }
};

// Security event logging
const securityLogger = {
  suspiciousActivity: (type, details, req) => {
    logger.warn('Suspicious activity detected', {
      type,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      endpoint: `${req.method} ${req.url}`,
      category: 'security'
    });
  },
  
  authFailure: (reason, req) => {
    logger.warn('Authentication failure', {
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.url}`,
      category: 'security'
    });
  },
  
  rateLimitExceeded: (limit, req) => {
    logger.warn('Rate limit exceeded', {
      limit,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      endpoint: `${req.method} ${req.url}`,
      category: 'security'
    });
  }
};

// Application event logging
const appLogger = {
  userAction: (action, details, userId) => {
    logger.info('User action logged', {
      action,
      details,
      userId,
      category: 'user-activity'
    });
  },
  
  systemEvent: (event, details) => {
    logger.info('System event', {
      event,
      details,
      category: 'system'
    });
  },
  
  aiAnalysis: (analysisId, confidence, processingTime, userId) => {
    logger.info('AI analysis completed', {
      analysisId,
      confidence,
      processingTime,
      userId,
      category: 'ai-analysis'
    });
  }
};

// Error logging with context
const errorLogger = (error, req = null, context = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    category: 'error',
    ...context
  };
  
  if (req) {
    errorLog.method = req.method;
    errorLog.url = req.url;
    errorLog.ip = req.ip;
    errorLog.userAgent = req.get('User-Agent');
    errorLog.userId = req.user?.id;
  }
  
  logger.error('Application error', errorLog);
};

// Generate unique request ID
function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Health check for logging system
const healthCheck = () => {
  try {
    logger.info('Logging system health check', { category: 'health-check' });
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

// Log retention management
const cleanupOldLogs = () => {
  const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  logger.info('Log cleanup initiated', {
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    category: 'maintenance'
  });
};

module.exports = {
  logger,
  requestLogger,
  performanceLogger,
  dbLogger,
  securityLogger,
  appLogger,
  errorLogger,
  healthCheck,
  cleanupOldLogs
};