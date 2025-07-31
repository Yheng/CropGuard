const { runQuery } = require('../config/database');

// Request ID generator
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Request logger middleware
function requestLogger(req, res, next) {
  const startTime = Date.now();
  req.requestId = generateRequestId();

  // Log request start
  console.log(`📥 [${req.requestId}] ${req.method} ${req.originalUrl} - ${req.ip}`);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log request completion
    const logLevel = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${logLevel} [${req.requestId}] ${res.statusCode} ${responseTime}ms`);

    // Log to database (async, don't block response)
    logToDatabase(req, res, responseTime).catch(error => {
      console.error('Failed to log request to database:', error);
    });
  };

  next();
}

// Log request to database
async function logToDatabase(req, res, responseTime) {
  try {
    await runQuery(`
      INSERT INTO api_usage (
        user_id, endpoint, method, status_code, response_time, 
        ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      req.user?.id || null,
      req.originalUrl,
      req.method,
      res.statusCode,
      responseTime,
      req.ip,
      req.get('User-Agent') || null,
    ]);
  } catch (error) {
    // Don't throw errors for logging failures
    console.error('Database logging error:', error);
  }
}

// Request timing middleware
function requestTiming(req, res, next) {
  req.startTime = process.hrtime.bigint();
  next();
}

// Get request duration
function getRequestDuration(req) {
  if (!req.startTime) {return 0;}
  const endTime = process.hrtime.bigint();
  return Number(endTime - req.startTime) / 1000000; // Convert to milliseconds
}

module.exports = {
  requestLogger,
  requestTiming,
  getRequestDuration,
  generateRequestId,
};