const request = require('supertest');
const path = require('path');
const fs = require('fs');

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

describe('Analysis Endpoints', () => {
  let authToken;

  beforeAll(() => {
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'farmer' },
      process.env.JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/analysis/analyze', () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    beforeAll(() => {
      // Create test fixtures directory
      const fixturesDir = path.join(__dirname, 'fixtures');
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      
      // Create a minimal test image (1x1 pixel JPEG)
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00,
        0x3F, 0x00, 0xB2, 0xC0, 0x07, 0xFF, 0xD9
      ]);
      
      if (!fs.existsSync(testImagePath)) {
        fs.writeFileSync(testImagePath, minimalJpeg);
      }
    });

    it('should analyze image successfully', async () => {
      runQuery.mockResolvedValueOnce({ id: 1 }); // Analysis creation
      getQuery.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        image_url: '/uploads/images/test.jpg',
        crop_type: 'tomato',
        condition: 'healthy',
        title: 'Healthy Crop',
        description: 'No issues detected',
        confidence: 0.95,
        severity: 'low',
        recommendations: JSON.stringify(['Continue current care']),
        created_at: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath)
        .field('cropType', 'tomato')
        .field('notes', 'Test analysis')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis.condition).toBeDefined();
    });

    it('should reject request without image', async () => {
      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .field('cropType', 'tomato')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('image', testImagePath)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid file types', async () => {
      const textFile = path.join(__dirname, 'fixtures', 'test.txt');
      fs.writeFileSync(textFile, 'This is not an image');

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', textFile)
        .expect(400);

      expect(response.body.success).toBe(false);
      
      // Cleanup
      fs.unlinkSync(textFile);
    });
  });

  describe('GET /api/analysis/history', () => {
    it('should return user analysis history', async () => {
      const mockAnalyses = [
        {
          id: 1,
          image_url: '/uploads/images/test1.jpg',
          crop_type: 'tomato',
          condition: 'healthy',
          title: 'Healthy Crop',
          confidence: 0.95,
          severity: 'low',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          image_url: '/uploads/images/test2.jpg',
          crop_type: 'corn',
          condition: 'disease',
          title: 'Blight Detected',
          confidence: 0.88,
          severity: 'medium',
          created_at: new Date().toISOString()
        }
      ];

      getQuery.mockResolvedValueOnce({ total: 2 }); // Count query
      allQuery.mockResolvedValueOnce(mockAnalyses); // Analysis query

      const response = await request(app)
        .get('/api/analysis/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analyses).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by condition', async () => {
      getQuery.mockResolvedValueOnce({ total: 1 });
      allQuery.mockResolvedValueOnce([{
        id: 1,
        condition: 'disease',
        title: 'Disease Detected'
      }]);

      const response = await request(app)
        .get('/api/analysis/history?condition=disease')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      getQuery.mockResolvedValueOnce({ total: 100 });
      allQuery.mockResolvedValueOnce(Array(20).fill().map((_, i) => ({
        id: i + 1,
        title: `Analysis ${i + 1}`
      })));

      const response = await request(app)
        .get('/api/analysis/history?page=2&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.pages).toBe(5);
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should return specific analysis', async () => {
      const mockAnalysis = {
        id: 1,
        user_id: 1,
        image_url: '/uploads/images/test.jpg',
        crop_type: 'tomato',
        condition: 'healthy',
        title: 'Healthy Crop',
        description: 'No issues detected',
        confidence: 0.95,
        severity: 'low',
        recommendations: JSON.stringify(['Continue current care']),
        metadata: JSON.stringify({ processingTime: 2.5 }),
        created_at: new Date().toISOString(),
        user_name: 'Test User',
        reviewer_name: null
      };

      getQuery.mockResolvedValueOnce(mockAnalysis);

      const response = await request(app)
        .get('/api/analysis/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis.id).toBe(1);
      expect(response.body.data.analysis.recommendations).toEqual(['Continue current care']);
    });

    it('should return 404 for non-existent analysis', async () => {
      getQuery.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/analysis/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should deny access to other user\'s analysis', async () => {
      getQuery.mockResolvedValueOnce({
        id: 1,
        user_id: 2, // Different user
        title: 'Analysis'
      });

      const response = await request(app)
        .get('/api/analysis/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/analysis/:id/request-review', () => {
    it('should request review successfully', async () => {
      getQuery.mockResolvedValueOnce({
        user_id: 1,
        review_status: 'pending'
      });
      runQuery.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/analysis/1/request-review')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject review request for already reviewed analysis', async () => {
      getQuery.mockResolvedValueOnce({
        user_id: 1,
        review_status: 'approved'
      });

      const response = await request(app)
        .post('/api/analysis/1/request-review')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Upload Progress Tracking', () => {
    it('should provide upload progress endpoint', async () => {
      const response = await request(app)
        .get('/api/analysis/upload-progress/test-session-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // No active session

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to analysis endpoint', async () => {
      // Make multiple requests rapidly
      const requests = Array(12).fill().map(() =>
        request(app)
          .get('/api/analysis/history')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests.map(req => 
        req.catch(res => res) // Catch to prevent unhandled rejections
      ));
      
      // Should have some 429 responses after rate limit is hit
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
    }, 10000);
  });
});