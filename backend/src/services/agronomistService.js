const { logger } = require('../middleware/logger');
const { AppError } = require('../middleware/errorHandler');
const db = require('../config/database');

/**
 * Agronomist Service - Manages review workflows and expert validation
 */
class AgronomistService {
  constructor() {
    this.reviewQueue = new Map(); // In-memory queue for active reviews
    this.metrics = {
      totalReviews: 0,
      avgReviewTime: 0,
      approvalRate: 0,
      expertCorrections: 0,
    };
    
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for agronomist workflow
   */
  async initializeDatabase() {
    try {
      // Create analyses table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmer_id INTEGER NOT NULL,
          image_path TEXT NOT NULL,
          original_image_path TEXT,
          crop_type TEXT,
          location TEXT,
          ai_diagnosis TEXT,
          ai_confidence REAL,
          ai_severity TEXT,
          ai_recommendations TEXT,
          status TEXT DEFAULT 'pending',
          priority INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (farmer_id) REFERENCES users (id)
        )
      `);

      // Create agronomist reviews table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS agronomist_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          analysis_id INTEGER NOT NULL,
          agronomist_id INTEGER NOT NULL,
          expert_diagnosis TEXT,
          expert_confidence REAL,
          expert_severity TEXT,
          expert_recommendations TEXT,
          expert_comments TEXT,
          ai_feedback TEXT,
          approval_status TEXT,
          review_time_seconds INTEGER,
          credits_earned INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (analysis_id) REFERENCES analyses (id),
          FOREIGN KEY (agronomist_id) REFERENCES users (id)
        )
      `);

      // Create review queue table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS review_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          analysis_id INTEGER NOT NULL,
          assigned_agronomist_id INTEGER,
          priority INTEGER DEFAULT 1,
          farmer_requested BOOLEAN DEFAULT FALSE,
          estimated_completion DATETIME,
          queue_position INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (analysis_id) REFERENCES analyses (id),
          FOREIGN KEY (assigned_agronomist_id) REFERENCES users (id)
        )
      `);

      // Create agronomist credits table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS agronomist_credits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agronomist_id INTEGER NOT NULL,
          credits_earned INTEGER DEFAULT 0,
          credits_spent INTEGER DEFAULT 0,
          current_balance INTEGER DEFAULT 0,
          level TEXT DEFAULT 'bronze',
          certifications TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agronomist_id) REFERENCES users (id)
        )
      `);

      logger.info('Agronomist service database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agronomist service database', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Add analysis to review queue
   */
  async queueForReview(analysisData, priority = 1, farmerRequested = false) {
    try {
      const {
        farmerId,
        imagePath,
        originalImagePath,
        cropType,
        location,
        aiDiagnosis,
        aiConfidence,
        aiSeverity,
        aiRecommendations,
      } = analysisData;

      // Insert analysis record
      const analysisResult = await db.run(`
        INSERT INTO analyses (
          farmer_id, image_path, original_image_path, crop_type, location,
          ai_diagnosis, ai_confidence, ai_severity, ai_recommendations,
          status, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `, [
        farmerId, imagePath, originalImagePath, cropType, location,
        JSON.stringify(aiDiagnosis), aiConfidence, aiSeverity,
        JSON.stringify(aiRecommendations), priority,
      ]);

      const analysisId = analysisResult.lastID;

      // Add to review queue
      const queuePosition = await this.getNextQueuePosition();
      
      await db.run(`
        INSERT INTO review_queue (
          analysis_id, priority, farmer_requested, queue_position
        ) VALUES (?, ?, ?, ?)
      `, [analysisId, priority, farmerRequested, queuePosition]);

      // Assign to available agronomist if possible
      await this.tryAssignToAgronomist(analysisId);

      logger.info('Analysis queued for review', {
        analysisId,
        farmerId,
        priority,
        farmerRequested,
        queuePosition,
      });

      return {
        analysisId,
        queuePosition,
        estimatedWait: await this.estimateWaitTime(priority),
      };

    } catch (error) {
      logger.error('Failed to queue analysis for review', {
        error: error.message,
        analysisData,
      });
      throw new AppError('Failed to queue analysis for review', 500);
    }
  }

  /**
   * Get review queue for agronomist
   */
  async getReviewQueue(agronomistId, filters = {}) {
    try {
      let query = `
        SELECT 
          a.id as analysis_id,
          a.farmer_id,
          a.image_path,
          a.original_image_path,
          a.crop_type,
          a.location,
          a.ai_diagnosis,
          a.ai_confidence,
          a.ai_severity,
          a.ai_recommendations,
          a.priority,
          a.created_at,
          rq.farmer_requested,
          rq.queue_position,
          rq.assigned_agronomist_id,
          u.name as farmer_name,
          u.email as farmer_email
        FROM analyses a
        JOIN review_queue rq ON a.id = rq.analysis_id
        JOIN users u ON a.farmer_id = u.id
        WHERE a.status = 'pending'
      `;

      const params = [];

      // Add filters
      if (filters.assignedOnly) {
        query += ' AND rq.assigned_agronomist_id = ?';
        params.push(agronomistId);
      }

      if (filters.priority) {
        query += ' AND a.priority >= ?';
        params.push(filters.priority);
      }

      if (filters.cropType) {
        query += ' AND a.crop_type = ?';
        params.push(filters.cropType);
      }

      if (filters.farmerRequested) {
        query += ' AND rq.farmer_requested = TRUE';
      }

      // Order by priority and queue position
      query += ' ORDER BY a.priority DESC, rq.queue_position ASC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const analyses = await db.all(query, params);

      // Parse JSON fields
      const processedAnalyses = analyses.map(analysis => ({
        ...analysis,
        ai_diagnosis: JSON.parse(analysis.ai_diagnosis || '{}'),
        ai_recommendations: JSON.parse(analysis.ai_recommendations || '[]'),
      }));

      return processedAnalyses;

    } catch (error) {
      logger.error('Failed to get review queue', {
        error: error.message,
        agronomistId,
        filters,
      });
      throw new AppError('Failed to get review queue', 500);
    }
  }

  /**
   * Assign analysis to agronomist
   */
  async assignAnalysis(analysisId, agronomistId) {
    try {
      // Check if analysis exists and is pending
      const analysis = await db.get(
        'SELECT * FROM analyses WHERE id = ? AND status = "pending"',
        [analysisId],
      );

      if (!analysis) {
        throw new AppError('Analysis not found or already reviewed', 404);
      }

      // Check if agronomist is available
      const agronomist = await db.get(
        'SELECT * FROM users WHERE id = ? AND role = "agronomist"',
        [agronomistId],
      );

      if (!agronomist) {
        throw new AppError('Agronomist not found', 404);
      }

      // Update assignment
      await db.run(`
        UPDATE review_queue 
        SET assigned_agronomist_id = ?, estimated_completion = datetime('now', '+2 hours')
        WHERE analysis_id = ?
      `, [agronomistId, analysisId]);

      // Add to in-memory queue for tracking
      this.reviewQueue.set(analysisId, {
        agronomistId,
        assignedAt: new Date(),
        status: 'assigned',
      });

      logger.info('Analysis assigned to agronomist', {
        analysisId,
        agronomistId,
      });

      return { success: true, assignedAt: new Date() };

    } catch (error) {
      logger.error('Failed to assign analysis', {
        error: error.message,
        analysisId,
        agronomistId,
      });
      throw error;
    }
  }

  /**
   * Submit agronomist review
   */
  async submitReview(analysisId, agronomistId, reviewData) {
    const startTime = Date.now();
    
    try {
      const {
        expertDiagnosis,
        expertConfidence,
        expertSeverity,
        expertRecommendations,
        expertComments,
        aiFeedback,
        approvalStatus,
      } = reviewData;

      // Validate review data
      if (!expertDiagnosis || !approvalStatus) {
        throw new AppError('Expert diagnosis and approval status are required', 400);
      }

      // Check if analysis exists and is assigned to this agronomist
      const queueItem = await db.get(`
        SELECT rq.*, a.status 
        FROM review_queue rq
        JOIN analyses a ON rq.analysis_id = a.id
        WHERE rq.analysis_id = ? AND rq.assigned_agronomist_id = ? AND a.status = 'pending'
      `, [analysisId, agronomistId]);

      if (!queueItem) {
        throw new AppError('Analysis not found or not assigned to you', 404);
      }

      const reviewTimeSeconds = Math.round((Date.now() - startTime) / 1000);

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      try {
        // Insert review record
        await db.run(`
          INSERT INTO agronomist_reviews (
            analysis_id, agronomist_id, expert_diagnosis, expert_confidence,
            expert_severity, expert_recommendations, expert_comments,
            ai_feedback, approval_status, review_time_seconds, credits_earned
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          analysisId, agronomistId, JSON.stringify(expertDiagnosis),
          expertConfidence, expertSeverity, JSON.stringify(expertRecommendations),
          expertComments, aiFeedback, approvalStatus, reviewTimeSeconds, 1,
        ]);

        // Update analysis status
        const newStatus = approvalStatus === 'approved' ? 'reviewed' : 'expert_modified';
        await db.run(`
          UPDATE analyses 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newStatus, analysisId]);

        // Remove from review queue
        await db.run('DELETE FROM review_queue WHERE analysis_id = ?', [analysisId]);

        // Update agronomist credits
        await this.updateAgronomistCredits(agronomistId, 1);

        // Update metrics
        this.updateMetrics(reviewTimeSeconds, approvalStatus === 'approved');

        // Commit transaction
        await db.run('COMMIT');

        // Remove from in-memory queue
        this.reviewQueue.delete(analysisId);

        logger.info('Agronomist review submitted successfully', {
          analysisId,
          agronomistId,
          approvalStatus,
          reviewTimeSeconds,
        });

        return {
          success: true,
          reviewId: analysisId,
          creditsEarned: 1,
          reviewTime: reviewTimeSeconds,
          newStatus,
        };

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      logger.error('Failed to submit agronomist review', {
        error: error.message,
        analysisId,
        agronomistId,
      });
      throw error;
    }
  }

  /**
   * Bulk review operations
   */
  async bulkReview(agronomistId, operations) {
    try {
      const results = [];

      for (const operation of operations) {
        const { analysisId, action, reviewData } = operation;

        try {
          let result;
          
          switch (action) {
          case 'approve':
            result = await this.submitReview(analysisId, agronomistId, {
              ...reviewData,
              approvalStatus: 'approved',
            });
            break;
              
          case 'modify':
            result = await this.submitReview(analysisId, agronomistId, {
              ...reviewData,
              approvalStatus: 'modified',
            });
            break;
              
          case 'reject':
            result = await this.submitReview(analysisId, agronomistId, {
              ...reviewData,
              approvalStatus: 'rejected',
            });
            break;
              
          case 'reassign':
            result = await this.reassignAnalysis(analysisId, reviewData.newAgronomistId);
            break;
              
          default:
            throw new AppError(`Invalid bulk action: ${action}`, 400);
          }

          results.push({
            analysisId,
            action,
            success: true,
            result,
          });

        } catch (error) {
          results.push({
            analysisId,
            action,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      logger.info('Bulk review operations completed', {
        agronomistId,
        total: operations.length,
        successful: successCount,
        failed: failureCount,
      });

      return {
        total: operations.length,
        successful: successCount,
        failed: failureCount,
        results,
      };

    } catch (error) {
      logger.error('Failed to perform bulk review operations', {
        error: error.message,
        agronomistId,
      });
      throw new AppError('Failed to perform bulk operations', 500);
    }
  }

  /**
   * Get agronomist statistics
   */
  async getAgronomistStats(agronomistId) {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(review_time_seconds) as avg_review_time,
          SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(credits_earned) as total_credits,
          MIN(created_at) as first_review,
          MAX(created_at) as last_review
        FROM agronomist_reviews 
        WHERE agronomist_id = ?
      `, [agronomistId]);

      const credits = await db.get(`
        SELECT * FROM agronomist_credits WHERE agronomist_id = ?
      `, [agronomistId]);

      const queueStats = await db.get(`
        SELECT COUNT(*) as assigned_count
        FROM review_queue 
        WHERE assigned_agronomist_id = ?
      `, [agronomistId]);

      return {
        reviews: {
          total: stats.total_reviews || 0,
          approved: stats.approved_count || 0,
          avgReviewTime: Math.round(stats.avg_review_time || 0),
          approvalRate: stats.total_reviews > 0 ? 
            Math.round((stats.approved_count / stats.total_reviews) * 100) : 0,
        },
        credits: {
          current: credits?.current_balance || 0,
          earned: credits?.credits_earned || 0,
          spent: credits?.credits_spent || 0,
          level: credits?.level || 'bronze',
        },
        queue: {
          assigned: queueStats.assigned_count || 0,
        },
        activity: {
          firstReview: stats.first_review,
          lastReview: stats.last_review,
        },
      };

    } catch (error) {
      logger.error('Failed to get agronomist statistics', {
        error: error.message,
        agronomistId,
      });
      throw new AppError('Failed to get statistics', 500);
    }
  }

  /**
   * Helper methods
   */
  async getNextQueuePosition() {
    const result = await db.get('SELECT MAX(queue_position) as max_pos FROM review_queue');
    return (result.max_pos || 0) + 1;
  }

  async estimateWaitTime(priority) {
    const queueLength = await db.get(`
      SELECT COUNT(*) as count FROM review_queue 
      WHERE priority >= ?
    `, [priority]);
    
    // Estimate 30 minutes per review
    return (queueLength.count || 0) * 30;
  }

  async tryAssignToAgronomist(analysisId) {
    try {
      // Find available agronomist with lowest current load
      const agronomist = await db.get(`
        SELECT u.id, COUNT(rq.assigned_agronomist_id) as current_load
        FROM users u
        LEFT JOIN review_queue rq ON u.id = rq.assigned_agronomist_id
        WHERE u.role = 'agronomist' AND u.active = 1
        GROUP BY u.id
        ORDER BY current_load ASC
        LIMIT 1
      `);

      if (agronomist && agronomist.current_load < 5) { // Max 5 concurrent reviews
        await this.assignAnalysis(analysisId, agronomist.id);
      }
    } catch (error) {
      // Non-critical - assignment can happen manually
      logger.warn('Failed to auto-assign analysis', {
        error: error.message,
        analysisId,
      });
    }
  }

  async updateAgronomistCredits(agronomistId, creditsEarned) {
    const current = await db.get(
      'SELECT * FROM agronomist_credits WHERE agronomist_id = ?',
      [agronomistId],
    );

    if (current) {
      const newBalance = current.current_balance + creditsEarned;
      const newLevel = this.calculateLevel(current.credits_earned + creditsEarned);
      
      await db.run(`
        UPDATE agronomist_credits 
        SET credits_earned = credits_earned + ?, 
            current_balance = ?,
            level = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE agronomist_id = ?
      `, [creditsEarned, newBalance, newLevel, agronomistId]);
    } else {
      await db.run(`
        INSERT INTO agronomist_credits (
          agronomist_id, credits_earned, current_balance, level
        ) VALUES (?, ?, ?, ?)
      `, [agronomistId, creditsEarned, creditsEarned, 'bronze']);
    }
  }

  calculateLevel(totalCredits) {
    if (totalCredits >= 1000) {return 'platinum';}
    if (totalCredits >= 500) {return 'gold';}
    if (totalCredits >= 100) {return 'silver';}
    return 'bronze';
  }

  updateMetrics(reviewTime, approved) {
    this.metrics.totalReviews++;
    this.metrics.avgReviewTime = (this.metrics.avgReviewTime * (this.metrics.totalReviews - 1) + reviewTime) / this.metrics.totalReviews;
    
    if (approved) {
      this.metrics.approvalRate = ((this.metrics.approvalRate * (this.metrics.totalReviews - 1)) + 100) / this.metrics.totalReviews;
    } else {
      this.metrics.expertCorrections++;
      this.metrics.approvalRate = (this.metrics.approvalRate * (this.metrics.totalReviews - 1)) / this.metrics.totalReviews;
    }
  }

  getServiceMetrics() {
    return {
      ...this.metrics,
      activeReviews: this.reviewQueue.size,
    };
  }
}

module.exports = AgronomistService;