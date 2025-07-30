#!/usr/bin/env node

/**
 * CropGuard Authentication Test Runner
 * 
 * This script provides an easy way to run different authentication test suites
 * with various options and configurations.
 */

const { spawn } = require('child_process');
const path = require('path');

// Test suite configurations
const TEST_SUITES = {
  comprehensive: {
    name: 'Comprehensive Authentication Tests',
    file: 'auth-comprehensive.test.js',
    description: 'Complete authentication system testing including registration, login, tokens, and RBAC'
  },
  rbac: {
    name: 'Role-Based Access Control Tests',
    file: 'auth-rbac.test.js',
    description: 'Detailed testing of farmer, agronomist, and admin role permissions'
  },
  security: {
    name: 'Advanced Security Tests',
    file: 'auth-security-advanced.test.js',
    description: 'XSS prevention, SQL injection prevention, token security, and attack simulation'
  },
  existing: {
    name: 'Existing Authentication Tests',
    file: 'auth.test.js',
    description: 'Original authentication tests (legacy)'
  },
  'security-middleware': {
    name: 'Security Middleware Tests',
    file: 'security.test.js',
    description: 'Security middleware and protection mechanisms'
  },
  all: {
    name: 'All Authentication Tests',
    pattern: 'auth',
    description: 'Run all authentication-related tests'
  }
};

// Test categories for targeted testing
const TEST_CATEGORIES = {
  registration: 'Registration Flow',
  login: 'Login Flow',
  tokens: 'Token-based Authentication',
  roles: 'Role-based Access Control',
  security: 'Security Features',
  'rate-limiting': 'Rate Limiting',
  'brute-force': 'Brute Force Protection',
  'error-handling': 'Error Handling'
};

/**
 * Display help information
 */
function showHelp() {
  console.log(`
🛡️  CropGuard Authentication Test Runner

USAGE:
  node run-auth-tests.js [suite] [options]

AVAILABLE TEST SUITES:
`);

  Object.entries(TEST_SUITES).forEach(([key, suite]) => {
    console.log(`  ${key.padEnd(20)} - ${suite.description}`);
  });

  console.log(`
AVAILABLE TEST CATEGORIES:
`);

  Object.entries(TEST_CATEGORIES).forEach(([key, category]) => {
    console.log(`  ${key.padEnd(20)} - ${category} tests only`);
  });

  console.log(`
OPTIONS:
  --coverage           Generate test coverage report
  --watch             Run tests in watch mode
  --verbose           Show detailed test output
  --timeout <ms>      Set test timeout (default: 30000ms)
  --help              Show this help message

EXAMPLES:
  node run-auth-tests.js comprehensive
  node run-auth-tests.js security --coverage
  node run-auth-tests.js all --watch
  node run-auth-tests.js --category registration
  node run-auth-tests.js rbac --verbose --timeout 60000

INTEGRATION WITH NPM:
  npm run test:auth:comprehensive
  npm run test:auth:security
  npm run test:auth:all
`);
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    suite: null,
    category: null,
    coverage: false,
    watch: false,
    verbose: false,
    timeout: 30000,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
        options.help = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]) || 30000;
        break;
      case '--category':
        options.category = args[++i];
        break;
      default:
        if (!arg.startsWith('--') && !options.suite) {
          options.suite = arg;
        }
        break;
    }
  }

  return options;
}

/**
 * Build Jest command arguments
 */
function buildJestArgs(options) {
  const jestArgs = [];

  // Test file or pattern
  if (options.category) {
    if (TEST_CATEGORIES[options.category]) {
      jestArgs.push('--testNamePattern', TEST_CATEGORIES[options.category]);
    } else {
      console.error(`❌ Unknown test category: ${options.category}`);
      console.log('Available categories:', Object.keys(TEST_CATEGORIES).join(', '));
      process.exit(1);
    }
  } else if (options.suite) {
    const suite = TEST_SUITES[options.suite];
    if (!suite) {
      console.error(`❌ Unknown test suite: ${options.suite}`);
      console.log('Available suites:', Object.keys(TEST_SUITES).join(', '));
      process.exit(1);
    }

    if (suite.file) {
      jestArgs.push(suite.file);
    } else if (suite.pattern) {
      jestArgs.push('--testPathPattern', suite.pattern);
    }
  } else {
    // Default to comprehensive tests
    jestArgs.push(TEST_SUITES.comprehensive.file);
  }

  // Options
  if (options.coverage) {
    jestArgs.push('--coverage');
    jestArgs.push('--collectCoverageFrom', 'src/**/*.js');
    jestArgs.push('--coverageDirectory', 'coverage');
    jestArgs.push('--coverageReporters', 'text', 'lcov', 'html');
  }

  if (options.watch) {
    jestArgs.push('--watch');
  }

  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  // Set timeout
  jestArgs.push('--testTimeout', options.timeout.toString());

  // Test environment
  jestArgs.push('--testEnvironment', 'node');

  // Run in band for consistent rate limiting tests
  jestArgs.push('--runInBand');

  return jestArgs;
}

/**
 * Run Jest with the specified arguments
 */
function runJest(jestArgs) {
  const jestBin = path.resolve(__dirname, 'node_modules', '.bin', 'jest');
  
  console.log(`🚀 Running Jest with arguments:`, jestArgs.join(' '));
  console.log('');

  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only'
    }
  });

  jest.on('close', (code) => {
    console.log('');
    if (code === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.log(`❌ Tests failed with exit code ${code}`);
    }
    process.exit(code);
  });

  jest.on('error', (err) => {
    console.error('❌ Failed to start Jest:', err);
    process.exit(1);
  });
}

/**
 * Display test suite information
 */
function displaySuiteInfo(options) {
  let suite;
  
  if (options.category) {
    console.log(`📋 Running ${TEST_CATEGORIES[options.category]} tests`);
  } else if (options.suite) {
    suite = TEST_SUITES[options.suite];
    console.log(`📋 Running: ${suite.name}`);
    console.log(`📄 Description: ${suite.description}`);
  } else {
    suite = TEST_SUITES.comprehensive;
    console.log(`📋 Running: ${suite.name} (default)`);
    console.log(`📄 Description: ${suite.description}`);
  }

  console.log('');
  
  if (options.coverage) {
    console.log('📊 Coverage report will be generated');
  }
  
  if (options.watch) {
    console.log('👀 Running in watch mode');
  }
  
  if (options.verbose) {
    console.log('📝 Verbose output enabled');
  }
  
  console.log(`⏱️  Test timeout: ${options.timeout}ms`);
  console.log('');
}

/**
 * Main execution function
 */
function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    return;
  }

  displaySuiteInfo(options);
  
  const jestArgs = buildJestArgs(options);
  runJest(jestArgs);
}

// Add npm script suggestions to package.json
const npmScripts = {
  "test:auth": "node run-auth-tests.js",
  "test:auth:comprehensive": "node run-auth-tests.js comprehensive",
  "test:auth:rbac": "node run-auth-tests.js rbac",
  "test:auth:security": "node run-auth-tests.js security",
  "test:auth:all": "node run-auth-tests.js all",
  "test:auth:coverage": "node run-auth-tests.js all --coverage",
  "test:auth:watch": "node run-auth-tests.js comprehensive --watch"
};

// Execute main function
if (require.main === module) {
  main();
}

module.exports = {
  TEST_SUITES,
  TEST_CATEGORIES,
  npmScripts
};