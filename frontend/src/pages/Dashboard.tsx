import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Upload, TrendingUp, Settings, LogOut, Bell } from 'lucide-react'
import { authService } from '../services/auth'

export function Dashboard() {
  const [user, setUser] = useState(authService.getCurrentUser() || { name: 'User', role: 'farmer' })
  const navigate = useNavigate()

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

  return (
    <div className="min-h-screen bg-[#1F2A44] text-white">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="w-8 h-8 text-[#10B981]" />
              <h1 className="text-2xl font-bold">CropGuard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#10B981] rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <span className="text-sm">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-300">
            Monitor your crops and get AI-powered insights for better farming decisions.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <button 
            onClick={() => navigate('/analysis')}
            className="bg-[#4A5B7C] hover:bg-[#4A5B7C]/80 rounded-lg p-6 text-left transition-colors"
          >
            <Upload className="w-8 h-8 text-[#10B981] mb-3" />
            <h3 className="font-semibold mb-1">Upload Image</h3>
            <p className="text-sm text-gray-300">Analyze new crop images</p>
          </button>

          <button 
            onClick={() => navigate('/analytics')}
            className="bg-[#4A5B7C] hover:bg-[#4A5B7C]/80 rounded-lg p-6 text-left transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-[#2DD4BF] mb-3" />
            <h3 className="font-semibold mb-1">View Trends</h3>
            <p className="text-sm text-gray-300">Check crop health trends</p>
          </button>

          <button className="bg-[#4A5B7C] hover:bg-[#4A5B7C]/80 rounded-lg p-6 text-left transition-colors">
            <Settings className="w-8 h-8 text-[#F59E0B] mb-3" />
            <h3 className="font-semibold mb-1">Settings</h3>
            <p className="text-sm text-gray-300">Configure your account</p>
          </button>

          <div className="bg-[#4A5B7C] rounded-lg p-6">
            <div className="text-[#10B981] text-2xl font-bold">12</div>
            <h3 className="font-semibold mb-1">Total Analyses</h3>
            <p className="text-sm text-gray-300">This month</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#4A5B7C] rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1F2A44] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#10B981]/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="font-medium">Tomato leaf analysis completed</p>
                  <p className="text-sm text-gray-300">2 hours ago</p>
                </div>
              </div>
              <span className="text-[#10B981] text-sm font-medium">Healthy</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1F2A44] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#F59E0B]/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="font-medium">Corn leaf analysis completed</p>
                  <p className="text-sm text-gray-300">1 day ago</p>
                </div>
              </div>
              <span className="text-[#F59E0B] text-sm font-medium">Warning</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1F2A44] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#10B981]/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="font-medium">Wheat analysis completed</p>
                  <p className="text-sm text-gray-300">3 days ago</p>
                </div>
              </div>
              <span className="text-[#10B981] text-sm font-medium">Healthy</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}