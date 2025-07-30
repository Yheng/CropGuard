# CropGuard Authentication System - Comprehensive Test Suite

This directory contains a comprehensive test suite for the CropGuard authentication system, designed to ensure production-ready security, functionality, and reliability.

## Test Files Overview

### Core Test Files

1. **`auth-comprehensive.test.js`** - Main comprehensive authentication tests
   - Registration flow testing (valid/invalid data, role-based registration)
   - Login flow testing (credential validation, inactive users, JWT tokens)
   - Token-based authentication (protected routes, expired tokens, malformed tokens)
   - Role-based access control (farmer/agronomist/admin permissions)
   - Security features (input sanitization, XSS prevention, SQL injection prevention)
   - Rate limiting and brute force protection
   - Error handling and edge cases

2. **`auth-rbac.test.js`** - Detailed role-based access control tests
   - User management access control
   - Analysis management permissions
   - Treatment management permissions
   - Analytics access control
   - Cross-role access attempt prevention
   - Privilege escalation prevention
   - Resource ownership validation

3. **`auth-security-advanced.test.js`** - Advanced security scenario tests
   - Advanced input sanitization (XSS, SQL injection, path traversal)
   - Token security (tampering detection, replay attack prevention)
   - Advanced rate limiting and DDoS protection
   - Session security and cookie protection
   - Error information disclosure prevention
   - Advanced brute force protection

### Utility Files

4. **`auth-test-utils.js`** - Comprehensive test utilities and helpers
   - Pre-defined test users and data
   - Token generation utilities
   - Password hashing utilities
   - Database mock utilities
   - Request test utilities
   - Security test utilities
   - Validation test utilities

### Configuration Files

5. **`setup.js`** - Test environment setup and configuration
6. **`testApp.js`** - Test application factory

## Test Coverage Areas

### 1. Registration Flow Testing ✅

**Valid Registration Scenarios:**
- Farmer registration with minimal data
- Agronomist registration with complete data
- Admin user registration
- Role-based registration validation

**Invalid Registration Scenarios:**
- Missing required fields (email, password, name)
- Invalid email formats
- Weak passwords (< 8 characters, > 128 characters)
- Invalid roles
- Short names, invalid phone formats

**Duplicate Email Handling:**
- Case-insensitive email checking
- Proper conflict resolution

**Input Sanitization:**
- XSS prevention in registration fields
- Malicious script tag removal
- JavaScript URL sanitization

### 2. Login Flow Testing ✅

**Valid Credential Testing:**
- Successful login with correct credentials
- Last login timestamp updates
- JWT token generation and validation
- Cookie-based authentication

**Invalid Credential Testing:**
- Non-existent email handling
- Incorrect password rejection
- Empty field validation
- Case-insensitive email support

**Account Status Validation:**
- Inactive user login prevention
- Proper error messaging
- No sensitive information disclosure

### 3. Token-Based Authentication ✅

**Protected Route Access:**
- Valid Bearer token authentication
- HttpOnly cookie authentication
- Token priority (cookie over header)
- Fresh user data retrieval

**Token Validation:**
- Expired token rejection
- Malformed token handling
- Invalid signature detection
- Missing token scenarios

**Security Features:**
- Token tampering detection
- Payload manipulation prevention
- Algorithm confusion attack prevention
- Timing attack resistance

### 4. Role-Based Access Control ✅

**Role Permissions:**
- **Farmer**: Profile access, own data only
- **Agronomist**: Analysis review, treatment creation
- **Admin**: Full system access, user management

**Access Control Validation:**
- Cross-role access prevention
- Resource ownership validation
- Privilege escalation prevention
- Lateral movement prevention

**Role Consistency:**
- Role persistence across requests
- Database role priority over token
- Role change handling

### 5. Security Features ✅

**Input Sanitization:**
- XSS attack prevention (script tags, event handlers, JavaScript URLs)
- SQL injection prevention
- Path traversal prevention
- Data size limit enforcement

**Authentication Security:**
- CSRF protection (HttpOnly cookies, SameSite attributes)
- Secure cookie attributes
- Token replay attack prevention
- Session security

**Security Headers:**
- Content Security Policy
- X-Frame-Options, X-XSS-Protection
- X-Content-Type-Options
- Request ID generation

### 6. Rate Limiting and Brute Force Protection ✅

**Rate Limiting:**
- Login attempt limiting (5 attempts/5 minutes)
- Registration rate limiting
- Password change limiting (3 attempts/15 minutes)
- Global rate limiting (100 requests/60 seconds)

**Brute Force Protection:**
- Account lockout mechanisms
- Progressive rate limiting
- Suspicious pattern detection
- Distributed attack handling

### 7. Error Handling and Edge Cases ✅

**Database Error Handling:**
- Connection failure graceful handling
- No sensitive information exposure
- Consistent error responses

**Malformed Request Handling:**
- Invalid JSON parsing
- Oversized request rejection
- Missing request body handling

**Concurrent Request Handling:**
- Thread safety validation
- Resource exhaustion protection
- Performance under load

## Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure test environment variables are set
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-key-for-testing-only
```

### Running Individual Test Suites

```bash
# Run comprehensive authentication tests
npm test -- auth-comprehensive.test.js

# Run role-based access control tests
npm test -- auth-rbac.test.js

# Run advanced security tests
npm test -- auth-security-advanced.test.js

# Run all authentication tests
npm test -- --testPathPattern=auth
```

### Running with Coverage

```bash
# Generate test coverage report
npm test -- --coverage --testPathPattern=auth

# Coverage output location: backend/coverage/
```

### Running Specific Test Categories

```bash
# Registration tests only
npm test -- --testNamePattern="Registration Flow"

# Login tests only
npm test -- --testNamePattern="Login Flow"

# Security tests only
npm test -- --testNamePattern="Security Features"

# Rate limiting tests only
npm test -- --testNamePattern="Rate Limiting"
```

## Test Data and Utilities

### Pre-defined Test Users

```javascript
const TEST_USERS = {
  farmer: { id: 1, email: 'farmer@test.com', role: 'farmer' },
  agronomist: { id: 2, email: 'agronomist@test.com', role: 'agronomist' },
  admin: { id: 3, email: 'admin@test.com', role: 'admin' },
  inactive: { id: 4, email: 'inactive@test.com', is_active: 0 }
};
```

### Utility Functions

```javascript
// Create valid JWT tokens
const token = TokenUtils.createValidToken(TEST_USERS.farmer);

// Create expired tokens
const expiredToken = TokenUtils.createExpiredToken();

// Setup database mocks for successful registration
DatabaseMockUtils.setupSuccessfulRegistration({ getQuery, runQuery });

// Test XSS prevention
const xssTest = SecurityTestUtils.testXSSPrevention(responseBody);
```

## Security Test Scenarios

### XSS Prevention Tests
- Script tag injection
- Event handler injection
- JavaScript URL injection
- Nested XSS attempts
- XSS in error messages

### SQL Injection Prevention Tests
- Classic SQL injection patterns
- Union-based attacks
- Time-based blind attacks
- Legitimate apostrophe handling

### CSRF Protection Tests
- SameSite cookie attributes
- HttpOnly cookie validation
- Secure cookie attributes
- Proper cookie clearing

### Token Security Tests
- Header tampering detection
- Payload manipulation detection
- Signature validation
- Algorithm confusion prevention
- Token replay protection

## Performance and Load Testing

### Rate Limiting Tests
- Sequential request limits
- Concurrent request handling
- Distributed attack simulation
- Progressive rate limiting

### Brute Force Protection Tests
- Account lockout mechanisms
- IP-based blocking
- Pattern recognition
- Recovery procedures

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Include both positive and negative test cases
- Test edge cases and error conditions

### Mock Management
- Clear mocks between tests
- Use realistic mock data
- Mock external dependencies consistently
- Verify mock interactions

### Security Testing
- Test with malicious inputs
- Validate sanitization effectiveness
- Check for information disclosure
- Verify access control enforcement

### Performance Testing
- Test rate limiting behavior
- Validate concurrent request handling
- Check resource utilization
- Monitor response times

## Continuous Integration

### Test Pipeline
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Component interaction testing
3. **Security Tests**: Vulnerability and attack simulation
4. **Performance Tests**: Load and stress testing
5. **End-to-End Tests**: Complete workflow validation

### Quality Gates
- Minimum 95% test coverage
- All security tests must pass
- No critical vulnerabilities
- Performance benchmarks met
- All rate limiting tests pass

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase Jest timeout: `jest.setTimeout(30000)`
- Check for unresolved promises
- Verify mock setup

**Rate limiting tests failing:**
- Ensure proper test isolation
- Clear rate limit state between tests
- Use appropriate timeouts

**Database mock issues:**
- Verify mock setup order
- Check mock return values
- Ensure mocks are cleared

**Token tests failing:**
- Verify JWT_SECRET is set
- Check token expiration times
- Validate token format

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test -- auth-comprehensive.test.js

# Run specific test with verbose output
npm test -- --verbose --testNamePattern="should register new user"
```

## Contributing

When adding new authentication features:

1. **Add corresponding tests** in appropriate test files
2. **Update test utilities** if new helpers are needed
3. **Test security implications** of new features
4. **Verify role-based access** for new endpoints
5. **Update documentation** with new test coverage

### Test Writing Guidelines

- Write tests before implementation (TDD)
- Include both happy path and error cases
- Test boundary conditions
- Verify security implications
- Use descriptive test names
- Group related tests logically
- Mock dependencies appropriately

## Security Compliance

This test suite validates compliance with:

- **OWASP Top 10** security vulnerabilities
- **JWT Best Practices** for token security
- **Rate Limiting Standards** for DDoS protection
- **Input Validation Standards** for data security
- **Authentication Standards** for access control

The comprehensive test coverage ensures the CropGuard authentication system is production-ready and secure against common attack vectors.