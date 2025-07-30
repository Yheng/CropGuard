const path = require('path');
const fs = require('fs');
const { initializeDatabase, closeDatabase } = require('../src/config/database');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Create test database path in memory or temp directory
const testDbPath = process.env.CI ? ':memory:' : path.join(__dirname, '../test.db');
process.env.DB_PATH = testDbPath;

// Global test database setup
let testDbInitialized = false;

// Clean up test database before all tests
beforeAll(async () => {
  try {
    // Remove existing test database file if it exists
    if (testDbPath !== ':memory:' && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Initialize test database
    if (!testDbInitialized) {
      await initializeDatabase();
      testDbInitialized = true;
    }
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

// Clean up test database after all tests
afterAll(async () => {
  try {
    await closeDatabase();
    
    // Remove test database file if it exists
    if (testDbPath !== ':memory:' && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
});

// Extend Jest timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reduce console noise during tests
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});