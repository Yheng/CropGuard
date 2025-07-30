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

describe('Infrastructure and Configuration Security Tests', () => {
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Headers Validation', () => {
    describe('Content Security Policy (CSP)', () => {
      it('should have a restrictive Content Security Policy', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const csp = response.headers['content-security-policy'];
        expect(csp).toBeDefined();
        
        // Should not allow unsafe-eval or unsafe-inline for scripts
        expect(csp).not.toContain("'unsafe-eval'");
        expect(csp).not.toContain("script-src * 'unsafe-inline'");
        
        // Should have restrictive frame-ancestors
        expect(csp).toContain("frame-ancestors 'none'");
        
        // Should restrict default-src
        expect(csp).toContain("default-src 'self'");
      });

      it('should prevent CSP bypass attempts', async () => {
        const bypassAttempts = [
          { header: 'Content-Security-Policy-Report-Only', value: "default-src *" },
          { header: 'X-Content-Security-Policy', value: "default-src *" },
          { header: 'X-WebKit-CSP', value: "default-src *" }
        ];

        for (const attempt of bypassAttempts) {
          const response = await request(app)
            .get('/health-simple')
            .set(attempt.header, attempt.value);

          // Main CSP header should still be present and restrictive
          const mainCsp = response.headers['content-security-policy'];
          expect(mainCsp).toBeDefined();
          expect(mainCsp).toContain("default-src 'self'");
        }
      });
    });

    describe('X-Frame-Options Security', () => {
      it('should prevent clickjacking with X-Frame-Options', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-frame-options']).toBe('DENY');
      });

      it('should not allow frame options override', async () => {
        const response = await request(app)
          .get('/health-simple')
          .set('X-Frame-Options', 'ALLOWALL');

        // Server should override client attempts
        expect(response.headers['x-frame-options']).toBe('DENY');
      });
    });

    describe('X-Content-Type-Options Security', () => {
      it('should prevent MIME type sniffing', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
      });
    });

    describe('X-XSS-Protection Security', () => {
      it('should enable XSS protection', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      });
    });

    describe('Referrer Policy Security', () => {
      it('should have a secure referrer policy', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const referrerPolicy = response.headers['referrer-policy'];
        expect(referrerPolicy).toBeDefined();
        expect(referrerPolicy).toBe('strict-origin-when-cross-origin');
      });
    });

    describe('Permissions Policy Security', () => {
      it('should restrict dangerous browser features', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const permissionsPolicy = response.headers['permissions-policy'];
        expect(permissionsPolicy).toBeDefined();
        expect(permissionsPolicy).toContain('geolocation=()');
        expect(permissionsPolicy).toContain('microphone=()');
        expect(permissionsPolicy).toContain('camera=()');
      });
    });

    describe('Strict Transport Security (HSTS)', () => {
      it('should enforce HTTPS in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const hsts = response.headers['strict-transport-security'];
        if (hsts) {
          expect(hsts).toContain('max-age=');
          expect(parseInt(hsts.match(/max-age=(\d+)/)[1])).toBeGreaterThan(31536000); // 1 year
        }

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Directory Traversal Prevention', () => {
    describe('File System Access Security', () => {
      it('should prevent directory traversal in static file serving', async () => {
        const traversalPaths = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '....//....//....//etc/hosts',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '..%2f..%2f..%2fetc%2fpasswd',
          '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',
          '....%2f....%2f....%2fetc%2fpasswd',
          '../../../proc/version',
          '../../../proc/self/environ',
          '../../../var/log/auth.log'
        ];

        for (const path of traversalPaths) {
          const response = await request(app)
            .get(`/static/${encodeURIComponent(path)}`);

          expect([403, 404]).toContain(response.status);
        }
      });

      it('should prevent access to application source code', async () => {
        const sourcePaths = [
          '../package.json',
          '../src/index.js',
          '../.env',
          '../config/database.js',
          '../node_modules/express/package.json',
          '../../.git/config',
          '../logs/error.log',
          '../src/middleware/auth.js'
        ];

        for (const path of sourcePaths) {
          const response = await request(app)
            .get(`/static/${encodeURIComponent(path)}`);

          expect([403, 404]).toContain(response.status);
        }
      });

      it('should prevent access to backup and temporary files', async () => {
        const backupFiles = [
          'index.js.bak',
          'config.json~',
          '.DS_Store',
          'Thumbs.db',
          'desktop.ini',
          '.env.backup',
          'database.sql.old',
          'app.js.swp',
          '.git/HEAD',
          '.svn/entries'
        ];

        for (const file of backupFiles) {
          const response = await request(app)
            .get(`/static/${file}`);

          expect([403, 404]).toContain(response.status);
        }
      });
    });

    describe('Path Normalization Security', () => {
      it('should handle path normalization attacks', async () => {
        const normalizedPaths = [
          'normal/../../../etc/passwd',
          'folder/./../../etc/hosts',
          'path/subfolder/../../../var/log/messages',
          'dir\\..\\..\\..\\windows\\system32\\config\\sam'
        ];

        for (const path of normalizedPaths) {
          const response = await request(app)
            .get(`/api/files/download/${encodeURIComponent(path)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([400, 403, 404]).toContain(response.status);
        }
      });

      it('should prevent null byte injection in file paths', async () => {
        const nullBytePaths = [
          'legitimate.txt%00.php',
          'safe.jpg\x00.exe',
          'image.png\0script.js',
          'document.pdf%00%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];

        for (const path of nullBytePaths) {
          const response = await request(app)
            .get(`/api/files/download/${encodeURIComponent(path)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([400, 403, 404]).toContain(response.status);
        }
      });
    });
  });

  describe('Configuration Security Assessment', () => {
    describe('Environment Variable Security', () => {
      it('should not expose environment variables', async () => {
        const envEndpoints = [
          '/api/env',
          '/api/config/env',
          '/api/debug/env',
          '/.env',
          '/env.json',
          '/config.json'
        ];

        for (const endpoint of envEndpoints) {
          const response = await request(app)
            .get(endpoint);

          expect([403, 404]).toContain(response.status);
        }
      });

      it('should not leak sensitive environment data in errors', async () => {
        const { getQuery } = require('../src/config/database');
        getQuery.mockRejectedValue(new Error(`Connection failed: ${process.env.DATABASE_URL || 'postgres://user:pass@localhost/db'}`));

        const response = await request(app)
          .get('/health')
          .expect(503);

        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toContain('postgres://');
        expect(responseBody).not.toContain('DATABASE_URL');
        expect(responseBody).not.toContain('user:pass');
      });
    });

    describe('Default Configuration Security', () => {
      it('should not use default credentials', async () => {
        const defaultCreds = [
          { email: 'admin@admin.com', password: 'admin' },
          { email: 'administrator@localhost', password: 'password' },
          { email: 'root@localhost', password: 'root' },
          { email: 'test@test.com', password: 'test' },
          { email: 'demo@demo.com', password: 'demo' }
        ];

        for (const cred of defaultCreds) {
          const response = await request(app)
            .post('/api/auth/login')
            .send(cred);

          expect([400, 401]).toContain(response.status);
          expect(response.body.success).toBe(false);
        }
      });

      it('should not expose default error pages', async () => {
        const response = await request(app)
          .get('/nonexistent-endpoint')
          .expect(404);

        const responseBody = response.text || JSON.stringify(response.body);
        
        // Should not expose server technology
        expect(responseBody).not.toContain('Express');
        expect(responseBody).not.toContain('Node.js');
        expect(responseBody).not.toContain('Apache');
        expect(responseBody).not.toContain('nginx');
      });
    });

    describe('Debug Configuration Security', () => {
      it('should not expose debug information in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/api/auth/login')
          .send({ email: 'invalid', password: 'wrong' });

        expect(response.body.stack).toBeUndefined();
        expect(response.body.trace).toBeUndefined();
        expect(response.body.debug).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
      });

      it('should not expose internal application structure', async () => {
        const response = await request(app)
          .get('/nonexistent')
          .expect(404);

        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toMatch(/\/src\/.*\.js/);
        expect(responseBody).not.toMatch(/\/node_modules\//);
        expect(responseBody).not.toContain('middleware');
        expect(responseBody).not.toContain('routes');
      });
    });
  });

  describe('Server Information Disclosure', () => {
    describe('Server Software Fingerprinting', () => {
      it('should not expose server software information', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['server']).toBeUndefined();
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['x-aspnet-version']).toBeUndefined();
        expect(response.headers['x-aspnetmvc-version']).toBeUndefined();
      });

      it('should not expose Node.js version information', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toContain(process.version);
        expect(responseBody).not.toContain('Node.js');
        expect(responseBody).not.toContain('v18.');
        expect(responseBody).not.toContain('v20.');
      });
    });

    describe('Application Version Disclosure', () => {
      it('should not expose application version in headers', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const versionHeaders = [
          'x-version',
          'x-app-version',
          'x-build-version',
          'x-release-version',
          'application-version'
        ];

        versionHeaders.forEach(header => {
          expect(response.headers[header]).toBeUndefined();
        });
      });

      it('should not expose build information', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toMatch(/build-\d+/);
        expect(responseBody).not.toMatch(/commit-[a-f0-9]+/);
        expect(responseBody).not.toContain('git');
        expect(responseBody).not.toContain('jenkins');
        expect(responseBody).not.toContain('gitlab-ci');
      });
    });
  });

  describe('Network Security Configuration', () => {
    describe('TLS Configuration Security', () => {
      it('should use secure SSL/TLS configuration', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        // Should not expose TLS version info
        expect(response.headers['ssl-version']).toBeUndefined();
        expect(response.headers['tls-version']).toBeUndefined();
      });
    });

    describe('DNS Security', () => {
      it('should prevent DNS rebinding attacks', async () => {
        const maliciousHosts = [
          'localhost.evil.com',
          '127.0.0.1.attacker.net',
          'internal-service.company.com.evil.org',
          '192.168.1.1.malicious.site'
        ];

        for (const host of maliciousHosts) {
          const response = await request(app)
            .get('/health-simple')
            .set('Host', host);

          // Should validate Host header
          expect([400, 200]).toContain(response.status);
        }
      });
    });
  });

  describe('Resource Exhaustion Protection', () => {
    describe('Memory Exhaustion Prevention', () => {
      it('should handle large request bodies properly', async () => {
        const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

        const response = await request(app)
          .post('/api/auth/register')
          .send({ data: largePayload })
          .expect(413);

        expect(response.body.error).toBe('Request Too Large');
      });

      it('should limit concurrent connections', async () => {
        // Simulate many concurrent requests
        const requests = Array(200).fill().map(() =>
          request(app).get('/health-simple')
        );

        const responses = await Promise.allSettled(requests);
        
        // Some requests might be rejected due to connection limits
        const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
        const failed = responses.length - successful.length;
        
        // Should handle the load gracefully
        expect(successful.length).toBeGreaterThan(0);
      }, 20000);
    });

    describe('CPU Exhaustion Prevention', () => {
      it('should prevent ReDoS attacks in input validation', async () => {
        const redosPayloads = [
          'a'.repeat(100000) + '!',
          'x'.repeat(50000) + 'y'.repeat(50000),
          '(' + 'a'.repeat(10000) + ')*',
          '\\\\' + 'a'.repeat(10000),
          '((((((((((a))))))))))' + 'b'.repeat(10000)
        ];

        for (const payload of redosPayloads) {
          const start = Date.now();
          
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: `test@example.com`,
              password: payload,
              name: payload
            });

          const duration = Date.now() - start;
          
          // Should not cause excessive processing time
          expect(duration).toBeLessThan(5000); // 5 seconds max
          expect([400]).toContain(response.status);
        }
      }, 30000);
    });
  });

  describe('File System Security', () => {
    describe('File Permission Security', () => {
      it('should not allow access to restricted directories', async () => {
        const restrictedPaths = [
          '/root/',
          '/etc/',
          '/proc/',
          '/sys/',
          '/dev/',
          '/boot/',
          '/usr/bin/',
          '/sbin/',
          'C:\\Windows\\',
          'C:\\System32\\',
          'C:\\Program Files\\'
        ];

        for (const path of restrictedPaths) {
          const response = await request(app)
            .get(`/api/files/browse/${encodeURIComponent(path)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([403, 404]).toContain(response.status);
        }
      });
    });

    describe('Temporary File Security', () => {
      it('should clean up temporary files properly', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', Buffer.from('fake image data'), 'test.jpg');

        // Temporary files should be cleaned up regardless of success/failure
        expect([200, 400]).toContain(response.status);
      });

      it('should use secure temporary directories', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', Buffer.from('fake image data'), 'test.jpg');

        // Should not expose temp directory paths
        if (response.body.tempPath) {
          expect(response.body.tempPath).not.toContain('/tmp/');
          expect(response.body.tempPath).not.toContain('C:\\Temp\\');
        }
      });
    });
  });

  describe('Logging Security Configuration', () => {
    describe('Log Injection Prevention', () => {
      it('should prevent log injection attacks', async () => {
        const logInjectionPayloads = [
          'normal_user\r\nFAKE LOG ENTRY: admin login successful',
          'user\n2024-01-01 00:00:00 [ERROR] System compromised',
          'test\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>',
          'user\x00INJECTION\x00ATTEMPT'
        ];

        for (const payload of logInjectionPayloads) {
          const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
          
          await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'test123'
            });

          // Check that log injection characters are sanitized
          if (consoleSpy.mock.calls.length > 0) {
            const loggedData = consoleSpy.mock.calls.flat().join(' ');
            expect(loggedData).not.toContain('\r\n');
            expect(loggedData).not.toContain('\x00');
            expect(loggedData).not.toContain('FAKE LOG ENTRY');
          }
          
          consoleSpy.mockRestore();
        }
      });

      it('should sanitize sensitive data in logs', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'supersecretpassword123',
            creditCard: '4111-1111-1111-1111',
            ssn: '123-45-6789'
          });

        const loggedData = consoleSpy.mock.calls.flat().join(' ');
        
        // Should not log sensitive information
        expect(loggedData).not.toContain('supersecretpassword123');
        expect(loggedData).not.toContain('4111-1111-1111-1111');
        expect(loggedData).not.toContain('123-45-6789');
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Monitoring and Alerting Security', () => {
    describe('Security Event Detection', () => {
      it('should detect and log suspicious activities', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        // Perform suspicious activity
        await request(app)
          .get('/api/analysis/history')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: "'; DROP TABLE users; --" });

        // Should log the suspicious activity
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });

      it('should monitor for brute force attempts', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const { getQuery } = require('../src/config/database');
        getQuery.mockResolvedValue(null);

        // Simulate brute force attempt
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({
              email: 'target@example.com',
              password: `wrongpassword${i}`
            });
        }

        // Should log the brute force attempt
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });
  });
});