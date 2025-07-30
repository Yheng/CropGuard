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
const { runQuery, getQuery, allQuery } = require('../src/config/database');

const app = createTestApp();

// Test constants
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// Test users for different roles
const TEST_USERS = {
  farmer: {
    id: 1,
    email: 'farmer@cropguard.com',
    name: 'John Farmer',
    role: 'farmer',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  agronomist: {
    id: 2,
    email: 'agronomist@cropguard.com',
    name: 'Dr. Plant Expert',
    role: 'agronomist',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  admin: {
    id: 3,
    email: 'admin@cropguard.com',
    name: 'System Administrator',
    role: 'admin',
    is_active: 1,
    created_at: new Date().toISOString()
  }
};

// Helper function to create tokens
const createTokenForUser = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn: '7d' }
  );
};

describe('Role-Based Access Control - Detailed Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management Access Control', () => {
    describe('Admin access to user management', () => {
      it('should allow admin to view all users', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        // Mock the user list response
        allQuery.mockResolvedValueOnce([
          TEST_USERS.farmer,
          TEST_USERS.agronomist,
          TEST_USERS.admin
        ]);

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(3);
      });

      it('should allow admin to view user details', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        getQuery.mockResolvedValueOnce(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/users/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(1);
      });

      it('should allow admin to update user roles', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...TEST_USERS.farmer,
          role: 'agronomist'
        });

        const response = await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: 'agronomist'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe('agronomist');
      });

      it('should allow admin to deactivate users', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          ...TEST_USERS.farmer,
          is_active: 0
        });

        const response = await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            isActive: false
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.is_active).toBe(0);
      });
    });

    describe('Agronomist access restrictions', () => {
      it('should deny agronomist access to user management', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Access Denied');
      });

      it('should deny agronomist access to user details', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .get('/api/users/1')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny agronomist ability to modify user roles', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            role: 'admin'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Farmer access restrictions', () => {
      it('should deny farmer access to user management', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny farmer access to other user profiles', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/users/2')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny farmer ability to modify any user data', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .put('/api/users/2')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            name: 'Modified Name'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Analysis Management Access Control', () => {
    describe('Analysis review capabilities', () => {
      it('should allow agronomist to review analyses', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          id: 1,
          status: 'approved',
          reviewed_by: TEST_USERS.agronomist.id,
          reviewed_at: new Date().toISOString()
        });

        const response = await request(app)
          .put('/api/analysis/1/review')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            status: 'approved',
            notes: 'Analysis looks correct'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin to review analyses', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          id: 1,
          status: 'approved',
          reviewed_by: TEST_USERS.admin.id,
          reviewed_at: new Date().toISOString()
        });

        const response = await request(app)
          .put('/api/analysis/1/review')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            status: 'approved',
            notes: 'Admin approval'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should deny farmer ability to review analyses', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .put('/api/analysis/1/review')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            status: 'approved',
            notes: 'Farmer trying to approve'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Analysis access permissions', () => {
      it('should allow farmers to view their own analyses', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);
        
        allQuery.mockResolvedValueOnce([
          {
            id: 1,
            user_id: TEST_USERS.farmer.id,
            crop_type: 'tomato',
            condition: 'pest',
            created_at: new Date().toISOString()
          }
        ]);

        const response = await request(app)
          .get('/api/analysis/history')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analyses).toHaveLength(1);
      });

      it('should allow agronomists to view all analyses for review', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        allQuery.mockResolvedValueOnce([
          {
            id: 1,
            user_id: TEST_USERS.farmer.id,
            crop_type: 'tomato',
            condition: 'pest',
            status: 'pending',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            user_id: 999, // Different farmer
            crop_type: 'corn',
            condition: 'disease',
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]);

        const response = await request(app)
          .get('/api/analysis/pending')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analyses).toHaveLength(2);
      });

      it('should allow admin to view all analyses', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        allQuery.mockResolvedValueOnce([
          {
            id: 1,
            user_id: TEST_USERS.farmer.id,
            crop_type: 'tomato',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            user_id: 999,
            crop_type: 'corn',
            created_at: new Date().toISOString()
          }
        ]);

        const response = await request(app)
          .get('/api/analysis/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analyses).toHaveLength(2);
      });

      it('should prevent farmers from viewing other farmers\' analyses', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/analysis/999') // Different user's analysis
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Treatment Management Access Control', () => {
    describe('Treatment creation permissions', () => {
      it('should allow agronomist to create new treatments', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce({
          id: 1,
          name: 'Organic Pest Control',
          type: 'organic',
          created_by: TEST_USERS.agronomist.id
        });

        const response = await request(app)
          .post('/api/treatments')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            name: 'Organic Pest Control',
            type: 'organic',
            description: 'Natural pest control method',
            ingredients: ['neem oil', 'soap'],
            instructions: ['Mix ingredients', 'Apply to leaves'],
            effectiveness: 0.8,
            applicationMethod: 'spray',
            frequency: 'weekly',
            safetyPeriod: '3 days',
            cost: 'low',
            difficulty: 'easy',
            targetConditions: ['aphids', 'whiteflies']
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.treatment.name).toBe('Organic Pest Control');
      });

      it('should allow admin to create new treatments', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        runQuery.mockResolvedValueOnce({ id: 1 });
        getQuery.mockResolvedValueOnce({
          id: 1,
          name: 'Admin Treatment',
          type: 'biological',
          created_by: TEST_USERS.admin.id
        });

        const response = await request(app)
          .post('/api/treatments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Admin Treatment',
            type: 'biological',
            description: 'Biological control method',
            ingredients: ['beneficial bacteria'],
            instructions: ['Apply to soil'],
            effectiveness: 0.9,
            applicationMethod: 'soil drench',
            frequency: 'monthly',
            safetyPeriod: '0 days',
            cost: 'medium',
            difficulty: 'moderate',
            targetConditions: ['root rot']
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should deny farmer ability to create treatments', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .post('/api/treatments')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            name: 'Farmer Treatment',
            type: 'organic',
            description: 'Unauthorized treatment',
            ingredients: ['water'],
            instructions: ['Apply'],
            effectiveness: 0.5,
            applicationMethod: 'spray',
            frequency: 'daily',
            safetyPeriod: '1 day',
            cost: 'low',
            difficulty: 'easy',
            targetConditions: ['pests']
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Treatment modification permissions', () => {
      it('should allow agronomist to modify their own treatments', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        // Mock getting the treatment (created by agronomist)
        getQuery.mockResolvedValueOnce({
          id: 1,
          created_by: TEST_USERS.agronomist.id,
          name: 'Original Treatment'
        });
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          id: 1,
          name: 'Updated Treatment',
          created_by: TEST_USERS.agronomist.id
        });

        const response = await request(app)
          .put('/api/treatments/1')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            name: 'Updated Treatment',
            description: 'Updated description'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.treatment.name).toBe('Updated Treatment');
      });

      it('should deny agronomist from modifying other agronomists\' treatments', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        // Mock getting a treatment created by different agronomist
        getQuery.mockResolvedValueOnce({
          id: 1,
          created_by: 999, // Different agronomist
          name: 'Other Treatment'
        });

        const response = await request(app)
          .put('/api/treatments/1')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            name: 'Unauthorized Update'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should allow admin to modify any treatment', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        getQuery.mockResolvedValueOnce({
          id: 1,
          created_by: TEST_USERS.agronomist.id,
          name: 'Treatment to Modify'
        });
        
        runQuery.mockResolvedValueOnce(true);
        getQuery.mockResolvedValueOnce({
          id: 1,
          name: 'Admin Modified Treatment',
          created_by: TEST_USERS.agronomist.id
        });

        const response = await request(app)
          .put('/api/treatments/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Admin Modified Treatment'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Analytics Access Control', () => {
    describe('System analytics access', () => {
      it('should allow admin to view comprehensive system analytics', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        // Mock analytics data
        getQuery.mockResolvedValue({ count: 150 }); // Total analyses
        allQuery.mockResolvedValueOnce([
          { condition: 'pest', count: 80 },
          { condition: 'disease', count: 50 },
          { condition: 'healthy', count: 20 }
        ]);

        const response = await request(app)
          .get('/api/analytics/system')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalAnalyses).toBeDefined();
      });

      it('should allow admin to view user statistics', async () => {
        const adminToken = createTokenForUser(TEST_USERS.admin);
        
        allQuery.mockResolvedValueOnce([
          { role: 'farmer', count: 45 },
          { role: 'agronomist', count: 5 },
          { role: 'admin', count: 2 }
        ]);

        const response = await request(app)
          .get('/api/analytics/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userStats).toBeDefined();
      });

      it('should deny agronomist access to system analytics', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .get('/api/analytics/system')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny farmer access to system analytics', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/analytics/system')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Personal analytics access', () => {
      it('should allow farmers to view their own analytics', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);
        
        allQuery.mockResolvedValueOnce([
          { condition: 'pest', count: 5 },
          { condition: 'disease', count: 3 },
          { condition: 'healthy', count: 2 }
        ]);

        const response = await request(app)
          .get('/api/analytics/personal')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.personalStats).toBeDefined();
      });

      it('should allow agronomists to view their review analytics', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);
        
        allQuery.mockResolvedValueOnce([
          { status: 'approved', count: 25 },
          { status: 'rejected', count: 3 }
        ]);

        const response = await request(app)
          .get('/api/analytics/reviews')
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reviewStats).toBeDefined();
      });
    });
  });

  describe('Cross-role access attempts', () => {
    describe('Privilege escalation attempts', () => {
      it('should prevent farmer from accessing admin endpoints via token manipulation', async () => {
        // Create a farmer token but try to access admin endpoint
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .get('/api/users') // Admin-only endpoint
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Access Denied');
      });

      it('should prevent agronomist from accessing admin-only user management', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .delete('/api/users/1') // Admin-only endpoint
          .set('Authorization', `Bearer ${agronomistToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should prevent role modification via profile update', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            role: 'admin' // Should be filtered out
          })
          .expect(400);

        // Role should not be in allowed fields for profile updates
        expect(response.body.success).toBe(false);
      });
    });

    describe('Lateral movement attempts', () => {
      it('should prevent farmers from accessing other farmers\' data', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);
        
        // Mock another farmer's analysis
        getQuery.mockResolvedValueOnce({
          id: 1,
          user_id: 999, // Different farmer
          crop_type: 'corn'
        });

        const response = await request(app)
          .get('/api/analysis/1')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should prevent agronomists from modifying farmer profiles', async () => {
        const agronomistToken = createTokenForUser(TEST_USERS.agronomist);

        const response = await request(app)
          .put('/api/users/1') // Farmer's profile
          .set('Authorization', `Bearer ${agronomistToken}`)
          .send({
            name: 'Modified by Agronomist'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Resource ownership validation', () => {
      it('should validate analysis ownership before allowing access', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);
        
        // Mock checking analysis ownership
        getQuery.mockResolvedValueOnce({
          id: 1,
          user_id: 999, // Different user
          crop_type: 'tomato'
        });

        const response = await request(app)
          .put('/api/analysis/1')
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({
            notes: 'Updated notes'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Access Denied');
      });

      it('should validate treatment plan ownership', async () => {
        const farmerToken = createTokenForUser(TEST_USERS.farmer);
        
        getQuery.mockResolvedValueOnce({
          id: 1,
          user_id: 999, // Different user
          analysis_id: 1
        });

        const response = await request(app)
          .get('/api/treatments/plan/1')
          .set('Authorization', `Bearer ${farmerToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Role persistence and consistency', () => {
    it('should maintain role consistency across requests', async () => {
      const farmerToken = createTokenForUser(TEST_USERS.farmer);
      
      // Make multiple requests with same token
      getQuery.mockResolvedValue(TEST_USERS.farmer);

      const requests = [
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${farmerToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${farmerToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${farmerToken}`)
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.user.role).toBe('farmer');
      });
    });

    it('should use current database role over token role', async () => {
      // Create token with old role
      const tokenWithOldRole = createTokenForUser({ ...TEST_USERS.farmer, role: 'farmer' });
      
      // Mock user with updated role
      const userWithNewRole = { ...TEST_USERS.farmer, role: 'agronomist' };
      getQuery.mockResolvedValueOnce(userWithNewRole);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenWithOldRole}`)
        .expect(200);

      // Should return current role from database
      expect(response.body.data.user.role).toBe('agronomist');
    });
  });
});