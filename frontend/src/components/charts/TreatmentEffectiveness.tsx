import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  // TrendingDown,
  Zap,
  Clock,
  CheckCircle,
  // XCircle,
  // AlertCircle,
  Beaker,
  Calendar,
  BarChart3,
  // Filter,
  Layers
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { ProgressChart } from '../ui/Chart'
import { cn } from '../../utils/cn'

interface TreatmentData {
  id: string
  name: string
  type: 'organic' | 'biological' | 'chemical' | 'preventive'
  category: 'pesticide' | 'fungicide' | 'bactericide' | 'growth_regulator'
  targetIssues: string[]
  applicationDate: string
  dosage: string
  method: 'spray' | 'drench' | 'broadcast' | 'injection'
  cost: number
  expectedDuration: number // days
  followUpRequired: boolean
}

interface TreatmentApplication {
  id: string
  treatmentId: string
  cropId: string
  cropType: string
  areaSize: number // hectares
  appliedDate: string
  completedDate?: string
  beforeHealthScore: number
  afterHealthScore?: number
  improvementScore?: number
  sideEffects: string[]
  notes: string
  weatherConditions: {
    temperature: number
    humidity: number
    rainfall: number
  }
  applicator: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

interface EffectivenessMetrics {
  treatmentId: string
  treatmentName: string
  applications: number
  successRate: number
  averageImprovement: number
  averageRecoveryTime: number
  costEffectiveness: number
  sideEffectRate: number
  reapplicationRate: number
  seasonalPerformance: {
    season: string
    effectivenessScore: number
  }[]
}

interface TreatmentEffectivenessProps {
  treatments: TreatmentData[]
  applications: TreatmentApplication[]
  metrics: EffectivenessMetrics[]
  selectedTreatments?: string[]
  onTreatmentFilter?: (treatmentIds: string[]) => void
  timeRange?: '30d' | '90d' | '6m' | '1y'
  onTimeRangeChange?: (range: '30d' | '90d' | '6m' | '1y') => void
  className?: string
}

export function TreatmentEffectiveness({
  treatments,
  applications,
  metrics,
  selectedTreatments = [],
  // onTreatmentFilter,
  timeRange = '90d',
  onTimeRangeChange,
  className
}: TreatmentEffectivenessProps) {
  const [selectedMetric, setSelectedMetric] = React.useState<'success' | 'improvement' | 'cost' | 'time'>('success')
  const [comparisonMode, setComparisonMode] = React.useState(false)
  // const [selectedType, setSelectedType] = React.useState<string>('all')

  // Process data for visualizations
  const processedData = React.useMemo(() => {
    const filteredMetrics = selectedTreatments.length > 0 
      ? metrics.filter(m => selectedTreatments.includes(m.treatmentId))
      : metrics

    const filteredApplications = applications.filter(app => {
      const withinTimeRange = true // TODO: implement time range filtering
      const matchesTreatments = selectedTreatments.length === 0 || 
        selectedTreatments.includes(app.treatmentId)
      return withinTimeRange && matchesTreatments
    })

    // Success rate comparison
    const successRateData = filteredMetrics.map(metric => ({
      label: metric.treatmentName,
      value: metric.successRate,
      color: metric.successRate >= 80 ? '#10B981' : 
             metric.successRate >= 60 ? '#F59E0B' : '#EF4444'
    }))

    // Improvement effectiveness
    const improvementData = filteredMetrics.map(metric => ({
      label: metric.treatmentName,
      value: metric.averageImprovement,
      color: '#2DD4BF'
    }))

    // Cost effectiveness (lower is better, so invert for display)
    const costData = filteredMetrics.map(metric => ({
      label: metric.treatmentName,
      value: 100 - metric.costEffectiveness, // Invert for better visualization
      color: '#8B5CF6'
    }))

    // Recovery time data
    const recoveryTimeData = filteredMetrics.map(metric => ({
      label: metric.treatmentName,
      value: metric.averageRecoveryTime,
      color: '#F59E0B'
    }))

    // Treatment timeline for recovery
    const treatmentTimeline = filteredApplications
      .filter(app => app.status === 'completed' && app.afterHealthScore)
      .map(app => {
        const treatment = treatments.find(t => t.id === app.treatmentId)
        const startDate = new Date(app.appliedDate)
        const endDate = app.completedDate ? new Date(app.completedDate) : new Date()
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          x: daysDiff,
          y: app.afterHealthScore! - app.beforeHealthScore,
          name: treatment?.name || 'Unknown',
          beforeScore: app.beforeHealthScore,
          afterScore: app.afterHealthScore!,
          cropType: app.cropType
        }
      })

    // Monthly effectiveness trends
    const monthlyTrends = filteredApplications
      .filter(app => app.status === 'completed')
      .reduce((acc, app) => {
        const month = new Date(app.appliedDate).toISOString().slice(0, 7)
        if (!acc[month]) {
          acc[month] = { total: 0, successful: 0, totalImprovement: 0 }
        }
        acc[month].total++
        if (app.improvementScore && app.improvementScore > 0) {
          acc[month].successful++
          acc[month].totalImprovement += app.improvementScore
        }
        return acc
      }, {} as Record<string, { total: number; successful: number; totalImprovement: number }>)

    const monthlyTrendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        x: new Date(month + '-01').getTime(),
        y: data.successful / data.total * 100,
        totalApplications: data.total,
        avgImprovement: data.totalImprovement / data.successful || 0
      }))

    return {
      successRateData,
      improvementData,
      costData,
      recoveryTimeData,
      treatmentTimeline,
      monthlyTrendData
    }
  }, [treatments, applications, metrics, selectedTreatments, timeRange])

  // Chart options
  const barChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'center' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      style: { colors: ['#fff'] }
    },
    xaxis: {
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      labels: { style: { colors: '#9CA3AF' } }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: { theme: 'dark' }
  }

  const scatterOptions: ApexOptions = {
    chart: {
      type: 'scatter',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981'],
    xaxis: {
      title: { text: 'Recovery Time (days)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      title: { text: 'Health Improvement', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex }) => {
        const point = processedData.treatmentTimeline[dataPointIndex]
        return `
          <div class="p-3 bg-gray-800 rounded-lg shadow-lg">
            <div class="font-medium text-white">${point.name}</div>
            <div class="text-sm text-gray-300">
              Crop: ${point.cropType}<br>
              Before: ${point.beforeScore}%<br>
              After: ${point.afterScore}%<br>
              Recovery: ${point.x} days
            </div>
          </div>
        `
      }
    }
  }

  const areaOptions: ApexOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1
      }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      title: { text: 'Success Rate (%)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'MMM yyyy' }
    }
  }

  const getCurrentData = () => {
    switch (selectedMetric) {
      case 'improvement': return processedData.improvementData
      case 'cost': return processedData.costData
      case 'time': return processedData.recoveryTimeData
      default: return processedData.successRateData
    }
  }

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'improvement': return 'Health Improvement (%)'
      case 'cost': return 'Cost Effectiveness Score'
      case 'time': return 'Recovery Time (days)'
      default: return 'Success Rate (%)'
    }
  }

  const bestPerformer = React.useMemo(() => {
    const data = getCurrentData()
    if (data.length === 0) return null
    
    const sorted = [...data].sort((a, b) => {
      if (selectedMetric === 'time') return a.value - b.value // Lower is better for time
      return b.value - a.value // Higher is better for others
    })
    
    return sorted[0]
  }, [selectedMetric, processedData])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Treatment Effectiveness</h2>
          <p className="text-gray-300">Track and compare treatment performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <Select
            options={[
              { value: 'success', label: 'Success Rate' },
              { value: 'improvement', label: 'Health Improvement' },
              { value: 'cost', label: 'Cost Effectiveness' },
              { value: 'time', label: 'Recovery Time' }
            ]}
            value={selectedMetric}
            onChange={(value) => setSelectedMetric(value as any)}
            className="w-40"
          />

          {/* Time Range */}
          <Select
            options={[
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '6m', label: 'Last 6 months' },
              { value: '1y', label: 'Last year' }
            ]}
            value={timeRange}
            onChange={(value) => onTimeRangeChange?.(value as any)}
            className="w-40"
          />

          {/* Comparison Toggle */}
          <Button
            variant={comparisonMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setComparisonMode(!comparisonMode)}
            leftIcon={<Layers className="w-4 h-4" />}
          >
            Compare
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Treatments</p>
              <p className="text-2xl font-bold text-white">{treatments.length}</p>
            </div>
            <Beaker className="w-8 h-8 text-[#2DD4BF]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Applications</p>
              <p className="text-2xl font-bold text-white">{applications.length}</p>
            </div>
            <Zap className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Success Rate</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length)}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Best Performer</p>
              <p className="text-sm font-bold text-white truncate">
                {bestPerformer?.label || 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Comparison */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title={`Treatment ${getMetricLabel()}`}
              description="Compare treatment performance"
              action={
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <BarChart3 className="w-4 h-4" />
                  <span>Last {timeRange}</span>
                </div>
              }
            />
            <CardContent>
              {getCurrentData().length > 0 ? (
                <Chart
                  options={barChartOptions}
                  series={[{
                    name: getMetricLabel(),
                    data: getCurrentData().map(item => ({
                      x: item.label,
                      y: item.value,
                      fillColor: item.color
                    }))
                  }]}
                  type="bar"
                  height={350}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>No treatment data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recovery Time vs Improvement */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Recovery Analysis"
              description="Recovery time vs health improvement"
            />
            <CardContent>
              {processedData.treatmentTimeline.length > 0 ? (
                <Chart
                  options={scatterOptions}
                  series={[{
                    name: 'Treatments',
                    data: processedData.treatmentTimeline
                  }]}
                  type="scatter"
                  height={350}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-2" />
                    <p>No recovery data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader
              title="Effectiveness Trends"
              description="Monthly treatment success rates over time"
              action={
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Monthly aggregation</span>
                </div>
              }
            />
            <CardContent>
              {processedData.monthlyTrendData.length > 0 ? (
                <Chart
                  options={areaOptions}
                  series={[{
                    name: 'Success Rate',
                    data: processedData.monthlyTrendData.map(point => ({
                      x: point.x,
                      y: point.y
                    }))
                  }]}
                  type="area"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                    <p>No trend data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Treatment Performance Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader
            title="Treatment Performance Breakdown"
            description="Detailed metrics for each treatment"
          />
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.treatmentId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="p-4 bg-[#1F2A44] rounded-lg border border-gray-600"
                >
                  <h4 className="font-medium text-white mb-3">{metric.treatmentName}</h4>
                  
                  <div className="space-y-3">
                    <ProgressChart
                      label="Success Rate"
                      value={metric.successRate}
                      max={100}
                      color="#10B981"
                      variant="linear"
                      size="sm"
                    />
                    
                    <ProgressChart
                      label="Avg Improvement"
                      value={metric.averageImprovement}
                      max={100}
                      color="#2DD4BF"
                      variant="linear"
                      size="sm"
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Applications:</span>
                      <span className="text-white">{metric.applications}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg Recovery:</span>
                      <span className="text-white">{metric.averageRecoveryTime}d</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Side Effects:</span>
                      <span className={cn(
                        metric.sideEffectRate < 10 ? 'text-[#10B981]' :
                        metric.sideEffectRate < 25 ? 'text-[#F59E0B]' : 'text-red-400'
                      )}>
                        {metric.sideEffectRate}%
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
  )
}