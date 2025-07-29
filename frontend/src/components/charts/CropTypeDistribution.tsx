import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { PieChart, Leaf } from 'lucide-react'

interface CropTypeData {
  name: string
  count: number
  healthScore: number
  color: string
}

interface CropTypeDistributionProps {
  data: CropTypeData[]
  height?: number
}

export function CropTypeDistribution({ data, height = 300 }: CropTypeDistributionProps) {
  const [chartData, setChartData] = useState<number[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    if (data.length === 0) return

    setChartData(data.map(item => item.count))
    setLabels(data.map(item => item.name))
    setColors(data.map(item => item.color))
  }, [data])

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent'
    },
    theme: {
      mode: 'dark'
    },
    colors: colors,
    labels: labels,
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        colors: ['#ffffff']
      },
      formatter: (val: number) => `${Math.round(val)}%`
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              color: '#9CA3AF'
            },
            value: {
              show: true,
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ffffff',
              formatter: (val: string) => parseInt(val).toString()
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total Crops',
              fontSize: '12px',
              color: '#9CA3AF',
              formatter: () => {
                const total = data.reduce((sum, item) => sum + item.count, 0)
                return total.toString()
              }
            }
          }
        }
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      theme: 'dark',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: (value, { seriesIndex }) => {
          const item = data[seriesIndex]
          return `${value} analyses (${item.healthScore}% avg health)`
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        }
      }
    }]
  }

  const totalAnalyses = data.reduce((sum, item) => sum + item.count, 0)
  const avgHealthScore = data.length > 0 
    ? Math.round(data.reduce((sum, item) => sum + (item.healthScore * item.count), 0) / totalAnalyses)
    : 0

  return (
    <div className="bg-[#4A5B7C] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center space-x-2">
            <PieChart className="w-5 h-5" />
            <span>Crop Distribution</span>
          </h3>
          <p className="text-sm text-gray-300">Analysis breakdown by crop type</p>
        </div>
        
        <div className="text-right">
          <div className="text-xl font-bold text-white">{avgHealthScore}%</div>
          <div className="text-sm text-gray-400">Avg Health</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2">
            <Chart
              options={options}
              series={chartData}
              type="donut"
              height={height}
            />
          </div>
          
          {/* Legend */}
          <div className="lg:w-1/2 lg:ml-6 mt-4 lg:mt-0">
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#1F2A44] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-sm text-gray-400">
                        {item.count} analyses
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {Math.round((item.count / totalAnalyses) * 100)}%
                    </div>
                    <div className={`text-sm ${
                      item.healthScore >= 80 ? 'text-[#10B981]' :
                      item.healthScore >= 60 ? 'text-[#F59E0B]' : 'text-red-400'
                    }`}>
                      {item.healthScore}% health
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Leaf className="w-12 h-12 mx-auto mb-2" />
            <p>No crop data available</p>
            <p className="text-sm">Analyze different crop types to see distribution</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {data.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{data.length}</div>
              <div className="text-sm text-gray-400">Crop Types</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{totalAnalyses}</div>
              <div className="text-sm text-gray-400">Total Analyses</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${
                avgHealthScore >= 80 ? 'text-[#10B981]' :
                avgHealthScore >= 60 ? 'text-[#F59E0B]' : 'text-red-400'
              }`}>
                {avgHealthScore}%
              </div>
              <div className="text-sm text-gray-400">Overall Health</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}