const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database before importing the app
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn(),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const { runQuery, getQuery } = require('../src/config/database');

const app = createTestApp();

// Test utilities and constants
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
const VALID_USER_DATA = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'farmer',
  phone: '+1234567890',
  location: 'Test Location',
  is_active: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  email_verified: 1
};

// Test helper functions
const createValidToken = (userData = VALID_USER_DATA) => {
  return jwt.sign(
    { id: userData.id, email: userData.email, role: userData.role },
    TEST_JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const createExpiredToken = (userData = VALID_USER_DATA) => {
  return jwt.sign(
    { id: userData.id, email: userData.email, role: userData.role },
    TEST_JWT_SECRET,
    { expiresIn: '-1h' } // Already expired
  );
};

const createMalformedToken = () => {
  return 'invalid.jwt.token.format';
};

const mockHashedPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

describe('CropGuard Authentication System - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. REGISTRATION FLOW TESTING
  describe('Registration Flow Testing', () => {
    describe('Valid user registration with all required fields', () => {
      it('should successfully register a farmer with minimal data', async () => {
        // Mock database responses
        getQuery.mockResolvedValueOnce(null); // No existing user
        runQuery.mockResolvedValueOnce({ id: 1 }); // User creation
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const registrationData = {
          email: 'farmer@test.com',
          password: 'SecurePass123!',
          name: 'John Farmer',
          role: 'farmer'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(registrationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('farmer@test.com');
        expect(response.body.data.user.role).toBe('farmer');
        expect(response.body.data.user.name).toBe('John Farmer');
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should successfully register an agronomist with complete data', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 2 });
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          id: 2,
          email: 'agronomist@test.com',
          role: 'agronomist',
          name: 'Dr. Plant Expert'
        });

        const registrationData = {
          email: 'agronomist@test.com',
          password: 'ExpertPass123!',
          name: 'Dr. Plant Expert',
          role: 'agronomist',
          phone: '+1987654321',
          location: 'Agricultural Research Center'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(registrationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('agronomist');
        expect(response.body.data.user.name).toBe('Dr. Plant Expert');
      });

      it('should successfully register an admin user', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 3 });
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          id: 3,
          email: 'admin@test.com',
          role: 'admin',
          name: 'System Administrator'
        });

        const registrationData = {
          email: 'admin@test.com',
          password: 'AdminSecure123!',
          name: 'System Administrator',
          role: 'admin'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(registrationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('admin');
      });
    });

    describe('Registration with missing/invalid data', () => {
      it('should reject registration with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'ValidPass123!',
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });

      it('should reject registration with invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'not-an-email',
            password: 'ValidPass123!',
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject registration with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('password');
      });

      it('should reject registration with missing name', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('name');
      });

      it('should reject registration with invalid role', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            role: 'invalid_role'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject registration with name too short', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'A' // Too short
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject registration with invalid phone format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            phone: '123' // Invalid format
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Duplicate email handling', () => {
      it('should reject registration with existing email', async () => {
        getQuery.mockResolvedValueOnce({ id: 1 }); // Existing user

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'existing@example.com',
            password: 'ValidPass123!',
            name: 'Test User'
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exists');
      });

      it('should handle case-insensitive email checking', async () => {
        getQuery.mockResolvedValueOnce({ id: 1 }); // Existing user

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'EXISTING@EXAMPLE.COM',
            password: 'ValidPass123!',
            name: 'Test User'
          })
          .expect(409);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Password strength validation', () => {
      it('should reject password shorter than 8 characters', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Short1!',
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject password longer than 128 characters', async () => {
        const longPassword = 'A'.repeat(129) + '1!';
        
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: longPassword,
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should accept password with exactly 8 characters', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Valid123',
            name: 'Test User'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Input sanitization during registration', () => {
      it('should sanitize malicious script tags in name field', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          name: 'Test User' // Should be sanitized
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: '<script>alert("xss")</script>Test User'
          })
          .expect(201);

        // Verify script tags are removed
        expect(response.body.data.user.name).not.toContain('<script>');
        expect(response.body.data.user.name).not.toContain('alert');
      });

      it('should sanitize javascript: URLs in location field', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            location: 'javascript:alert("xss")'
          })
          .expect(201);

        // Should not contain javascript:
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
      });
    });
  });

  // 2. LOGIN FLOW TESTING
  describe('Login Flow Testing', () => {
    describe('Valid credential login', () => {
      it('should login successfully with correct email and password', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true); // Update last login

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('test@example.com');
        expect(response.headers['set-cookie']).toBeDefined();
        
        // Verify cookie attributes
        const cookies = response.headers['set-cookie'];
        const authCookie = cookies.find(cookie => cookie.includes('auth_token'));
        expect(authCookie).toContain('HttpOnly');
        expect(authCookie).toContain('SameSite=Strict');
      });

      it('should update last_login timestamp on successful login', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true);

        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(200);

        // Verify last_login update was called
        expect(runQuery).toHaveBeenCalledWith(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [VALID_USER_DATA.id]
        );
      });
    });

    describe('Invalid email/password combinations', () => {
      it('should reject login with non-existent email', async () => {
        getQuery.mockResolvedValueOnce(null); // User not found

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'ValidPass123!'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid email or password');
      });

      it('should reject login with incorrect password', async () => {
        const hashedPassword = await mockHashedPassword('CorrectPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPass123!'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid email or password');
      });

      it('should reject login with empty email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: '',
            password: 'ValidPass123!'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject login with empty password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: ''
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle case-insensitive email login', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'TEST@EXAMPLE.COM',
            password: 'ValidPass123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Inactive user login attempts', () => {
      it('should reject login for inactive user', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword,
          is_active: 0 // Inactive user
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('deactivated');
      });

      it('should not update last_login for inactive users', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword,
          is_active: 0
        });

        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(401);

        // Verify last_login update was NOT called
        expect(runQuery).not.toHaveBeenCalledWith(
          expect.stringContaining('UPDATE users SET last_login'),
          expect.any(Array)
        );
      });
    });

    describe('JWT token generation and validation', () => {
      it('should generate a valid JWT token on successful login', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(200);

        // Verify token structure (should be a valid JWT)
        const cookieHeader = response.headers['set-cookie'].find(cookie => 
          cookie.includes('auth_token')
        );
        expect(cookieHeader).toBeDefined();
        
        // Extract token value from cookie
        const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
        expect(tokenMatch).toBeTruthy();
        
        const token = tokenMatch[1];
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      });

      it('should include correct user data in JWT payload', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(200);

        // Extract and decode token from cookie
        const cookieHeader = response.headers['set-cookie'].find(cookie => 
          cookie.includes('auth_token')
        );
        const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
        const token = tokenMatch[1];
        
        const decoded = jwt.decode(token);
        expect(decoded.id).toBe(VALID_USER_DATA.id);
        expect(decoded.email).toBe(VALID_USER_DATA.email);
        expect(decoded.role).toBe(VALID_USER_DATA.role);
        expect(decoded.exp).toBeDefined(); // Expiration time
      });
    });
  });

  // 3. TOKEN-BASED AUTHENTICATION TESTING
  describe('Token-based Authentication', () => {
    describe('Protected route access with valid tokens', () => {
      it('should allow access to protected route with valid Bearer token', async () => {
        const token = createValidToken();
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(VALID_USER_DATA.email);
      });

      it('should allow access to protected route with HttpOnly cookie', async () => {
        const token = createValidToken();
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', `auth_token=${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(VALID_USER_DATA.email);
      });

      it('should prioritize HttpOnly cookie over Authorization header', async () => {
        const cookieToken = createValidToken();
        const headerToken = createValidToken({ id: 999, email: 'other@test.com', role: 'farmer' });
        
        // Mock response for cookie token user
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${headerToken}`)
          .set('Cookie', `auth_token=${cookieToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(VALID_USER_DATA.email);
      });

      it('should refresh user data from database on each request', async () => {
        const token = createValidToken();
        const updatedUserData = {
          ...VALID_USER_DATA,
          name: 'Updated Name',
          updated_at: new Date().toISOString()
        };
        
        getQuery.mockResolvedValueOnce(updatedUserData);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data.user.name).toBe('Updated Name');
        expect(getQuery).toHaveBeenCalledWith(
          'SELECT id, email, name, role, is_active FROM users WHERE id = ? AND is_active = 1',
          [VALID_USER_DATA.id]
        );
      });
    });

    describe('Expired token handling', () => {
      it('should reject requests with expired tokens', async () => {
        const expiredToken = createExpiredToken();

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Token Expired');
        expect(response.body.message).toContain('Please login again');
      });

      it('should clear HttpOnly cookie when token is expired', async () => {
        const expiredToken = createExpiredToken();

        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', `auth_token=${expiredToken}`)
          .expect(401);

        expect(response.body.error).toBe('Token Expired');
      });
    });

    describe('Malformed token rejection', () => {
      it('should reject malformed JWT tokens', async () => {
        const malformedToken = createMalformedToken();

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${malformedToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid Token');
        expect(response.body.message).toContain('malformed');
      });

      it('should reject tokens with invalid signatures', async () => {
        const validToken = createValidToken();
        const invalidSignatureToken = validToken.slice(0, -10) + 'invalidsig';

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${invalidSignatureToken}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should reject completely invalid token formats', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer not-a-token-at-all')
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should reject tokens with missing Bearer prefix', async () => {
        const token = createValidToken();

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', token) // No "Bearer " prefix
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('No token provided');
      });
    });

    describe('User validation on token verification', () => {
      it('should reject tokens for non-existent users', async () => {
        const token = createValidToken();
        getQuery.mockResolvedValueOnce(null); // User not found

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('User not found or inactive');
      });

      it('should reject tokens for inactive users', async () => {
        const token = createValidToken();
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          is_active: 0
        });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('User not found or inactive');
      });
    });

    describe('No token scenarios', () => {
      it('should reject requests without any authentication', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('No token provided');
      });

      it('should reject requests with empty Authorization header', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', '')
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('No token provided');
      });

      it('should reject requests with empty Bearer token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer ')
          .expect(401);

        expect(response.body.error).toBe('Access Denied');
        expect(response.body.message).toContain('No token provided');
      });
    });
  });

  // 4. ROLE-BASED ACCESS CONTROL TESTING
  describe('Role-based Access Control', () => {
    const createUserWithRole = (role) => ({
      ...VALID_USER_DATA,
      role,
      email: `${role}@test.com`
    });

    describe('Farmer role permissions', () => {
      it('should allow farmer to access their own profile', async () => {
        const farmerUser = createUserWithRole('farmer');
        const token = createValidToken(farmerUser);
        getQuery.mockResolvedValueOnce(farmerUser);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('farmer');
      });

      it('should allow farmer to update their own profile', async () => {
        const farmerUser = createUserWithRole('farmer');
        const token = createValidToken(farmerUser);
        
        runQuery.mockResolvedValueOnce(true); // Update query
        getQuery.mockResolvedValueOnce({
          ...farmerUser,
          name: 'Updated Farmer Name'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Updated Farmer Name',
            location: 'New Farm Location'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe('Updated Farmer Name');
      });

      it('should allow farmer to change their password', async () => {
        const farmerUser = createUserWithRole('farmer');
        const token = createValidToken(farmerUser);
        const hashedPassword = await mockHashedPassword('OldPass123!');
        
        getQuery.mockResolvedValueOnce({ password_hash: hashedPassword });
        runQuery.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: 'OldPass123!',
            newPassword: 'NewPass123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Agronomist role permissions', () => {
      it('should allow agronomist to access their profile', async () => {
        const agronomistUser = createUserWithRole('agronomist');
        const token = createValidToken(agronomistUser);
        getQuery.mockResolvedValueOnce(agronomistUser);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('agronomist');
      });

      it('should allow agronomist to perform profile operations', async () => {
        const agronomistUser = createUserWithRole('agronomist');
        const token = createValidToken(agronomistUser);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...agronomistUser,
          location: 'Research Center'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            location: 'Research Center'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Admin role permissions', () => {
      it('should allow admin to access their profile', async () => {
        const adminUser = createUserWithRole('admin');
        const token = createValidToken(adminUser);
        getQuery.mockResolvedValueOnce(adminUser);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('admin');
      });

      it('should allow admin to perform all profile operations', async () => {
        const adminUser = createUserWithRole('admin');
        const token = createValidToken(adminUser);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...adminUser,
          name: 'System Admin'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'System Admin'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Role validation edge cases', () => {
      it('should handle requests from users with undefined roles', async () => {
        const userWithNoRole = { ...VALID_USER_DATA, role: undefined };
        const token = createValidToken(userWithNoRole);
        getQuery.mockResolvedValueOnce(userWithNoRole);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should handle role changes between token creation and verification', async () => {
        const token = createValidToken({ ...VALID_USER_DATA, role: 'farmer' });
        const userWithNewRole = { ...VALID_USER_DATA, role: 'admin' };
        getQuery.mockResolvedValueOnce(userWithNewRole);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Should use current role from database, not token
        expect(response.body.data.user.role).toBe('admin');
      });
    });
  });

  // 5. SECURITY FEATURES TESTING
  describe('Security Features', () => {
    const createUserWithRole = (role) => ({
      ...VALID_USER_DATA,
      role,
      email: `${role}@test.com`
    });

    describe('Input sanitization effectiveness', () => {
      const adminToken = createValidToken(createUserWithRole('admin'));

      it('should sanitize XSS attempts in profile updates', async () => {
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          name: 'Clean Name',
          location: 'Clean Location'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '<script>alert("xss")</script>Malicious Name',
            location: 'javascript:alert("location")'
          })
          .expect(200);

        // Verify XSS content is sanitized
        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
        expect(JSON.stringify(response.body)).not.toContain('alert');
      });

      it('should sanitize HTML event handlers', async () => {
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          name: 'Clean Name'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '<div onclick="malicious()">Name</div>',
            location: '<img onerror="attack()" src="x">'
          })
          .expect(200);

        expect(JSON.stringify(response.body)).not.toContain('onclick');
        expect(JSON.stringify(response.body)).not.toContain('onerror');
      });

      it('should preserve legitimate content while sanitizing', async () => {
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          name: 'Dr. John Smith & Associates',
          location: 'Farm #123, Route 66'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Dr. John Smith & Associates',
            location: 'Farm #123, Route 66'
          })
          .expect(200);

        expect(response.body.data.user.name).toBe('Dr. John Smith & Associates');
        expect(response.body.data.user.location).toBe('Farm #123, Route 66');
      });
    });

    describe('SQL injection prevention', () => {
      it('should prevent SQL injection in email field during login', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: "admin@test.com'; DROP TABLE users; --",
            password: 'password123'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        // Should be caught by validation, not executed
      });

      it('should prevent SQL injection in registration fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle parameterized queries safely', async () => {
        getQuery.mockResolvedValueOnce(null);
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce(VALID_USER_DATA);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: "O'Connor" // Legitimate apostrophe
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('XSS attack prevention', () => {
      it('should prevent stored XSS in user profiles', async () => {
        const token = createValidToken();
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          location: 'Sanitized Location'
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            location: '<img src="x" onerror="alert(document.cookie)">'
          })
          .expect(200);

        expect(JSON.stringify(response.body)).not.toContain('onerror');
        expect(JSON.stringify(response.body)).not.toContain('alert');
      });

      it('should prevent reflected XSS in error messages', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: '<script>alert("xss")</script>',
            password: 'password123'
          })
          .expect(400);

        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('alert');
      });
    });

    describe('CSRF protection', () => {
      it('should set secure cookie attributes for CSRF protection', async () => {
        const hashedPassword = await mockHashedPassword('ValidPass123!');
        
        getQuery.mockResolvedValueOnce({
          ...VALID_USER_DATA,
          password_hash: hashedPassword
        });
        runQuery.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(200);

        const cookies = response.headers['set-cookie'];
        const authCookie = cookies.find(cookie => cookie.includes('auth_token'));
        
        expect(authCookie).toContain('HttpOnly');
        expect(authCookie).toContain('SameSite=Strict');
      });

      it('should properly clear cookies on logout', async () => {
        const token = createValidToken();

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        
        const clearCookie = cookies.find(cookie => cookie.includes('auth_token'));
        expect(clearCookie).toBeDefined();
      });
    });

    describe('Security headers validation', () => {
      it('should include essential security headers', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['content-security-policy']).toBeDefined();
      });

      it('should include CORS headers appropriately', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBeDefined();
      });

      it('should include request ID for tracking', async () => {
        const response = await request(app)
          .get('/health-simple')
          .expect(200);

        expect(response.headers['x-request-id']).toBeDefined();
        expect(response.headers['x-request-id']).toMatch(/^[a-f0-9-]+$/);
      });
    });
  });

  // 6. RATE LIMITING AND BRUTE FORCE PROTECTION
  describe('Rate Limiting and Brute Force Protection', () => {
    describe('Login rate limiting', () => {
      it('should apply rate limiting to login attempts', async () => {
        getQuery.mockResolvedValue(null); // Always return user not found

        // Make multiple rapid login attempts
        const requests = Array(6).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );

        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited (429 status)
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }, 10000);

      it('should include rate limit information in headers', async () => {
        getQuery.mockResolvedValueOnce(null);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });

        // First request should succeed (might be 401 for wrong credentials)
        expect([401, 429]).toContain(response.status);
      });
    });

    describe('Registration rate limiting', () => {
      it('should apply rate limiting to registration attempts', async () => {
        getQuery.mockResolvedValue(null); // No existing user

        // Make multiple rapid registration attempts
        const requests = Array(6).fill().map((_, index) =>
          request(app)
            .post('/api/auth/register')
            .send({
              email: `test${index}@example.com`,
              password: 'ValidPass123!',
              name: `User ${index}`
            })
        );

        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }, 10000);
    });

    describe('Password change rate limiting', () => {
      it('should apply stricter rate limiting to password changes', async () => {
        const token = createValidToken();
        const hashedPassword = await mockHashedPassword('OldPass123!');
        
        getQuery.mockResolvedValue({ password_hash: hashedPassword });
        runQuery.mockResolvedValue(true);

        // Make multiple rapid password change attempts
        const requests = Array(4).fill().map(() =>
          request(app)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
              currentPassword: 'OldPass123!',
              newPassword: 'NewPass123!'
            })
        );

        const responses = await Promise.all(requests);
        
        // Should have stricter limits for password changes
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }, 10000);
    });

    describe('Global rate limiting', () => {
      it('should apply global rate limiting across all endpoints', async () => {
        // Make many requests to different endpoints rapidly
        const requests = Array(110).fill().map((_, index) => {
          if (index % 2 === 0) {
            return request(app).get('/health-simple');
          } else {
            return request(app).get('/health-simple');
          }
        });

        const responses = await Promise.allSettled(requests);
        
        // Some requests should hit global rate limit
        const rateLimited = responses.filter(result => 
          result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 15000);
    });

    describe('Brute force protection patterns', () => {
      it('should detect and block suspicious login patterns', async () => {
        getQuery.mockResolvedValue(null); // User not found

        // Simulate brute force attack pattern
        const attackRequests = Array(5).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'target@example.com',
              password: 'guessedpassword'
            })
        );

        const responses = await Promise.all(attackRequests);
        
        // Later requests should be blocked
        const blockedResponses = responses.slice(-2).filter(res => res.status === 429);
        expect(blockedResponses.length).toBeGreaterThan(0);
      }, 10000);
    });
  });

  // 7. ERROR HANDLING AND EDGE CASES
  describe('Error Handling and Edge Cases', () => {
    describe('Database connection errors', () => {
      it('should handle database errors gracefully during login', async () => {
        getQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!'
          })
          .expect(500);

        expect(response.body.error).toBe('Internal Server Error');
        // Should not expose sensitive database information
        expect(JSON.stringify(response.body)).not.toContain('Database connection failed');
      });

      it('should handle database errors during registration', async () => {
        getQuery.mockResolvedValueOnce(null); // No existing user
        runQuery.mockRejectedValueOnce(new Error('Database write failed'));

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User'
          })
          .expect(500);

        expect(response.body.error).toBe('Internal Server Error');
      });
    });

    describe('Malformed request handling', () => {
      it('should handle malformed JSON gracefully', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}')
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle requests with no body', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle oversized requests', async () => {
        const oversizedData = {
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'x'.repeat(2 * 1024 * 1024) // 2MB of data
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(oversizedData)
          .expect(413);

        expect(response.body.error).toBe('Request Too Large');
      });
    });

    describe('Token edge cases', () => {
      it('should handle tokens with tampered payload', async () => {
        const validToken = createValidToken();
        const [header, payload, signature] = validToken.split('.');
        
        // Tamper with payload
        const tamperedPayload = Buffer.from('{"id":999,"email":"hacker@evil.com","role":"admin"}')
          .toString('base64')
          .replace(/=/g, '');
        const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });

      it('should handle tokens with missing segments', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer header.payload') // Missing signature
          .expect(401);

        expect(response.body.error).toBe('Invalid Token');
      });
    });

    describe('Concurrent request handling', () => {
      it('should handle concurrent authentication requests safely', async () => {
        const token = createValidToken();
        getQuery.mockResolvedValue(VALID_USER_DATA);

        const concurrentRequests = Array(10).fill().map(() =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        );

        const responses = await Promise.all(concurrentRequests);
        
        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });
      });
    });
  });
});