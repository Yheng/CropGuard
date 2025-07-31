const express = require('express');
const { getQuery, allQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get health trend data
router.get('/health-trend', authenticateToken, asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  }[timeRange] || 30;

  // Generate mock health trend data
  const healthTrendData = generateHealthTrendData(days, req.user.id);

  res.json({
    success: true,
    data: { healthTrend: healthTrendData },
  });
}));

// Get analysis history statistics
router.get('/analysis-history', authenticateToken, asyncHandler(async (req, res) => {
  const { timeRange = '6m' } = req.query;
  
  const months = {
    '6m': 6,
    '1y': 12,
    '2y': 24,
  }[timeRange] || 6;

  // Get actual analysis data from database
  const analysisData = await allQuery(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      condition,
      COUNT(*) as count
    FROM analyses 
    WHERE user_id = ? 
    AND created_at >= datetime('now', '-${months} months')
    GROUP BY strftime('%Y-%m', created_at), condition
    ORDER BY month ASC
  `, [req.user.id]);

  // Process data for chart
  const processedData = processAnalysisHistoryData(analysisData, months);

  res.json({
    success: true,
    data: { analysisHistory: processedData },
  });
}));

// Get crop type distribution
router.get('/crop-distribution', authenticateToken, asyncHandler(async (req, res) => {
  const cropData = await allQuery(`
    SELECT 
      crop_type,
      COUNT(*) as count,
      AVG(confidence * 100) as avg_health_score
    FROM analyses 
    WHERE user_id = ? AND crop_type IS NOT NULL
    GROUP BY crop_type
    ORDER BY count DESC
  `, [req.user.id]);

  // Add colors for chart
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#F97316', '#6B7280'];
  const processedData = cropData.map((item, index) => ({
    name: item.crop_type || 'Unknown',
    count: item.count,
    healthScore: Math.round(item.avg_health_score || 75),
    color: colors[index % colors.length],
  }));

  res.json({
    success: true,
    data: { cropDistribution: processedData },
  });
}));

// Get complete analytics dashboard
router.get('/dashboard', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // Get health trend (last 30 days)
    const healthTrend = generateHealthTrendData(30, req.user.id);

    // Get analysis history (last 6 months)
    const analysisData = await allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        condition,
        COUNT(*) as count
      FROM analyses 
      WHERE user_id = ? 
      AND created_at >= datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at), condition
      ORDER BY month ASC
    `, [req.user.id]);

    const analysisHistory = processAnalysisHistoryData(analysisData, 6);

    // Get crop distribution
    const cropData = await allQuery(`
      SELECT 
        crop_type,
        COUNT(*) as count,
        AVG(confidence * 100) as avg_health_score
      FROM analyses 
      WHERE user_id = ? AND crop_type IS NOT NULL
      GROUP BY crop_type
      ORDER BY count DESC
    `, [req.user.id]);

    const colors = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#F97316', '#6B7280'];
    const cropDistribution = cropData.map((item, index) => ({
      name: item.crop_type || 'Unknown',
      count: item.count,
      healthScore: Math.round(item.avg_health_score || 75),
      color: colors[index % colors.length],
    }));

    res.json({
      success: true,
      data: {
        healthTrend,
        analysisHistory,
        cropDistribution,
      },
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    throw new AppError('Failed to load analytics data', 500);
  }
}));

// Get user statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    // Total analyses
    getQuery('SELECT COUNT(*) as total FROM analyses WHERE user_id = ?', [req.user.id]),
    
    // This month's analyses
    getQuery(`
      SELECT COUNT(*) as total FROM analyses 
      WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `, [req.user.id]),
    
    // Healthy rate
    getQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN condition = 'healthy' THEN 1 ELSE 0 END) as healthy
      FROM analyses WHERE user_id = ?
    `, [req.user.id]),
    
    // Average confidence
    getQuery('SELECT AVG(confidence) as avg_confidence FROM analyses WHERE user_id = ?', [req.user.id]),
  ]);

  const totalAnalyses = stats[0].total;
  const thisMonthAnalyses = stats[1].total;
  const healthyRate = totalAnalyses > 0 ? Math.round((stats[2].healthy / stats[2].total) * 100) : 0;
  const avgConfidence = Math.round((stats[3].avg_confidence || 0) * 100);

  res.json({
    success: true,
    data: {
      totalAnalyses,
      thisMonthAnalyses,
      healthyRate,
      avgConfidence,
    },
  });
}));

// Admin: Get system-wide analytics
router.get('/admin/system', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const systemStats = await Promise.all([
    // Total users
    getQuery('SELECT COUNT(*) as total FROM users WHERE is_active = 1'),
    
    // Total analyses
    getQuery('SELECT COUNT(*) as total FROM analyses'),
    
    // This month's analyses
    getQuery(`
      SELECT COUNT(*) as total FROM analyses 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `),
    
    // User growth (last 6 months)
    allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_users
      FROM users 
      WHERE created_at >= datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `),
    
    // Analysis breakdown by condition
    allQuery(`
      SELECT condition, COUNT(*) as count
      FROM analyses
      GROUP BY condition
    `),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers: systemStats[0].total,
      totalAnalyses: systemStats[1].total,
      thisMonthAnalyses: systemStats[2].total,
      userGrowth: systemStats[3],
      conditionBreakdown: systemStats[4],
    },
  });
}));

// Helper function to generate mock health trend data
function generateHealthTrendData(days, _userId) {
  const data = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate realistic health scores with some variation
    let baseScore = 75 + Math.random() * 20;
    
    // Add seasonal variation
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 10;
    baseScore += seasonalFactor;
    
    // Add some random events
    if (Math.random() < 0.1) {baseScore -= 20;} // Disease outbreak
    if (Math.random() < 0.05) {baseScore -= 30;} // Severe pest issue
    
    baseScore = Math.max(20, Math.min(100, baseScore));
    
    const condition = baseScore >= 80 ? 'healthy' : baseScore >= 50 ? 'warning' : 'critical';
    
    data.push({
      date: date.toISOString().split('T')[0],
      healthScore: Math.round(baseScore),
      condition,
      cropType: ['tomato', 'corn', 'wheat', 'lettuce', 'pepper'][Math.floor(Math.random() * 5)],
    });
  }
  
  return data;
}

// Helper function to process analysis history data
function processAnalysisHistoryData(rawData, months) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result = [];
  
  // Generate all months in range
  for (let i = months; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Find data for this month
    const monthData = rawData.filter(item => item.month === monthKey);
    
    const healthy = monthData.find(item => item.condition === 'healthy')?.count || 0;
    const pest = monthData.find(item => item.condition === 'pest')?.count || 0;
    const disease = monthData.find(item => item.condition === 'disease')?.count || 0;
    const unknown = monthData.find(item => item.condition === 'unknown')?.count || 0;
    
    result.push({
      month: monthName,
      healthy,
      pest,
      disease: disease + unknown, // Combine disease and unknown
      total: healthy + pest + disease + unknown,
    });
  }
  
  return result;
}

module.exports = router;