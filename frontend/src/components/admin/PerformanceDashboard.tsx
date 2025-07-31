import React from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Gauge,
  Network
} from 'lucide-react'
import { usePerformance } from '../../hooks/usePerformance'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { MetricCard } from '../ui/Chart'

export function PerformanceDashboard() {
  const { 
    metrics, 
    apiMetrics, 
    getRecommendations, 
    getPerformanceScore, 
    isLoading 
  } = usePerformance()

  const performanceScore = getPerformanceScore()
  const recommendations = getRecommendations()

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981' // Green
    if (score >= 70) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Needs Improvement'
    return 'Poor'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              <span className="ml-3 text-gray-400">Measuring performance...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader 
            title="Performance Score" 
            description="Overall application performance rating"
          />
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: getScoreColor(performanceScore) }}
                >
                  {performanceScore}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {getScoreLabel(performanceScore)}
                  </div>
                  <div className="text-gray-400">
                    Performance Rating
                  </div>
                </div>
              </div>
              <Gauge 
                className="w-8 h-8 text-gray-400" 
                style={{ color: getScoreColor(performanceScore) }}
              />
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="h-2 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${performanceScore}%`,
                  backgroundColor: getScoreColor(performanceScore)
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-emerald-400">
                  {performanceScore >= 90 ? '✓' : performanceScore >= 70 ? '~' : '✗'}
                </div>
                <div className="text-xs text-gray-400">Load Time</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">
                  {apiMetrics.averageResponseTime < 3000 ? '✓' : '✗'}
                </div>
                <div className="text-xs text-gray-400">API Speed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-400">
                  {metrics && metrics.cumulativeLayoutShift < 0.1 ? '✓' : '✗'}
                </div>
                <div className="text-xs text-gray-400">Stability</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard
            title="Load Time"
            value={`${metrics ? (metrics.loadTime / 1000).toFixed(2) : 0}s`}
            icon={<Clock className="w-6 h-6" />}
            color={metrics && metrics.loadTime < 2000 ? "#10B981" : "#EF4444"}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard
            title="First Paint"
            value={`${metrics ? (metrics.firstContentfulPaint / 1000).toFixed(2) : 0}s`}
            icon={<Zap className="w-6 h-6" />}
            color={metrics && metrics.firstContentfulPaint < 1500 ? "#10B981" : "#F59E0B"}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard
            title="API Response"
            value={`${(apiMetrics.averageResponseTime / 1000).toFixed(2)}s`}
            icon={<Network className="w-6 h-6" />}
            color={apiMetrics.averageResponseTime < 3000 ? "#10B981" : "#EF4444"}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <MetricCard
            title="Error Rate"
            value={`${apiMetrics.errorRate.toFixed(1)}%`}
            icon={<AlertTriangle className="w-6 h-6" />}
            color={apiMetrics.errorRate < 5 ? "#10B981" : "#EF4444"}
          />
        </motion.div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader title="Load Performance" description="Page loading metrics" />
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">First Contentful Paint</span>
                  <span className="text-white font-semibold">
                    {metrics ? (metrics.firstContentfulPaint / 1000).toFixed(2) : 0}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Largest Contentful Paint</span>
                  <span className="text-white font-semibold">
                    {metrics ? (metrics.largestContentfulPaint / 1000).toFixed(2) : 0}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Cumulative Layout Shift</span>
                  <span className="text-white font-semibold">
                    {metrics ? metrics.cumulativeLayoutShift.toFixed(3) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Blocking Time</span>
                  <span className="text-white font-semibold">
                    {metrics ? metrics.totalBlockingTime.toFixed(0) : 0}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader title="API Performance" description="Network and API metrics" />
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Requests</span>
                  <span className="text-white font-semibold">
                    {apiMetrics.totalRequests}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Slow Requests (&gt;5s)</span>
                  <span className="text-white font-semibold">
                    {apiMetrics.slowRequestsCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Response Time</span>
                  <span className="text-white font-semibold">
                    {(apiMetrics.averageResponseTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Success Rate</span>
                  <span className="text-white font-semibold">
                    {(100 - apiMetrics.errorRate).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader 
              title="Performance Recommendations" 
              description="Suggestions to improve application performance"
            />
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-[#1F2A44] rounded-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance Targets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader title="Performance Targets" description="CropGuard performance goals" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-white mb-2">Load Time Targets</h4>
                <div className="flex items-center gap-2">
                  {metrics && metrics.loadTime < 2000 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">Page Load &lt; 2 seconds</span>
                </div>
                <div className="flex items-center gap-2">
                  {metrics && metrics.firstContentfulPaint < 1500 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">First Paint &lt; 1.5 seconds</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white mb-2">API Targets</h4>
                <div className="flex items-center gap-2">
                  {apiMetrics.averageResponseTime < 5000 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">API Response &lt; 5 seconds</span>
                </div>
                <div className="flex items-center gap-2">
                  {apiMetrics.errorRate < 5 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">Error Rate &lt; 5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}