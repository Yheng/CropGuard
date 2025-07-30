import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Scale to 20 users
    { duration: '2m', target: 50 },   // Scale to 50 users
    { duration: '1m', target: 20 },   // Scale down to 20 users
    { duration: '30s', target: 0 },   // Scale down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate must be below 10%
  },
};

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

// Test data
const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'loadtest123',
  name: 'Load Test User'
};

let authToken = '';

export function setup() {
  // Setup phase - create test user and get auth token
  console.log('Setting up load test...');
  
  // Register test user
  const registerResponse = http.post(`${BASE_URL}/api/auth/register`, {
    email: TEST_USER.email,
    password: TEST_USER.password,
    name: TEST_USER.name,
    role: 'farmer'
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerResponse.status === 200 || registerResponse.status === 400) {
    // Login to get token
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      const loginData = loginResponse.json();
      authToken = loginData.data.token;
      console.log('Setup completed successfully');
      return { authToken };
    }
  }
  
  console.error('Setup failed');
  return { authToken: null };
}

export default function(data) {
  const token = data.authToken;
  
  if (!token) {
    console.error('No auth token available, skipping test');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test scenarios
  const scenarios = [
    () => testHealthCheck(),
    () => testAuthentication(token),
    () => testUserProfile(headers),
    () => testAnalysisEndpoint(headers),
    () => testTreatmentsEndpoint(headers),
    () => testAnalyticsEndpoint(headers),
  ];

  // Randomly select a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(1);
}

// Health check test
function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check has correct format': (r) => {
      try {
        const data = r.json();
        return data.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

// Authentication test
function testAuthentication(existingToken) {
  if (!existingToken) {
    const response = http.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const success = check(response, {
      'auth status is 200': (r) => r.status === 200,
      'auth response time < 300ms': (r) => r.timings.duration < 300,
      'auth returns token': (r) => {
        try {
          const data = r.json();
          return data.data && data.data.token;
        } catch (e) {
          return false;
        }
      },
    });

    errorRate.add(!success);
    return;
  }

  // Test token validation
  const response = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${existingToken}` },
  });

  const success = check(response, {
    'token validation status is 200': (r) => r.status === 200,
    'token validation response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

// User profile test
function testUserProfile(headers) {
  const response = http.get(`${BASE_URL}/api/auth/me`, { headers });

  const success = check(response, {
    'profile status is 200': (r) => r.status === 200,
    'profile response time < 200ms': (r) => r.timings.duration < 200,
    'profile has user data': (r) => {
      try {
        const data = r.json();
        return data.data && data.data.user;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

// Analysis endpoint test
function testAnalysisEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/analysis`, { headers });

  const success = check(response, {
    'analysis status is 200': (r) => r.status === 200,
    'analysis response time < 500ms': (r) => r.timings.duration < 500,
    'analysis returns data': (r) => {
      try {
        const data = r.json();
        return Array.isArray(data.data);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

// Treatments endpoint test
function testTreatmentsEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/treatments`, { headers });

  const success = check(response, {
    'treatments status is 200': (r) => r.status === 200,
    'treatments response time < 300ms': (r) => r.timings.duration < 300,
    'treatments returns data': (r) => {
      try {
        const data = r.json();
        return Array.isArray(data.data);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

// Analytics endpoint test
function testAnalyticsEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/analytics/dashboard`, { headers });

  const success = check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 400ms': (r) => r.timings.duration < 400,
    'analytics returns data': (r) => {
      try {
        const data = r.json();
        return data.data;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

export function teardown(data) {
  // Cleanup phase
  console.log('Cleaning up load test...');
  // Note: In a real scenario, you might want to clean up test data
}

// Export individual test functions for targeted testing
export { 
  testHealthCheck, 
  testAuthentication, 
  testUserProfile, 
  testAnalysisEndpoint, 
  testTreatmentsEndpoint, 
  testAnalyticsEndpoint 
};