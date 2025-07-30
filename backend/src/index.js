const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('rate-limiter-flexible');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const treatmentRoutes = require('./routes/treatments');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const agronomistRoutes = require('./routes/agronomist');

const { initializeDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { 
  requestLogger, 
  performanceLogger, 
  logger, 
  appLogger 
} = require('./middleware/logger');
const {
  createRateLimitMiddleware,
  suspiciousActivityDetector,
  requestSizeValidator,
  advancedSanitization,
  securityHeaders,
  requestIdMiddleware
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const rateLimiter = new rateLimit.RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Try again later.'
    });
  }
};

// Security middleware (order is important)
app.use(requestIdMiddleware);
app.use(securityHeaders);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());

// Request validation and rate limiting
app.use(requestSizeValidator());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(suspiciousActivityDetector);
app.use(advancedSanitization);

// Logging and monitoring
app.use(requestLogger);
app.use(performanceLogger);

// Global rate limiting
app.use(createRateLimitMiddleware('global'));

// Health check and monitoring routes
app.use('/health', healthRoutes);

// Legacy health endpoint for backward compatibility
app.get('/health-simple', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agronomist', agronomistRoutes);

// Static file serving for uploaded images
app.use('/uploads', express.static('uploads'));

// Serve processed images
app.use('/uploads/processed', express.static(path.join(__dirname, '../uploads/processed')));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');
    appLogger.systemEvent('server_startup', { port: PORT });
    
    app.listen(PORT, () => {
      logger.info(`CropGuard API server running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/health`
      });
      
      // Legacy console logs for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🚀 CropGuard API server running on port ${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
        console.log(`🌱 Environment: ${process.env.NODE_ENV || 'development'}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  appLogger.systemEvent('server_shutdown', { signal: 'SIGTERM' });
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  appLogger.systemEvent('server_shutdown', { signal: 'SIGINT' });
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();