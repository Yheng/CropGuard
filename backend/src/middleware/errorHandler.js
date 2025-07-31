const fs = require('fs').promises;
const path = require('path');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Log error to file
async function logError(error, req) {
  try {
    const logDir = path.join(__dirname, '../../logs');
    await fs.mkdir(logDir, { recursive: true });

    const logFile = path.join(logDir, 'error.log');
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
      },
      request: {
        method: req?.method,
        url: req?.originalUrl,
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
        userId: req?.user?.id,
      },
    };

    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Main error handler middleware
function errorHandler(err, req, res, _next) {
  // Default error properties
  let error = { ...err };
  error.message = err.message;

  // Log error
  logError(error, req);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400);
  }

  // SQLite constraint error
  if (err.code === 'SQLITE_CONSTRAINT') {
    const message = 'Database constraint violation';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new AppError(message, 400);
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = {
    success: false,
    error: isDevelopment ? error.name || 'Error' : 'Internal Server Error',
    message: message,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error;
  }

  // Include request ID if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  console.error(`❌ Error ${statusCode}:`, message);
  if (isDevelopment) {
    console.error(error.stack);
  }

  res.status(statusCode).json(errorResponse);
}

// 404 handler
function notFound(req, res, next) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

// Async error wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
  logError,
};