import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion } from 'framer-motion'
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle,
  Settings,
  Layers,
  Zap,
  Activity,
  BarChart3
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { ProgressChart } from '../ui/Chart'
import { cn } from '../../utils/cn'

interface AIModelData {
  id: string
  name: string
  version: string
  type: 'vision' | 'classification' | 'detection' | 'prediction'
  provider: 'openai' | 'google' | 'local' | 'custom'
  isActive: boolean
  lastUpdated: string
}

interface ConfidenceScore {
  analysisId: string
  modelId: string
  modelName: string
  overallConfidence: number
  detectionConfidence: number
  classificationConfidence: number
  severity: number
  timestamp: string
  imageQuality: number
  processingTime: number
  factors: {
    imageClarity: number
    lightingConditions: number
    cropVisibility: number
    backgroundNoise: number
    resolution: number
  }
  predictions: Array<{
    class: string
    confidence: number
    boundingBox?: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
  validationStatus: 'pending' | 'confirmed' | 'rejected' | 'uncertain'
  expertFeedback?: {
    rating: number
    comments: string
    agronomistId: string
  }
}

interface ModelPerformanceMetrics {
  modelId: string
  modelName: string
  averageConfidence: number
  accuracyRate: number
  processingSpeed: number
  reliabilityScore: number
  totalAnalyses: number
  confidenceDistribution: {
    high: number // >80%
    medium: number // 60-80%
    low: number // <60%
  }
  trend: 'improving' | 'declining' | 'stable'
  lastCalibration: string
}

interface AIConfidenceVisualizationProps {
  confidenceScores: ConfidenceScore[]
  models: AIModelData[]
  performanceMetrics: ModelPerformanceMetrics[]
  selectedModel?: string
  onModelSelect?: (modelId: string) => void
  showDetails?: boolean
  onToggleDetails?: (show: boolean) => void
  calibrationMode?: boolean
  onCalibrationToggle?: (enabled: boolean) => void
  className?: string
}

export function AIConfidenceVisualization({
  confidenceScores,
  models,
  performanceMetrics,
  selectedModel,
  onModelSelect,
  showDetails = false,
  onToggleDetails,
  calibrationMode = false,
  onCalibrationToggle,
  className
}: AIConfidenceVisualizationProps) {
  const [selectedTimeRange, setSelectedTimeRange] = React.useState('7d')
  const [comparisonMode, setComparisonMode] = React.useState(false)
  // const [selectedMetric, setSelectedMetric] = React.useState<'confidence' | 'accuracy' | 'speed'>('confidence')

  // Process data for visualizations
  const processedData = React.useMemo(() => {
    const filteredScores = selectedModel
      ? confidenceScores.filter(score => score.modelId === selectedModel)
      : confidenceScores

    // Confidence distribution
    const confidenceDistribution = filteredScores.reduce((acc, score) => {
      if (score.overallConfidence >= 80) acc.high++
      else if (score.overallConfidence >= 60) acc.medium++
      else acc.low++
      return acc
    }, { high: 0, medium: 0, low: 0 })

    // Confidence over time
    const confidenceTimeline = filteredScores
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(score => ({
        x: new Date(score.timestamp).getTime(),
        y: score.overallConfidence,
        modelName: score.modelName,
        severity: score.severity,
        processingTime: score.processingTime
      }))

    // Model comparison data
    const modelComparison = performanceMetrics.map(metric => ({
      model: metric.modelName,
      confidence: metric.averageConfidence,
      accuracy: metric.accuracyRate,
      speed: metric.processingSpeed,
      reliability: metric.reliabilityScore,
      total: metric.totalAnalyses
    }))

    // Confidence vs Accuracy scatter
    const confidenceAccuracyScatter = performanceMetrics.map(metric => ({
      x: metric.averageConfidence,
      y: metric.accuracyRate,
      z: metric.totalAnalyses,
      name: metric.modelName,
      trend: metric.trend
    }))

    // Factor analysis for selected model
    const factorAnalysis = selectedModel
      ? filteredScores.map(score => ({
          imageClarity: score.factors.imageClarity,
          lighting: score.factors.lightingConditions,
          visibility: score.factors.cropVisibility,
          noise: score.factors.backgroundNoise,
          resolution: score.factors.resolution,
          confidence: score.overallConfidence
        }))
      : []

    // Average factor scores
    const avgFactors = factorAnalysis.length > 0
      ? factorAnalysis.reduce((acc, factors) => {
          acc.imageClarity += factors.imageClarity
          acc.lighting += factors.lighting
          acc.visibility += factors.visibility
          acc.noise += factors.noise
          acc.resolution += factors.resolution
          return acc
        }, { imageClarity: 0, lighting: 0, visibility: 0, noise: 0, resolution: 0 })
      : { imageClarity: 0, lighting: 0, visibility: 0, noise: 0, resolution: 0 }

    if (factorAnalysis.length > 0) {
      Object.keys(avgFactors).forEach(key => {
        avgFactors[key as keyof typeof avgFactors] /= factorAnalysis.length
      })
    }

    return {
      confidenceDistribution,
      confidenceTimeline,
      modelComparison,
      confidenceAccuracyScatter,
      factorAnalysis,
      avgFactors
    }
  }, [confidenceScores, performanceMetrics, selectedModel])

  // Chart configurations
  const distributionOptions: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    labels: ['High (80%+)', 'Medium (60-80%)', 'Low (<60%)'],
    legend: {
      labels: { colors: '#9CA3AF' },
      position: 'bottom'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              color: '#fff',
              label: 'Total Analyses'
            }
          }
        }
      }
    },
    tooltip: { theme: 'dark' }
  }

  const timelineOptions: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      strokeColors: '#1F2A44',
      hover: { size: 7 }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      title: { text: 'Confidence (%)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } },
      min: 0,
      max: 100
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy HH:mm' }
    }
  }

  const comparisonOptions: ApexOptions = {
    chart: {
      type: 'radar',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    colors: ['#10B981', '#F59E0B', '#EF4444', '#2DD4BF'],
    fill: {
      opacity: 0.2
    },
    markers: {
      size: 4
    },
    stroke: {
      width: 2
    },
    xaxis: {
      categories: ['Confidence', 'Accuracy', 'Speed', 'Reliability'],
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { style: { colors: '#9CA3AF' } }
    },
    legend: {
      labels: { colors: '#9CA3AF' }
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
      title: { text: 'Average Confidence (%)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } },
      min: 0,
      max: 100
    },
    yaxis: {
      title: { text: 'Accuracy Rate (%)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } },
      min: 0,
      max: 100
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex }) => {
        const point = processedData.confidenceAccuracyScatter[dataPointIndex]
        return `
          <div class="p-3 bg-gray-800 rounded-lg shadow-lg">
            <div class="font-medium text-white">${point.name}</div>
            <div class="text-sm text-gray-300">
              Confidence: ${point.x}%<br>
              Accuracy: ${point.y}%<br>
              Analyses: ${point.z}<br>
              Trend: ${point.trend}
            </div>
          </div>
        `
      }
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#10B981'
    if (confidence >= 60) return '#F59E0B'
    return '#EF4444'
  }

  // const getConfidenceLabel = (confidence: number) => {
  //   if (confidence >= 80) return 'High'
  //   if (confidence >= 60) return 'Medium'
  //   return 'Low'
  // }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-[#10B981]" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-400" />
      default: return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">AI Confidence Analysis</h2>
          <p className="text-gray-300">Model performance and reliability insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Model Selector */}
          <Select
            options={[
              { value: '', label: 'All Models' },
              ...models.map(model => ({ value: model.id, label: model.name }))
            ]}
            value={selectedModel || ''}
            onChange={(value) => onModelSelect?.(value)}
            placeholder="Select Model"
            className="w-40"
          />

          {/* Time Range */}
          <Select
            options={[
              { value: '24h', label: 'Last 24h' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' }
            ]}
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            className="w-32"
          />

          {/* Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={comparisonMode ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode(!comparisonMode)}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Compare
            </Button>
            <Button
              variant={showDetails ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onToggleDetails?.(!showDetails)}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Details
            </Button>
            <Button
              variant={calibrationMode ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onCalibrationToggle?.(!calibrationMode)}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Calibrate
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Confidence</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(confidenceScores.reduce((sum, score) => sum + score.overallConfidence, 0) / confidenceScores.length || 0)}%
              </p>
            </div>
            <Brain className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Confidence</p>
              <p className="text-2xl font-bold text-white">
                {processedData.confidenceDistribution.high}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Models</p>
              <p className="text-2xl font-bold text-white">
                {models.filter(model => model.isActive).length}
              </p>
            </div>
            <Layers className="w-8 h-8 text-[#2DD4BF]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Processing</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(confidenceScores.reduce((sum, score) => sum + score.processingTime, 0) / confidenceScores.length || 0)}ms
              </p>
            </div>
            <Zap className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title="Confidence Distribution"
              description="Breakdown of confidence levels"
            />
            <CardContent>
              {Object.values(processedData.confidenceDistribution).some(val => val > 0) ? (
                <Chart
                  options={distributionOptions}
                  series={[
                    processedData.confidenceDistribution.high,
                    processedData.confidenceDistribution.medium,
                    processedData.confidenceDistribution.low
                  ]}
                  type="donut"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-2" />
                    <p>No confidence data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence Timeline */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Confidence Over Time"
              description="Track confidence trends"
            />
            <CardContent>
              {processedData.confidenceTimeline.length > 0 ? (
                <Chart
                  options={timelineOptions}
                  series={[{
                    name: 'Confidence',
                    data: processedData.confidenceTimeline
                  }]}
                  type="line"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2" />
                    <p>No timeline data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Model Comparison */}
        {comparisonMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader
                title="Model Performance Comparison"
                description="Radar chart comparing all models"
              />
              <CardContent>
                {performanceMetrics.length > 0 ? (
                  <Chart
                    options={comparisonOptions}
                    series={performanceMetrics.map(metric => ({
                      name: metric.modelName,
                      data: [
                        metric.averageConfidence,
                        metric.accuracyRate,
                        metric.processingSpeed,
                        metric.reliabilityScore
                      ]
                    }))}
                    type="radar"
                    height={400}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Confidence vs Accuracy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={comparisonMode ? 'lg:col-span-1' : 'lg:col-span-2'}
        >
          <Card>
            <CardHeader
              title="Confidence vs Accuracy"
              description="Model reliability analysis"
            />
            <CardContent>
              {processedData.confidenceAccuracyScatter.length > 0 ? (
                <Chart
                  options={scatterOptions}
                  series={[{
                    name: 'Models',
                    data: processedData.confidenceAccuracyScatter
                  }]}
                  type="scatter"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-2" />
                    <p>No correlation data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Model Performance Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader
            title="Model Performance Summary"
            description="Detailed metrics for each AI model"
          />
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {performanceMetrics.map((metric, index) => (
                <motion.div
                  key={metric.modelId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={cn(
                    'p-4 rounded-lg border transition-colors cursor-pointer',
                    selectedModel === metric.modelId
                      ? 'border-[#10B981] bg-[#10B981]/10'
                      : 'border-gray-600 bg-[#1F2A44] hover:border-gray-500'
                  )}
                  onClick={() => onModelSelect?.(metric.modelId)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{metric.modelName}</h4>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <ProgressChart
                      label="Avg Confidence"
                      value={metric.averageConfidence}
                      max={100}
                      color={getConfidenceColor(metric.averageConfidence)}
                      variant="linear"
                      size="sm"
                    />

                    <ProgressChart
                      label="Accuracy Rate"
                      value={metric.accuracyRate}
                      max={100}
                      color="#2DD4BF"
                      variant="linear"
                      size="sm"
                    />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Analyses:</span>
                      <span className="text-white">{metric.totalAnalyses}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Speed:</span>
                      <span className="text-white">{metric.processingSpeed}ms</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reliability:</span>
                      <span className={cn(
                        metric.reliabilityScore >= 80 ? 'text-[#10B981]' :
                        metric.reliabilityScore >= 60 ? 'text-[#F59E0B]' : 'text-red-400'
                      )}>
                        {metric.reliabilityScore}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Factor Analysis (if model selected) */}
      {selectedModel && showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader
              title="Confidence Factors Analysis"
              description="Factors affecting AI confidence for selected model"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(processedData.avgFactors).map(([factor, value]) => (
                  <div key={factor} className="text-center">
                    <div className="mb-2">
                      <ProgressChart
                        label=""
                        value={value}
                        max={100}
                        color={value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444'}
                        variant="circular"
                        size="md"
                        showPercentage={true}
                      />
                    </div>
                    <h4 className="text-sm font-medium text-white capitalize">
                      {factor.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Avg: {Math.round(value)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}