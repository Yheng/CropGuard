const express = require('express');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get user profile (public info)
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getQuery(`
    SELECT id, name, role, location, created_at
    FROM users 
    WHERE id = ? AND is_active = 1
  `, [req.params.id]);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user },
  });
}));

// Admin: Get all users
router.get('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { role, search } = req.query;

  const whereConditions = ['is_active = 1'];
  const queryParams = [];

  if (role) {
    whereConditions.push('role = ?');
    queryParams.push(role);
  }

  if (search) {
    whereConditions.push('(name LIKE ? OR email LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereConditions.join(' AND ')}`;
  const countResult = await getQuery(countQuery, queryParams);

  // Get users
  const usersQuery = `
    SELECT id, email, name, role, phone, location, created_at, last_login, email_verified
    FROM users 
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const users = await allQuery(usersQuery, [...queryParams, limit, offset]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    },
  });
}));

// Admin: Get user details with statistics
router.get('/:id/details', authenticateToken, requireRole(['admin', 'agronomist']), asyncHandler(async (req, res) => {
  const user = await getQuery(`
    SELECT id, email, name, role, phone, location, avatar_url,
           created_at, last_login, email_verified, is_active
    FROM users WHERE id = ?
  `, [req.params.id]);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get user statistics
  const stats = await Promise.all([
    // Total analyses
    getQuery('SELECT COUNT(*) as total FROM analyses WHERE user_id = ?', [req.params.id]),
    
    // Analyses this month
    getQuery(`
      SELECT COUNT(*) as total FROM analyses 
      WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `, [req.params.id]),
    
    // Treatment plans
    getQuery('SELECT COUNT(*) as total FROM treatment_plans WHERE user_id = ?', [req.params.id]),
    
    // Average confidence
    getQuery('SELECT AVG(confidence) as avg FROM analyses WHERE user_id = ?', [req.params.id]),
    
    // Recent analyses
    allQuery(`
      SELECT id, crop_type, condition, title, confidence, created_at
      FROM analyses 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [req.params.id]),
  ]);

  res.json({
    success: true,
    data: {
      user,
      statistics: {
        totalAnalyses: stats[0].total,
        thisMonthAnalyses: stats[1].total,
        treatmentPlans: stats[2].total,
        avgConfidence: Math.round((stats[3].avg || 0) * 100),
        recentAnalyses: stats[4],
      },
    },
  });
}));

// Admin: Update user
router.put('/:id', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const updateSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('farmer', 'agronomist', 'admin').optional(),
    phone: Joi.string().optional(),
    location: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional(),
  });

  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Check if user exists
  const user = await getQuery('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check for email uniqueness if email is being updated
  if (value.email) {
    const existingUser = await getQuery('SELECT id FROM users WHERE email = ? AND id != ?', [value.email, req.params.id]);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }
  }

  const updates = [];
  const queryParams = [];

  Object.keys(value).forEach(key => {
    const dbKey = key === 'isActive' ? 'is_active' : key === 'emailVerified' ? 'email_verified' : key;
    updates.push(`${dbKey} = ?`);
    queryParams.push(value[key]);
  });

  if (updates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  queryParams.push(req.params.id);

  await runQuery(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `, queryParams);

  // Get updated user
  const updatedUser = await getQuery(`
    SELECT id, email, name, role, phone, location, is_active, email_verified, updated_at
    FROM users WHERE id = ?
  `, [req.params.id]);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser },
  });
}));

// Admin: Deactivate user
router.delete('/:id', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id.toString()) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  const result = await runQuery(`
    UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND role != 'admin'
  `, [req.params.id]);

  if (result.changes === 0) {
    throw new AppError('User not found or cannot be deactivated', 404);
  }

  res.json({
    success: true,
    message: 'User deactivated successfully',
  });
}));

// Get farmers for agronomist review
router.get('/role/farmers', authenticateToken, requireRole(['agronomist', 'admin']), asyncHandler(async (req, res) => {
  const farmers = await allQuery(`
    SELECT u.id, u.name, u.location, u.created_at,
           COUNT(a.id) as total_analyses,
           COUNT(CASE WHEN a.review_status = 'pending' THEN 1 END) as pending_reviews
    FROM users u
    LEFT JOIN analyses a ON u.id = a.user_id
    WHERE u.role = 'farmer' AND u.is_active = 1
    GROUP BY u.id, u.name, u.location, u.created_at
    ORDER BY pending_reviews DESC, total_analyses DESC
  `, []);

  res.json({
    success: true,
    data: { farmers },
  });
}));

// Get agronomists list
router.get('/role/agronomists', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const agronomists = await allQuery(`
    SELECT u.id, u.name, u.email, u.location, u.created_at,
           COUNT(a.id) as reviews_completed
    FROM users u
    LEFT JOIN analyses a ON u.id = a.reviewed_by
    WHERE u.role = 'agronomist' AND u.is_active = 1
    GROUP BY u.id, u.name, u.email, u.location, u.created_at
    ORDER BY reviews_completed DESC
  `, []);

  res.json({
    success: true,
    data: { agronomists },
  });
}));

// Get user activity log (simplified)
router.get('/:id/activity', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await getQuery('SELECT COUNT(*) as total FROM api_usage WHERE user_id = ?', [req.params.id]);

  // Get activity log
  const activities = await allQuery(`
    SELECT endpoint, method, status_code, created_at
    FROM api_usage 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [req.params.id, limit, offset]);

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    },
  });
}));

module.exports = router;