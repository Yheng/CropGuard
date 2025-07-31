import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ThemeProvider from '../contexts/ThemeContext'
import FieldModeProvider from '../contexts/FieldModeContext'

// Mock auth service
export const mockAuthService = {
  isAuthenticated: vi.fn(() => true),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(() => ({
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'farmer'
  })),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  setupAxiosInterceptors: vi.fn(),
}

// Mock API responses
export const mockApiResponses = {
  analyses: [
    {
      id: '1',
      title: 'Tomato Leaf Analysis',
      condition: 'pest',
      confidence: 0.85,
      severity: 'medium',
      created_at: '2025-07-30T00:00:00Z',
      image_url: '/test-image.jpg'
    }
  ],
  treatments: [
    {
      id: '1',
      name: 'Organic Neem Oil',
      type: 'organic',
      effectiveness: 0.8,
      cost: 'low',
      difficulty: 'easy'
    }
  ],
  analytics: {
    healthScore: 75,
    totalAnalyses: 12,
    recentTrends: [
      { date: '2025-07-29', value: 80 },
      { date: '2025-07-30', value: 75 }
    ]
  }
}

// Custom render function with providers
/* eslint-disable react-refresh/only-export-components */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <FieldModeProvider>
          {children}
        </FieldModeProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock fetch for API calls
export const mockFetch = (response: unknown, status = 200) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  )
}

// Mock file upload
export const mockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  return new File(['test'], name, { type })
}

// Wait for async operations
export const waitForAsyncOps = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Mock intersection observer
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  })
  window.IntersectionObserver = mockIntersectionObserver
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
/* eslint-enable react-refresh/only-export-components */