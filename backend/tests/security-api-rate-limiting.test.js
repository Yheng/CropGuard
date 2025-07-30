const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const app = createTestApp();

describe('API Security and Rate Limiting Bypass Tests', () => {
  let authToken, adminToken, farmerToken, agronomistToken;

  beforeAll(() => {
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

    farmerToken = jwt.sign(
      { id: 3, email: 'farmer@example.com', role: 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    agronomistToken = jwt.sign(
      { id: 4, email: 'agronomist@example.com', role: 'agronomist' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting Bypass Attempts', () => {
    describe('IP-based Rate Limiting Bypass', () => {
      it('should not bypass rate limiting with X-Forwarded-For header manipulation', async () => {
        const requests = [];
        
        // Generate requests with different X-Forwarded-For headers
        for (let i = 0; i < 110; i++) {
          requests.push(
            request(app)
              .get('/health-simple')
              .set('X-Forwarded-For', `192.168.1.${i % 255}`)
          );
        }

        const responses = await Promise.allSettled(requests);
        
        // Some requests should still be rate limited despite header manipulation
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 20000);

      it('should not bypass rate limiting with X-Real-IP header manipulation', async () => {
        const requests = [];
        
        for (let i = 0; i < 110; i++) {
          requests.push(
            request(app)
              .get('/health-simple')
              .set('X-Real-IP', `10.0.0.${i % 255}`)
              .set('X-Forwarded-For', `203.0.113.${i % 255}`)
          );
        }

        const responses = await Promise.allSettled(requests);
        
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 20000);

      it('should not bypass rate limiting with multiple proxy headers', async () => {
        const proxyHeaders = [
          'X-Forwarded-For',
          'X-Real-IP',
          'X-Client-IP',
          'X-Cluster-Client-IP',
          'Forwarded-For',
          'Forwarded',
          'Via'
        ];

        const requests = [];
        
        for (let i = 0; i < 110; i++) {
          const req = request(app).get('/health-simple');
          
          // Add multiple conflicting proxy headers
          proxyHeaders.forEach((header, index) => {
            req.set(header, `192.168.${index}.${i % 255}`);
          });
          
          requests.push(req);
        }

        const responses = await Promise.allSettled(requests);
        
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 20000);
    });

    describe('User-Agent Based Bypass Attempts', () => {
      it('should not exempt requests based on User-Agent spoofing', async () => {
        const spoofedUserAgents = [
          'GoogleBot/2.1 (+http://www.google.com/bot.html)',
          'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Twitterbot/1.0',
          'LinkedInBot/1.0',
          'WhatsApp/2.21.23.20',
          'curl/7.68.0',
          'PostmanRuntime/7.26.8',
          'axios/0.21.1',
          'node-fetch/2.6.1'
        ];

        for (const userAgent of spoofedUserAgents) {
          const requests = Array(110).fill().map(() =>
            request(app)
              .get('/health-simple')
              .set('User-Agent', userAgent)
          );

          const responses = await Promise.allSettled(requests);
          
          const rateLimited = responses.filter(result => 
            result.status === 'fulfilled' && result.value.status === 429
          );
          
          expect(rateLimited.length).toBeGreaterThan(0);
        }
      }, 30000);
    });

    describe('Authentication Bypass in Rate Limiting', () => {
      it('should apply rate limiting to authenticated requests', async () => {
        const requests = Array(110).fill().map(() =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`)
        );

        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          role: 'farmer',
          is_active: 1
        });

        const responses = await Promise.allSettled(requests);
        
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 20000);

      it('should not bypass auth endpoint rate limiting with valid tokens', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue(null); // User not found for failed login

        const requests = Array(10).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );

        const responses = await Promise.all(requests);
        
        const rateLimited = responses.filter(res => res.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 15000);
    });

    describe('Distributed Attack Simulation', () => {
      it('should handle distributed brute force attempts', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue(null);

        const ipRanges = [
          '192.168.1.',
          '10.0.0.',
          '172.16.',
          '203.0.113.',
          '198.51.100.'
        ];

        const requests = [];
        
        // Simulate attacks from different IP ranges
        for (let range of ipRanges) {
          for (let i = 1; i <= 20; i++) {
            requests.push(
              request(app)
                .post('/api/auth/login')
                .set('X-Forwarded-For', `${range}${i}`)
                .send({
                  email: 'admin@example.com',
                  password: `password${i}`
                })
            );
          }
        }

        const responses = await Promise.allSettled(requests);
        
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        // Should rate limit even distributed attacks
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 25000);
    });
  });

  describe('API Endpoint Security Validation', () => {
    describe('Endpoint Enumeration Prevention', () => {
      it('should not expose internal endpoints to unauthorized users', async () => {
        const internalEndpoints = [
          '/api/admin/users',
          '/api/admin/logs',
          '/api/admin/config',
          '/api/admin/stats',
          '/api/internal/health',
          '/api/internal/metrics',
          '/api/debug/info',
          '/api/debug/routes',
          '/api/system/status',
          '/api/system/config'
        ];

        for (const endpoint of internalEndpoints) {
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`);

          expect([401, 403, 404]).toContain(response.status);
        }
      });

      it('should prevent HTTP method tampering', async () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        
        for (const method of methods) {
          const response = await request(app)
            [method.toLowerCase()]('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`);

          // Only GET should be allowed for this endpoint
          if (method !== 'GET') {
            expect([405, 404]).toContain(response.status);
          }
        }
      });

      it('should handle HTTP verb tampering attempts', async () => {
        const response = await request(app)
          .post('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-HTTP-Method-Override', 'GET');

        // Should not allow method override for security-sensitive endpoints
        expect([405, 404]).toContain(response.status);
      });
    });

    describe('Parameter Pollution Prevention', () => {
      it('should handle HTTP parameter pollution properly', async () => {
        const response = await request(app)
          .get('/api/analysis/history')
          .set('Authorization', `Bearer ${authToken}`)
          .query('filter=safe&filter=malicious&filter=dangerous');

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          // Should use first or last parameter, not concatenate
          expect(response.body).toBeDefined();
        }
      });

      it('should prevent parameter pollution in POST bodies', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send('email=test@example.com&email=admin@example.com&password=test123')
          .set('Content-Type', 'application/x-www-form-urlencoded');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Content-Type Validation', () => {
      it('should validate Content-Type headers strictly', async () => {
        const maliciousContentTypes = [
          'application/json; charset=utf-7',
          'text/html',
          'application/xml',
          'multipart/form-data; boundary=--',
          'application/x-www-form-urlencoded; charset=utf-7',
          'text/plain; charset=iso-2022-jp',
          'application/octet-stream'
        ];

        for (const contentType of maliciousContentTypes) {
          const response = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', contentType)
            .send('{"email":"test@example.com","password":"test123"}');

          if (contentType !== 'application/json') {
            expect([400, 415]).toContain(response.status);
          }
        }
      });

      it('should prevent MIME type confusion attacks', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'image/jpeg')
          .send('{"malicious": "json", "disguised": "as image"}');

        expect([400, 415]).toContain(response.status);
      });
    });
  });

  describe('CORS Security Validation', () => {
    describe('CORS Policy Bypass Attempts', () => {
      it('should not allow arbitrary origins', async () => {
        const maliciousOrigins = [
          'http://evil.com',
          'https://attacker.net',
          'http://localhost:3000.evil.com',
          'https://cropguard.com.evil.com',
          'null',
          'file://',
          'data:text/html,<script>alert(1)</script>',
          'javascript:alert(1)'
        ];

        for (const origin of maliciousOrigins) {
          const response = await request(app)
            .options('/api/auth/login')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'POST');

          if (response.headers['access-control-allow-origin']) {
            expect(response.headers['access-control-allow-origin']).not.toBe(origin);
          }
        }
      });

      it('should validate preflight requests properly', async () => {
        const response = await request(app)
          .options('/api/auth/login')
          .set('Origin', 'http://evil.com')
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Evil-Header');

        // Should not allow evil headers
        const allowedHeaders = response.headers['access-control-allow-headers'];
        if (allowedHeaders) {
          expect(allowedHeaders.toLowerCase()).not.toContain('x-evil-header');
        }
      });

      it('should prevent CORS bypass with subdomain wildcards', async () => {
        const subdomainAttempts = [
          'http://evil.cropguard.com',
          'https://admin.cropguard.com.evil.com',
          'http://api.cropguard.com.attacker.net',
          'https://cropguard.com.evil.org'
        ];

        for (const origin of subdomainAttempts) {
          const response = await request(app)
            .get('/api/health-simple')
            .set('Origin', origin);

          if (response.headers['access-control-allow-origin']) {
            expect(response.headers['access-control-allow-origin']).not.toBe(origin);
          }
        }
      });
    });

    describe('CORS Credentials Handling', () => {
      it('should handle credentials properly with CORS', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Origin', 'http://localhost:3000')
          .set('Authorization', `Bearer ${authToken}`);

        // If CORS is enabled, credentials should be handled securely
        const allowCredentials = response.headers['access-control-allow-credentials'];
        if (allowCredentials === 'true') {
          // Should not use wildcard origin when allowing credentials
          expect(response.headers['access-control-allow-origin']).not.toBe('*');
        }
      });
    });
  });

  describe('API Error Information Disclosure', () => {
    describe('Error Message Analysis', () => {
      it('should not expose sensitive information in error responses', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockRejectedValue(new Error('Connection failed: user:password@localhost:5432/cropguard_dev'));

        const response = await request(app)
          .get('/health')
          .expect(503);

        const responseBody = JSON.stringify(response.body);
        
        // Should not expose database credentials or internal paths
        expect(responseBody).not.toContain('password');
        expect(responseBody).not.toContain('localhost:5432');
        expect(responseBody).not.toContain('cropguard_dev');
        expect(responseBody).not.toContain('Connection failed');
      });

      it('should not expose stack traces in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const { getQuery } = require('../src/config/database');
        getQuery.mockRejectedValue(new Error('Database error with sensitive info'));

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.stack).toBeUndefined();
        expect(response.body.trace).toBeUndefined();
        
        process.env.NODE_ENV = originalEnv;
      });

      it('should not expose internal server paths', async () => {
        // Try to cause a file not found error
        const response = await request(app)
          .get('/api/analysis/download/nonexistent.jpg')
          .set('Authorization', `Bearer ${authToken}`);

        const responseBody = JSON.stringify(response.body);
        
        // Should not expose server file paths
        expect(responseBody).not.toMatch(/\/home\/.*\/.*\.js/);
        expect(responseBody).not.toMatch(/C:\\.*\\.*\.js/);
        expect(responseBody).not.toMatch(/\/var\/www\/.*\.js/);
      });
    });

    describe('Debug Information Leakage', () => {
      it('should not expose server software versions', async () => {
        const response = await request(app)
          .get('/health-simple');

        expect(response.headers['server']).toBeUndefined();
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['x-express-version']).toBeUndefined();
      });

      it('should not expose debug endpoints in production', async () => {
        const debugEndpoints = [
          '/api/debug',
          '/api/debug/info',
          '/api/debug/config',
          '/api/debug/env',
          '/api/debug/routes',
          '/debug',
          '/.env',
          '/package.json',
          '/node_modules'
        ];

        for (const endpoint of debugEndpoints) {
          const response = await request(app)
            .get(endpoint);

          expect([404, 403]).toContain(response.status);
        }
      });
    });
  });

  describe('API Versioning Security', () => {
    describe('Version Confusion Attacks', () => {
      it('should handle API version manipulation securely', async () => {
        const versionHeaders = [
          'API-Version: v999',
          'Accept-Version: ../../../etc/passwd',
          'Version: <script>alert(1)</script>',
          'API-Version: null',
          'Accept-Version: undefined'
        ];

        for (const header of versionHeaders) {
          const [name, value] = header.split(': ');
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`)
            .set(name, value);

          expect([200, 400, 404]).toContain(response.status);
        }
      });
    });
  });

  describe('Rate Limit Header Security', () => {
    describe('Rate Limit Information Disclosure', () => {
      it('should not expose sensitive rate limiting information', async () => {
        const response = await request(app)
          .get('/health-simple');

        // Check if rate limit headers are present but not too detailed
        const rateLimitHeaders = Object.keys(response.headers).filter(header => 
          header.toLowerCase().includes('rate') || 
          header.toLowerCase().includes('limit')
        );

        // Should not expose internal rate limiting logic
        rateLimitHeaders.forEach(header => {
          expect(response.headers[header]).not.toContain('redis');
          expect(response.headers[header]).not.toContain('memory');
          expect(response.headers[header]).not.toContain('algorithm');
        });
      });
    });
  });

  describe('WebSocket Security (if applicable)', () => {
    describe('WebSocket Upgrade Security', () => {
      it('should handle WebSocket upgrade attempts securely', async () => {
        const response = await request(app)
          .get('/api/ws')
          .set('Upgrade', 'websocket')
          .set('Connection', 'Upgrade')
          .set('Sec-WebSocket-Key', 'SGVsbG8gV29ybGQ=')
          .set('Sec-WebSocket-Version', '13');

        // Should not allow unauthorized WebSocket upgrades
        expect([400, 404, 426]).toContain(response.status);
      });
    });
  });

  describe('GraphQL Security (if applicable)', () => {
    describe('GraphQL Query Security', () => {
      it('should prevent malicious GraphQL queries', async () => {
        const maliciousQueries = [
          '{ __schema { types { name } } }', // Schema introspection
          'query { users { password } }', // Sensitive field access
          'mutation { deleteAllUsers }', // Dangerous mutation
          '{ users(first: 999999) { id } }' // Resource exhaustion
        ];

        for (const query of maliciousQueries) {
          const response = await request(app)
            .post('/api/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ query });

          expect([400, 403, 404]).toContain(response.status);
        }
      });
    });
  });

  describe('File Download Security', () => {
    describe('Unauthorized File Access', () => {
      it('should prevent access to system files through API', async () => {
        const systemFiles = [
          '/etc/passwd',
          '/etc/shadow',
          '/proc/version',
          '/proc/self/environ',
          'C:\\Windows\\System32\\config\\SAM',
          'C:\\Windows\\win.ini',
          '../../../etc/passwd',
          '..\\..\\..\\Windows\\System32\\config\\SAM'
        ];

        for (const file of systemFiles) {
          const response = await request(app)
            .get(`/api/files/download/${encodeURIComponent(file)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([403, 404]).toContain(response.status);
        }
      });

      it('should validate file ownership before serving', async () => {
        // Try to access files owned by other users
        const response = await request(app)
          .get('/api/analysis/999999/download')
          .set('Authorization', `Bearer ${authToken}`);

        expect([403, 404]).toContain(response.status);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Role-Based Access Control Bypass', () => {
    describe('Role Escalation Attempts', () => {
      it('should prevent role escalation through parameter manipulation', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            name: 'Test User',
            role: 'admin', // Attempt to escalate to admin
            permissions: ['admin:read', 'admin:write']
          });

        expect([400, 403]).toContain(response.status);
        expect(response.body.success).toBe(false);
      });

      it('should prevent cross-role data access', async () => {
        // Farmer trying to access agronomist data
        const response = await request(app)
          .get('/api/agronomist/consultations')
          .set('Authorization', `Bearer ${farmerToken}`);

        expect([403, 404]).toContain(response.status);
      });

      it('should enforce proper role hierarchy', async () => {
        // Agronomist should not access admin functions
        const response = await request(app)
          .delete('/api/admin/users/1')
          .set('Authorization', `Bearer ${agronomistToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access Denied');
      });
    });
  });
});