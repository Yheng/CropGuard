import { Routes, Route, Navigate } from 'react-router-dom'
import { Login, Signup } from './pages/auth'
import { Dashboard } from './pages/Dashboard'
import { LandingPage } from './pages/LandingPage'
import { Analysis } from './pages/Analysis'
import { Treatments } from './pages/Treatments'
import { Analytics } from './pages/Analytics'
import { authService } from './services/auth'

function App() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/dashboard" 
          element={
            authService.isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/analysis" 
          element={
            authService.isAuthenticated() ? <Analysis /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/treatments" 
          element={
            authService.isAuthenticated() ? <Treatments /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/analytics" 
          element={
            authService.isAuthenticated() ? <Analytics /> : <Navigate to="/login" />
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default App
