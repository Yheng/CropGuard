const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { runQuery, getQuery } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('farmer', 'agronomist').default('farmer'),
  phone: Joi.string().optional(),
  location: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password, name, role, phone, location } = value;

  // Check if user already exists
  const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await runQuery(`
    INSERT INTO users (email, password_hash, name, role, phone, location, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [email, passwordHash, name, role, phone || null, location || null]);

  // Get created user
  const user = await getQuery(`
    SELECT id, email, name, role, phone, location, created_at 
    FROM users WHERE id = ?
  `, [result.id]);

  // Generate token
  const token = generateToken(user);

  // Update last login
  await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        createdAt: user.created_at
      },
      token
    }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = value;

  // Get user by email
  const user = await getQuery(`
    SELECT id, email, password_hash, name, role, phone, location, is_active 
    FROM users WHERE email = ?
  `, [email]);

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate token
  const token = generateToken(user);

  // Update last login
  await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location
      },
      token
    }
  });
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getQuery(`
    SELECT id, email, name, role, phone, location, avatar_url, 
           created_at, last_login, email_verified
    FROM users WHERE id = ?
  `, [req.user.id]);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        emailVerified: user.email_verified
      }
    }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const updateSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().optional(),
    location: Joi.string().optional(),
    avatar_url: Joi.string().uri().optional()
  });

  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const updates = [];
  const values = [];

  Object.keys(value).forEach(key => {
    updates.push(`${key} = ?`);
    values.push(value[key]);
  });

  if (updates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.user.id);

  await runQuery(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `, values);

  // Get updated user
  const user = await getQuery(`
    SELECT id, email, name, role, phone, location, avatar_url, updated_at
    FROM users WHERE id = ?
  `, [req.user.id]);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// Change password
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { currentPassword, newPassword } = value;

  // Get current password hash
  const user = await getQuery('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await runQuery(`
    UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [newPasswordHash, req.user.id]);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout (for token blacklisting in future)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // For now, just send success response
  // In production, you might want to implement token blacklisting
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

module.exports = router;