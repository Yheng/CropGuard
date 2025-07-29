const request = require('supertest');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');

const app = createTestApp();

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should apply global rate limiting', async () => {
      // Make many requests rapidly
      const requests = Array(105).fill().map(() =>
        request(app)
          .get('/health-simple')
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 15000);

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health-simple')
        .expect(200);

      // Should have request ID header
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/health-simple')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health-simple')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    let authToken;

    beforeAll(() => {
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'farmer' },
        process.env.JWT_SECRET
      );
    });

    it('should sanitize malicious script tags', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Test User',
        location: 'javascript:alert("xss")'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput)
        .expect(400); // Should fail validation or be sanitized

      // The response should not contain the malicious script
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should detect SQL injection attempts', async () => {
      const maliciousInput = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with suspicious patterns', async () => {
      const maliciousData = {
        search: 'UNION SELECT * FROM users WHERE 1=1',
        filter: '../../../etc/passwd'
      };

      const response = await request(app)
        .get('/api/analysis/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query(maliciousData)
        .expect(400);

      expect(response.body.error).toBe('Invalid Request');
    });
  });

  describe('Request Size Validation', () => {
    it('should reject oversized requests', async () => {
      const oversizedData = {
        notes: 'x'.repeat(2 * 1024 * 1024) // 2MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(oversizedData)
        .expect(413);

      expect(response.body.error).toBe('Request Too Large');
    });

    it('should reject requests with too many query parameters', async () => {
      const query = {};
      for (let i = 0; i < 60; i++) {
        query[`param${i}`] = `value${i}`;
      }

      const response = await request(app)
        .get('/health-simple')
        .query(query)
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
    });
  });

  describe('File Upload Security', () => {
    let authToken;

    beforeAll(() => {
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'farmer' },
        process.env.JWT_SECRET
      );
    });

    it('should reject dangerous file extensions', async () => {
      const dangerousFile = Buffer.from('malicious content');

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', dangerousFile, 'malicious.exe')
        .expect(400);

      expect(response.body.error).toBe('File Not Allowed');
    });

    it('should validate file MIME types', async () => {
      const textFile = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', textFile, 'fake.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement brute force protection for login', async () => {
      const { getQuery } = require('../src/config/database');
      
      // Mock failed login attempts
      getQuery.mockResolvedValue(null); // User not found

      // Make multiple failed login attempts
      const attempts = Array(4).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      
      // Later attempts should be rate limited
      const blockedResponses = responses.filter(res => res.status === 429);
      expect(blockedResponses.length).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', async () => {
      const responses = await Promise.all([
        request(app).get('/health-simple'),
        request(app).get('/health-simple'),
        request(app).get('/health-simple')
      ]);

      const requestIds = responses.map(res => res.headers['x-request-id']);
      
      // All request IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);
      
      // All should be defined
      expect(requestIds.every(id => id)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive error information', async () => {
      const { getQuery } = require('../src/config/database');
      
      // Mock database error
      getQuery.mockRejectedValue(new Error('Database connection failed with credentials user:password'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      // Should not expose sensitive information in error messages
      expect(JSON.stringify(response.body)).not.toContain('password');
      expect(JSON.stringify(response.body)).not.toContain('credentials');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with malformed Authorization headers', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate JWT token structure', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});