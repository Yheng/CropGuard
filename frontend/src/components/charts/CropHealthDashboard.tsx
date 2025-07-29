import React from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  // TrendingUp, 
  // TrendingDown, 
  AlertTriangle, 
  Leaf, 
  Bug,
  Droplets,
  Sun,
  Calendar,
  MapPin
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { MetricCard, ProgressChart, BarChart, LineChart, DonutChart } from '../ui/Chart'
import { cn } from '../../utils/cn'

interface CropHealthData {
  overallHealth: number
  diseaseCount: number
  pestCount: number
  weatherRisk: number
  moistureLevel: number
  recentAnalyses: AnalysisData[]
  cropDistribution: CropTypeData[]
  healthTrend: HealthTrendPoint[]
  threatBreakdown: ThreatData[]
  regionalData: RegionalHealthData[]
}

interface AnalysisData {
  id: string
  date: string
  cropType: string
  healthScore: number
  issues: string[]
  location: string
}

interface CropTypeData {
  label: string
  value: number
  color: string
  healthScore: number
}

interface HealthTrendPoint {
  label: string
  value: number
}

interface ThreatData {
  label: string
  value: number
  color: string
  severity: 'low' | 'medium' | 'high'
}

interface RegionalHealthData {
  region: string
  healthScore: number
  issueCount: number
  lastUpdated: string
}

interface CropHealthDashboardProps {
  data: CropHealthData
  timeRange: '24h' | '7d' | '30d' | '90d'
  onTimeRangeChange: (range: '24h' | '7d' | '30d' | '90d') => void
  isRealTime?: boolean
  className?: string
}

export function CropHealthDashboard({
  data,
  timeRange,
  onTimeRangeChange,
  isRealTime = false,
  className
}: CropHealthDashboardProps) {
  // const [selectedMetric, setSelectedMetric] = React.useState<string>('health')
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRefreshing(false)
  }, [])

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: 'Excellent', color: '#10B981', icon: Leaf }
    if (score >= 60) return { status: 'Good', color: '#F59E0B', icon: Activity }
    if (score >= 40) return { status: 'Warning', color: '#EF4444', icon: AlertTriangle }
    return { status: 'Critical', color: '#DC2626', icon: Bug }
  }

  const healthStatus = getHealthStatus(data.overallHealth)
  const HealthIcon = healthStatus.icon

  const timeRangeOptions = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' }
  ] as const

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Crop Health Dashboard</h1>
          <p className="text-gray-300">Real-time monitoring and analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex bg-[#1F2A44] rounded-lg p-1">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onTimeRangeChange(option.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  timeRange === option.value
                    ? 'bg-[#10B981] text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A5B7C] text-white rounded-lg hover:bg-[#4A5B7C]/80 transition-colors disabled:opacity-50"
          >
            <Activity className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="text-sm font-medium">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* Real-time Status */}
          {isRealTime && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#10B981]/20 text-[#10B981] rounded-lg">
              <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard
            title="Overall Health"
            value={`${data.overallHealth}%`}
            change={{
              value: 5.2,
              type: 'increase',
              period: 'vs last week'
            }}
            icon={<HealthIcon className="w-6 h-6" />}
            color={healthStatus.color}
            className="cursor-pointer hover:scale-105 transition-transform"
            // onClick={() => setSelectedMetric('health')}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard
            title="Active Diseases"
            value={data.diseaseCount}
            change={{
              value: 12,
              type: 'decrease',
              period: 'vs last week'
            }}
            icon={<Bug className="w-6 h-6" />}
            color="#EF4444"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard
            title="Pest Incidents"
            value={data.pestCount}
            change={{
              value: 8,
              type: 'decrease',
              period: 'vs last week'
            }}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="#F59E0B"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard
            title="Weather Risk"
            value={`${data.weatherRisk}%`}
            change={{
              value: 15,
              type: 'increase',
              period: 'vs yesterday'
            }}
            icon={<Sun className="w-6 h-6" />}
            color="#2DD4BF"
          />
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader
              title="Health Trend"
              description="Crop health score over time"
              action={
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Last {timeRange}</span>
                </div>
              }
            />
            <CardContent>
              <LineChart
                data={data.healthTrend}
                color="#10B981"
                height={250}
                showDots={true}
                showGrid={true}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Crop Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader
              title="Crop Distribution"
              description="Health status by crop type"
            />
            <CardContent>
              <DonutChart
                data={data.cropDistribution}
                size={250}
                showLegend={true}
                showPercentages={true}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader
              title="Threat Analysis"
              description="Current issues by severity"
            />
            <CardContent>
              <BarChart
                data={data.threatBreakdown}
                height={200}
                showValues={true}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Environmental Factors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader
              title="Environmental Status"
              description="Key environmental indicators"
            />
            <CardContent className="space-y-4">
              <ProgressChart
                label="Soil Moisture"
                value={data.moistureLevel}
                max={100}
                color="#2DD4BF"
                variant="linear"
                size="md"
              />
              <ProgressChart
                label="Temperature Risk"
                value={data.weatherRisk}
                max={100}
                color="#F59E0B"
                variant="linear"
                size="md"
              />
              <ProgressChart
                label="Humidity Level"
                value={75}
                max={100}
                color="#10B981"
                variant="linear"
                size="md"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardHeader
              title="Recent Analyses"
              description="Latest crop assessments"
            />
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.recentAnalyses.map((analysis, index) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-[#1F2A44] rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {analysis.cropType}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span>{analysis.location}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {analysis.issues.length > 0 ? (
                          <span className="text-[#F59E0B]">
                            {analysis.issues.join(', ')}
                          </span>
                        ) : (
                          <span className="text-[#10B981]">Healthy</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {analysis.healthScore}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(analysis.date).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Regional Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <Card>
          <CardHeader
            title="Regional Health Overview"
            description="Health status across different regions"
            action={
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Droplets className="w-4 h-4" />
                <span>Updated {timeRange === '24h' ? 'hourly' : 'daily'}</span>
              </div>
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.regionalData.map((region, index) => (
                <motion.div
                  key={region.region}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + index * 0.1 }}
                  className="p-4 bg-[#1F2A44] rounded-lg border border-gray-600 hover:border-[#10B981]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{region.region}</h4>
                    <div className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      region.healthScore >= 80 ? 'bg-[#10B981]/20 text-[#10B981]' :
                      region.healthScore >= 60 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {region.healthScore}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {region.issueCount} active issue{region.issueCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(region.lastUpdated).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}