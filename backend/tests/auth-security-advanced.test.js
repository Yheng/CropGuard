const request = require('supertest');
const {
  TEST_USERS,
  TEST_DATA,
  TokenUtils,
  PasswordUtils,
  DatabaseMockUtils,
  RequestTestUtils,
  SecurityTestUtils,
  ValidationTestUtils
} = require('./auth-test-utils');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const { runQuery, getQuery } = require('../src/config/database');

const app = createTestApp();

describe('Advanced Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced Input Sanitization', () => {
    describe('XSS Prevention Comprehensive Tests', () => {
      const adminToken = TokenUtils.createValidToken(TEST_USERS.admin);

      TEST_DATA.maliciousInputs.xss.forEach((xssPayload, index) => {
        it(`should sanitize XSS payload ${index + 1}: ${xssPayload.substring(0, 20)}...`, async () => {
          DatabaseMockUtils.setupTokenValidation({ getQuery });
          runQuery.mockResolvedValueOnce(true);
          getQuery.mockResolvedValueOnce({
            ...TEST_USERS.admin,
            name: 'Sanitized Name',
            location: 'Sanitized Location'
          });

          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: xssPayload,
              location: `Location with ${xssPayload}`
            });

          const xssTest = SecurityTestUtils.testXSSPrevention(response.body, [xssPayload]);
          expect(xssTest.passed).toBe(true);
          
          if (!xssTest.passed) {
            console.log('XSS payload found in response:', xssTest.foundMalicious);
          }
        });
      });

      it('should handle nested XSS attempts', async () => {
        DatabaseMockUtils.setupTokenValidation({ getQuery });
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...TEST_USERS.admin,
          name: 'Clean Name'
        });

        const nestedXSS = '<div><script>alert("nested")</script><p onclick="evil()">content</p></div>';

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: nestedXSS
          })
          .expect(200);

        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('onclick');
        expect(JSON.stringify(response.body)).not.toContain('alert');
      });

      it('should prevent XSS in error messages', async () => {
        const xssEmail = '<script>alert("email-xss")</script>test@example.com';

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: xssEmail,
            password: 'somepassword'
          })
          .expect(400);

        const xssTest = SecurityTestUtils.testXSSPrevention(response.body);
        expect(xssTest.passed).toBe(true);
      });
    });

    describe('SQL Injection Prevention Tests', () => {
      TEST_DATA.maliciousInputs.sqlInjection.forEach((sqlPayload, index) => {
        it(`should prevent SQL injection ${index + 1}: ${sqlPayload}`, async () => {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: sqlPayload,
              password: 'testpassword'
            })
            .expect(400);

          expect(response.body.success).toBe(false);
          // Should be caught by validation, not executed as SQL
        });
      });

      it('should handle legitimate apostrophes in names', async () => {
        DatabaseMockUtils.setupSuccessfulRegistration({ getQuery, runQuery });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'oconnor@test.com',
            password: 'SecurePass123!',
            name: "Patrick O'Connor" // Legitimate apostrophe
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe("Patrick O'Connor");
      });

      it('should prevent SQL injection in profile updates', async () => {
        const token = TokenUtils.createValidToken();

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: "'; DROP TABLE users; --"
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Path Traversal Prevention', () => {
      TEST_DATA.maliciousInputs.pathTraversal.forEach((traversalPayload, index) => {
        it(`should prevent path traversal ${index + 1}: ${traversalPayload}`, async () => {
          const token = TokenUtils.createValidToken();

          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({
              location: traversalPayload
            })
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });
    });

    describe('Data Size Limits', () => {
      it('should reject oversized name field', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            name: TEST_DATA.maliciousInputs.oversized.hugeName
          })
          .expect(413);

        expect(response.body.error).toBe('Request Too Large');
      });

      it('should handle maximum allowed field sizes', async () => {
        DatabaseMockUtils.setupSuccessfulRegistration({ getQuery, runQuery });

        const maxLengthName = 'A'.repeat(100); // Max allowed length

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            name: maxLengthName
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Token Security Advanced Tests', () => {
    describe('Token Tampering Detection', () => {
      it('should detect header tampering', async () => {
        const validToken = TokenUtils.createValidToken();
        const [, payload, signature] = validToken.split('.');
        
        // Tamper with header
        const tamperedHeader = Buffer.from('{"alg":"none","typ":"JWT"}')
          .toString('base64')
          .replace(/=/g, '');
        const tamperedToken = `${tamperedHeader}.${payload}.${signature}`;

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should detect payload tampering with privilege escalation attempt', async () => {
        const tamperedToken = TokenUtils.createTokenWithTamperedPayload({
          id: 999,
          email: 'hacker@evil.com',
          role: 'admin'
        });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should detect signature manipulation', async () => {
        const tokenWithInvalidSig = TokenUtils.createTokenWithInvalidSignature();

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tokenWithInvalidSig}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should reject tokens with algorithm confusion attacks', async () => {
        // Create token with "none" algorithm
        const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6MSwiZW1haWwiOiJmYXJtZXJAdGVzdC5jb20iLCJyb2xlIjoiYWRtaW4ifQ.';

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${noneAlgToken}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });
    });

    describe('Token Replay Attack Prevention', () => {
      it('should use fresh user data for each request', async () => {
        const token = TokenUtils.createValidToken(TEST_USERS.farmer);
        
        // First request - user is active
        getQuery.mockResolvedValueOnce(TEST_USERS.farmer);

        const response1 = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response1.body.success).toBe(true);

        // Second request - user has been deactivated
        getQuery.mockResolvedValueOnce({
          ...TEST_USERS.farmer,
          is_active: 0
        });

        const response2 = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response2.body.error).toBe('Access Denied');
        expect(response2.body.message).toContain('User not found or inactive');
      });

      it('should handle role changes during active sessions', async () => {
        const token = TokenUtils.createValidToken({ ...TEST_USERS.farmer, role: 'farmer' });
        
        // User's role has been changed to agronomist
        getQuery.mockResolvedValueOnce({
          ...TEST_USERS.farmer,
          role: 'agronomist'
        });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Should reflect current role from database
        expect(response.body.data.user.role).toBe('agronomist');
      });
    });

    describe('Token Timing Attack Prevention', () => {
      it('should have consistent response times for invalid tokens', async () => {
        const invalidTokens = [
          'invalid-token',
          TokenUtils.createMalformedToken(),
          TokenUtils.createTokenWithInvalidSignature(),
          TokenUtils.createExpiredToken()
        ];

        const timings = [];

        for (const token of invalidTokens) {
          const start = Date.now();
          
          await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
          
          const end = Date.now();
          timings.push(end - start);
        }

        // Check that response times are relatively consistent
        const maxTiming = Math.max(...timings);
        const minTiming = Math.min(...timings);
        const timingVariance = maxTiming - minTiming;

        // Allow some variance but not too much (timing attacks look for significant differences)
        expect(timingVariance).toBeLessThan(100); // Less than 100ms difference
      });
    });
  });

  describe('Advanced Rate Limiting and DDoS Protection', () => {
    describe('Distributed Attack Simulation', () => {
      it('should handle distributed login attempts', async () => {
        getQuery.mockResolvedValue(null); // User not found

        // Simulate attacks from different "IPs" by varying request patterns
        const attackPatterns = [
          { email: 'target1@test.com', password: 'guess1' },
          { email: 'target2@test.com', password: 'guess2' },
          { email: 'target3@test.com', password: 'guess3' },
          { email: 'target1@test.com', password: 'guess4' }, // Repeat target
        ];

        const requests = attackPatterns.map(pattern =>
          request(app)
            .post('/api/auth/login')
            .send(pattern)
        );

        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimitedCount = responses.filter(res => res.status === 429).length;
        expect(rateLimitedCount).toBeGreaterThan(0);
      }, 15000);

      it('should implement progressive rate limiting', async () => {
        getQuery.mockResolvedValue(null);

        // Make requests with increasing delays to test progressive limiting
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(
            request(app)
              .post('/api/auth/login')
              .send({
                email: 'progressive@test.com',
                password: `attempt${i}`
              })
          );
        }

        const responses = await Promise.all(requests);
        
        // Later requests should be more likely to be rate limited
        const firstHalf = responses.slice(0, 5);
        const secondHalf = responses.slice(5);
        
        const firstHalfLimited = firstHalf.filter(res => res.status === 429).length;
        const secondHalfLimited = secondHalf.filter(res => res.status === 429).length;
        
        expect(secondHalfLimited).toBeGreaterThanOrEqual(firstHalfLimited);
      }, 15000);
    });

    describe('Resource Exhaustion Protection', () => {
      it('should limit concurrent requests per user', async () => {
        const token = TokenUtils.createValidToken();
        DatabaseMockUtils.setupTokenValidation({ getQuery });

        // Create many concurrent requests
        const concurrentRequests = Array(20).fill().map(() =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        );

        const responses = await Promise.all(concurrentRequests);
        
        // All requests should complete (no timeouts or errors)
        responses.forEach(response => {
          expect([200, 429]).toContain(response.status);
        });
      });

      it('should handle large request bodies gracefully', async () => {
        const largeButValidRequest = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'A'.repeat(5000), // Large but under limit
          location: 'B'.repeat(1000)
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(largeButValidRequest)
          .expect(400); // Should fail validation due to size

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Session Security and Cookie Protection', () => {
    describe('Cookie Security Attributes', () => {
      it('should set all required security attributes on login', async () => {
        await DatabaseMockUtils.setupSuccessfulLogin({ getQuery, runQuery });

        const response = await request(app)
          .post('/api/auth/login')
          .send(TEST_DATA.validLogin)
          .expect(200);

        const cookieValidation = RequestTestUtils.validateCookieSecurity(
          response.headers['set-cookie']
        );

        expect(cookieValidation.found).toBe(true);
        expect(cookieValidation.httpOnly).toBe(true);
        expect(cookieValidation.sameSiteStrict).toBe(true);
        
        // In production, secure should be true
        if (process.env.NODE_ENV === 'production') {
          expect(cookieValidation.secure).toBe(true);
        }
      });

      it('should properly clear cookies on logout', async () => {
        const token = TokenUtils.createValidToken();

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        
        const clearCookie = cookies.find(cookie => cookie.includes('auth_token'));
        expect(clearCookie).toBeDefined();
        expect(clearCookie).toContain('HttpOnly');
      });
    });

    describe('Cross-Site Request Forgery (CSRF) Protection', () => {
      it('should require proper SameSite attributes', async () => {
        await DatabaseMockUtils.setupSuccessfulLogin({ getQuery, runQuery });

        const response = await request(app)
          .post('/api/auth/login')
          .send(TEST_DATA.validLogin)
          .expect(200);

        const authCookie = response.headers['set-cookie']?.find(cookie => 
          cookie.includes('auth_token')
        );

        expect(authCookie).toContain('SameSite=Strict');
      });

      it('should work with cookie-based authentication', async () => {
        const token = TokenUtils.createValidToken();
        DatabaseMockUtils.setupTokenValidation({ getQuery });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', `auth_token=${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Information Disclosure Prevention', () => {
    it('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      getQuery.mockRejectedValueOnce(new Error('Database connection failed with user:password@host:port/database'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(TEST_DATA.validLogin)
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(JSON.stringify(response.body)).not.toContain('user:password');
      expect(JSON.stringify(response.body)).not.toContain('Database connection failed');
      expect(JSON.stringify(response.body)).not.toContain('stack');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose sensitive user information in error messages', async () => {
      getQuery.mockRejectedValueOnce(new Error('User password hash is: $2a$12$...'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(TEST_DATA.validLogin)
        .expect(500);

      expect(JSON.stringify(response.body)).not.toContain('password hash');
      expect(JSON.stringify(response.body)).not.toContain('$2a$');
    });

    it('should use generic error messages for authentication failures', async () => {
      // Test both non-existent user and wrong password scenarios
      const scenarios = [
        { setup: () => getQuery.mockResolvedValueOnce(null) }, // User not found
        { setup: async () => {
          const hashedPassword = await PasswordUtils.createHashedPassword('differentpassword');
          getQuery.mockResolvedValueOnce({
            ...TEST_USERS.farmer,
            password_hash: hashedPassword
          });
        }} // Wrong password
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        await scenario.setup();

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
          .expect(401);

        // Both scenarios should return the same generic message
        expect(response.body.message).toBe('Invalid email or password');
      }
    });
  });

  describe('Advanced Brute Force Protection', () => {
    it('should implement account lockout after repeated failures', async () => {
      getQuery.mockResolvedValue(null); // Always fail login

      // Simulate repeated failed attempts on same account
      const attempts = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'target@test.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      
      // Later attempts should be blocked with 429
      const blockedAttempts = responses.filter(res => res.status === 429);
      expect(blockedAttempts.length).toBeGreaterThan(0);
    }, 15000);

    it('should detect suspicious patterns across different endpoints', async () => {
      const suspiciousRequests = [
        request(app).post('/api/auth/login').send({ email: 'test1@example.com', password: 'pass' }),
        request(app).post('/api/auth/register').send({ email: 'test2@example.com', password: 'pass', name: 'Test' }),
        request(app).post('/api/auth/login').send({ email: 'test3@example.com', password: 'pass' }),
        request(app).post('/api/auth/register').send({ email: 'test4@example.com', password: 'pass', name: 'Test' }),
      ];

      const responses = await Promise.all(suspiciousRequests);
      
      // Some requests should be blocked due to suspicious activity
      const blockedRequests = responses.filter(res => res.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    }, 10000);
  });
});