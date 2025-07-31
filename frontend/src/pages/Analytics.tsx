import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, BarChart3, Camera, PieChart, TrendingUp } from 'lucide-react'
import { userDataService } from '../services/userDataService'

interface UserStats {
  totalAnalyses: number
  healthyPlants: number
  plantsNeedingCare: number
  diseasedPlants: number
}

interface MonthlyAnalysis {
  month: string
  count: number
}

interface StatusDistribution {
  status: string
  count: number
  color: string
}

interface FieldActivity {
  name: string
  lastAnalysis: string
  status: string
  analyses: number
}

interface AnalyticsData {
  monthlyAnalyses: MonthlyAnalysis[]
  statusDistribution: StatusDistribution[]
  fieldActivity: FieldActivity[]
}

export function Analytics() {
  const navigate = useNavigate()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    loadAnalyticsData()
    
    // Add focus event listener to refresh data when user returns to tab
    const handleFocus = () => {
      console.log('Analytics: Page focused, refreshing data')
      loadAnalyticsData()
    }
    
    window.addEventListener('focus', handleFocus)
    
    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const stats = userDataService.getUserStats()
      const data = userDataService.getAnalyticsData()
      setUserStats(stats)
      setAnalyticsData(data)
    } catch (err) {
      console.warn('Failed to load analytics data:', err)
      // Set empty state for new users
      setUserStats({ totalAnalyses: 0, healthyPlants: 0, plantsNeedingCare: 0, diseasedPlants: 0 })
      setAnalyticsData({ monthlyAnalyses: [], statusDistribution: [], fieldActivity: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    console.log('Analytics: Manual refresh requested')
    setRefreshing(true)
    await loadAnalyticsData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  // Empty state for new users
  if (!loading && userStats && userStats.totalAnalyses === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Header */}
        <header className="border-b border-gray-600">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-sm text-gray-300">View your crop analysis insights</p>
              </div>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-300 mb-4">No Analytics Data Yet</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Start analyzing your plants to see detailed insights, trends, and statistics about your crop health.
            </p>
            <button
              onClick={() => navigate('/analysis')}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              <Camera className="w-6 h-6" />
              Analyze Your First Plant
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-sm text-gray-300">Crop health insights and trends</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-emerald-400">{userStats?.totalAnalyses || 0}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Total Analyses</h3>
            <p className="text-sm text-gray-400">Plant health checks</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-400">{userStats?.healthyPlants || 0}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Healthy Plants</h3>
            <p className="text-sm text-gray-400">No issues detected</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <PieChart className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-amber-400">{userStats?.plantsNeedingCare || 0}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Need Care</h3>
            <p className="text-sm text-gray-400">Require attention</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-2xl font-bold text-red-400">{userStats?.diseasedPlants || 0}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Diseased</h3>
            <p className="text-sm text-gray-400">Disease detected</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Analysis Chart */}
          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-6">Monthly Analysis Trend</h3>
            {analyticsData?.monthlyAnalyses?.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.monthlyAnalyses.map((item, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-300">{item.month}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (item.count / Math.max(...analyticsData.monthlyAnalyses.map((m) => m.count))) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-emerald-400 font-medium w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No monthly data available yet</p>
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-6">Health Status Distribution</h3>
            {analyticsData?.statusDistribution?.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.statusDistribution.map((item, index: number) => {
                  const getStatusColor = (status: string) => {
                    switch (status.toLowerCase()) {
                      case 'healthy': return 'from-emerald-500 to-green-500'
                      case 'needs care': return 'from-amber-500 to-orange-500'
                      case 'disease detected': return 'from-red-500 to-pink-500'
                      default: return 'from-slate-500 to-gray-500'
                    }
                  }

                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{item.status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r ${getStatusColor(item.status)} h-2 rounded-full`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-medium w-12 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No status data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Field Activity */}
        {analyticsData?.fieldActivity?.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-6">Top Active Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData.fieldActivity.map((field, index: number) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{field.field}</h4>
                    <span className="text-emerald-400 font-bold">{field.count}</span>
                  </div>
                  <p className="text-sm text-gray-400">analyses conducted</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}