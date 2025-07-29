const request = require('supertest');

// Mock the database
jest.mock('../src/config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  runQuery: jest.fn(),
  getQuery: jest.fn().mockResolvedValue({ test: 1 }),
  allQuery: jest.fn()
}));

const createTestApp = require('./testApp');
const { getQuery } = require('../src/config/database');

const app = createTestApp();

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      // Mock database health check
      getQuery.mockResolvedValueOnce({ test: 1 });
      
      // Mock successful database queries for statistics
      getQuery
        .mockResolvedValueOnce({ count: 10 }) // users
        .mockResolvedValueOnce({ count: 25 }) // analyses
        .mockResolvedValueOnce({ count: 15 }); // treatments

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBeDefined();
      expect(response.body.checks.memory).toBeDefined();
      expect(response.body.checks.logging).toBeDefined();
    });

    it('should return degraded status when database is unhealthy', async () => {
      // Mock database failure
      getQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database.status).toBe('unhealthy');
    });
  });

  describe('GET /health/metrics', () => {
    it('should return system metrics', async () => {
      // Mock database metrics
      getQuery
        .mockResolvedValueOnce({ count: 10 }) // users
        .mockResolvedValueOnce({ count: 25 }) // analyses
        .mockResolvedValueOnce({ count: 15 }); // treatments

      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.system).toBeDefined();
      expect(response.body.system.platform).toBeDefined();
      expect(response.body.system.memory).toBeDefined();
      expect(response.body.system.cpu).toBeDefined();
      expect(response.body.application).toBeDefined();
      expect(response.body.database).toBeDefined();
      expect(response.body.api).toBeDefined();
    });

    it('should include process metrics', async () => {
      getQuery
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ count: 25 })
        .mockResolvedValueOnce({ count: 15 });

      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body.system.uptime.process).toBeGreaterThan(0);
      expect(response.body.system.memory.process).toBeDefined();
      expect(response.body.application.pid).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when all checks pass', async () => {
      // Mock successful database check
      getQuery.mockResolvedValueOnce({ test: 1 });

      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return not ready when database fails', async () => {
      // Mock database failure
      getQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not ready');
    });
  });

  describe('GET /health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Legacy Health Endpoint', () => {
    it('should support legacy health endpoint', async () => {
      const response = await request(app)
        .get('/health-simple')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.environment).toBeDefined();
    });
  });

  describe('Database Health Checks', () => {
    it('should detect database connection issues', async () => {
      getQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.checks.database.status).toBe('unhealthy');
      expect(response.body.checks.database.error).toContain('Connection timeout');
    });

    it('should measure database response time', async () => {
      getQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ test: 1 }), 50))
      );

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.database.responseTime).toBeGreaterThan(40);
    });
  });

  describe('Memory Health Checks', () => {
    it('should report memory usage', async () => {
      getQuery.mockResolvedValue({ test: 1 });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.memory.status).toBeDefined();
      expect(response.body.checks.memory.process).toBeDefined();
      expect(response.body.checks.memory.system).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track endpoint response times', async () => {
      const start = Date.now();
      
      getQuery.mockResolvedValue({ test: 1 });

      await request(app)
        .get('/health')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});