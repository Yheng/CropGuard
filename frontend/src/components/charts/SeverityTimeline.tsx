import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  // TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Calendar,
  // Filter,
  Target,
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { ProgressChart } from '../ui/Chart'
import { cn } from '../../utils/cn'

interface SeverityDataPoint {
  date: string
  severity: number
  confidence: number
  issueType: 'pest' | 'disease'
  issueName: string
  cropType: string
  treatmentApplied?: string
  treatmentDate?: string
  notes?: string
  weather: {
    temperature: number
    humidity: number
    rainfall: number
  }
  stage: 'detection' | 'monitoring' | 'treatment' | 'recovery' | 'resolved'
}

interface ProgressionEvent {
  id: string
  date: string
  type: 'detection' | 'escalation' | 'treatment' | 'improvement' | 'resolution'
  severity: number
  description: string
  issueName: string
  automaticTrigger: boolean
}

interface PredictionPoint {
  date: string
  predictedSeverity: number
  confidence: number
  factors: string[]
}

interface SeverityTimelineProps {
  data: SeverityDataPoint[]
  events: ProgressionEvent[]
  predictions?: PredictionPoint[]
  selectedIssue?: string
  onIssueSelect?: (issueId: string) => void
  showPredictions?: boolean
  onPredictionToggle?: (enabled: boolean) => void
  playbackMode?: boolean
  onPlaybackToggle?: (enabled: boolean) => void
  playbackSpeed?: number
  onSpeedChange?: (speed: number) => void
  className?: string
}

export function SeverityTimeline({
  data,
  events,
  predictions = [],
  selectedIssue,
  // onIssueSelect,
  showPredictions = false,
  onPredictionToggle,
  playbackMode = false,
  onPlaybackToggle,
  playbackSpeed = 1,
  onSpeedChange,
  className
}: SeverityTimelineProps) {
  const [currentTime, setCurrentTime] = React.useState<string>('')
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = React.useState('30d')
  const [groupBy, setGroupBy] = React.useState<'issue' | 'crop' | 'stage'>('issue')
  const [showEvents, setShowEvents] = React.useState(true)

  const playbackIntervalRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Process data for visualization
  const processedData = React.useMemo(() => {
    const filteredData = selectedIssue
      ? data.filter(point => point.issueName === selectedIssue)
      : data

    // Group data by the selected grouping
    const groupedData = filteredData.reduce((acc, point) => {
      let key = ''
      switch (groupBy) {
        case 'issue':
          key = point.issueName
          break
        case 'crop':
          key = point.cropType
          break
        case 'stage':
          key = point.stage
          break
      }

      if (!acc[key]) acc[key] = []
      acc[key].push(point)
      return acc
    }, {} as Record<string, SeverityDataPoint[]>)

    // Create series for the timeline chart
    const timelineSeries = Object.entries(groupedData).map(([key, points]) => ({
      name: key,
      data: points.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.severity,
        confidence: point.confidence,
        stage: point.stage,
        treatment: point.treatmentApplied,
        weather: point.weather
      }))
    }))

    // Process events for annotations
    const eventAnnotations = showEvents ? events.map(event => ({
      x: new Date(event.date).getTime(),
      strokeDashArray: 0,
      borderColor: getEventColor(event.type),
      label: {
        borderColor: getEventColor(event.type),
        style: {
          color: '#fff',
          background: getEventColor(event.type)
        },
        text: event.description
      }
    })) : []

    // Process predictions
    const predictionSeries = showPredictions && predictions.length > 0 ? [{
      name: 'Predicted Severity',
      data: predictions.map(pred => ({
        x: new Date(pred.date).getTime(),
        y: pred.predictedSeverity
      })),
      type: 'line',
      color: '#8B5CF6',
      strokeDashArray: 5
    }] : []

    // Calculate progression statistics
    const progressionStats = {
      totalIssues: new Set(data.map(point => point.issueName)).size,
      averageSeverity: data.reduce((sum, point) => sum + point.severity, 0) / data.length || 0,
      criticalPeriods: data.filter(point => point.severity >= 80).length,
      recoveryRate: data.filter(point => point.stage === 'resolved').length / data.length * 100 || 0,
      activeIssues: data.filter(point => !['resolved', 'recovery'].includes(point.stage)).length
    }

    return {
      timelineSeries: [...timelineSeries, ...predictionSeries],
      eventAnnotations,
      progressionStats,
      uniqueIssues: Object.keys(groupedData)
    }
  }, [data, events, predictions, selectedIssue, groupBy, showEvents, showPredictions])

  // Playback functionality
  React.useEffect(() => {
    if (playbackMode && isPlaying && data.length > 0) {
      const sortedDates = [...new Set(data.map(point => point.date))].sort()
      let currentIndex = sortedDates.findIndex(date => date === currentTime) || 0

      playbackIntervalRef.current = setInterval(() => {
        currentIndex = (currentIndex + 1) % sortedDates.length
        setCurrentTime(sortedDates[currentIndex])
      }, 1000 / playbackSpeed)

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current)
        }
      }
    }
  }, [playbackMode, isPlaying, playbackSpeed, currentTime, data])

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'detection': return '#2DD4BF'
      case 'escalation': return '#F59E0B'
      case 'treatment': return '#8B5CF6'
      case 'improvement': return '#10B981'
      case 'resolution': return '#059669'
      default: return '#6B7280'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'detection': return '#2DD4BF'
      case 'monitoring': return '#F59E0B'
      case 'treatment': return '#8B5CF6'
      case 'recovery': return '#10B981'
      case 'resolved': return '#059669'
      default: return '#6B7280'
    }
  }

  // Chart options
  const timelineOptions: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: true },
      animations: {
        enabled: playbackMode,
        dynamicAnimation: {
          enabled: playbackMode,
          speed: 1000 / playbackSpeed
        }
      }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981', '#F59E0B', '#EF4444', '#2DD4BF', '#8B5CF6'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 6,
      strokeWidth: 2,
      strokeColors: '#1F2A44',
      hover: { size: 8 }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { colors: '#9CA3AF' },
        datetimeUTC: false
      },
      axisBorder: { color: '#4B5563' },
      axisTicks: { color: '#4B5563' }
    },
    yaxis: {
      title: {
        text: 'Severity Score',
        style: { color: '#9CA3AF' }
      },
      labels: {
        style: { colors: '#9CA3AF' },
        formatter: (val) => `${val}%`
      },
      min: 0,
      max: 100
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    legend: {
      labels: { colors: '#9CA3AF' },
      position: 'top'
    },
    annotations: {
      xaxis: processedData.eventAnnotations
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      x: {
        format: 'dd MMM yyyy HH:mm'
      },
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        return `
          <div class="p-3 bg-gray-800 rounded-lg shadow-lg">
            <div class="font-medium text-white mb-2">${w.globals.seriesNames[seriesIndex]}</div>
            <div class="text-sm text-gray-300 space-y-1">
              <div>Severity: ${series[seriesIndex][dataPointIndex]}%</div>
            </div>
          </div>
        `
      }
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentTime(data.length > 0 ? data[0].date : '')
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Severity Timeline & Progression</h2>
          <p className="text-gray-300">Track issue severity over time with predictive insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Playback Controls */}
          {playbackMode && (
            <div className="flex items-center gap-2 bg-[#1F2A44] rounded-lg p-1">
              <button
                onClick={handleReset}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {isPlaying ? (
                  <PauseCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
              </button>
              <Select
                options={[
                  { value: '0.5', label: '0.5x' },
                  { value: '1', label: '1x' },
                  { value: '2', label: '2x' },
                  { value: '4', label: '4x' }
                ]}
                value={playbackSpeed.toString()}
                onChange={(value) => onSpeedChange?.(parseFloat(value))}
                className="w-20"
              />
            </div>
          )}

          {/* Group By Selector */}
          <Select
            options={[
              { value: 'issue', label: 'By Issue' },
              { value: 'crop', label: 'By Crop' },
              { value: 'stage', label: 'By Stage' }
            ]}
            value={groupBy}
            onChange={(value) => setGroupBy(value as any)}
            className="w-32"
          />

          {/* Time Range */}
          <Select
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            className="w-32"
          />

          {/* Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={showEvents ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
              leftIcon={<Target className="w-4 h-4" />}
            >
              Events
            </Button>
            <Button
              variant={showPredictions ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPredictionToggle?.(!showPredictions)}
              leftIcon={<TrendingUp className="w-4 h-4" />}
            >
              Predictions
            </Button>
            <Button
              variant={playbackMode ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPlaybackToggle?.(!playbackMode)}
              leftIcon={<PlayCircle className="w-4 h-4" />}
            >
              Playback
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold text-white">
                {processedData.progressionStats.totalIssues}
              </p>
            </div>
            <Activity className="w-8 h-8 text-[#2DD4BF]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Severity</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(processedData.progressionStats.averageSeverity)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical Periods</p>
              <p className="text-2xl font-bold text-white">
                {processedData.progressionStats.criticalPeriods}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Recovery Rate</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(processedData.progressionStats.recoveryRate)}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Issues</p>
              <p className="text-2xl font-bold text-white">
                {processedData.progressionStats.activeIssues}
              </p>
            </div>
            <Zap className="w-8 h-8 text-[#8B5CF6]" />
          </div>
        </Card>
      </div>

      {/* Main Timeline Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader
            title="Severity Progression Timeline"
            description="Track how issues develop and resolve over time"
            action={
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Real-time tracking</span>
              </div>
            }
          />
          <CardContent>
            {processedData.timelineSeries.length > 0 ? (
              <Chart
                options={timelineOptions}
                series={processedData.timelineSeries}
                type="line"
                height={400}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-2" />
                  <p>No timeline data available</p>
                  <p className="text-sm">Start monitoring issues to see progression trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Issue Breakdown and Event Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Stages Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Issue Stage Distribution"
              description="Current status of all tracked issues"
            />
            <CardContent>
              <div className="space-y-4">
                {['detection', 'monitoring', 'treatment', 'recovery', 'resolved'].map((stage) => {
                  const stageData = data.filter(point => point.stage === stage)
                  const percentage = (stageData.length / data.length) * 100 || 0

                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getStageColor(stage) }}
                          />
                          <span className="text-white capitalize">{stage}</span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {stageData.length} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <ProgressChart
                        label=""
                        value={percentage}
                        max={100}
                        color={getStageColor(stage)}
                        variant="linear"
                        size="sm"
                        showPercentage={false}
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader
              title="Recent Events"
              description="Latest progression events and milestones"
            />
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {events
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-[#1F2A44] rounded-lg"
                    >
                      <div
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: getEventColor(event.type) }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">
                            {event.issueName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">
                          {event.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 capitalize">
                            {event.type}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-1 rounded',
                            event.severity >= 70 ? 'bg-red-500/20 text-red-400' :
                            event.severity >= 40 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                            'bg-[#10B981]/20 text-[#10B981]'
                          )}>
                            {event.severity}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Predictions Panel */}
      {showPredictions && predictions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader
              title="Severity Predictions"
              description="AI-powered forecasts based on current trends"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {predictions.slice(0, 6).map((prediction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="p-4 bg-[#1F2A44] rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(prediction.date).toLocaleDateString()}
                      </span>
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        prediction.confidence >= 80 ? 'bg-[#10B981]/20 text-[#10B981]' :
                        prediction.confidence >= 60 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {prediction.confidence}% confident
                      </span>
                    </div>
                    
                    <div className="text-2xl font-bold text-white mb-2">
                      {Math.round(prediction.predictedSeverity)}%
                    </div>
                    
                    <div className="text-sm text-gray-300">
                      Key factors:
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {prediction.factors.slice(0, 2).map((factor, idx) => (
                          <li key={idx}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}