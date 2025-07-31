const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const AgronomistService = require('../services/agronomistService');
const { logger } = require('../middleware/logger');
const { AppError } = require('../middleware/errorHandler');

// Initialize agronomist service
const agronomistService = new AgronomistService();

// Validation schemas
const reviewSchema = {
  expertDiagnosis: { type: 'object', required: true },
  expertConfidence: { type: 'number', min: 0, max: 1 },
  expertSeverity: { type: 'string', enum: ['low', 'medium', 'high'] },
  expertRecommendations: { type: 'array' },
  expertComments: { type: 'string' },
  aiFeedback: { type: 'string', enum: ['accurate', 'partially_accurate', 'inaccurate'] },
  approvalStatus: { type: 'string', enum: ['approved', 'modified', 'rejected'], required: true },
};

const assignmentSchema = {
  analysisId: { type: 'number', required: true },
  agronomistId: { type: 'number', required: true },
};

const bulkReviewSchema = {
  operations: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        analysisId: { type: 'number', required: true },
        action: { type: 'string', enum: ['approve', 'modify', 'reject', 'reassign'], required: true },
        reviewData: { type: 'object' },
      },
    },
  },
};

/**
 * @route GET /api/agronomist/queue
 * @desc Get review queue for agronomist
 * @access Private (Agronomist only)
 */
router.get('/queue', 
  authMiddleware, 
  roleMiddleware(['agronomist']), 
  async (req, res) => {
    try {
      const agronomistId = req.user.id;
      const filters = {
        assignedOnly: req.query.assigned === 'true',
        priority: req.query.priority ? parseInt(req.query.priority) : undefined,
        cropType: req.query.cropType,
        farmerRequested: req.query.farmer_requested === 'true',
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
      };

      const queue = await agronomistService.getReviewQueue(agronomistId, filters);

      res.json({
        success: true,
        data: {
          queue,
          totalCount: queue.length,
          filters,
        },
      });

    } catch (error) {
      logger.error('Failed to get review queue', {
        error: error.message,
        agronomistId: req.user.id,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get review queue',
      });
    }
  },
);

/**
 * @route POST /api/agronomist/assign
 * @desc Assign analysis to agronomist
 * @access Private (Agronomist/Admin only)
 */
router.post('/assign',
  authMiddleware,
  roleMiddleware(['agronomist', 'admin']),
  validateRequest(assignmentSchema),
  async (req, res) => {
    try {
      const { analysisId, agronomistId } = req.body;

      // Only admins can assign to other agronomists
      if (req.user.role !== 'admin' && agronomistId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only assign analyses to yourself',
        });
      }

      const result = await agronomistService.assignAnalysis(analysisId, agronomistId);

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      logger.error('Failed to assign analysis', {
        error: error.message,
        body: req.body,
        userId: req.user.id,
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to assign analysis',
      });
    }
  },
);

/**
 * @route POST /api/agronomist/review/:analysisId
 * @desc Submit agronomist review
 * @access Private (Agronomist only)
 */
router.post('/review/:analysisId',
  authMiddleware,
  roleMiddleware(['agronomist']),
  validateRequest(reviewSchema),
  async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const agronomistId = req.user.id;

      if (isNaN(analysisId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid analysis ID',
        });
      }

      const result = await agronomistService.submitReview(
        analysisId,
        agronomistId,
        req.body,
      );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      logger.error('Failed to submit review', {
        error: error.message,
        analysisId: req.params.analysisId,
        agronomistId: req.user.id,
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to submit review',
      });
    }
  },
);

/**
 * @route POST /api/agronomist/bulk-review
 * @desc Perform bulk review operations
 * @access Private (Agronomist only)
 */
router.post('/bulk-review',
  authMiddleware,
  roleMiddleware(['agronomist']),
  validateRequest(bulkReviewSchema),
  async (req, res) => {
    try {
      const agronomistId = req.user.id;
      const { operations } = req.body;

      const result = await agronomistService.bulkReview(agronomistId, operations);

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      logger.error('Failed to perform bulk review', {
        error: error.message,
        agronomistId: req.user.id,
        operationCount: req.body.operations?.length,
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk review',
      });
    }
  },
);

/**
 * @route GET /api/agronomist/stats
 * @desc Get agronomist statistics
 * @access Private (Agronomist only)
 */
router.get('/stats',
  authMiddleware,
  roleMiddleware(['agronomist']),
  async (req, res) => {
    try {
      const agronomistId = req.user.id;
      const stats = await agronomistService.getAgronomistStats(agronomistId);

      res.json({
        success: true,
        data: stats,
      });

    } catch (error) {
      logger.error('Failed to get agronomist stats', {
        error: error.message,
        agronomistId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
      });
    }
  },
);

/**
 * @route GET /api/agronomist/analysis/:analysisId
 * @desc Get detailed analysis for review
 * @access Private (Agronomist only)
 */
router.get('/analysis/:analysisId',
  authMiddleware,
  roleMiddleware(['agronomist']),
  async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      
      if (isNaN(analysisId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid analysis ID',
        });
      }

      // Get analysis details with farmer information
      const db = require('../config/database');
      const analysis = await db.get(`
        SELECT 
          a.*,
          u.name as farmer_name,
          u.email as farmer_email,
          u.phone as farmer_phone,
          rq.farmer_requested,
          rq.priority,
          rq.assigned_agronomist_id
        FROM analyses a
        JOIN users u ON a.farmer_id = u.id
        LEFT JOIN review_queue rq ON a.id = rq.analysis_id
        WHERE a.id = ?
      `, [analysisId]);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found',
        });
      }

      // Parse JSON fields
      const processedAnalysis = {
        ...analysis,
        ai_diagnosis: JSON.parse(analysis.ai_diagnosis || '{}'),
        ai_recommendations: JSON.parse(analysis.ai_recommendations || '[]'),
      };

      // Get any existing reviews
      const existingReviews = await db.all(`
        SELECT 
          ar.*,
          u.name as agronomist_name
        FROM agronomist_reviews ar
        JOIN users u ON ar.agronomist_id = u.id
        WHERE ar.analysis_id = ?
        ORDER BY ar.created_at DESC
      `, [analysisId]);

      res.json({
        success: true,
        data: {
          analysis: processedAnalysis,
          existingReviews: existingReviews.map(review => ({
            ...review,
            expert_diagnosis: JSON.parse(review.expert_diagnosis || '{}'),
            expert_recommendations: JSON.parse(review.expert_recommendations || '[]'),
          })),
        },
      });

    } catch (error) {
      logger.error('Failed to get analysis details', {
        error: error.message,
        analysisId: req.params.analysisId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get analysis details',
      });
    }
  },
);

/**
 * @route GET /api/agronomist/leaderboard
 * @desc Get agronomist leaderboard
 * @access Private (Agronomist only)
 */
router.get('/leaderboard',
  authMiddleware,
  roleMiddleware(['agronomist', 'admin']),
  async (req, res) => {
    try {
      const db = require('../config/database');
      const timeframe = req.query.timeframe || 'month'; // week, month, year, all
      
      let dateFilter = '';
      switch (timeframe) {
      case 'week':
        dateFilter = 'AND ar.created_at >= datetime(\'now\', \'-7 days\')';
        break;
      case 'month':
        dateFilter = 'AND ar.created_at >= datetime(\'now\', \'-30 days\')';
        break;
      case 'year':
        dateFilter = 'AND ar.created_at >= datetime(\'now\', \'-365 days\')';
        break;
      default:
        dateFilter = '';
      }

      const leaderboard = await db.all(`
        SELECT 
          u.name,
          u.id as agronomist_id,
          COUNT(*) as reviews_completed,
          AVG(ar.review_time_seconds) as avg_review_time,
          SUM(ar.credits_earned) as credits_earned,
          SUM(CASE WHEN ar.approval_status = 'approved' THEN 1 ELSE 0 END) as approvals,
          ac.level,
          ac.current_balance
        FROM agronomist_reviews ar
        JOIN users u ON ar.agronomist_id = u.id
        LEFT JOIN agronomist_credits ac ON u.id = ac.agronomist_id
        WHERE u.role = 'agronomist' ${dateFilter}
        GROUP BY u.id, u.name, ac.level, ac.current_balance
        ORDER BY credits_earned DESC, reviews_completed DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: {
          timeframe,
          leaderboard: leaderboard.map((entry, index) => ({
            rank: index + 1,
            ...entry,
            approval_rate: entry.reviews_completed > 0 ? 
              Math.round((entry.approvals / entry.reviews_completed) * 100) : 0,
            avg_review_time: Math.round(entry.avg_review_time || 0),
          })),
        },
      });

    } catch (error) {
      logger.error('Failed to get leaderboard', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  },
);

/**
 * @route GET /api/agronomist/service-metrics
 * @desc Get service-wide metrics (admin only)
 * @access Private (Admin only)
 */
router.get('/service-metrics',
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res) => {
    try {
      const metrics = agronomistService.getServiceMetrics();
      
      // Get additional database metrics
      const db = require('../config/database');
      const dbMetrics = await db.get(`
        SELECT 
          COUNT(*) as total_analyses,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as completed_reviews,
          AVG(CASE WHEN status = 'reviewed' THEN 
            (julianday(updated_at) - julianday(created_at)) * 24 * 60 
          END) as avg_turnaround_minutes
        FROM analyses
      `);

      const queueMetrics = await db.get(`
        SELECT 
          COUNT(*) as queue_length,
          AVG(priority) as avg_priority,
          COUNT(CASE WHEN farmer_requested = TRUE THEN 1 END) as farmer_requested_count
        FROM review_queue
      `);

      res.json({
        success: true,
        data: {
          service: metrics,
          database: dbMetrics,
          queue: queueMetrics,
        },
      });

    } catch (error) {
      logger.error('Failed to get service metrics', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get service metrics',
      });
    }
  },
);

module.exports = router;