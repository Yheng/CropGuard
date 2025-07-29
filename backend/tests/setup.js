const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Create test database path
const testDbPath = path.join(__dirname, '../test.db');

// Clean up test database before tests
beforeAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Clean up test database after all tests
afterAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Extend Jest timeout for async operations
jest.setTimeout(30000);