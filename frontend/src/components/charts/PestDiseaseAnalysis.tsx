import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion } from 'framer-motion'
import {
  Bug,
  // Virus,
  AlertTriangle,
  Eye,
  Target,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Info
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { cn } from '../../utils/cn'

interface PestDiseaseData {
  id: string
  name: string
  type: 'pest' | 'disease'
  severity: number
  confidence: number
  frequency: number
  firstDetected: string
  lastDetected: string
  affectedArea: number
  cropTypes: string[]
  symptoms: string[]
  treatmentSuccess: number
  trend: 'increasing' | 'decreasing' | 'stable'
  location: {
    lat: number
    lng: number
    region: string
  }
}

interface AnalysisResult {
  id: string
  imageUrl: string
  date: string
  cropType: string
  detectedIssues: PestDiseaseData[]
  overallConfidence: number
  recommendedActions: string[]
  aiModel: string
  processingTime: number
}

interface PestDiseaseAnalysisProps {
  data: AnalysisResult[]
  selectedTypes?: ('pest' | 'disease')[]
  onTypeFilter?: (types: ('pest' | 'disease')[]) => void
  onExport?: (format: 'pdf' | 'csv' | 'json') => void
  className?: string
}

export function PestDiseaseAnalysis({
  data,
  selectedTypes = ['pest', 'disease'],
  onTypeFilter,
  onExport,
  className
}: PestDiseaseAnalysisProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState('30d')
  // const [selectedSeverity, setSelectedSeverity] = React.useState('all')
  const [showConfidence, setShowConfidence] = React.useState(true)

  // Process data for visualizations
  const processedData = React.useMemo(() => {
    const filteredData = data.filter(result => 
      result.detectedIssues.some(issue => selectedTypes.includes(issue.type))
    )

    // Issue frequency by type
    const issueFrequency = filteredData.reduce((acc, result) => {
      result.detectedIssues.forEach(issue => {
        if (selectedTypes.includes(issue.type)) {
          const key = issue.name
          acc[key] = (acc[key] || 0) + 1
        }
      })
      return acc
    }, {} as Record<string, number>)

    // Severity distribution
    const severityDistribution = filteredData.reduce((acc, result) => {
      result.detectedIssues.forEach(issue => {
        if (selectedTypes.includes(issue.type)) {
          const bucket = issue.severity < 30 ? 'Low' : 
                        issue.severity < 70 ? 'Medium' : 'High'
          acc[bucket] = (acc[bucket] || 0) + 1
        }
      })
      return acc
    }, {} as Record<string, number>)

    // Confidence vs Severity scatter plot
    const confidenceScatter = filteredData.flatMap(result =>
      result.detectedIssues
        .filter(issue => selectedTypes.includes(issue.type))
        .map(issue => ({
          x: issue.confidence,
          y: issue.severity,
          name: issue.name,
          type: issue.type
        }))
    )

    // Detection timeline
    const detectionTimeline = filteredData.reduce((acc, result) => {
      const date = new Date(result.date).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + result.detectedIssues.filter(issue => 
        selectedTypes.includes(issue.type)
      ).length
      return acc
    }, {} as Record<string, number>)

    return {
      issueFrequency: Object.entries(issueFrequency).map(([name, count]) => ({
        label: name,
        value: count,
        color: name.includes('pest') ? '#EF4444' : '#F59E0B'
      })),
      severityDistribution: Object.entries(severityDistribution).map(([severity, count]) => ({
        label: severity,
        value: count,
        color: severity === 'High' ? '#DC2626' : 
               severity === 'Medium' ? '#F59E0B' : '#10B981'
      })),
      confidenceScatter,
      detectionTimeline: Object.entries(detectionTimeline)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ x: new Date(date).getTime(), y: count }))
    }
  }, [data, selectedTypes])

  // Chart configurations
  const frequencyChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    colors: ['#EF4444', '#F59E0B'],
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'center' }
      }
    },
    dataLabels: {
      enabled: true,
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
    tooltip: {
      theme: 'dark'
    }
  }

  const scatterChartOptions: ApexOptions = {
    chart: {
      type: 'scatter',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    theme: { mode: 'dark' },
    colors: ['#EF4444', '#F59E0B'],
    xaxis: {
      title: { text: 'AI Confidence (%)', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } },
      min: 0,
      max: 100
    },
    yaxis: {
      title: { text: 'Severity Score', style: { color: '#9CA3AF' } },
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
        const point = processedData.confidenceScatter[dataPointIndex]
        return `
          <div class="p-3 bg-gray-800 rounded-lg shadow-lg">
            <div class="font-medium text-white">${point.name}</div>
            <div class="text-sm text-gray-300">
              Confidence: ${point.x}%<br>
              Severity: ${point.y}<br>
              Type: ${point.type}
            </div>
          </div>
        `
      }
    }
  }

  const timelineChartOptions: ApexOptions = {
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
      title: { text: 'Detections', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' }
    }
  }

  const handleExport = (format: 'pdf' | 'csv' | 'json') => {
    onExport?.(format)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Pest & Disease Analysis</h2>
          <p className="text-gray-300">Advanced visualization and insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex bg-[#1F2A44] rounded-lg p-1">
            <button
              onClick={() => onTypeFilter?.(['pest', 'disease'])}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                selectedTypes.length === 2
                  ? 'bg-[#10B981] text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              All
            </button>
            <button
              onClick={() => onTypeFilter?.(['pest'])}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                selectedTypes.includes('pest') && selectedTypes.length === 1
                  ? 'bg-[#EF4444] text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Pests
            </button>
            <button
              onClick={() => onTypeFilter?.(['disease'])}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                selectedTypes.includes('disease') && selectedTypes.length === 1
                  ? 'bg-[#F59E0B] text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Diseases
            </button>
          </div>

          {/* Period Selector */}
          <Select
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            className="w-40"
          />

          {/* Export Button */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Detections</p>
              <p className="text-2xl font-bold text-white">
                {data.reduce((sum, result) => sum + result.detectedIssues.length, 0)}
              </p>
            </div>
            <Bug className="w-8 h-8 text-[#EF4444]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Confidence</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(data.reduce((sum, result) => sum + result.overallConfidence, 0) / data.length)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Severity</p>
              <p className="text-2xl font-bold text-white">
                {data.reduce((sum, result) => 
                  sum + result.detectedIssues.filter(issue => issue.severity >= 70).length, 0
                )}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Unique Issues</p>
              <p className="text-2xl font-bold text-white">
                {new Set(data.flatMap(result => result.detectedIssues.map(issue => issue.name))).size}
              </p>
            </div>
            <div className="w-8 h-8 text-[#2DD4BF] flex items-center justify-center text-xl">🦠</div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Frequency */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title="Most Common Issues"
              description="Frequency of detected pests and diseases"
              action={
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Filter className="w-4 h-4" />
                  <span>Last {selectedPeriod}</span>
                </div>
              }
            />
            <CardContent>
              {processedData.issueFrequency.length > 0 ? (
                <Chart
                  options={frequencyChartOptions}
                  series={[{
                    name: 'Detections',
                    data: processedData.issueFrequency.map(item => ({
                      x: item.label,
                      y: item.value,
                      fillColor: item.color
                    }))
                  }]}
                  type="bar"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Bug className="w-12 h-12 mx-auto mb-2" />
                    <p>No issues detected</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Severity Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Severity Distribution"
              description="Breakdown of issue severity levels"
            />
            <CardContent>
              {processedData.severityDistribution.length > 0 ? (
                <Chart
                  options={{
                    chart: { type: 'donut', background: 'transparent' },
                    theme: { mode: 'dark' },
                    colors: processedData.severityDistribution.map(item => item.color),
                    labels: processedData.severityDistribution.map(item => item.label),
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
                              color: '#fff'
                            }
                          }
                        }
                      }
                    }
                  }}
                  series={processedData.severityDistribution.map(item => item.value)}
                  type="donut"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                    <p>No severity data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence vs Severity Scatter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader
              title="Confidence vs Severity"
              description="AI confidence plotted against issue severity"
              action={
                <button
                  onClick={() => setShowConfidence(!showConfidence)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showConfidence ? 'Hide' : 'Show'} Details</span>
                </button>
              }
            />
            <CardContent>
              {processedData.confidenceScatter.length > 0 ? (
                <Chart
                  options={scatterChartOptions}
                  series={[
                    {
                      name: 'Pests',
                      data: processedData.confidenceScatter.filter(point => point.type === 'pest')
                    },
                    {
                      name: 'Diseases',
                      data: processedData.confidenceScatter.filter(point => point.type === 'disease')
                    }
                  ]}
                  type="scatter"
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

        {/* Detection Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader
              title="Detection Timeline"
              description="Issue detections over time"
              action={
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Daily aggregation</span>
                </div>
              }
            />
            <CardContent>
              {processedData.detectionTimeline.length > 0 ? (
                <Chart
                  options={timelineChartOptions}
                  series={[{
                    name: 'Detections',
                    data: processedData.detectionTimeline
                  }]}
                  type="area"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                    <p>No timeline data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analysis Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader
            title="AI Analysis Insights"
            description="Key findings and recommendations"
            action={
              <Info className="w-5 h-5 text-gray-400" />
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-[#1F2A44] rounded-lg">
                <h4 className="font-medium text-white mb-2">Detection Accuracy</h4>
                <p className="text-sm text-gray-300">
                  AI models show {Math.round(data.reduce((sum, result) => sum + result.overallConfidence, 0) / data.length)}% 
                  average confidence across all detections.
                </p>
              </div>
              
              <div className="p-4 bg-[#1F2A44] rounded-lg">
                <h4 className="font-medium text-white mb-2">Risk Assessment</h4>
                <p className="text-sm text-gray-300">
                  {data.reduce((sum, result) => sum + result.detectedIssues.filter(issue => issue.severity >= 70).length, 0)} 
                  high-severity issues require immediate attention.
                </p>
              </div>
              
              <div className="p-4 bg-[#1F2A44] rounded-lg">
                <h4 className="font-medium text-white mb-2">Trend Analysis</h4>
                <p className="text-sm text-gray-300">
                  Most common issue type: {selectedTypes.includes('pest') && selectedTypes.includes('disease') ? 'Mixed detection' : 
                  selectedTypes.includes('pest') ? 'Pest infestations' : 'Disease outbreaks'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}