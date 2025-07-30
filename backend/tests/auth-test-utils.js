const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Test constants
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// Pre-defined test users for consistent testing
const TEST_USERS = {
  farmer: {
    id: 1,
    email: 'farmer@test.com',
    name: 'John Farmer',
    role: 'farmer',
    phone: '+1234567890',
    location: 'Farm Valley',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    email_verified: 1
  },
  agronomist: {
    id: 2,
    email: 'agronomist@test.com',
    name: 'Dr. Plant Expert',
    role: 'agronomist',
    phone: '+1987654321',
    location: 'Research Center',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    email_verified: 1
  },
  admin: {
    id: 3,
    email: 'admin@test.com',
    name: 'System Administrator',
    role: 'admin',
    phone: '+1555000000',
    location: 'HQ Office',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    email_verified: 1
  },
  inactive: {
    id: 4,
    email: 'inactive@test.com',
    name: 'Inactive User',
    role: 'farmer',
    is_active: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: null,
    email_verified: 0
  }
};

// Test data generators
const TEST_DATA = {
  validRegistration: {
    email: 'newuser@test.com',
    password: 'SecurePass123!',
    name: 'New Test User',
    role: 'farmer',
    phone: '+1999888777',
    location: 'Test Farm'
  },
  
  invalidRegistrations: [
    {
      name: 'missing_email',
      data: {
        password: 'SecurePass123!',
        name: 'Test User'
      },
      expectedError: 'email'
    },
    {
      name: 'invalid_email',
      data: {
        email: 'not-an-email',
        password: 'SecurePass123!',
        name: 'Test User'
      },
      expectedError: 'email'
    },
    {
      name: 'weak_password',
      data: {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      },
      expectedError: 'password'
    },
    {
      name: 'missing_name',
      data: {
        email: 'test@example.com',
        password: 'SecurePass123!'
      },
      expectedError: 'name'
    },
    {
      name: 'invalid_role',
      data: {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'invalid_role'
      },
      expectedError: 'role'
    }
  ],

  validLogin: {
    email: 'farmer@test.com',
    password: 'FarmerPass123!'
  },

  invalidLogins: [
    {
      name: 'wrong_email',
      data: {
        email: 'nonexistent@test.com',
        password: 'SomePass123!'
      },
      expectedError: 'Invalid email or password'
    },
    {
      name: 'wrong_password',
      data: {
        email: 'farmer@test.com',
        password: 'WrongPass123!'
      },
      expectedError: 'Invalid email or password'
    },
    {
      name: 'empty_email',
      data: {
        email: '',
        password: 'SomePass123!'
      },
      expectedError: 'email'
    },
    {
      name: 'empty_password',
      data: {
        email: 'farmer@test.com',
        password: ''
      },
      expectedError: 'password'
    }
  ],

  maliciousInputs: {
    xss: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')" />',
      '<div onclick="malicious()">content</div>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>'
    ],
    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
      "' UNION SELECT * FROM users WHERE '1'='1",
      "'; UPDATE users SET role='admin' WHERE email='victim@test.com'; --"
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/shadow',
      '../../../../root/.ssh/id_rsa'
    ],
    oversized: {
      name: 'x'.repeat(1000),
      location: 'y'.repeat(2000),
      hugeName: 'z'.repeat(100000)
    }
  }
};

/**
 * Authentication Token Utilities
 */
class TokenUtils {
  /**
   * Create a valid JWT token for a user
   * @param {Object} userData - User data to include in token
   * @param {Object} options - Token options (expiresIn, etc.)
   * @returns {string} JWT token
   */
  static createValidToken(userData = TEST_USERS.farmer, options = {}) {
    const defaultOptions = {
      expiresIn: options.expiresIn || '7d'
    };

    return jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      TEST_JWT_SECRET,
      defaultOptions
    );
  }

  /**
   * Create an expired JWT token
   * @param {Object} userData - User data to include in token
   * @returns {string} Expired JWT token
   */
  static createExpiredToken(userData = TEST_USERS.farmer) {
    return jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      TEST_JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    );
  }

  /**
   * Create a malformed token
   * @returns {string} Malformed token
   */
  static createMalformedToken() {
    return 'invalid.jwt.token.format';
  }

  /**
   * Create a token with invalid signature
   * @returns {string} Token with invalid signature
   */
  static createTokenWithInvalidSignature() {
    const validToken = this.createValidToken();
    const parts = validToken.split('.');
    parts[2] = 'invalid_signature';
    return parts.join('.');
  }

  /**
   * Create a token with tampered payload
   * @param {Object} tamperedData - Data to inject into payload
   * @returns {string} Token with tampered payload
   */
  static createTokenWithTamperedPayload(tamperedData = { role: 'admin', id: 999 }) {
    const validToken = this.createValidToken();
    const [header, , signature] = validToken.split('.');
    
    const tamperedPayload = Buffer.from(JSON.stringify(tamperedData))
      .toString('base64')
      .replace(/=/g, '');
    
    return `${header}.${tamperedPayload}.${signature}`;
  }

  /**
   * Decode a JWT token without verification
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

/**
 * Password Utilities
 */
class PasswordUtils {
  /**
   * Create a hashed password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} rounds - Salt rounds (default: 12)
   * @returns {Promise<string>} Hashed password
   */
  static async createHashedPassword(password, rounds = 12) {
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Get pre-hashed passwords for common test passwords
   * @returns {Object} Object with pre-hashed passwords
   */
  static getPreHashedPasswords() {
    return {
      'FarmerPass123!': '$2a$12$5yGV2pT8WbVU9O5g7k3NxOWJQEh4OKZ6r7WQ8w1jQK2X0sY9eR3S6',
      'AgronomistPass123!': '$2a$12$mG8qT9wB4vU9O6g8k4NyOWJQEh5OKZ7r8WQ9w2jQK3X1sY0eR4T7',
      'AdminPass123!': '$2a$12$nH9rU0wC5vV0P7h9l5OzPWKREh6PL8s9XR0x3kRLY4Y2tZ1fS5U8',
      'TestPass123!': '$2a$12$oI0sV1xD6wW1Q8i0m6P0QXLSFi7QM9t0YS1y4lSM5Z3uA2gT6V9'
    };
  }
}

/**
 * Database Mock Utilities
 */
class DatabaseMockUtils {
  /**
   * Setup successful registration mocks
   * @param {Object} mockFunctions - Database mock functions
   * @param {Object} userData - User data to return
   */
  static setupSuccessfulRegistration(mockFunctions, userData = TEST_USERS.farmer) {
    const { getQuery, runQuery } = mockFunctions;
    
    getQuery.mockResolvedValueOnce(null); // No existing user
    runQuery.mockResolvedValueOnce({ id: userData.id }); // User creation
    getQuery.mockResolvedValueOnce(userData); // Get created user
  }

  /**
   * Setup successful login mocks
   * @param {Object} mockFunctions - Database mock functions
   * @param {Object} userData - User data to return
   * @param {string} password - Password to hash
   */
  static async setupSuccessfulLogin(mockFunctions, userData = TEST_USERS.farmer, password = 'FarmerPass123!') {
    const { getQuery, runQuery } = mockFunctions;
    const hashedPassword = await PasswordUtils.createHashedPassword(password);
    
    getQuery.mockResolvedValueOnce({
      ...userData,
      password_hash: hashedPassword
    });
    runQuery.mockResolvedValueOnce(true); // Update last login
  }

  /**
   * Setup failed login mocks (user not found)
   * @param {Object} mockFunctions - Database mock functions
   */
  static setupFailedLogin(mockFunctions) {
    const { getQuery } = mockFunctions;
    getQuery.mockResolvedValueOnce(null); // User not found
  }

  /**
   * Setup inactive user login mocks
   * @param {Object} mockFunctions - Database mock functions
   * @param {string} password - Password to hash
   */
  static async setupInactiveUserLogin(mockFunctions, password = 'TestPass123!') {
    const { getQuery } = mockFunctions;
    const hashedPassword = await PasswordUtils.createHashedPassword(password);
    
    getQuery.mockResolvedValueOnce({
      ...TEST_USERS.inactive,
      password_hash: hashedPassword
    });
  }

  /**
   * Setup duplicate email registration mocks
   * @param {Object} mockFunctions - Database mock functions
   */
  static setupDuplicateEmailRegistration(mockFunctions) {
    const { getQuery } = mockFunctions;
    getQuery.mockResolvedValueOnce({ id: 1 }); // Existing user
  }

  /**
   * Setup authentication token validation mocks
   * @param {Object} mockFunctions - Database mock functions
   * @param {Object} userData - User data to return
   */
  static setupTokenValidation(mockFunctions, userData = TEST_USERS.farmer) {
    const { getQuery } = mockFunctions;
    getQuery.mockResolvedValueOnce(userData);
  }

  /**
   * Setup user not found for token validation
   * @param {Object} mockFunctions - Database mock functions
   */
  static setupUserNotFoundForToken(mockFunctions) {
    const { getQuery } = mockFunctions;
    getQuery.mockResolvedValueOnce(null);
  }
}

/**
 * Request Test Utilities
 */
class RequestTestUtils {
  /**
   * Create authorization header with Bearer token
   * @param {string} token - JWT token
   * @returns {Object} Headers object
   */
  static createAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Create cookie header with auth token
   * @param {string} token - JWT token
   * @returns {Object} Headers object
   */
  static createCookieHeaders(token) {
    return {
      'Cookie': `auth_token=${token}`
    };
  }

  /**
   * Extract token from Set-Cookie header
   * @param {Array} setCookieHeaders - Set-Cookie headers from response
   * @returns {string|null} Extracted token or null
   */
  static extractTokenFromSetCookie(setCookieHeaders) {
    if (!setCookieHeaders) return null;
    
    const authCookie = setCookieHeaders.find(cookie => 
      cookie.includes('auth_token')
    );
    
    if (!authCookie) return null;
    
    const tokenMatch = authCookie.match(/auth_token=([^;]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  }

  /**
   * Validate cookie security attributes
   * @param {Array} setCookieHeaders - Set-Cookie headers from response
   * @returns {Object} Validation results
   */
  static validateCookieSecurity(setCookieHeaders) {
    const authCookie = setCookieHeaders?.find(cookie => 
      cookie.includes('auth_token')
    );
    
    if (!authCookie) {
      return { found: false };
    }

    return {
      found: true,
      httpOnly: authCookie.includes('HttpOnly'),
      secure: authCookie.includes('Secure'),
      sameSite: authCookie.includes('SameSite'),
      sameSiteStrict: authCookie.includes('SameSite=Strict')
    };
  }
}

/**
 * Test Data Validation Utilities
 */
class ValidationTestUtils {
  /**
   * Generate test cases for input validation
   * @param {string} fieldName - Name of the field to test
   * @param {Array} validValues - Array of valid values
   * @param {Array} invalidValues - Array of invalid values
   * @returns {Array} Test cases
   */
  static generateValidationTestCases(fieldName, validValues, invalidValues) {
    const testCases = [];

    validValues.forEach(value => {
      testCases.push({
        name: `valid_${fieldName}_${typeof value}`,
        data: { [fieldName]: value },
        shouldPass: true
      });
    });

    invalidValues.forEach(value => {
      testCases.push({
        name: `invalid_${fieldName}_${typeof value}`,
        data: { [fieldName]: value },
        shouldPass: false
      });
    });

    return testCases;
  }

  /**
   * Create rate limiting test helper
   * @param {number} requestCount - Number of requests to make
   * @param {Function} requestFunction - Function that returns a request promise
   * @returns {Promise<Array>} Array of responses
   */
  static async testRateLimit(requestCount, requestFunction) {
    const requests = Array(requestCount).fill().map(() => requestFunction());
    const responses = await Promise.all(requests);
    
    const successful = responses.filter(res => res.status < 400);
    const rateLimited = responses.filter(res => res.status === 429);
    const failed = responses.filter(res => res.status >= 400 && res.status !== 429);

    return {
      total: responses.length,
      successful: successful.length,
      rateLimited: rateLimited.length,
      failed: failed.length,
      responses
    };
  }
}

/**
 * Security Test Utilities
 */
class SecurityTestUtils {
  /**
   * Test XSS prevention in response
   * @param {Object} responseBody - Response body to check
   * @param {Array} maliciousStrings - Array of malicious strings to check for
   * @returns {Object} Test results
   */
  static testXSSPrevention(responseBody, maliciousStrings = TEST_DATA.maliciousInputs.xss) {
    const responseString = JSON.stringify(responseBody);
    const foundMalicious = [];

    maliciousStrings.forEach(maliciousString => {
      if (responseString.includes(maliciousString)) {
        foundMalicious.push(maliciousString);
      }
    });

    return {
      passed: foundMalicious.length === 0,
      foundMalicious,
      responseString
    };
  }

  /**
   * Test SQL injection prevention patterns
   * @param {string} input - Input string to test
   * @returns {boolean} True if input contains SQL injection patterns
   */
  static containsSQLInjectionPatterns(input) {
    const sqlPatterns = [
      /';.*DROP.*TABLE/i,
      /';.*INSERT.*INTO/i,
      /';.*UPDATE.*SET/i,
      /';.*DELETE.*FROM/i,
      /UNION.*SELECT/i,
      /'.*OR.*'.*='.*'/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Generate security headers test cases
   * @returns {Array} Array of expected security headers
   */
  static getExpectedSecurityHeaders() {
    return [
      { name: 'x-content-type-options', expected: 'nosniff' },
      { name: 'x-frame-options', expected: 'DENY' },
      { name: 'x-xss-protection', expected: '1; mode=block' },
      { name: 'content-security-policy', required: true },
      { name: 'x-request-id', required: true }
    ];
  }
}

module.exports = {
  TEST_USERS,
  TEST_DATA,
  TokenUtils,
  PasswordUtils,
  DatabaseMockUtils,
  RequestTestUtils,
  ValidationTestUtils,
  SecurityTestUtils,
  TEST_JWT_SECRET
};