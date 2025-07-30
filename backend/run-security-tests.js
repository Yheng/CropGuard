#!/usr/bin/env node

/**
 * CropGuard Comprehensive Security Testing Suite Runner
 * 
 * This script orchestrates the execution of all security tests and generates
 * comprehensive vulnerability assessment reports.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityTestRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'OWASP Top 10 Security Tests',
        file: 'security-owasp-top10.test.js',
        category: 'Core Security',
        priority: 'CRITICAL'
      },
      {
        name: 'Advanced JWT & Authentication Tests',  
        file: 'security-auth-advanced.test.js',
        category: 'Authentication',
        priority: 'HIGH'
      },
      {
        name: 'Input Validation & Injection Tests',
        file: 'security-injection-bypass.test.js', 
        category: 'Input Security',
        priority: 'CRITICAL'
      },
      {
        name: 'API Security & Rate Limiting Tests',
        file: 'security-api-rate-limiting.test.js',
        category: 'API Security', 
        priority: 'HIGH'
      },
      {
        name: 'Infrastructure Security Tests',
        file: 'security-infrastructure.test.js',
        category: 'Infrastructure',
        priority: 'MEDIUM'
      },
      {
        name: 'Agricultural-Specific Security Tests',
        file: 'security-agricultural-scenarios.test.js',
        category: 'Domain Specific',
        priority: 'HIGH'
      },
      {
        name: 'Comprehensive Security Assessment',
        file: 'security-assessment-runner.test.js',
        category: 'Assessment',
        priority: 'HIGH'
      }
    ];

    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: null,
      totalSuites: this.testSuites.length,
      passedSuites: 0,
      failedSuites: 0,
      suiteResults: [],
      overallStatus: 'PENDING'
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🛡️  CropGuard Security Testing Suite');
    console.log('=====================================');
    console.log(`Starting comprehensive security assessment...`);
    console.log(`Test suites to execute: ${this.testSuites.length}`);
    console.log('');

    // Check prerequisites
    this.checkPrerequisites();

    // Setup test environment
    await this.setupTestEnvironment();

    // Execute test suites
    for (const suite of this.testSuites) {
      await this.executeSuite(suite);
    }

    // Generate final report
    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;
    this.results.overallStatus = this.calculateOverallStatus();

    await this.generateFinalReport();
    this.displaySummary();
  }

  /**
   * Check system prerequisites
   */
  checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js version: ${nodeVersion}`);

    // Check if Jest is available
    try {
      execSync('npx jest --version', { stdio: 'pipe' });
      console.log('   ✅ Jest is available');
    } catch (error) {
      console.error('   ❌ Jest is not available');
      process.exit(1);
    }

    // Check if test files exist
    const missingFiles = this.testSuites.filter(suite => {
      const filePath = path.join(__dirname, 'tests', suite.file);
      return !fs.existsSync(filePath);
    });

    if (missingFiles.length > 0) {
      console.error('   ❌ Missing test files:');
      missingFiles.forEach(file => console.error(`      - ${file.file}`));
      process.exit(1);
    }

    console.log('   ✅ All test files are available');
    console.log('');
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-security-testing';

    // Create reports directory
    const reportsDir = path.join(__dirname, 'tests', 'security-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      console.log('   ✅ Created security reports directory');
    }

    // Create logs directory  
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('   ✅ Created logs directory');
    }

    console.log('   ✅ Test environment ready');
    console.log('');
  }

  /**
   * Execute a test suite
   */
  async executeSuite(suite) {
    console.log(`🧪 Executing: ${suite.name}`);
    console.log(`   Category: ${suite.category} | Priority: ${suite.priority}`);
    
    const startTime = Date.now();
    
    try {
      // Execute Jest for specific test file
      const result = await this.runJestTest(suite.file);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      const suiteResult = {
        ...suite,
        status: result.success ? 'PASSED' : 'FAILED',
        duration,
        testsRun: result.numTotalTests,
        testsPassed: result.numPassedTests,
        testsFailed: result.numFailedTests,
        coverage: result.coverage || null,
        errors: result.errors || []
      };

      this.results.suiteResults.push(suiteResult);

      if (result.success) {
        this.results.passedSuites++;
        console.log(`   ✅ PASSED (${duration}ms) - ${result.numPassedTests}/${result.numTotalTests} tests`);
      } else {
        this.results.failedSuites++;
        console.log(`   ❌ FAILED (${duration}ms) - ${result.numPassedTests}/${result.numTotalTests} tests`);
        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      
      this.results.suiteResults.push({
        ...suite,
        status: 'ERROR',
        duration: Date.now() - startTime,
        error: error.message
      });
      
      this.results.failedSuites++;
    }

    console.log('');
  }

  /**
   * Run Jest test for specific file
   */
  runJestTest(testFile) {
    return new Promise((resolve, reject) => {
      const testPath = path.join(__dirname, 'tests', testFile);
      const command = 'npx';
      const args = [
        'jest',
        testPath,
        '--json',
        '--coverage',
        '--detectOpenHandles',
        '--forceExit',
        '--maxWorkers=1'
      ];

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Parse Jest JSON output
          const lines = stdout.split('\n');
          const jsonLine = lines.find(line => line.trim().startsWith('{') && line.includes('testResults'));
          
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            resolve({
              success: result.success,
              numTotalTests: result.numTotalTests,
              numPassedTests: result.numPassedTests, 
              numFailedTests: result.numFailedTests,
              coverage: result.coverageMap ? this.processCoverage(result.coverageMap) : null,
              errors: result.testResults.flatMap(tr => 
                tr.assertionResults
                  .filter(ar => ar.status === 'failed')
                  .map(ar => ar.title)
              )
            });
          } else {
            // Fallback parsing
            resolve({
              success: code === 0,
              numTotalTests: 0,
              numPassedTests: code === 0 ? 1 : 0,
              numFailedTests: code === 0 ? 0 : 1,
              errors: code !== 0 ? [stderr || 'Test execution failed'] : []
            });
          }
        } catch (parseError) {
          resolve({
            success: code === 0,
            numTotalTests: 0,
            numPassedTests: code === 0 ? 1 : 0,
            numFailedTests: code === 0 ? 0 : 1,
            errors: [parseError.message]
          });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Test execution timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Process coverage information
   */
  processCoverage(coverageMap) {
    if (!coverageMap || typeof coverageMap !== 'object') {
      return null;
    }

    const files = Object.keys(coverageMap);
    if (files.length === 0) return null;

    let totalStatements = 0;
    let coveredStatements = 0;

    files.forEach(file => {
      const fileCoverage = coverageMap[file];
      if (fileCoverage && fileCoverage.s) {
        const statements = Object.values(fileCoverage.s);
        totalStatements += statements.length;
        coveredStatements += statements.filter(count => count > 0).length;
      }
    });

    return {
      percentage: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
      coveredStatements,
      totalStatements
    };
  }

  /**
   * Calculate overall status
   */
  calculateOverallStatus() {
    const failureRate = this.results.failedSuites / this.results.totalSuites;
    const criticalFailures = this.results.suiteResults.filter(s => 
      s.status === 'FAILED' && s.priority === 'CRITICAL'
    ).length;

    if (criticalFailures > 0) {
      return 'CRITICAL_ISSUES';
    } else if (failureRate > 0.5) {
      return 'HIGH_RISK';
    } else if (failureRate > 0.2) {
      return 'MEDIUM_RISK';
    } else if (this.results.failedSuites > 0) {
      return 'LOW_RISK';
    } else {
      return 'SECURE';
    }
  }

  /**
   * Generate final comprehensive report
   */
  async generateFinalReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, 'tests', 'security-reports', `comprehensive-security-report-${timestamp}.json`);
    
    const report = {
      metadata: {
        applicationName: 'CropGuard',
        testSuiteVersion: '1.0.0',
        executionTimestamp: this.results.startTime.toISOString(),
        completionTimestamp: this.results.endTime.toISOString(),
        duration: this.results.duration,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      },
      summary: {
        overallStatus: this.results.overallStatus,
        totalSuites: this.results.totalSuites,
        passedSuites: this.results.passedSuites,
        failedSuites: this.results.failedSuites,
        successRate: Math.round((this.results.passedSuites / this.results.totalSuites) * 100),
        totalTestsRun: this.results.suiteResults.reduce((sum, suite) => sum + (suite.testsRun || 0), 0),
        totalTestsPassed: this.results.suiteResults.reduce((sum, suite) => sum + (suite.testsPassed || 0), 0),
        totalTestsFailed: this.results.suiteResults.reduce((sum, suite) => sum + (suite.testsFailed || 0), 0)
      },
      suiteResults: this.results.suiteResults,
      recommendations: this.generateExecutiveRecommendations(),
      nextActions: this.generateNextActions()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Comprehensive report saved: ${reportPath}`);

    // Generate executive summary
    await this.generateExecutiveSummary(report);
  }

  /**
   * Generate executive recommendations
   */
  generateExecutiveRecommendations() {
    const recommendations = [];
    const failedSuites = this.results.suiteResults.filter(s => s.status === 'FAILED');

    if (failedSuites.some(s => s.priority === 'CRITICAL')) {
      recommendations.push({
        priority: 'IMMEDIATE',
        category: 'Critical Security Issues',
        recommendation: 'Address critical security vulnerabilities immediately before production deployment.',
        impact: 'Application may be vulnerable to severe security attacks.'
      });
    }

    if (failedSuites.some(s => s.category === 'Authentication')) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication Security',
        recommendation: 'Strengthen authentication mechanisms and session management.',
        impact: 'Unauthorized access and account compromise risks.'
      });
    }

    if (failedSuites.some(s => s.category === 'Input Security')) {
      recommendations.push({
        priority: 'HIGH', 
        category: 'Input Validation',
        recommendation: 'Implement comprehensive input validation and sanitization.',
        impact: 'Code injection and XSS attack vulnerabilities.'
      });
    }

    if (failedSuites.some(s => s.category === 'API Security')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'API Security',
        recommendation: 'Enhance API security controls and rate limiting.',
        impact: 'API abuse and denial of service vulnerabilities.'
      });
    }

    if (failedSuites.some(s => s.category === 'Domain Specific')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Agricultural Security',
        recommendation: 'Address agricultural domain-specific security concerns.',
        impact: 'Farm data privacy and AI model security risks.'
      });
    }

    return recommendations;
  }

  /**
   * Generate next actions
   */
  generateNextActions() {
    const actions = [];

    if (this.results.overallStatus === 'CRITICAL_ISSUES') {
      actions.push('🚨 DO NOT DEPLOY to production until critical issues are resolved');
      actions.push('🔧 Fix all critical security vulnerabilities');
      actions.push('🧪 Re-run security tests after fixes');
    } else if (this.results.overallStatus === 'HIGH_RISK') {
      actions.push('⚠️  Address high-risk issues before production deployment');
      actions.push('📋 Create security issue tracking tickets');
      actions.push('👥 Conduct security code review');
    } else if (this.results.overallStatus === 'MEDIUM_RISK') {
      actions.push('📈 Plan security improvements for next sprint');
      actions.push('🔍 Monitor security metrics in production');
      actions.push('📚 Provide security training to development team');
    } else if (this.results.overallStatus === 'SECURE') {
      actions.push('✅ Application meets security standards');
      actions.push('🔄 Schedule regular security testing');
      actions.push('📊 Maintain security monitoring');
    }

    actions.push('📖 Review detailed security assessment reports');
    actions.push('🛡️ Implement recommended security enhancements');

    return actions;
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(report) {
    const summaryPath = path.join(__dirname, 'tests', 'security-reports', 'executive-summary.md');
    
    const summary = `# CropGuard Security Assessment Executive Summary

## 🛡️ Overall Security Status: **${report.summary.overallStatus}**

**Generated:** ${new Date().toLocaleString()}  
**Duration:** ${Math.round(report.metadata.duration / 1000)}s  

---

## 📊 Test Results Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Test Suites** | ${report.summary.totalSuites} | - |
| **Passed Suites** | ${report.summary.passedSuites} | ✅ |
| **Failed Suites** | ${report.summary.failedSuites} | ${report.summary.failedSuites > 0 ? '❌' : '✅'} |
| **Success Rate** | ${report.summary.successRate}% | ${report.summary.successRate >= 80 ? '✅' : '⚠️'} |
| **Total Tests Executed** | ${report.summary.totalTestsRun} | - |

---

## 🔍 Security Suite Results

${report.suiteResults.map(suite => `
### ${suite.name}
- **Status:** ${suite.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}  
- **Priority:** ${suite.priority}  
- **Category:** ${suite.category}  
- **Duration:** ${suite.duration}ms  
- **Tests:** ${suite.testsPassed || 0}/${suite.testsRun || 0} passed  
${suite.errors && suite.errors.length > 0 ? `- **Issues:** ${suite.errors.slice(0, 2).join(', ')}` : ''}
`).join('')}

---

## 🚨 Priority Recommendations

${report.recommendations.map((rec, index) => `
${index + 1}. **${rec.category}** (${rec.priority} Priority)
   - ${rec.recommendation}
   - *Impact:* ${rec.impact}
`).join('')}

---

## 🎯 Next Actions

${report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}

---

## 📋 Security Standards Compliance

This assessment covers:
- ✅ OWASP Top 10 Security Risks
- ✅ Authentication & Authorization Security  
- ✅ Input Validation & Injection Prevention
- ✅ API Security Best Practices
- ✅ Infrastructure Security Configuration
- ✅ Agricultural Domain-Specific Security

---

*For detailed technical findings, review the comprehensive JSON reports and individual test suite results.*
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 Executive summary saved: ${summaryPath}`);
  }

  /**
   * Display final summary
   */
  displaySummary() {
    console.log('🏁 Security Testing Complete');
    console.log('============================');
    console.log(`Overall Status: ${this.getStatusEmoji(this.results.overallStatus)} ${this.results.overallStatus}`);
    console.log(`Duration: ${Math.round(this.results.duration / 1000)}s`);
    console.log(`Test Suites: ${this.results.passedSuites}/${this.results.totalSuites} passed`);
    console.log(`Success Rate: ${Math.round((this.results.passedSuites / this.results.totalSuites) * 100)}%`);
    console.log('');

    if (this.results.failedSuites > 0) {
      console.log('❌ Failed Suites:');
      this.results.suiteResults
        .filter(s => s.status === 'FAILED')
        .forEach(suite => {
          console.log(`   - ${suite.name} (${suite.priority} priority)`);
        });
      console.log('');
    }

    console.log('📊 Reports generated in tests/security-reports/');
    console.log('🔍 Review detailed findings and implement recommendations');
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    const emojis = {
      'SECURE': '🟢',
      'LOW_RISK': '🟡', 
      'MEDIUM_RISK': '🟠',
      'HIGH_RISK': '🔴',
      'CRITICAL_ISSUES': '💀'
    };
    return emojis[status] || '❓';
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new SecurityTestRunner();
  
  runner.run().catch(error => {
    console.error('❌ Security test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = SecurityTestRunner;