const request = require('supertest');
const fs = require('fs');
const path = require('path');
const SecurityTestUtils = require('./security-test-utils');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const app = createTestApp();

describe('Comprehensive Security Assessment Runner', () => {
  let securityUtils;
  let testTokens;

  beforeAll(() => {
    securityUtils = new SecurityTestUtils();
    testTokens = securityUtils.generateTestTokens();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Generate and save comprehensive security report
    const securityReport = securityUtils.generateSecurityReport();
    await saveSecurityReport(securityReport);
    
    // Log summary to console
    console.log('\n=== SECURITY ASSESSMENT SUMMARY ===');
    console.log(`Total Tests: ${securityReport.summary.totalTests}`);
    console.log(`Passed: ${securityReport.summary.passedTests}`);
    console.log(`Failed: ${securityReport.summary.failedTests}`);
    console.log(`Vulnerabilities Found: ${securityReport.summary.vulnerabilitiesFound}`);
    console.log(`Risk Score: ${securityReport.summary.riskScore}%`);
    console.log(`Overall Status: ${securityReport.summary.overallStatus}`);
    console.log('=====================================\n');
  });

  describe('OWASP Top 10 Assessment', () => {
    describe('A01:2021 – Broken Access Control', () => {
      it('should prevent horizontal privilege escalation', async () => {
        const response = await request(app)
          .get('/api/users/999')
          .set('Authorization', `Bearer ${testTokens.validToken}`);

        const result = securityUtils.assessVulnerability(
          'horizontal_privilege_escalation',
          response.status,
          403,
          'high'
        );

        expect(response.status).toBe(403);
        expect(result.passed).toBe(true);
      });

      it('should prevent vertical privilege escalation', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${testTokens.validToken}`);

        const result = securityUtils.assessVulnerability(
          'vertical_privilege_escalation',
          response.status,
          403,
          'high'
        );

        expect(response.status).toBe(403);
        expect(result.passed).toBe(true);
      });
    });

    describe('A02:2021 – Cryptographic Failures', () => {
      it('should use secure JWT tokens', async () => {
        const decoded = require('jsonwebtoken').decode(testTokens.validToken);
        
        const hasNoSensitiveData = !decoded.password && !decoded.hash && !decoded.secret;
        const result = securityUtils.assessVulnerability(
          'jwt_security',
          hasNoSensitiveData,
          true,
          'medium'
        );

        expect(hasNoSensitiveData).toBe(true);
        expect(result.passed).toBe(true);
      });
    });

    describe('A03:2021 – Injection', () => {
      it('should prevent SQL injection attacks', async () => {
        const sqlPayloads = securityUtils.getSQLInjectionPayloads().basic;
        let allBlocked = true;

        for (const payload of sqlPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({ email: payload, password: 'test' });

          if (response.status !== 400) {
            allBlocked = false;
            break;
          }
        }

        const result = securityUtils.assessVulnerability(
          'sql_injection_prevention',
          allBlocked,
          true,
          'critical'
        );

        expect(allBlocked).toBe(true);
        expect(result.passed).toBe(true);
      });

      it('should prevent XSS attacks', async () => {
        const xssPayloads = securityUtils.getXSSPayloads().basic;
        let allBlocked = true;

        for (const payload of xssPayloads) {
          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${testTokens.validToken}`)
            .send({ name: payload });

          if (response.status === 200 && JSON.stringify(response.body).includes('<script>')) {
            allBlocked = false;
            break;
          }
        }

        const result = securityUtils.assessVulnerability(
          'xss_prevention',
          allBlocked,
          true,
          'high'
        );

        expect(allBlocked).toBe(true);
        expect(result.passed).toBe(true);
      });

      it('should prevent command injection', async () => {
        const cmdPayloads = securityUtils.getCommandInjectionPayloads();
        let allBlocked = true;

        for (const payload of cmdPayloads) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .set('Authorization', `Bearer ${testTokens.validToken}`)
            .field('options', payload)
            .attach('image', Buffer.from('fake'), 'test.jpg');

          if (![400, 422].includes(response.status)) {
            allBlocked = false;
            break;
          }
        }

        const result = securityUtils.assessVulnerability(
          'command_injection_prevention',
          allBlocked,
          true,
          'critical'
        );

        expect(allBlocked).toBe(true);
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Authentication Security Assessment', () => {
    it('should reject tampered JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testTokens.tamperedToken}`);

      const result = securityUtils.assessVulnerability(
        'jwt_tampering_protection',
        response.status,
        401,
        'high'
      );

      expect(response.status).toBe(401);
      expect(result.passed).toBe(true);
    });

    it('should reject expired tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testTokens.expiredToken}`);

      const result = securityUtils.assessVulnerability(
        'token_expiration_validation',
        response.status,
        401,
        'medium'
      );

      expect(response.status).toBe(401);
      expect(result.passed).toBe(true);
    });

    it('should reject none algorithm tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testTokens.noneAlgorithmToken}`);

      const result = securityUtils.assessVulnerability(
        'none_algorithm_protection',
        response.status,
        401,
        'critical'
      );

      expect(response.status).toBe(401);
      expect(result.passed).toBe(true);
    });
  });

  describe('Rate Limiting Assessment', () => {
    it('should implement effective rate limiting', async () => {
      const requests = Array(110).fill().map(() =>
        request(app).get('/health-simple')
      );

      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status === 429
      ).length;

      const hasRateLimiting = rateLimited > 0;
      const result = securityUtils.assessVulnerability(
        'rate_limiting_effectiveness',
        hasRateLimiting,
        true,
        'medium'
      );

      expect(hasRateLimiting).toBe(true);
      expect(result.passed).toBe(true);
    }, 20000);

    it('should not allow rate limit bypass', async () => {
      const bypassHeaders = securityUtils.getRateLimitBypassHeaders();
      let bypassAttemptSuccessful = false;

      for (const headers of bypassHeaders.slice(0, 3)) {
        const requests = Array(110).fill().map(() =>
          request(app)
            .get('/health-simple')
            .set(headers)
        );

        const responses = await Promise.allSettled(requests);
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        ).length;

        if (rateLimited === 0) {
          bypassAttemptSuccessful = true;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'rate_limit_bypass_prevention',
        !bypassAttemptSuccessful,
        true,
        'medium'
      );

      expect(bypassAttemptSuccessful).toBe(false);
      expect(result.passed).toBe(true);
    }, 30000);
  });

  describe('File Upload Security Assessment', () => {
    it('should prevent malicious file uploads', async () => {
      const maliciousFiles = securityUtils.getMaliciousFilePayloads().executableFiles;
      let allBlocked = true;

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${testTokens.validToken}`)
          .attach('image', file.content, file.name);

        if (response.status === 200) {
          allBlocked = false;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'malicious_file_upload_prevention',
        allBlocked,
        true,
        'high'
      );

      expect(allBlocked).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('should validate file content vs extension', async () => {
      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${testTokens.validToken}`)
        .attach('image', Buffer.from('This is not an image'), 'fake.jpg');

      const result = securityUtils.assessVulnerability(
        'file_content_validation',
        response.status,
        400,
        'medium'
      );

      expect(response.status).toBe(400);
      expect(result.passed).toBe(true);
    });
  });

  describe('Infrastructure Security Assessment', () => {
    it('should have proper security headers', async () => {
      const response = await request(app)
        .get('/health-simple');

      const hasCSP = !!response.headers['content-security-policy'];
      const hasFrameOptions = response.headers['x-frame-options'] === 'DENY';
      const hasContentTypeOptions = response.headers['x-content-type-options'] === 'nosniff';
      const hasXSSProtection = response.headers['x-xss-protection'] === '1; mode=block';

      const allHeadersPresent = hasCSP && hasFrameOptions && hasContentTypeOptions && hasXSSProtection;

      const result = securityUtils.assessVulnerability(
        'security_headers_implementation',
        allHeadersPresent,
        true,
        'medium'
      );

      expect(allHeadersPresent).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('should prevent directory traversal', async () => {
      const traversalPaths = securityUtils.getPathTraversalPayloads();
      let allBlocked = true;

      for (const path of traversalPaths.slice(0, 5)) {
        const response = await request(app)
          .get(`/static/${encodeURIComponent(path)}`);

        if (![403, 404].includes(response.status)) {
          allBlocked = false;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'directory_traversal_prevention',
        allBlocked,
        true,
        'high'
      );

      expect(allBlocked).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/health-simple');

      const noServerHeader = !response.headers['server'];
      const noPoweredBy = !response.headers['x-powered-by'];
      const noVersionInfo = !JSON.stringify(response.body).includes(process.version);

      const noInformationDisclosure = noServerHeader && noPoweredBy && noVersionInfo;

      const result = securityUtils.assessVulnerability(
        'information_disclosure_prevention',
        noInformationDisclosure,
        true,
        'low'
      );

      expect(noInformationDisclosure).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe('Agricultural-Specific Security Assessment', () => {
    it('should protect farm data isolation', async () => {
      const response = await request(app)
        .get('/api/farms/other-farm-id/analysis')
        .set('Authorization', `Bearer ${testTokens.validToken}`);

      const result = securityUtils.assessVulnerability(
        'farm_data_isolation',
        response.status,
        403,
        'high'
      );

      expect([403, 404]).toContain(response.status);
      expect(result.passed).toBe(true);
    });

    it('should prevent model extraction attempts', async () => {
      const response = await request(app)
        .get('/api/ml/model-weights')
        .set('Authorization', `Bearer ${testTokens.validToken}`);

      const result = securityUtils.assessVulnerability(
        'ai_model_protection',
        response.status,
        403,
        'high'
      );

      expect([403, 404]).toContain(response.status);
      expect(result.passed).toBe(true);
    });

    it('should validate IoT device authentication', async () => {
      const response = await request(app)
        .post('/api/iot/sensor-data')
        .set('Authorization', `Bearer ${testTokens.validToken}`)
        .send({
          device_id: '../../../config/master_key',
          sensor_data: { temperature: 25 }
        });

      const result = securityUtils.assessVulnerability(
        'iot_device_security',
        response.status,
        400,
        'medium'
      );

      expect([400, 401, 403]).toContain(response.status);
      expect(result.passed).toBe(true);
    });
  });

  describe('CORS Security Assessment', () => {
    it('should not allow arbitrary origins', async () => {
      const maliciousOrigins = securityUtils.getCORSBypassPayloads().maliciousOrigins;
      let anyOriginAllowed = false;

      for (const origin of maliciousOrigins.slice(0, 3)) {
        const response = await request(app)
          .options('/api/auth/login')
          .set('Origin', origin);

        if (response.headers['access-control-allow-origin'] === origin) {
          anyOriginAllowed = true;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'cors_origin_validation',
        !anyOriginAllowed,
        true,
        'medium'
      );

      expect(anyOriginAllowed).toBe(false);
      expect(result.passed).toBe(true);
    });
  });

  describe('NoSQL Injection Assessment', () => {
    it('should prevent NoSQL injection attacks', async () => {
      const noSqlPayloads = securityUtils.getNoSQLInjectionPayloads();
      let allBlocked = true;

      for (const payload of noSqlPayloads.slice(0, 3)) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: payload, password: 'test' });

        if (response.status !== 400) {
          allBlocked = false;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'nosql_injection_prevention',
        allBlocked,
        true,
        'high'
      );

      expect(allBlocked).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe('Template Injection Assessment', () => {
    it('should prevent server-side template injection', async () => {
      const templatePayloads = securityUtils.getTemplateInjectionPayloads();
      let allBlocked = true;

      for (const payload of templatePayloads.slice(0, 3)) {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${testTokens.validToken}`)
          .send({ name: payload });

        if (response.status === 200 && JSON.stringify(response.body).includes('49')) {
          allBlocked = false;
          break;
        }
      }

      const result = securityUtils.assessVulnerability(
        'template_injection_prevention',
        allBlocked,
        true,
        'medium'
      );

      expect(allBlocked).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe('Timing Attack Assessment', () => {
    it('should have consistent authentication timing', async () => {
      const { getQuery } = require('../src/config/database');
      
      // Valid user timing
      getQuery.mockResolvedValueOnce({
        id: 1,
        email: 'valid@example.com',
        password: '$2a$10$hashedpassword',
        role: 'farmer',
        is_active: 1
      });

      const validUserTime = await securityUtils.measureResponseTime(async () => {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'valid@example.com', password: 'wrongpassword' });
      });

      // Invalid user timing
      getQuery.mockResolvedValueOnce(null);

      const invalidUserTime = await securityUtils.measureResponseTime(async () => {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'invalid@example.com', password: 'wrongpassword' });
      });

      const timingDifference = Math.abs(validUserTime - invalidUserTime);
      const consistentTiming = timingDifference < 100;

      const result = securityUtils.assessVulnerability(
        'timing_attack_prevention',
        consistentTiming,
        true,
        'low'
      );

      expect(consistentTiming).toBe(true);
      expect(result.passed).toBe(true);
    });
  });
});

/**
 * Save comprehensive security report to file
 */
async function saveSecurityReport(report) {
  const reportsDir = path.join(__dirname, 'security-reports');
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `security-assessment-${timestamp}.json`);
  const htmlReportPath = path.join(reportsDir, `security-assessment-${timestamp}.html`);

  // Save JSON report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate HTML report
  const htmlReport = generateHTMLReport(report);
  fs.writeFileSync(htmlReportPath, htmlReport);

  console.log(`Security reports saved:`);
  console.log(`JSON: ${reportPath}`);
  console.log(`HTML: ${htmlReportPath}`);
}

/**
 * Generate HTML security report
 */
function generateHTMLReport(report) {
  const severityColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };

  const statusColors = {
    'CRITICAL': '#dc3545',
    'HIGH_RISK': '#fd7e14',
    'MEDIUM_RISK': '#ffc107',
    'LOW_RISK': '#17a2b8',
    'SECURE': '#28a745'
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <title>CropGuard Security Assessment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; border-left: 4px solid #007bff; }
        .metric h3 { margin: 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .status { padding: 10px 20px; border-radius: 20px; color: white; font-weight: bold; display: inline-block; }
        .vulnerability { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .vulnerability h4 { margin: 0 0 10px 0; }
        .severity { padding: 3px 8px; border-radius: 3px; color: white; font-size: 0.8em; font-weight: bold; }
        .recommendation { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0; }
        .compliance { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .compliance-item { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ CropGuard Security Assessment Report</h1>
            <p><strong>Generated:</strong> ${report.metadata.testTimestamp}</p>
            <p><strong>Application:</strong> ${report.metadata.applicationName}</p>
            <div class="status" style="background-color: ${statusColors[report.summary.overallStatus]};">
                Overall Status: ${report.summary.overallStatus}
            </div>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value" style="color: #28a745;">${report.summary.passedTests}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value" style="color: #dc3545;">${report.summary.failedTests}</div>
            </div>
            <div class="metric">
                <h3>Vulnerabilities</h3>
                <div class="value" style="color: #fd7e14;">${report.summary.vulnerabilitiesFound}</div>
            </div>
            <div class="metric">
                <h3>Risk Score</h3>
                <div class="value" style="color: ${report.summary.riskScore > 50 ? '#dc3545' : '#28a745'};">${report.summary.riskScore}%</div>
            </div>
        </div>

        <h2>📊 Risk Distribution</h2>
        <table>
            <tr>
                <th>Severity</th>
                <th>Count</th>
                <th>Percentage</th>
            </tr>
            <tr>
                <td><span class="severity" style="background-color: ${severityColors.critical};">CRITICAL</span></td>
                <td>${report.summary.criticalIssues}</td>
                <td>${report.summary.totalTests > 0 ? Math.round((report.summary.criticalIssues / report.summary.totalTests) * 100) : 0}%</td>
            </tr>
            <tr>
                <td><span class="severity" style="background-color: ${severityColors.high};">HIGH</span></td>
                <td>${report.summary.highRiskIssues}</td>
                <td>${report.summary.totalTests > 0 ? Math.round((report.summary.highRiskIssues / report.summary.totalTests) * 100) : 0}%</td>
            </tr>
            <tr>
                <td><span class="severity" style="background-color: ${severityColors.medium};">MEDIUM</span></td>
                <td>${report.summary.mediumRiskIssues}</td>
                <td>${report.summary.totalTests > 0 ? Math.round((report.summary.mediumRiskIssues / report.summary.totalTests) * 100) : 0}%</td>
            </tr>
            <tr>
                <td><span class="severity" style="background-color: ${severityColors.low};">LOW</span></td>
                <td>${report.summary.lowRiskIssues}</td>
                <td>${report.summary.totalTests > 0 ? Math.round((report.summary.lowRiskIssues / report.summary.totalTests) * 100) : 0}%</td>
            </tr>
        </table>

        <h2>🚨 Vulnerabilities Found</h2>
        ${report.vulnerabilities.length === 0 ? 
            '<p style="color: #28a745; font-weight: bold;">✅ No vulnerabilities detected!</p>' :
            report.vulnerabilities.map(vuln => `
                <div class="vulnerability">
                    <h4>${vuln.testName.replace(/_/g, ' ').toUpperCase()}</h4>
                    <span class="severity" style="background-color: ${severityColors[vuln.severity]};">${vuln.severity.toUpperCase()}</span>
                    <p><strong>Description:</strong> ${vuln.description}</p>
                    <p><strong>Result:</strong> ${vuln.result} (Expected: ${vuln.expectedResult})</p>
                    <p><strong>Timestamp:</strong> ${vuln.timestamp}</p>
                </div>
            `).join('')
        }

        <h2>💡 Security Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <h4>${rec.category} (Priority: ${rec.priority})</h4>
                <p><strong>Recommendation:</strong> ${rec.recommendation}</p>
                <p><strong>Implementation:</strong> ${rec.implementation}</p>
            </div>
        `).join('')}

        <h2>📋 Compliance Status</h2>
        <div class="compliance">
            ${Object.entries(report.complianceStatus).map(([standard, status]) => `
                <div class="compliance-item">
                    <h4>${standard.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                    <div class="status" style="background-color: ${status.status === 'COMPLIANT' ? '#28a745' : '#dc3545'};">
                        ${status.status}
                    </div>
                    <p>${status.details}</p>
                </div>
            `).join('')}
        </div>

        <h2>📈 Detailed Findings by Category</h2>
        ${Object.entries(report.detailedFindings).map(([category, findings]) => {
            if (findings.length === 0) return '';
            return `
                <h3>${category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                <ul>
                    ${findings.map(finding => `
                        <li>
                            <strong>${finding.testName}:</strong> 
                            <span class="severity" style="background-color: ${severityColors[finding.severity]};">${finding.severity}</span>
                            - ${finding.description}
                        </li>
                    `).join('')}
                </ul>
            `;
        }).join('')}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #6c757d;">
            <p>Security Assessment completed by CropGuard Security Testing Suite</p>
            <p>Standards: ${report.metadata.securityStandards.join(', ')}</p>
        </div>
    </div>
</body>
</html>
  `;
}