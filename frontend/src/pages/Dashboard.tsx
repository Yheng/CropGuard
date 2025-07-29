import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Camera, TrendingUp, Settings, LogOut, Bell, Sun, CloudRain } from 'lucide-react'
import { authService } from '../services/auth'
import { useFieldMode } from '../contexts/FieldModeContext'
import { useFieldMetrics } from '../hooks/useFieldMetrics'
import FieldOptimizedButton from '../components/ui/FieldOptimizedButton'
import OneHandedNavigation from '../components/navigation/OneHandedNavigation'

export function Dashboard() {
  const [user, setUser] = useState(authService.getCurrentUser() || { name: 'User', role: 'farmer' })
  const navigate = useNavigate()
  const { fieldMode, settings, weatherData, isFieldOptimized, setFieldMode } = useFieldMode()
  const { startTask, metrics, getFieldUsabilityScore } = useFieldMetrics()

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
    } else {
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
    }
  }, [navigate])

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  const handleQuickAction = (action: string, path: string) => {
    const taskId = startTask(action as any)
    navigate(path)
    return taskId
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
    <div className="min-h-screen field-background">
      {/* Header */}
      <header className={`border-b ${isFieldOptimized ? 'border-gray-400 bg-field-adaptive-bg' : 'border-gray-600'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Leaf className={`${isFieldOptimized ? 'w-10 h-10' : 'w-8 h-8'} text-[#10B981]`} />
              <div>
                <h1 className={`${isFieldOptimized ? 'text-3xl' : 'text-2xl'} font-bold high-contrast-text`}>
                  CropGuard
                </h1>
                {weatherData && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    {getWeatherIcon()}
                    <span>{weatherData.condition} • {weatherData.brightness}% bright</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Field mode toggle */}
              {!settings.oneHandedMode && (
                <FieldOptimizedButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setFieldMode(fieldMode === 'standard' ? 'field' : 'standard')}
                  className="hidden md:flex"
                >
                  {isFieldOptimized ? 'Farm Mode' : 'Enable Farm Mode'}
                </FieldOptimizedButton>
              )}
              
              <Bell className={`${isFieldOptimized ? 'w-6 h-6' : 'w-5 h-5'} text-gray-400 hover:text-white cursor-pointer`} />
              <div className="flex items-center space-x-2">
                <div className={`${isFieldOptimized ? 'w-10 h-10' : 'w-8 h-8'} bg-[#10B981] rounded-full flex items-center justify-center`}>
                  <span className={`${isFieldOptimized ? 'text-base' : 'text-sm'} font-medium`}>
                    {user.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <span className={`${isFieldOptimized ? 'text-base' : 'text-sm'} high-contrast-text`}>{user.name}</span>
              </div>
              <FieldOptimizedButton
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </FieldOptimizedButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 ${settings.oneHandedMode ? 'one-handed-reach' : ''}`}>
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className={`${isFieldOptimized ? 'text-4xl' : 'text-3xl'} font-bold mb-2 high-contrast-text`}>
            {getGreeting()}, {user.name}!
          </h2>
          <p className={`${isFieldOptimized ? 'text-lg' : 'text-base'} text-gray-300`}>
            Check your crops and get smart insights for better farming decisions.
          </p>
          
          {/* Field usability score */}
          {metrics && isFieldOptimized && (
            <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Farm Mode Score: {getFieldUsabilityScore()}/100
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">
                  {getFieldUsabilityScore() > 80 ? 'Excellent field usability!' : 'Good field performance'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`grid ${isFieldOptimized ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-4'} gap-6 mb-8`}>
          <FieldOptimizedButton
            onClick={() => handleQuickAction('analysis', '/analysis')}
            className="card p-6 text-left h-auto flex-col items-start justify-start"
            variant="secondary"
          >
            <Camera className={`${isFieldOptimized ? 'w-10 h-10' : 'w-8 h-8'} text-[#10B981] mb-3`} />
            <h3 className={`${isFieldOptimized ? 'text-xl' : 'text-lg'} font-semibold mb-1 high-contrast-text`}>
              Examine Plant
            </h3>
            <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
              Take photo to check plant health
            </p>
          </FieldOptimizedButton>

          <FieldOptimizedButton
            onClick={() => handleQuickAction('navigation', '/analytics')}
            className="card p-6 text-left h-auto flex-col items-start justify-start"
            variant="secondary"
          >
            <TrendingUp className={`${isFieldOptimized ? 'w-10 h-10' : 'w-8 h-8'} text-[#2DD4BF] mb-3`} />
            <h3 className={`${isFieldOptimized ? 'text-xl' : 'text-lg'} font-semibold mb-1 high-contrast-text`}>
              Crop Reports
            </h3>
            <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
              View your field's health trends
            </p>
          </FieldOptimizedButton>

          <FieldOptimizedButton
            onClick={() => navigate('/settings')}
            className="card p-6 text-left h-auto flex-col items-start justify-start"
            variant="secondary"
          >
            <Settings className={`${isFieldOptimized ? 'w-10 h-10' : 'w-8 h-8'} text-[#F59E0B] mb-3`} />
            <h3 className={`${isFieldOptimized ? 'text-xl' : 'text-lg'} font-semibold mb-1 high-contrast-text`}>
              Farm Settings
            </h3>
            <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
              Configure your farm profile
            </p>
          </FieldOptimizedButton>

          <div className="card p-6">
            <div className={`text-[#10B981] ${isFieldOptimized ? 'text-4xl' : 'text-2xl'} font-bold high-contrast-text`}>
              12
            </div>
            <h3 className={`${isFieldOptimized ? 'text-xl' : 'text-lg'} font-semibold mb-1 high-contrast-text`}>
              Plants Checked
            </h3>
            <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
              This month
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold mb-4 high-contrast-text`}>
            Recent Plant Checks
          </h3>
          <div className="space-y-4">
            <div className={`flex items-center justify-between ${isFieldOptimized ? 'p-5' : 'p-4'} card rounded-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isFieldOptimized ? 'w-12 h-12' : 'w-10 h-10'} bg-[#10B981]/20 rounded-lg flex items-center justify-center`}>
                  <Camera className={`${isFieldOptimized ? 'w-6 h-6' : 'w-5 h-5'} text-[#10B981]`} />
                </div>
                <div>
                  <p className={`${isFieldOptimized ? 'text-lg' : 'text-base'} font-medium high-contrast-text`}>
                    Tomato plant examined
                  </p>
                  <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                    2 hours ago
                  </p>
                </div>
              </div>
              <span className={`text-[#10B981] ${isFieldOptimized ? 'text-base' : 'text-sm'} font-medium px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full`}>
                Healthy
              </span>
            </div>

            <div className={`flex items-center justify-between ${isFieldOptimized ? 'p-5' : 'p-4'} card rounded-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isFieldOptimized ? 'w-12 h-12' : 'w-10 h-10'} bg-[#F59E0B]/20 rounded-lg flex items-center justify-center`}>
                  <Camera className={`${isFieldOptimized ? 'w-6 h-6' : 'w-5 h-5'} text-[#F59E0B]`} />
                </div>
                <div>
                  <p className={`${isFieldOptimized ? 'text-lg' : 'text-base'} font-medium high-contrast-text`}>
                    Corn plant examined
                  </p>
                  <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                    1 day ago
                  </p>
                </div>
              </div>
              <span className={`text-[#F59E0B] ${isFieldOptimized ? 'text-base' : 'text-sm'} font-medium px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-full`}>
                Needs Care
              </span>
            </div>

            <div className={`flex items-center justify-between ${isFieldOptimized ? 'p-5' : 'p-4'} card rounded-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isFieldOptimized ? 'w-12 h-12' : 'w-10 h-10'} bg-[#10B981]/20 rounded-lg flex items-center justify-center`}>
                  <Camera className={`${isFieldOptimized ? 'w-6 h-6' : 'w-5 h-5'} text-[#10B981]`} />
                </div>
                <div>
                  <p className={`${isFieldOptimized ? 'text-lg' : 'text-base'} font-medium high-contrast-text`}>
                    Wheat plant examined
                  </p>
                  <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                    3 days ago
                  </p>
                </div>
              </div>
              <span className={`text-[#10B981] ${isFieldOptimized ? 'text-base' : 'text-sm'} font-medium px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full`}>
                Healthy
              </span>
            </div>
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