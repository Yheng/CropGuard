import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface HealthDataPoint {
  date: string
  healthScore: number
  condition: 'healthy' | 'warning' | 'critical'
  cropType: string
}

interface HealthTrendChartProps {
  data: HealthDataPoint[]
  timeRange: '7d' | '30d' | '90d' | '1y'
  height?: number
}

export function HealthTrendChart({ data, timeRange, height = 300 }: HealthTrendChartProps) {
  const [chartData, setChartData] = useState<Array<{
    name: string
    data: Array<{
      x: number
      y: number
      fillColor: string
    }>
  }>>([])
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')

  useEffect(() => {
    if (data.length === 0) return

    // Process data for chart
    const processedData = data.map(point => ({
      x: new Date(point.date).getTime(),
      y: point.healthScore,
      fillColor: getHealthColor(point.condition)
    }))

    setChartData([{
      name: 'Health Score',
      data: processedData
    }])

    // Calculate trend
    if (data.length > 1) {
      const recent = data.slice(-3).reduce((sum, point) => sum + point.healthScore, 0) / 3
      const previous = data.slice(-6, -3).reduce((sum, point) => sum + point.healthScore, 0) / 3
      
      if (recent > previous + 5) setTrend('up')
      else if (recent < previous - 5) setTrend('down')
      else setTrend('stable')
    }
  }, [data])

  const getHealthColor = (condition: string) => {
    switch (condition) {
      case 'healthy': return '#10B981'
      case 'warning': return '#F59E0B'
      case 'critical': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-5 h-5 text-[#10B981]" />
      case 'down': return <TrendingDown className="w-5 h-5 text-red-400" />
      default: return <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
    }
  }

  const getTrendText = () => {
    switch (trend) {
      case 'up': return 'Improving'
      case 'down': return 'Declining'
      default: return 'Stable'
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-[#10B981]'
      case 'down': return 'text-red-400'
      default: return 'text-[#F59E0B]'
    }
  }

  const options: ApexOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    theme: {
      mode: 'dark'
    },
    colors: ['#10B981'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#9CA3AF'
        },
        format: timeRange === '7d' ? 'dd MMM' : timeRange === '30d' ? 'dd MMM' : 'MMM yyyy'
      },
      axisBorder: {
        color: '#4B5563'
      },
      axisTicks: {
        color: '#4B5563'
      }
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        style: {
          colors: '#9CA3AF'
        },
        formatter: (value) => `${Math.round(value)}%`
      }
    },
    tooltip: {
      theme: 'dark',
      style: {
        fontSize: '12px'
      },
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value) => `${Math.round(value)}% Health Score`
      }
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: '#1F2A44',
      hover: {
        size: 6
      }
    }
  }

  const currentScore = data.length > 0 ? data[data.length - 1].healthScore : 0

  return (
    <div className="bg-[#4A5B7C] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Crop Health Trend</h3>
          <p className="text-sm text-gray-300">Overall health score over time</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {Math.round(currentScore)}%
          </div>
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{getTrendText()}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <Chart
          options={options}
          series={chartData}
          type="area"
          height={height}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <p>No health data available</p>
            <p className="text-sm">Upload crop images to start tracking health trends</p>
          </div>
        </div>
      )}

      {/* Health Status Indicators */}
      <div className="mt-4 flex justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
          <span className="text-gray-300">Healthy (80-100%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
          <span className="text-gray-300">Warning (50-79%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
          <span className="text-gray-300">Critical (0-49%)</span>
        </div>
      </div>
    </div>
  )
}