import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { BarChart3, Calendar, Filter } from 'lucide-react'

interface AnalysisHistoryData {
  month: string
  healthy: number
  pest: number
  disease: number
  total: number
}

interface AnalysisHistoryChartProps {
  data: AnalysisHistoryData[]
  timeRange: '6m' | '1y' | '2y'
  height?: number
}

export function AnalysisHistoryChart({ data, timeRange, height = 350 }: AnalysisHistoryChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [viewType, setViewType] = useState<'stacked' | 'percentage'>('stacked')

  useEffect(() => {
    if (data.length === 0) return

    if (viewType === 'stacked') {
      setChartData([
        {
          name: 'Healthy',
          data: data.map(item => item.healthy),
          color: '#10B981'
        },
        {
          name: 'Pest Issues',
          data: data.map(item => item.pest),
          color: '#F59E0B'
        },
        {
          name: 'Disease Issues',
          data: data.map(item => item.disease),
          color: '#EF4444'
        }
      ])
    } else {
      setChartData([
        {
          name: 'Healthy %',
          data: data.map(item => item.total > 0 ? Math.round((item.healthy / item.total) * 100) : 0),
          color: '#10B981'
        },
        {
          name: 'Pest Issues %',
          data: data.map(item => item.total > 0 ? Math.round((item.pest / item.total) * 100) : 0),
          color: '#F59E0B'
        },
        {
          name: 'Disease Issues %',
          data: data.map(item => item.total > 0 ? Math.round((item.disease / item.total) * 100) : 0),
          color: '#EF4444'
        }
      ])
    }
  }, [data, viewType])

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: {
        show: false
      },
      stacked: true
    },
    theme: {
      mode: 'dark'
    },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    xaxis: {
      categories: data.map(item => item.month),
      labels: {
        style: {
          colors: '#9CA3AF'
        }
      },
      axisBorder: {
        color: '#4B5563'
      },
      axisTicks: {
        color: '#4B5563'
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9CA3AF'
        },
        formatter: (value) => viewType === 'percentage' ? `${Math.round(value)}%` : Math.round(value).toString()
      }
    },
    tooltip: {
      theme: 'dark',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: (value) => {
          const suffix = viewType === 'percentage' ? '%' : ' analyses'
          return `${Math.round(value)}${suffix}`
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: '#9CA3AF'
      }
    }
  }

  const totalAnalyses = data.reduce((sum, item) => sum + item.total, 0)
  const healthyTotal = data.reduce((sum, item) => sum + item.healthy, 0)
  const healthyPercentage = totalAnalyses > 0 ? Math.round((healthyTotal / totalAnalyses) * 100) : 0

  return (
    <div className="bg-[#4A5B7C] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Analysis History</span>
          </h3>
          <p className="text-sm text-gray-300">Breakdown of crop conditions over time</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Type Toggle */}
          <div className="flex bg-[#1F2A44] rounded-lg p-1">
            <button
              onClick={() => setViewType('stacked')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewType === 'stacked' 
                  ? 'bg-[#10B981] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Count
            </button>
            <button
              onClick={() => setViewType('percentage')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewType === 'percentage' 
                  ? 'bg-[#10B981] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Percentage
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalAnalyses}</div>
          <div className="text-sm text-gray-400">Total Analyses</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#10B981]">{healthyPercentage}%</div>
          <div className="text-sm text-gray-400">Healthy Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#F59E0B]">
            {data.reduce((sum, item) => sum + item.pest, 0)}
          </div>
          <div className="text-sm text-gray-400">Pest Issues</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">
            {data.reduce((sum, item) => sum + item.disease, 0)}
          </div>
          <div className="text-sm text-gray-400">Disease Issues</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && data.length > 0 ? (
        <Chart
          options={options}
          series={chartData}
          type="bar"
          height={height}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2" />
            <p>No analysis history available</p>
            <p className="text-sm">Upload and analyze crop images to see trends</p>
          </div>
        </div>
      )}

      {/* Time Range Indicator */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-gray-400">
          <Filter className="w-4 h-4" />
          <span>Showing last {timeRange === '6m' ? '6 months' : timeRange === '1y' ? '1 year' : '2 years'}</span>
        </div>
        
        <div className="text-gray-400">
          Latest: {data.length > 0 ? data[data.length - 1].month : 'No data'}
        </div>
      </div>
    </div>
  )
}