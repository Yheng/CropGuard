const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import routes and middleware
const authRoutes = require('../src/routes/auth');
const analysisRoutes = require('../src/routes/analysis');
const treatmentRoutes = require('../src/routes/treatments');
const analyticsRoutes = require('../src/routes/analytics');
const userRoutes = require('../src/routes/users');
const healthRoutes = require('../src/routes/health');

const { errorHandler } = require('../src/middleware/errorHandler');
const { 
  requestLogger, 
  performanceLogger 
} = require('../src/middleware/logger');
const {
  createRateLimitMiddleware,
  suspiciousActivityDetector,
  requestSizeValidator,
  advancedSanitization,
  securityHeaders,
  requestIdMiddleware
} = require('../src/middleware/security');

// Create test app without starting server
function createTestApp() {
  const app = express();

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
  app.use(suspiciousActivityDetector);
  app.use(advancedSanitization);

  // Logging and monitoring (in test mode, make these no-ops)
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
    app.use(performanceLogger);
  }

  // Global rate limiting (relaxed for tests)
  if (process.env.NODE_ENV !== 'test') {
    app.use(createRateLimitMiddleware('global'));
  }

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

  // Static file serving for uploaded images
  app.use('/uploads', express.static('uploads'));
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

  return app;
}

module.exports = createTestApp;