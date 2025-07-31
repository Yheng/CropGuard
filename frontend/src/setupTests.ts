// Enhanced Test Setup for CropGuard Frontend
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto cleanup after each test
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup DOM after each test
  cleanup();
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

// Mock Web APIs
// =============

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for lazy loading and virtualization
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([])
}));

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 768px') ? false : true, // Default to desktop
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator APIs
// ==================

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn().mockImplementation(() => true),
});

// Mock navigator.geolocation for location-based features
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: vi.fn().mockImplementation((success) => 
      Promise.resolve(success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      }))
    ),
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn()
  }
});

// Mock navigator.share for Web Share API
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

// Mock navigator.clipboard for copy/paste functionality
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    readText: vi.fn().mockImplementation(() => Promise.resolve('mocked text')),
    write: vi.fn().mockImplementation(() => Promise.resolve()),
    read: vi.fn().mockImplementation(() => Promise.resolve())
  }
});

// Mock Storage APIs
// ================

// Enhanced localStorage mock with realistic behavior
const createStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
};

global.localStorage = createStorageMock() as Storage;
global.sessionStorage = createStorageMock() as Storage;

// Mock File and Blob APIs
// =======================

// Mock File constructor for file upload tests
global.File = class MockFile extends Blob {
  name: string;
  lastModified: number;
  webkitRelativePath: string;

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options?.lastModified || Date.now();
    this.webkitRelativePath = '';
  }
} as typeof File;

// Mock FileReader for image processing tests
global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();

  readAsDataURL = vi.fn().mockImplementation(() => {
    this.readyState = 2;
    this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/...';
    setTimeout(() => {
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  });

  readAsText = vi.fn().mockImplementation(() => {
    this.readyState = 2;
    this.result = 'mocked file content';
    setTimeout(() => {
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  });

  readAsArrayBuffer = vi.fn();
  readAsBinaryString = vi.fn();
  abort = vi.fn();
} as typeof File;

// Mock URL APIs for file handling
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch API
// ==============
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
  })
);

// Mock Performance API for Web Vitals testing
// ===========================================
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    ...window.performance,
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([]),
    now: vi.fn().mockReturnValue(Date.now()),
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now() + 1000,
    }
  }
});

// Mock Canvas API for chart testing
// =================================
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({}),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// Mock HTMLVideoElement for camera functionality
// =============================================
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

// Mock media devices for camera access
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockImplementation(() =>
      Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }],
        getVideoTracks: () => [{ stop: vi.fn() }],
        getAudioTracks: () => [],
      })
    ),
    enumerateDevices: vi.fn().mockImplementation(() =>
      Promise.resolve([
        { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' }
      ])
    )
  }
});

// Mock console methods to avoid noise in tests
// ============================================
const originalConsole = { ...console };

// Suppress console.warn and console.error in tests unless explicitly needed
console.warn = vi.fn();
console.error = vi.fn();

// Restore console for debugging when needed
export const restoreConsole = () => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

// Test utilities for common assertions
// ====================================
export const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'farmer' as const
};

export const mockAnalysisResult = {
  id: 'analysis-123',
  imageUrl: 'https://example.com/image.jpg',
  cropType: 'tomato',
  healthStatus: 'diseased',
  confidence: 0.85,
  diseases: [
    {
      name: 'Late Blight',
      severity: 'high',
      confidence: 0.9
    }
  ],
  treatments: ['copper_fungicide', 'preventive_care'],
  createdAt: new Date().toISOString()
};

// Global test environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';
process.env.VITE_DEMO_MODE = 'true';