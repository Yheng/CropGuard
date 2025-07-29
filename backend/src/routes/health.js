const express = require('express');
const { getQuery } = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { healthCheck: loggerHealthCheck } = require('../middleware/logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const router = express.Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      filesystem: await checkFilesystem(),
      memory: checkMemory(),
      logging: loggerHealthCheck()
    }
  };

  // Determine overall status
  const allChecksHealthy = Object.values(healthStatus.checks)
    .every(check => check.status === 'healthy');
  
  if (!allChecksHealthy) {
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
}));

// Detailed system metrics
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: {
        process: process.uptime(),
        system: os.uptime()
      },
      cpu: {
        model: os.cpus()[0]?.model || 'unknown',
        cores: os.cpus().length,
        usage: process.cpuUsage()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        process: process.memoryUsage()
      },
      load: os.loadavg()
    },
    application: {
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      version: '1.0.0'
    },
    database: await getDatabaseMetrics(),
    api: await getApiMetrics()
  };

  res.json(metrics);
}));

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', asyncHandler(async (req, res) => {
  const checks = [
    checkDatabase(),
    checkFilesystem()
  ];

  const results = await Promise.all(checks);
  const allReady = results.every(result => result.status === 'healthy');

  if (allReady) {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ 
      status: 'not ready', 
      timestamp: new Date().toISOString(),
      checks: results
    });
  }
}));

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Database health check
async function checkDatabase() {
  try {
    const start = Date.now();
    await getQuery('SELECT 1 as test');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

// Filesystem health check
async function checkFilesystem() {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const logsDir = path.join(__dirname, '../../logs');
    
    // Check if directories exist and are writable
    await fs.access(uploadsDir, fs.constants.W_OK);
    await fs.access(logsDir, fs.constants.W_OK);
    
    // Check disk space
    const stats = await fs.stat(uploadsDir);
    
    return {
      status: 'healthy',
      message: 'Filesystem accessible',
      uploadsDir,
      logsDir
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Filesystem check failed'
    };
  }
}

// Memory health check
function checkMemory() {
  const usage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  // Alert if process is using more than 80% of available memory
  const memoryUsagePercent = (usage.heapUsed / totalMemory) * 100;
  const systemMemoryUsagePercent = (usedMemory / totalMemory) * 100;
  
  const status = memoryUsagePercent > 80 || systemMemoryUsagePercent > 90 
    ? 'degraded' 
    : 'healthy';
  
  return {
    status,
    process: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    },
    system: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: Math.round(systemMemoryUsagePercent)
    },
    processUsagePercent: Math.round(memoryUsagePercent)
  };
}

// Get database metrics
async function getDatabaseMetrics() {
  try {
    const userCount = await getQuery('SELECT COUNT(*) as count FROM users');
    const analysisCount = await getQuery('SELECT COUNT(*) as count FROM analyses');
    const treatmentCount = await getQuery('SELECT COUNT(*) as count FROM treatments');
    
    return {
      status: 'connected',
      statistics: {
        users: userCount.count,
        analyses: analysisCount.count,
        treatments: treatmentCount.count
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Get API metrics (basic implementation)
async function getApiMetrics() {
  return {
    status: 'operational',
    endpoints: {
      auth: '/api/auth',
      analysis: '/api/analysis',
      treatments: '/api/treatments',
      analytics: '/api/analytics',
      users: '/api/users'
    },
    features: {
      fileUpload: 'enabled',
      imageProcessing: 'enabled',
      validation: 'enabled',
      rateLimit: 'enabled'
    }
  };
}

module.exports = router;