import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Camera, TrendingUp, Settings, LogOut, Bell, Sun, CloudRain, Menu, X, BarChart3 } from 'lucide-react'
import { authService } from '../services/auth'
import { useFieldMode } from '../contexts/FieldModeContext'
import { useFieldMetrics } from '../hooks/useFieldMetrics'
import { userDataService, type UserStats, type PlantAnalysis } from '../services/userDataService'
import OneHandedNavigation from '../components/navigation/OneHandedNavigation'

export function Dashboard() {
  const [user] = useState(() => authService.getCurrentUser() || { name: 'Demo User', role: 'farmer' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<PlantAnalysis[]>([])
  const navigate = useNavigate()
  // Restored FieldModeContext (should be safe now)
  const { fieldMode, settings, weatherData, isFieldOptimized, setFieldMode } = useFieldMode()
  // Keep metrics disabled for now to avoid potential loops
  const metrics = null
  const getFieldUsabilityScore = () => 85
  // const { metrics, getFieldUsabilityScore } = useFieldMetrics()

  // Load user-specific data
  useEffect(() => {
    try {
      const stats = userDataService.getUserStats()
      const analyses = userDataService.getRecentAnalyses(3)
      setUserStats(stats)
      setRecentAnalyses(analyses)
    } catch (error) {
      console.warn('Failed to load user data:', error)
      // Set empty state for new users
      setUserStats({ totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 })
      setRecentAnalyses([])
    }
  }, [user])

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }


  const getGreeting = () => {
    if (!weatherData) return "Welcome back"
    
    const hour = new Date().getHours()
    const weather = weatherData.condition
    
    if (weather === 'rainy') return "Stay dry out there"
    if (weather === 'sunny' && hour > 11 && hour < 15) return "Great weather for field work"
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const getWeatherIcon = () => {
    if (!weatherData) return <Sun className="w-5 h-5" />
    
    switch (weatherData.condition) {
      case 'sunny': return <Sun className="w-5 h-5 text-yellow-500" />
      case 'rainy': return <CloudRain className="w-5 h-5 text-blue-500" />
      default: return <Sun className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Modern Header with Mobile Menu */}
      <header className="bg-slate-900/95 backdrop-blur-xl border-b border-emerald-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CropGuard</h1>
                {weatherData && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    {getWeatherIcon()}
                    <span>{weatherData.condition} • {weatherData.brightness}% bright</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              <button
                onClick={() => navigate('/analysis')}
                className="text-slate-300 hover:text-emerald-400 transition-colors font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Analyze
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="text-slate-300 hover:text-emerald-400 transition-colors font-medium flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Reports
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="text-slate-300 hover:text-emerald-400 transition-colors font-medium flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              {/* Field mode toggle */}
              <button
                onClick={() => setFieldMode(fieldMode === 'standard' ? 'field' : 'standard')}
                className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
              >
                {isFieldOptimized ? 'Standard Mode' : 'Field Mode'}
              </button>
              
              <Bell className="w-5 h-5 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors" />
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{user.name}</span>
                  <span className="text-xs text-emerald-400 capitalize">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors p-2"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-slate-300 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-700 py-4">
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-xs text-emerald-400 capitalize">{user.role}</p>
                  </div>
                </div>
                
                {/* Navigation Links */}
                <button
                  onClick={() => {
                    navigate('/analysis')
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full text-left text-slate-300 hover:text-emerald-400 py-2 px-4 rounded-lg hover:bg-slate-800/50 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>Analyze Crops</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/analytics')
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full text-left text-slate-300 hover:text-emerald-400 py-2 px-4 rounded-lg hover:bg-slate-800/50 transition-all"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>View Reports</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/settings')
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full text-left text-slate-300 hover:text-emerald-400 py-2 px-4 rounded-lg hover:bg-slate-800/50 transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span>Farm Settings</span>
                </button>
                
                {/* Field Mode Toggle */}
                <button
                  onClick={() => setFieldMode(fieldMode === 'standard' ? 'field' : 'standard')}
                  className="flex items-center gap-3 w-full text-left bg-emerald-500/20 text-emerald-300 py-2 px-4 rounded-lg hover:bg-emerald-500/30 transition-all"
                >
                  <Sun className="w-5 h-5" />
                  <span>{isFieldOptimized ? 'Standard Mode' : 'Field Mode'}</span>
                </button>
                
                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left text-red-400 hover:text-red-300 py-2 px-4 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            {getGreeting()}, {user.name}!
          </h2>
          <p className="text-xl text-slate-300 mb-6">
            Monitor your crops and make data-driven farming decisions with AI-powered insights.
          </p>
          
          {/* Field usability score */}
          {metrics && isFieldOptimized && (
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300 font-semibold">
                    Farm Mode Score: {getFieldUsabilityScore()}/100
                  </p>
                  <p className="text-sm text-emerald-400">
                    {getFieldUsabilityScore() > 80 ? 'Excellent field usability!' : 'Good field performance'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Examine Plant Card */}
          <button
            onClick={() => navigate('/analysis')}
            className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-left hover:bg-slate-800/70 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              Examine Plant
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              Take photos to analyze plant health and detect diseases instantly
            </p>
            <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Start Analysis →
            </div>
          </button>

          {/* Crop Reports Card */}
          <button
            onClick={() => navigate('/analytics')}
            className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-left hover:bg-slate-800/70 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Crop Reports
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              View comprehensive analytics and health trends for your crops
            </p>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View Reports →
            </div>
          </button>

          {/* Farm Settings Card */}
          <button
            onClick={() => navigate('/settings')}
            className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-left hover:bg-slate-800/70 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/10"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Farm Settings
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              Configure your farm profile, preferences, and notification settings
            </p>
            <div className="mt-4 flex items-center text-amber-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open Settings →
            </div>
          </button>

          {/* Stats Card */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-14 h-14 bg-emerald-500/30 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-4xl font-bold text-emerald-400 mb-2">
              {userStats?.totalAnalyses || 0}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Plants Analyzed</h3>
            <p className="text-slate-400">Total</p>
            {userStats && userStats.totalAnalyses > 0 ? (
              <div className="mt-4 flex items-center">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (userStats.healthyPlants / userStats.totalAnalyses) * 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-emerald-400 text-sm font-medium ml-3">
                  {Math.round((userStats.healthyPlants / userStats.totalAnalyses) * 100)}%
                </span>
              </div>
            ) : (
              <div className="mt-4 text-slate-500 text-sm">
                No analyses yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Recent Plant Analysis</h3>
            <button 
              onClick={() => navigate('/analytics')}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          
          {recentAnalyses.length > 0 ? (
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'healthy': return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' }
                    case 'needs-care': return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' }
                    case 'disease-detected': return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400' }
                    default: return { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-400' }
                  }
                }

                const formatTimeAgo = (timestamp: string) => {
                  const now = new Date()
                  const analysisTime = new Date(timestamp)
                  const diffMs = now.getTime() - analysisTime.getTime()
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffHours / 24)

                  if (diffDays > 0) {
                    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
                  } else if (diffHours > 0) {
                    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                  } else {
                    return 'Just now'
                  }
                }

                const colors = getStatusColor(analysis.status)

                return (
                  <div key={analysis.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:bg-slate-700/70 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                        <Camera className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-white">{analysis.plantType} plant examined</p>
                        <p className="text-sm text-slate-400">{analysis.location} • {formatTimeAgo(analysis.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 ${colors.bg} ${colors.text} text-sm font-medium rounded-full border ${colors.border}`}>
                        {analysis.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <div className={`w-2 h-2 ${colors.dot} rounded-full ${analysis.status === 'healthy' ? 'animate-pulse' : ''}`}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-slate-500" />
              </div>
              <h4 className="text-lg font-medium text-slate-400 mb-2">No plant analyses yet</h4>
              <p className="text-slate-500 mb-6">Start by taking photos of your plants to get AI-powered health insights</p>
              <button
                onClick={() => navigate('/analysis')}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <Camera className="w-5 h-5" />
                Analyze Your First Plant
              </button>
            </div>
          )}
          
          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-700/50">
            <button
              onClick={() => navigate('/analysis')}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Analyze New Plant
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="flex-1 bg-slate-700/50 text-slate-300 px-4 py-3 rounded-xl font-semibold hover:bg-slate-700/70 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-600/50"
            >
              <BarChart3 className="w-5 h-5" />
              View Analytics
            </button>
          </div>
        </div>
      </main>

      {/* One-handed navigation */}
      {settings.oneHandedMode && (
        <OneHandedNavigation useAgriculturalTerms={true} />
      )}
    </div>
  )
}