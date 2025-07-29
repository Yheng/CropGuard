import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Login, Signup } from './pages/auth'
import { Dashboard } from './pages/Dashboard'
import { LandingPage } from './pages/LandingPage'
import { Analysis } from './pages/Analysis'
import { Treatments } from './pages/Treatments'
import { Analytics } from './pages/Analytics'
import { FieldSettings } from './pages/FieldSettings'
import { authService } from './services/auth'
import ThemeProvider from './contexts/ThemeContext'
import FieldModeProvider from './contexts/FieldModeContext'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('authStateChange', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)
    
    return () => {
      window.removeEventListener('authStateChange', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#1F2A44] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ThemeProvider>
      <FieldModeProvider>
        <div style={{ fontFamily: 'Inter, sans-serif' }} className="field-background">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis" 
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/treatments" 
              element={
                <ProtectedRoute>
                  <Treatments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <FieldSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </FieldModeProvider>
    </ThemeProvider>
  )
}

export default App
