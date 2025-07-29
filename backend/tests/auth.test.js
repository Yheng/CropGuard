const request = require('supertest');

// Mock the database before importing the app
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const { runQuery, getQuery } = require('../src/config/database');

const app = createTestApp();

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock database responses
      getQuery.mockResolvedValueOnce(null); // No existing user
      runQuery.mockResolvedValueOnce({ id: 1 }); // User creation
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'farmer',
        phone: null,
        location: null,
        created_at: new Date().toISOString()
      });

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'farmer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with existing email', async () => {
      getQuery.mockResolvedValueOnce({ id: 1 }); // Existing user

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = '$2a$12$5yGV2pT8WbVU9O5g7k3NxOWJQEh4OKZ6r7WQ8w1jQK2X0sY9eR3S6'; // 'password123' hashed
      
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'farmer',
        phone: null,
        location: null,
        is_active: 1
      });
      runQuery.mockResolvedValueOnce(true); // Update last login

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      getQuery.mockResolvedValueOnce(null); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login for deactivated user', async () => {
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User',
        role: 'farmer',
        is_active: 0
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Create a test token
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'farmer' },
        process.env.JWT_SECRET
      );
    });

    it('should return user profile with valid token', async () => {
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'farmer',
        phone: null,
        location: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        email_verified: 1
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'farmer' },
        process.env.JWT_SECRET
      );
    });

    it('should update user profile successfully', async () => {
      runQuery.mockResolvedValueOnce(true); // Update query
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'farmer',
        phone: '+1234567890',
        location: 'Test Location',
        avatar_url: null,
        updated_at: new Date().toISOString()
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          phone: '+1234567890',
          location: 'Test Location'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Name');
    });

    it('should reject invalid profile data', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A', // Too short
          avatar_url: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'farmer' },
        process.env.JWT_SECRET
      );
    });

    it('should change password successfully', async () => {
      const hashedPassword = '$2a$12$5yGV2pT8WbVU9O5g7k3NxOWJQEh4OKZ6r7WQ8w1jQK2X0sY9eR3S6';
      
      getQuery.mockResolvedValueOnce({ password_hash: hashedPassword });
      runQuery.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject with incorrect current password', async () => {
      const hashedPassword = '$2a$12$differenthash';
      
      getQuery.mockResolvedValueOnce({ password_hash: hashedPassword });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // Mock user not found to trigger quick failures
      getQuery.mockResolvedValue(null);

      // Make multiple requests rapidly
      const requests = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          })
      );

      const responses = await Promise.all(requests);
      
      // Should have some 429 responses after rate limit is hit
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });
});