import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, BarChart3 } from 'lucide-react'
import { HealthTrendChart } from '../components/charts/HealthTrendChart'
import { AnalysisHistoryChart } from '../components/charts/AnalysisHistoryChart'
import { CropTypeDistribution } from '../components/charts/CropTypeDistribution'
import { analyticsService, type AnalyticsData } from '../services/analytics'

export function Analytics() {
  const navigate = useNavigate()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [timeRanges, setTimeRanges] = useState({
    health: '30d' as '7d' | '30d' | '90d' | '1y',
    history: '6m' as '6m' | '1y' | '2y'
  })

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await analyticsService.getAnalyticsDashboard()
      setAnalyticsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalyticsData()
    setRefreshing(false)
  }

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    try {
      const blob = await analyticsService.exportData(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crop-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const updateHealthTimeRange = async (range: '7d' | '30d' | '90d' | '1y') => {
    setTimeRanges(prev => ({ ...prev, health: range }))
    try {
      const healthData = await analyticsService.getHealthTrend(range)
      if (analyticsData) {
        setAnalyticsData({
          ...analyticsData,
          healthTrend: healthData
        })
      }
    } catch (err) {
      console.error('Failed to update health trend:', err)
    }
  }

  const updateHistoryTimeRange = async (range: '6m' | '1y' | '2y') => {
    setTimeRanges(prev => ({ ...prev, history: range }))
    try {
      const historyData = await analyticsService.getAnalysisHistory(range)
      if (analyticsData) {
        setAnalyticsData({
          ...analyticsData,
          analysisHistory: historyData
        })
      }
    } catch (err) {
      console.error('Failed to update analysis history:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10B981] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadAnalyticsData}
            className="bg-[#10B981] hover:bg-[#10B981]/80 text-white px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
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
            </div>
            
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <BarChart3 className="w-6 h-6" />
              <span>Analytics Dashboard</span>
            </h1>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <div className="relative group">
                <button className="flex items-center space-x-2 bg-[#10B981] hover:bg-[#10B981]/80 text-white px-4 py-2 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-32 bg-[#4A5B7C] border border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-colors"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-colors"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {analyticsData && (
          <div className="space-y-8">
            {/* Health Trend Chart */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Crop Health Trends</h2>
                <div className="flex bg-[#4A5B7C] rounded-lg p-1">
                  {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => updateHealthTimeRange(range)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        timeRanges.health === range 
                          ? 'bg-[#10B981] text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {range === '7d' ? '7 Days' : 
                       range === '30d' ? '30 Days' : 
                       range === '90d' ? '90 Days' : '1 Year'}
                    </button>
                  ))}
                </div>
              </div>
              <HealthTrendChart
                data={analyticsData.healthTrend}
                timeRange={timeRanges.health}
              />
            </div>

            {/* Analysis History and Crop Distribution */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Analysis History</h2>
                  <div className="flex bg-[#4A5B7C] rounded-lg p-1">
                    {(['6m', '1y', '2y'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => updateHistoryTimeRange(range)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          timeRanges.history === range 
                            ? 'bg-[#10B981] text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {range === '6m' ? '6 Months' : 
                         range === '1y' ? '1 Year' : '2 Years'}
                      </button>
                    ))}
                  </div>
                </div>
                <AnalysisHistoryChart
                  data={analyticsData.analysisHistory}
                  timeRange={timeRanges.history}
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Crop Type Distribution</h2>
                <CropTypeDistribution data={analyticsData.cropDistribution} />
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-[#4A5B7C] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Summary Statistics</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#10B981] mb-2">
                    {analyticsData.analysisHistory.reduce((sum, month) => sum + month.total, 0)}
                  </div>
                  <div className="text-gray-300">Total Analyses</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Last {timeRanges.history === '6m' ? '6 months' : timeRanges.history === '1y' ? 'year' : '2 years'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-[#10B981] mb-2">
                    {Math.round(
                      analyticsData.healthTrend.reduce((sum, point) => sum + point.healthScore, 0) / 
                      analyticsData.healthTrend.length
                    )}%
                  </div>
                  <div className="text-gray-300">Average Health Score</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Last {timeRanges.health === '7d' ? '7 days' : 
                          timeRanges.health === '30d' ? '30 days' : 
                          timeRanges.health === '90d' ? '90 days' : 'year'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-[#2DD4BF] mb-2">
                    {analyticsData.cropDistribution.length}
                  </div>
                  <div className="text-gray-300">Crop Types Monitored</div>
                  <div className="text-sm text-gray-400 mt-1">Active varieties</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-[#F59E0B] mb-2">
                    {Math.round(
                      (analyticsData.analysisHistory.reduce((sum, month) => sum + month.healthy, 0) /
                       analyticsData.analysisHistory.reduce((sum, month) => sum + month.total, 0)) * 100
                    )}%
                  </div>
                  <div className="text-gray-300">Healthy Rate</div>
                  <div className="text-sm text-gray-400 mt-1">Overall performance</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}