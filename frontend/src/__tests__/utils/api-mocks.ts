/**
 * API Mocking Utilities for CropGuard Frontend Tests
 * Provides comprehensive mocks for all API endpoints using MSW (Mock Service Worker)
 * and Vitest mocking capabilities for agricultural domain testing.
 */

import { vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createMockUser, createMockAnalysis, createMockTreatment, mockApiResponse } from './test-utils';

// Base API URL
const API_BASE_URL = 'http://localhost:3000/api';

// Mock data generators
// ===================

export const generateMockAnalyses = (count = 5) =>
  Array.from({ length: count }, (_, index) =>
    createMockAnalysis({
      id: `analysis-${index + 1}`,
      cropType: ['tomato', 'corn', 'wheat', 'rice', 'potato'][index % 5],
      healthStatus: ['healthy', 'diseased', 'pest_damage'][index % 3],
      confidence: 0.7 + (index * 0.05),
    })
  );

export const generateMockTreatments = (count = 3) =>
  Array.from({ length: count }, (_, index) =>
    createMockTreatment({
      id: `treatment-${index + 1}`,
      name: ['Fungicide Spray', 'Organic Pesticide', 'Nutrient Supplement'][index],
      type: ['chemical', 'organic', 'fertilizer'][index],
    })
  );

export const generateMockUsers = (count = 3) =>
  Array.from({ length: count }, (_, index) =>
    createMockUser({
      id: `user-${index + 1}`,
      role: ['farmer', 'agronomist', 'admin'][index],
      email: `user${index + 1}@example.com`,
    })
  );

// MSW Request Handlers
// ===================

export const handlers = [
  // Authentication endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json(
        mockApiResponse({
          token: 'mock-jwt-token',
          user: createMockUser({ email }),
        })
      );
    }

    return HttpResponse.json(
      mockApiResponse(null, false),
      { status: 401 }
    );
  }),

  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    const { email, name } = body;

    return HttpResponse.json(
      mockApiResponse({
        token: 'mock-jwt-token',
        user: createMockUser({ email, name }),
      })
    );
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json(mockApiResponse({}));
  }),

  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json(
      mockApiResponse(createMockUser())
    );
  }),

  // Analysis endpoints
  http.post(`${API_BASE_URL}/analysis/upload`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    return HttpResponse.json(
      mockApiResponse({
        imageId: 'uploaded-image-123',
        imageUrl: `https://example.com/uploads/${file?.name || 'image.jpg'}`,
      })
    );
  }),

  http.post(`${API_BASE_URL}/analysis/analyze`, async ({ request }) => {
    const body = await request.json() as { imageId: string; cropType?: string };
    const { imageId, cropType } = body;

    const analysis = createMockAnalysis({
      cropType: cropType || 'tomato',
      imageUrl: `https://example.com/uploads/image-${imageId}.jpg`,
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return HttpResponse.json(mockApiResponse(analysis));
  }),

  http.get(`${API_BASE_URL}/analysis`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const cropType = url.searchParams.get('cropType');

    let analyses = generateMockAnalyses(25);
    
    if (cropType) {
      analyses = analyses.filter(a => a.cropType === cropType);
    }

    const start = (page - 1) * limit;
    const paginatedAnalyses = analyses.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: paginatedAnalyses,
      pagination: {
        page,
        limit,
        total: analyses.length,
        pages: Math.ceil(analyses.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/analysis/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json(
      mockApiResponse(createMockAnalysis({ id: id as string }))
    );
  }),

  http.delete(`${API_BASE_URL}/analysis/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json(
      mockApiResponse({ id, deleted: true })
    );
  }),

  // Treatment endpoints
  http.get(`${API_BASE_URL}/treatments`, ({ request }) => {
    const url = new URL(request.url);
    const cropType = url.searchParams.get('cropType');

    let treatments = generateMockTreatments(10);

    if (cropType) {
      treatments = treatments.filter(t => 
        t.name.toLowerCase().includes(cropType.toLowerCase())
      );
    }

    return HttpResponse.json(mockApiResponse(treatments));
  }),

  http.get(`${API_BASE_URL}/treatments/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json(
      mockApiResponse(createMockTreatment({ id: id as string }))
    );
  }),

  http.post(`${API_BASE_URL}/treatments/apply`, async ({ request }) => {
    const body = await request.json() as { treatmentId: string; analysisId: string; notes?: string };
    const { treatmentId, analysisId, notes } = body;

    return HttpResponse.json(
      mockApiResponse({
        id: 'application-123',
        treatmentId,
        analysisId,
        notes,
        appliedAt: new Date().toISOString(),
        status: 'pending',
      })
    );
  }),

  // Analytics endpoints
  http.get(`${API_BASE_URL}/analytics/dashboard`, ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';

    return HttpResponse.json(
      mockApiResponse({
        totalAnalyses: 156,
        healthyCount: 98,
        diseasedCount: 45,
        pestCount: 13,
        averageConfidence: 0.87,
        topCrops: [
          { name: 'Tomato', count: 67 },
          { name: 'Corn', count: 34 },
          { name: 'Wheat', count: 28 },
        ],
        topDiseases: [
          { name: 'Late Blight', count: 23 },
          { name: 'Rust', count: 12 },
          { name: 'Mildew', count: 10 },
        ],
        healthTrend: [
          { date: '2024-01-01', healthy: 85, diseased: 15 },
          { date: '2024-01-08', healthy: 82, diseased: 18 },
          { date: '2024-01-15', healthy: 88, diseased: 12 },
          { date: '2024-01-22', healthy: 91, diseased: 9 },
        ],
        period,
      })
    );
  }),

  http.get(`${API_BASE_URL}/analytics/crop-health`, ({ request }) => {
    const url = new URL(request.url);
    const cropType = url.searchParams.get('cropType');

    return HttpResponse.json(
      mockApiResponse({
        cropType: cropType || 'all',
        healthDistribution: {
          healthy: 65,
          diseased: 25,
          pest_damage: 10,
        },
        severityDistribution: {
          low: 45,
          medium: 35,
          high: 20,
        },
        confidenceMetrics: {
          average: 0.87,
          median: 0.89,
          stdDev: 0.12,
        },
      })
    );
  }),

  // Weather endpoints
  http.get(`${API_BASE_URL}/weather/current`, ({ request }) => {
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat') || '40.7128';
    const lon = url.searchParams.get('lon') || '-74.0060';

    return HttpResponse.json(
      mockApiResponse({
        location: { lat: parseFloat(lat), lon: parseFloat(lon) },
        current: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
          precipitation: 0,
          uvIndex: 6,
          conditions: 'sunny',
          pressure: 1013.25,
          visibility: 10,
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  http.get(`${API_BASE_URL}/weather/forecast`, ({ request }) => {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    const forecast = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      
      return {
        date: date.toISOString().split('T')[0],
        high: 25 + Math.floor(Math.random() * 10),
        low: 15 + Math.floor(Math.random() * 5),
        conditions: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
        humidity: 50 + Math.floor(Math.random() * 30),
        precipitation: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0,
      };
    });

    return HttpResponse.json(mockApiResponse(forecast));
  }),

  // File upload endpoints
  http.post(`${API_BASE_URL}/upload/image`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    return HttpResponse.json(
      mockApiResponse({
        id: 'file-123',
        filename: file?.name || 'image.jpg',
        url: `https://example.com/uploads/${file?.name || 'image.jpg'}`,
        size: file?.size || 1024,
        mimeType: file?.type || 'image/jpeg',
        uploadedAt: new Date().toISOString(),
      })
    );
  }),

  // Error simulation endpoints
  http.get(`${API_BASE_URL}/test/error`, () => {
    return HttpResponse.json(
      mockApiResponse(null, false),
      { status: 500 }
    );
  }),

  http.get(`${API_BASE_URL}/test/timeout`, () => {
    // Simulate timeout by never resolving
    return new Promise(() => {});
  }),

  // Default catch-all handler
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      mockApiResponse(null, false),
      { status: 404 }
    );
  }),
];

// MSW Server Setup
// ===============

export const server = setupServer(...handlers);

// Axios Mock Setup
// ===============

export const setupAxiosMocks = () => {
  // Mock axios for components that use it directly
  vi.mock('axios', () => ({
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      create: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      isAxiosError: vi.fn(),
    },
  }));
};

// Mock API Service Functions
// ==========================

export const mockAuthService = {
  login: vi.fn().mockResolvedValue({
    token: 'mock-jwt-token',
    user: createMockUser(),
  }),
  signup: vi.fn().mockResolvedValue({
    token: 'mock-jwt-token',
    user: createMockUser(),
  }),
  logout: vi.fn().mockResolvedValue({}),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getCurrentUser: vi.fn().mockReturnValue(createMockUser()),
  setupAxiosInterceptors: vi.fn(),
};

export const mockAnalysisService = {
  uploadImage: vi.fn().mockResolvedValue({
    imageId: 'uploaded-image-123',
    imageUrl: 'https://example.com/uploads/image.jpg',
  }),
  analyzeImage: vi.fn().mockResolvedValue(createMockAnalysis()),
  getAnalyses: vi.fn().mockResolvedValue({
    data: generateMockAnalyses(),
    pagination: { page: 1, limit: 10, total: 25, pages: 3 },
  }),
  getAnalysis: vi.fn().mockResolvedValue(createMockAnalysis()),
  deleteAnalysis: vi.fn().mockResolvedValue({ success: true }),
};

export const mockTreatmentService = {
  getTreatments: vi.fn().mockResolvedValue(generateMockTreatments()),
  getTreatment: vi.fn().mockResolvedValue(createMockTreatment()),
  applyTreatment: vi.fn().mockResolvedValue({
    id: 'application-123',
    status: 'pending',
  }),
};

export const mockWeatherService = {
  getCurrentWeather: vi.fn().mockResolvedValue({
    temperature: 25,
    humidity: 60,
    conditions: 'sunny',
  }),
  getForecast: vi.fn().mockResolvedValue([
    { date: '2024-01-16', high: 28, low: 20, conditions: 'sunny' },
    { date: '2024-01-17', high: 26, low: 18, conditions: 'cloudy' },
  ]),
};

// Test Scenarios
// ==============

export const testScenarios = {
  // Successful login flow
  successfulLogin: () => {
    mockAuthService.login.mockResolvedValueOnce({
      token: 'valid-token',
      user: createMockUser({ role: 'farmer' }),
    });
  },

  // Failed login
  failedLogin: () => {
    mockAuthService.login.mockRejectedValueOnce(
      new Error('Invalid credentials')
    );
  },

  // Network error
  networkError: () => {
    const error = new Error('Network Error') as Error & { code: string };
    error.code = 'ERR_NETWORK';
    mockAuthService.login.mockRejectedValueOnce(error);
  },

  // Slow network response
  slowResponse: () => {
    mockAnalysisService.analyzeImage.mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve(createMockAnalysis()), 3000)
      )
    );
  },

  // Analysis with disease detected
  diseaseDetected: () => {
    mockAnalysisService.analyzeImage.mockResolvedValueOnce(
      createMockAnalysis({
        healthStatus: 'diseased',
        diseases: [
          {
            name: 'Late Blight',
            severity: 'high',
            confidence: 0.92,
          },
        ],
        treatments: generateMockTreatments(2),
      })
    );
  },

  // Empty results
  emptyResults: () => {
    mockAnalysisService.getAnalyses.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    });
  },
};

// Setup and Teardown Helpers
// ==========================

export const setupApiMocks = () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });
};

// Utility functions
// ================

export const waitForApiCall = (mockFn: { mock: { calls: unknown[] } }, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (mockFn.mock.calls.length > 0) {
        clearInterval(checkInterval);
        resolve(mockFn.mock.calls);
      }
    }, 10);

    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('API call timeout'));
    }, timeout);
  });
};

export const simulateApiDelay = (delay = 500) => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

export default {
  server,
  handlers,
  setupAxiosMocks,
  setupApiMocks,
  testScenarios,
  mockAuthService,
  mockAnalysisService,
  mockTreatmentService,
  mockWeatherService,
};