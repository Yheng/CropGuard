/**
 * Enhanced Test Utilities for CropGuard Frontend
 * Provides comprehensive testing utilities including custom render functions,
 * mock providers, and common test helpers for agricultural domain testing.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ThemeContext, ThemeContextType } from '@/contexts/ThemeContext';
import { FieldModeContext, FieldModeContextType } from '@/contexts/FieldModeContext';

// Types for test utilities
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  initialEntries?: string[];
  theme?: Partial<ThemeContextType>;
  fieldMode?: Partial<FieldModeContextType>;
  withRouter?: boolean;
  user?: any;
}

// Mock theme context default values
const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

// Mock field mode context default values
const defaultFieldModeContext: FieldModeContextType = {
  isFieldMode: false,
  setFieldMode: vi.fn(),
  toggleFieldMode: vi.fn(),
  fieldSettings: {
    largeButtons: true,
    highContrast: false,
    simplifiedUI: true,
    voiceNavigation: false,
  },
  updateFieldSettings: vi.fn(),
};

// Custom render function with providers
export function customRender(
  ui: ReactElement,
  {
    route = '/',
    initialEntries,
    theme,
    fieldMode,
    withRouter = true,
    user,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { user?: any } {
  const themeValue = { ...defaultThemeContext, ...theme };
  const fieldModeValue = { ...defaultFieldModeContext, ...fieldMode };

  function AllTheProviders({ children }: { children: ReactNode }) {
    const RouterComponent = withRouter
      ? initialEntries
        ? MemoryRouter
        : BrowserRouter
      : React.Fragment;

    const routerProps = initialEntries
      ? { initialEntries, initialIndex: 0 }
      : {};

    return (
      <RouterComponent {...(withRouter ? routerProps : {})}>
        <ThemeContext.Provider value={themeValue}>
          <FieldModeContext.Provider value={fieldModeValue}>
            {children}
          </FieldModeContext.Provider>
        </ThemeContext.Provider>
      </RouterComponent>
    );
  }

  const result = render(ui, { wrapper: AllTheProviders, ...renderOptions });

  return {
    ...result,
    user,
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Custom render as default export
export { customRender as render };

// Test data factories
// ===================

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  name: 'Test Farmer',
  email: 'farmer@test.com',
  role: 'farmer',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockCrop = (overrides: Partial<any> = {}) => ({
  id: 'crop-123',
  name: 'Tomato',
  type: 'vegetable',
  plantingDate: '2024-01-15',
  expectedHarvest: '2024-04-15',
  location: 'Field A',
  ...overrides,
});

export const createMockAnalysis = (overrides: Partial<any> = {}) => ({
  id: 'analysis-123',
  imageUrl: 'https://example.com/crop-image.jpg',
  cropType: 'tomato',
  healthStatus: 'healthy',
  confidence: 0.95,
  diseases: [],
  pests: [],
  treatments: [],
  createdAt: new Date().toISOString(),
  userId: 'user-123',
  ...overrides,
});

export const createMockDisease = (overrides: Partial<any> = {}) => ({
  id: 'disease-123',
  name: 'Late Blight',
  severity: 'medium',
  confidence: 0.8,
  description: 'A common fungal disease affecting tomatoes',
  symptoms: ['Dark spots on leaves', 'Brown patches'],
  ...overrides,
});

export const createMockTreatment = (overrides: Partial<any> = {}) => ({
  id: 'treatment-123',
  name: 'Copper Fungicide Application',
  type: 'chemical',
  description: 'Apply copper-based fungicide spray',
  dosage: '2ml per liter of water',
  frequency: 'Weekly for 3 weeks',
  timing: 'Early morning or evening',
  precautions: ['Wear protective gear', 'Avoid rain within 4 hours'],
  effectiveness: 0.85,
  ...overrides,
});

// Mock API responses
// ==================

export const mockApiResponse = <T,>(data: T, success = true) => ({
  success,
  data,
  message: success ? 'Operation successful' : 'Operation failed',
  timestamp: new Date().toISOString(),
});

export const mockPaginatedResponse = <T>(
  items: T[],
  page = 1,
  limit = 10,
  total?: number
) => ({
  success: true,
  data: items,
  pagination: {
    page,
    limit,
    total: total || items.length,
    pages: Math.ceil((total || items.length) / limit),
  },
});

// File testing utilities
// ======================

export const createMockFile = (
  name = 'test-image.jpg',
  type = 'image/jpeg',
  size = 1024 * 1024 // 1MB
): File => {
  const file = new File([''], name, { type, lastModified: Date.now() });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockImageFile = (
  name = 'crop-photo.jpg',
  size = 2 * 1024 * 1024 // 2MB
): File => createMockFile(name, 'image/jpeg', size);

// Event utilities
// ===============

export const createMockDragEvent = (files: File[] = []) => {
  const mockDataTransfer = {
    files: {
      ...files,
      length: files.length,
      item: (index: number) => files[index] || null,
    },
    types: ['Files'],
  };

  return {
    dataTransfer: mockDataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
};

export const createMockChangeEvent = (files: File[] = []) => ({
  target: {
    files: {
      ...files,
      length: files.length,
      item: (index: number) => files[index] || null,
    },
  },
  preventDefault: vi.fn(),
});

// Responsive testing utilities
// ============================

export const mockMediaQuery = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

export const mockMobileView = () => mockMediaQuery(true);
export const mockDesktopView = () => mockMediaQuery(false);

// Performance testing utilities
// =============================

export const mockPerformanceMetrics = () => {
  const entries = [
    {
      name: 'first-contentful-paint',
      entryType: 'paint',
      startTime: 800,
      duration: 0,
    },
    {
      name: 'largest-contentful-paint',
      entryType: 'largest-contentful-paint',
      startTime: 1200,
      size: 1000,
    },
  ];

  window.performance.getEntriesByType = vi.fn().mockImplementation((type) =>
    entries.filter((entry) => entry.entryType === type)
  );

  return entries;
};

// Accessibility testing utilities
// ===============================

export const getByLabelText = (container: HTMLElement, text: string) => {
  const label = container.querySelector(`label[for]`);
  if (label && label.textContent?.includes(text)) {
    const forAttr = label.getAttribute('for');
    return container.querySelector(`#${forAttr}`);
  }
  return container.querySelector(`[aria-label*="${text}"]`);
};

export const expectToBeAccessible = async (element: HTMLElement) => {
  // Check for basic accessibility requirements
  const interactiveElements = element.querySelectorAll(
    'button, input, select, textarea, a, [tabindex]'
  );

  interactiveElements.forEach((el) => {
    const hasLabel =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (el.tagName === 'INPUT' &&
        element.querySelector(`label[for="${el.id}"]`));

    expect(hasLabel).toBeTruthy();
  });
};

// Animation testing utilities
// ===========================

export const waitForAnimation = (duration = 500) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export const mockAnimation = () => {
  HTMLElement.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
    finish: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    reverse: vi.fn(),
    updatePlaybackRate: vi.fn(),
  });
};

// Local storage testing utilities
// ===============================

export const setupLocalStorageTest = () => {
  beforeEach(() => {
    localStorage.clear();
  });
};

export const setLocalStorageItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getLocalStorageItem = (key: string) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
};

// Geolocation testing utilities
// =============================

export const mockGeolocation = (
  coords = { latitude: 40.7128, longitude: -74.006 }
) => {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            ...coords,
            accuracy: 100,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        })
      ),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    writable: true,
  });
};

// Camera testing utilities
// ========================

export const mockCamera = () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          {
            kind: 'video',
            stop: vi.fn(),
            getSettings: () => ({ width: 640, height: 480 }),
          },
        ],
        getVideoTracks: () => [
          {
            kind: 'video',
            stop: vi.fn(),
            getSettings: () => ({ width: 640, height: 480 }),
          },
        ],
        getAudioTracks: () => [],
      }),
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      ]),
    },
    writable: true,
  });
};

// Chart testing utilities
// =======================

export const mockChart = () => {
  return {
    render: vi.fn(),
    updateSeries: vi.fn(),
    updateOptions: vi.fn(),
    destroy: vi.fn(),
    toggleSeries: vi.fn(),
    showSeries: vi.fn(),
    hideSeries: vi.fn(),
    appendSeries: vi.fn(),
    zoomX: vi.fn(),
    resetSeries: vi.fn(),
  };
};

// Error boundary testing
// ======================

export const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Common test assertions
// =====================

export const expectElementToBeVisible = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (
  element: HTMLElement | null,
  name: string
) => {
  expect(element).toHaveAccessibleName(name);
};

export const expectFormToBeValid = (form: HTMLFormElement) => {
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    expect(input).toBeValid();
  });
};

// Agricultural domain specific utilities
// =====================================

export const createMockCropAnalysisWorkflow = () => ({
  uploadImage: vi.fn().mockResolvedValue({ imageId: 'img-123' }),
  analyzeImage: vi.fn().mockResolvedValue(createMockAnalysis()),
  getTreatments: vi.fn().mockResolvedValue([createMockTreatment()]),
  saveAnalysis: vi.fn().mockResolvedValue({ id: 'analysis-123' }),
});

export const mockWeatherData = () => ({
  temperature: 25,
  humidity: 60,
  windSpeed: 10,
  precipitation: 0,
  uvIndex: 6,
  conditions: 'sunny',
  forecast: [
    { date: '2024-01-16', high: 28, low: 20, conditions: 'partly cloudy' },
    { date: '2024-01-17', high: 26, low: 18, conditions: 'rainy' },
  ],
});

export default customRender;