import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Eager load critical components
import { Login, Signup } from './pages/auth'
import { LandingPage } from './pages/LandingPage'

// Lazy load non-critical components
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const Analysis = lazy(() => import('./pages/Analysis').then(module => ({ default: module.Analysis })))
const Treatments = lazy(() => import('./pages/Treatments').then(module => ({ default: module.Treatments })))
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })))
const FieldSettings = lazy(() => import('./pages/FieldSettings').then(module => ({ default: module.FieldSettings })))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })))
import { authService } from './services/auth'
import ThemeProvider from './contexts/ThemeContext'
import FieldModeProvider from './contexts/FieldModeContext'
import { LoadingProvider } from './contexts/LoadingContext'
import './utils/authDebug' // Import debug utilities
import './utils/restoreUser' // Import user restore utility

// Proper ProtectedRoute that checks authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authService.isAuthenticated()
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// AdminProtectedRoute that checks for admin role
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authService.isAuthenticated()
  const currentUser = authService.getCurrentUser()
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If not admin, redirect to dashboard
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize auth service and axios interceptors
    authService.setupAxiosInterceptors()
    setIsInitialized(true)
  }, [])

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1F2A44] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <FieldModeProvider>
        <LoadingProvider>
          <div style={{ fontFamily: 'Inter, sans-serif' }} className="field-background">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="farm-ecosystem" message="Loading dashboard..." />}>
                    <Dashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="plant-growth" message="Loading plant analyzer..." />}>
                    <Analysis />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/treatments" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="leaf-spin" message="Loading treatments..." />}>
                    <Treatments />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="farm-ecosystem" message="Loading analytics..." />}>
                    <Analytics />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="plant-growth" message="Loading settings..." />}>
                    <FieldSettings />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminProtectedRoute>
                  <Suspense fallback={<LoadingSpinner size="xl" variant="farm-ecosystem" message="Loading admin dashboard..." />}>
                    <AdminDashboard 
                      users={[]} 
                      systemMetrics={{
                        totalUsers: 0,
                        activeUsers: 0,
                        totalAnalyses: 0,
                        systemUptime: 99.9,
                        apiUsage: 0,
                        storageUsed: 0,
                        errorRate: 0,
                        averageResponseTime: 0
                      }}
                      auditLogs={[]}
                      aiConfig={{
                        openaiApiKey: '',
                        model: 'gpt-4o',
                        confidenceThreshold: 0.8,
                        maxTokens: 1500,
                        temperature: 0.3,
                        backupModel: 'gpt-4o-mini',
                        rateLimitPerHour: 100,
                        costLimitPerDay: 50
                      }}
                    />
                  </Suspense>
                </AdminProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </div>
        </LoadingProvider>
      </FieldModeProvider>
    </ThemeProvider>
  )
}

export default App
