const { logger, appLogger } = require('../../middleware/logger');
const { runQuery, getQuery, allQuery } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

/**
 * AI Feedback Collector - Collects user feedback for model improvement
 * This system helps improve AI accuracy over time through expert validation
 */
class FeedbackCollector {
  constructor() {
    this.feedbackTypes = {
      CORRECT: 'correct',
      INCORRECT: 'incorrect',
      PARTIAL: 'partial',
      UNCERTAIN: 'uncertain'
    };

    this.expertRoles = ['agronomist', 'admin'];
    this.initialize();
  }

  /**
   * Initialize feedback collection system
   */
  async initialize() {
    try {
      await this.ensureFeedbackTables();
      logger.info('AI Feedback Collector initialized', {
        category: 'ai-feedback'
      });
    } catch (error) {
      logger.error('Failed to initialize AI Feedback Collector', {
        category: 'ai-feedback',
        error: error.message
      });
    }
  }

  /**
   * Ensure feedback tables exist
   */
  async ensureFeedbackTables() {
    const createFeedbackTable = `
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        feedback_type TEXT NOT NULL,
        correct_condition TEXT,
        correct_title TEXT,
        correct_description TEXT,
        correct_severity TEXT,
        confidence_rating INTEGER,
        notes TEXT,
        expert_validation BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES analyses (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    const createTrainingDataTable = `
      CREATE TABLE IF NOT EXISTS ai_training_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_path TEXT NOT NULL,
        image_hash TEXT UNIQUE NOT NULL,
        ground_truth_condition TEXT NOT NULL,
        ground_truth_title TEXT,
        ground_truth_description TEXT,
        ground_truth_severity TEXT,
        crop_type TEXT,
        validation_level TEXT DEFAULT 'expert',
        validated_by INTEGER,
        confidence_score REAL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (validated_by) REFERENCES users (id)
      )
    `;

    const createModelPerformanceTable = `
      CREATE TABLE IF NOT EXISTS ai_model_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_provider TEXT NOT NULL,
        model_version TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        false_positives INTEGER DEFAULT 0,
        false_negatives INTEGER DEFAULT 0,
        average_confidence REAL,
        accuracy_rate REAL,
        precision_rate REAL,
        recall_rate REAL,
        f1_score REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await runQuery(createFeedbackTable);
    await runQuery(createTrainingDataTable);
    await runQuery(createModelPerformanceTable);
  }

  /**
   * Collect user feedback on an AI analysis
   */
  async collectFeedback(analysisId, userId, feedbackData) {
    try {
      const {
        feedbackType,
        correctCondition,
        correctTitle,
        correctDescription,
        correctSeverity,
        confidenceRating,
        notes
      } = feedbackData;

      // Validate feedback type
      if (!Object.values(this.feedbackTypes).includes(feedbackType)) {
        throw new AppError('Invalid feedback type', 400);
      }

      // Get user role to determine if this is expert validation
      const user = await getQuery('SELECT role FROM users WHERE id = ?', [userId]);
      const isExpert = this.expertRoles.includes(user?.role);

      // Store feedback
      const result = await runQuery(`
        INSERT INTO ai_feedback (
          analysis_id, user_id, feedback_type, correct_condition,
          correct_title, correct_description, correct_severity,
          confidence_rating, notes, expert_validation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        analysisId, userId, feedbackType, correctCondition,
        correctTitle, correctDescription, correctSeverity,
        confidenceRating, notes, isExpert
      ]);

      // If this is incorrect feedback from an expert, add to training data
      if (isExpert && feedbackType === this.feedbackTypes.INCORRECT && correctCondition) {
        await this.addToTrainingData(analysisId, userId, {
          condition: correctCondition,
          title: correctTitle,
          description: correctDescription,
          severity: correctSeverity
        });
      }

      // Update model performance metrics
      await this.updateModelPerformance(analysisId, feedbackType, isExpert);

      logger.info('AI feedback collected', {
        category: 'ai-feedback',
        analysisId,
        userId,
        feedbackType,
        isExpert
      });

      appLogger.userAction('ai_feedback_submitted', {
        analysisId,
        feedbackType,
        expertValidation: isExpert
      }, userId);

      return result.id;
    } catch (error) {
      logger.error('Failed to collect AI feedback', {
        category: 'ai-feedback',
        error: error.message,
        analysisId,
        userId
      });
      throw error;
    }
  }

  /**
   * Add validated data to training dataset
   */
  async addToTrainingData(analysisId, validatedBy, groundTruth) {
    try {
      // Get analysis details
      const analysis = await getQuery(`
        SELECT image_path, crop_type, metadata
        FROM analyses WHERE id = ?
      `, [analysisId]);

      if (!analysis) {
        throw new AppError('Analysis not found', 404);
      }

      // Generate image hash for deduplication
      const crypto = require('crypto');
      const fs = require('fs').promises;
      
      let imageHash;
      try {
        const imageBuffer = await fs.readFile(analysis.image_path);
        imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      } catch (error) {
        // Fallback hash if file not accessible
        imageHash = crypto.createHash('sha256').update(analysis.image_path + Date.now()).digest('hex');
      }

      // Check if this image is already in training data
      const existing = await getQuery('SELECT id FROM ai_training_data WHERE image_hash = ?', [imageHash]);
      if (existing) {
        // Update existing record
        await runQuery(`
          UPDATE ai_training_data SET
            ground_truth_condition = ?, ground_truth_title = ?,
            ground_truth_description = ?, ground_truth_severity = ?,
            validated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE image_hash = ?
        `, [
          groundTruth.condition, groundTruth.title,
          groundTruth.description, groundTruth.severity,
          validatedBy, imageHash
        ]);
      } else {
        // Insert new training record
        await runQuery(`
          INSERT INTO ai_training_data (
            image_path, image_hash, ground_truth_condition,
            ground_truth_title, ground_truth_description, ground_truth_severity,
            crop_type, validated_by, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          analysis.image_path, imageHash, groundTruth.condition,
          groundTruth.title, groundTruth.description, groundTruth.severity,
          analysis.crop_type, validatedBy, analysis.metadata
        ]);
      }

      logger.info('Added to AI training data', {
        category: 'ai-feedback',
        analysisId,
        imageHash: imageHash.substring(0, 16) + '...',
        groundTruthCondition: groundTruth.condition
      });

    } catch (error) {
      logger.error('Failed to add to training data', {
        category: 'ai-feedback',
        error: error.message,
        analysisId
      });
    }
  }

  /**
   * Update model performance metrics
   */
  async updateModelPerformance(analysisId, feedbackType, isExpert) {
    try {
      if (!isExpert) {
        return; // Only use expert feedback for performance metrics
      }

      // Get analysis details
      const analysis = await getQuery(`
        SELECT ai_model_version, condition, confidence, metadata
        FROM analyses WHERE id = ?
      `, [analysisId]);

      if (!analysis) {
        return;
      }

      const modelProvider = analysis.ai_model_version || 'unknown';
      const conditionType = analysis.condition;

      // Get or create performance record
      let performance = await getQuery(`
        SELECT * FROM ai_model_performance 
        WHERE model_provider = ? AND condition_type = ?
      `, [modelProvider, conditionType]);

      if (!performance) {
        await runQuery(`
          INSERT INTO ai_model_performance (
            model_provider, model_version, condition_type,
            total_predictions, correct_predictions, false_positives, false_negatives
          ) VALUES (?, ?, ?, 0, 0, 0, 0)
        `, [modelProvider, analysis.ai_model_version || '1.0.0', conditionType]);

        performance = { total_predictions: 0, correct_predictions: 0, false_positives: 0, false_negatives: 0 };
      }

      // Update metrics based on feedback
      let correctIncrement = 0;
      let falsePositiveIncrement = 0;
      let falseNegativeIncrement = 0;

      switch (feedbackType) {
        case this.feedbackTypes.CORRECT:
          correctIncrement = 1;
          break;
        case this.feedbackTypes.INCORRECT:
          // This would need more sophisticated logic to determine if it's FP or FN
          falsePositiveIncrement = 1;
          break;
        case this.feedbackTypes.PARTIAL:
          correctIncrement = 0.5; // Partial credit
          break;
      }

      // Update performance record
      const newTotal = performance.total_predictions + 1;
      const newCorrect = performance.correct_predictions + correctIncrement;
      const newFP = performance.false_positives + falsePositiveIncrement;
      const newFN = performance.false_negatives + falseNegativeIncrement;

      const accuracy = newTotal > 0 ? (newCorrect / newTotal) : 0;
      const precision = (newCorrect + newFP) > 0 ? (newCorrect / (newCorrect + newFP)) : 0;
      const recall = (newCorrect + newFN) > 0 ? (newCorrect / (newCorrect + newFN)) : 0;
      const f1Score = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

      await runQuery(`
        UPDATE ai_model_performance SET
          total_predictions = ?, correct_predictions = ?,
          false_positives = ?, false_negatives = ?,
          accuracy_rate = ?, precision_rate = ?, recall_rate = ?, f1_score = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE model_provider = ? AND condition_type = ?
      `, [
        newTotal, newCorrect, newFP, newFN,
        accuracy, precision, recall, f1Score,
        modelProvider, conditionType
      ]);

      logger.debug('Updated model performance metrics', {
        category: 'ai-feedback',
        modelProvider,
        conditionType,
        accuracy: accuracy.toFixed(3),
        precision: precision.toFixed(3),
        recall: recall.toFixed(3),
        f1Score: f1Score.toFixed(3)
      });

    } catch (error) {
      logger.error('Failed to update model performance', {
        category: 'ai-feedback',
        error: error.message,
        analysisId
      });
    }
  }

  /**
   * Get feedback statistics for an analysis
   */
  async getFeedbackStats(analysisId) {
    try {
      const stats = await allQuery(`
        SELECT feedback_type, COUNT(*) as count,
               AVG(confidence_rating) as avg_confidence,
               COUNT(CASE WHEN expert_validation = 1 THEN 1 END) as expert_count
        FROM ai_feedback 
        WHERE analysis_id = ?
        GROUP BY feedback_type
      `, [analysisId]);

      return {
        analysisId,
        totalFeedback: stats.reduce((sum, stat) => sum + stat.count, 0),
        feedbackBreakdown: stats,
        expertValidations: stats.reduce((sum, stat) => sum + stat.expert_count, 0)
      };
    } catch (error) {
      logger.error('Failed to get feedback stats', {
        category: 'ai-feedback',
        error: error.message,
        analysisId
      });
      return null;
    }
  }

  /**
   * Get model performance report
   */
  async getPerformanceReport(modelProvider = null) {
    try {
      let query = 'SELECT * FROM ai_model_performance';
      let params = [];

      if (modelProvider) {
        query += ' WHERE model_provider = ?';
        params.push(modelProvider);
      }

      query += ' ORDER BY last_updated DESC';

      const performance = await allQuery(query, params);

      // Calculate overall metrics
      const overall = performance.reduce((acc, perf) => {
        acc.totalPredictions += perf.total_predictions;
        acc.correctPredictions += perf.correct_predictions;
        acc.falsePositives += perf.false_positives;
        acc.falseNegatives += perf.false_negatives;
        return acc;
      }, { totalPredictions: 0, correctPredictions: 0, falsePositives: 0, falseNegatives: 0 });

      const overallAccuracy = overall.totalPredictions > 0 ? 
        (overall.correctPredictions / overall.totalPredictions) : 0;

      return {
        modelProvider: modelProvider || 'all',
        overall: {
          ...overall,
          accuracy: overallAccuracy,
          conditionsTracked: performance.length
        },
        byCondition: performance,
        reportGeneratedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to generate performance report', {
        category: 'ai-feedback',
        error: error.message,
        modelProvider
      });
      throw error;
    }
  }

  /**
   * Export training data for model retraining
   */
  async exportTrainingData(filters = {}) {
    try {
      let query = `
        SELECT td.*, u.name as validator_name
        FROM ai_training_data td
        LEFT JOIN users u ON td.validated_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.conditionType) {
        query += ' AND td.ground_truth_condition = ?';
        params.push(filters.conditionType);
      }

      if (filters.cropType) {
        query += ' AND td.crop_type = ?';
        params.push(filters.cropType);
      }

      if (filters.validationLevel) {
        query += ' AND td.validation_level = ?';
        params.push(filters.validationLevel);
      }

      if (filters.fromDate) {
        query += ' AND td.created_at >= ?';
        params.push(filters.fromDate);
      }

      query += ' ORDER BY td.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const trainingData = await allQuery(query, params);

      logger.info('Training data exported', {
        category: 'ai-feedback',
        recordCount: trainingData.length,
        filters
      });

      return {
        data: trainingData,
        count: trainingData.length,
        filters,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to export training data', {
        category: 'ai-feedback',
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get feedback trends over time
   */
  async getFeedbackTrends(days = 30) {
    try {
      const trends = await allQuery(`
        SELECT 
          DATE(created_at) as date,
          feedback_type,
          COUNT(*) as count,
          AVG(confidence_rating) as avg_confidence
        FROM ai_feedback 
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at), feedback_type
        ORDER BY date DESC
      `);

      return {
        period: `${days} days`,
        trends,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get feedback trends', {
        category: 'ai-feedback',
        error: error.message,
        days
      });
      throw error;
    }
  }
}

module.exports = FeedbackCollector;