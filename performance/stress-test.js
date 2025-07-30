import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const dbResponseTime = new Trend('db_response_time');

// Stress test configuration - gradually increase load to find breaking point
export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Scale to 100 users
    { duration: '5m', target: 200 },  // Scale to 200 users
    { duration: '5m', target: 300 },  // Scale to 300 users
    { duration: '10m', target: 400 }, // Scale to 400 users (stress level)
    { duration: '5m', target: 200 },  // Scale back down
    { duration: '2m', target: 0 },    // Scale down to 0
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% of requests must complete below 1s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],             // Custom error rate must be below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test user credentials
const TEST_USERS = [
  { email: 'stress1@example.com', password: 'stress123' },
  { email: 'stress2@example.com', password: 'stress123' },
  { email: 'stress3@example.com', password: 'stress123' },
  { email: 'stress4@example.com', password: 'stress123' },
  { email: 'stress5@example.com', password: 'stress123' },
];

let authTokens = [];

export function setup() {
  console.log('Setting up stress test with multiple users...');
  
  // Create multiple test users and get tokens
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    
    // Register user (ignore if already exists)
    http.post(`${BASE_URL}/api/auth/register`, {
      email: user.email,
      password: user.password,
      name: `Stress Test User ${i + 1}`,
      role: 'farmer'
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Login to get token
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      const loginData = loginResponse.json();
      authTokens.push(loginData.data.token);
    }
  }

  console.log(`Setup completed with ${authTokens.length} authenticated users`);
  return { authTokens };
}

export default function(data) {
  const tokens = data.authTokens;
  
  if (!tokens || tokens.length === 0) {
    console.error('No auth tokens available, skipping test');
    return;
  }

  // Randomly select a token (simulate different users)
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Simulate realistic user behavior patterns
  simulateUserSession(headers);
  
  // Random sleep between 0.5-2 seconds to simulate real user behavior
  sleep(Math.random() * 1.5 + 0.5);
}

function simulateUserSession(headers) {
  // Simulate a typical user session with multiple actions
  
  // 1. Check health (lightweight operation)
  testHealthEndpoint();
  
  // 2. Get user profile
  testUserProfile(headers);
  
  // 3. Simulate random user action (weighted probabilities)
  const action = Math.random();
  
  if (action < 0.4) {
    // 40% - View analyses
    testAnalysisListAndDetail(headers);
  } else if (action < 0.7) {
    // 30% - View treatments
    testTreatmentsList(headers);
  } else if (action < 0.9) {
    // 20% - View analytics dashboard
    testAnalyticsDashboard(headers);
  } else {
    // 10% - Heavy operation: create new analysis
    testCreateAnalysis(headers);
  }
}

function testHealthEndpoint() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/health`);
  const duration = Date.now() - startTime;
  
  responseTime.add(duration);
  
  const success = check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 50ms': (r) => r.timings.duration < 50,
  });

  errorRate.add(!success);
}

function testUserProfile(headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/auth/me`, { headers });
  const duration = Date.now() - startTime;
  
  responseTime.add(duration);
  dbResponseTime.add(duration); // This involves DB query
  
  const success = check(response, {
    'profile status is 200': (r) => r.status === 200,
    'profile response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

function testAnalysisListAndDetail(headers) {
  // Get analyses list
  const startTime = Date.now();
  const listResponse = http.get(`${BASE_URL}/api/analysis`, { headers });
  const listDuration = Date.now() - startTime;
  
  responseTime.add(listDuration);
  dbResponseTime.add(listDuration);
  
  let success = check(listResponse, {
    'analysis list status is 200': (r) => r.status === 200,
    'analysis list response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);

  // If successful and has data, get details of a random analysis
  if (listResponse.status === 200) {
    try {
      const data = listResponse.json();
      if (data.data && data.data.length > 0) {
        const randomAnalysis = data.data[Math.floor(Math.random() * data.data.length)];
        
        const detailStartTime = Date.now();
        const detailResponse = http.get(`${BASE_URL}/api/analysis/${randomAnalysis.id}`, { headers });
        const detailDuration = Date.now() - detailStartTime;
        
        responseTime.add(detailDuration);
        dbResponseTime.add(detailDuration);
        
        const detailSuccess = check(detailResponse, {
          'analysis detail status is 200': (r) => r.status === 200,
          'analysis detail response time < 300ms': (r) => r.timings.duration < 300,
        });

        errorRate.add(!detailSuccess);
      }
    } catch (e) {
      errorRate.add(true);
    }
  }
}

function testTreatmentsList(headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/treatments`, { headers });
  const duration = Date.now() - startTime;
  
  responseTime.add(duration);
  dbResponseTime.add(duration);
  
  const success = check(response, {
    'treatments status is 200': (r) => r.status === 200,
    'treatments response time < 400ms': (r) => r.timings.duration < 400,
  });

  errorRate.add(!success);
}

function testAnalyticsDashboard(headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/analytics/dashboard`, { headers });
  const duration = Date.now() - startTime;
  
  responseTime.add(duration);
  dbResponseTime.add(duration);
  
  const success = check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 600ms': (r) => r.timings.duration < 600,
  });

  errorRate.add(!success);
}

function testCreateAnalysis(headers) {
  // Simulate creating a new analysis (heavy operation)
  const analysisData = {
    title: `Stress Test Analysis ${Date.now()}`,
    crop_type: 'tomato',
    description: 'Automated stress test analysis',
    image_path: '/test/image.jpg'
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/analysis`, analysisData, { headers });
  const duration = Date.now() - startTime;
  
  responseTime.add(duration);
  dbResponseTime.add(duration);
  
  const success = check(response, {
    'create analysis status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'create analysis response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

export function teardown(data) {
  console.log('Stress test completed. Cleaning up...');
  // Note: In production, you might want to clean up test data
}

// Performance monitoring function
export function handleSummary(data) {
  return {
    'stress-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
Stress Test Summary:
====================
Total Requests: ${data.metrics.http_reqs.count}
Failed Requests: ${data.metrics.http_req_failed.count} (${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%)
Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
95th Percentile: ${data.metrics['http_req_duration{p(95)}'].toFixed(2)}ms
99th Percentile: ${data.metrics['http_req_duration{p(99)}'].toFixed(2)}ms

Custom Metrics:
Error Rate: ${data.metrics.errors.rate.toFixed(4)}
Average DB Response Time: ${data.metrics.db_response_time ? data.metrics.db_response_time.avg.toFixed(2) : 'N/A'}ms

VU Analysis:
Peak VUs: ${Math.max(...data.root_group.checks.map(c => c.passes + c.fails))}
Data Received: ${(data.metrics.data_received.count / (1024 * 1024)).toFixed(2)} MB
Data Sent: ${(data.metrics.data_sent.count / (1024 * 1024)).toFixed(2)} MB
    `,
  };
}