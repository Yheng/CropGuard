import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion } from 'framer-motion'
import {
  MapPin,
  Layers,
  // Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Settings,
  Eye,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { cn } from '../../utils/cn'

interface GeographicalDataPoint {
  id: string
  lat: number
  lng: number
  healthScore: number
  cropType: string
  farmName: string
  area: number // hectares
  lastUpdated: string
  issues: Array<{
    type: 'pest' | 'disease'
    name: string
    severity: number
  }>
  weather: {
    temperature: number
    humidity: number
    rainfall: number
  }
  soilConditions: {
    ph: number
    moisture: number
    nutrients: string[]
  }
}

interface RegionData {
  name: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  averageHealth: number
  farmCount: number
  totalArea: number
  majorCrops: string[]
  alertCount: number
}

interface HeatmapLayer {
  id: string
  name: string
  type: 'health' | 'pest_density' | 'disease_risk' | 'soil_quality' | 'weather_risk'
  visible: boolean
  opacity: number
  color: string
}

interface GeographicalHeatmapProps {
  data: GeographicalDataPoint[]
  regions: RegionData[]
  selectedRegion?: string
  onRegionSelect?: (regionId: string) => void
  layers?: HeatmapLayer[]
  onLayerToggle?: (layerId: string, visible: boolean) => void
  showClusters?: boolean
  onClusterToggle?: (enabled: boolean) => void
  className?: string
}

export function GeographicalHeatmap({
  data,
  regions,
  selectedRegion,
  onRegionSelect,
  layers = [
    { id: 'health', name: 'Health Score', type: 'health', visible: true, opacity: 0.7, color: '#10B981' },
    { id: 'pest', name: 'Pest Density', type: 'pest_density', visible: false, opacity: 0.6, color: '#EF4444' },
    { id: 'disease', name: 'Disease Risk', type: 'disease_risk', visible: false, opacity: 0.6, color: '#F59E0B' },
    { id: 'soil', name: 'Soil Quality', type: 'soil_quality', visible: false, opacity: 0.5, color: '#8B5CF6' },
    { id: 'weather', name: 'Weather Risk', type: 'weather_risk', visible: false, opacity: 0.5, color: '#2DD4BF' }
  ],
  onLayerToggle,
  showClusters = true,
  onClusterToggle,
  className
}: GeographicalHeatmapProps) {
  const [zoomLevel, setZoomLevel] = React.useState(8)
  const [selectedPoint, setSelectedPoint] = React.useState<GeographicalDataPoint | null>(null)
  const [showDetails, setShowDetails] = React.useState(false)
  const [mapStyle, setMapStyle] = React.useState<'standard' | 'satellite' | 'terrain'>('standard')

  // Process data for different visualizations
  const processedData = React.useMemo(() => {
    // Create heatmap data based on active layers
    const heatmapSeries = layers
      .filter(layer => layer.visible)
      .map(layer => {
        const layerData = data.map(point => {
          let value = 0
          
          switch (layer.type) {
            case 'health':
              value = point.healthScore
              break
            case 'pest_density':
              value = point.issues.filter(issue => issue.type === 'pest').length * 20
              break
            case 'disease_risk':
              value = point.issues.filter(issue => issue.type === 'disease').reduce((sum, issue) => sum + issue.severity, 0) / point.issues.length || 0
              break
            case 'soil_quality':
              value = (point.soilConditions.ph * 10) + (point.soilConditions.moisture * 0.5)
              break
            case 'weather_risk':
              value = Math.min(100, (point.weather.temperature > 35 ? 30 : 0) + 
                                   (point.weather.humidity > 80 ? 25 : 0) + 
                                   (point.weather.rainfall > 50 ? 20 : 0))
              break
          }
          
          return {
            x: point.lng,
            y: point.lat,
            z: value,
            pointData: point
          }
        })

        return {
          name: layer.name,
          data: layerData,
          color: layer.color,
          opacity: layer.opacity
        }
      })

    // Cluster data for performance
    const clusters = showClusters ? createClusters(data, zoomLevel) : []

    // Region statistics
    const regionStats = regions.map(region => {
      const regionPoints = data.filter(point => 
        point.lat >= region.bounds.south && point.lat <= region.bounds.north &&
        point.lng >= region.bounds.west && point.lng <= region.bounds.east
      )

      const avgHealth = regionPoints.reduce((sum, point) => sum + point.healthScore, 0) / regionPoints.length || 0
      const issueCount = regionPoints.reduce((sum, point) => sum + point.issues.length, 0)

      return {
        ...region,
        currentHealth: avgHealth,
        activeIssues: issueCount,
        dataPoints: regionPoints.length
      }
    })

    return {
      heatmapSeries,
      clusters,
      regionStats
    }
  }, [data, layers, showClusters, zoomLevel, regions])

  // Create clusters for better performance with large datasets
  function createClusters(points: GeographicalDataPoint[], zoom: number) {
    const clusterSize = zoom > 10 ? 0.01 : zoom > 8 ? 0.05 : 0.1
    const clusters = new Map<string, {
      lat: number
      lng: number
      points: GeographicalDataPoint[]
      avgHealth: number
    }>()

    points.forEach(point => {
      const clusterLat = Math.round(point.lat / clusterSize) * clusterSize
      const clusterLng = Math.round(point.lng / clusterSize) * clusterSize
      const key = `${clusterLat}-${clusterLng}`

      if (!clusters.has(key)) {
        clusters.set(key, {
          lat: clusterLat,
          lng: clusterLng,
          points: [],
          avgHealth: 0
        })
      }

      const cluster = clusters.get(key)!
      cluster.points.push(point)
      cluster.avgHealth = cluster.points.reduce((sum, p) => sum + p.healthScore, 0) / cluster.points.length
    })

    return Array.from(clusters.values())
  }

  // Heatmap chart options
  const heatmapOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    theme: { mode: 'dark' },
    dataLabels: { enabled: false },
    colors: ['#10B981'],
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 10,
        useFillColorAsStroke: true,
        colorScale: {
          ranges: [
            { from: 0, to: 30, color: '#DC2626', name: 'Critical' },
            { from: 31, to: 60, color: '#F59E0B', name: 'Warning' },
            { from: 61, to: 80, color: '#10B981', name: 'Good' },
            { from: 81, to: 100, color: '#059669', name: 'Excellent' }
          ]
        }
      }
    },
    xaxis: {
      type: 'numeric',
      title: { text: 'Longitude', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      title: { text: 'Latitude', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    grid: {
      borderColor: '#4B5563',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex, seriesIndex }) => {
        const series = processedData.heatmapSeries[seriesIndex]
        const point = series?.data[dataPointIndex]?.pointData
        
        if (!point) return ''
        
        return `
          <div class="p-3 bg-gray-800 rounded-lg shadow-lg max-w-xs">
            <div class="font-medium text-white mb-2">${point.farmName}</div>
            <div class="text-sm text-gray-300 space-y-1">
              <div>Health Score: ${point.healthScore}%</div>
              <div>Crop: ${point.cropType}</div>
              <div>Area: ${point.area} hectares</div>
              <div>Issues: ${point.issues.length}</div>
              <div>Last Updated: ${new Date(point.lastUpdated).toLocaleDateString()}</div>
            </div>
          </div>
        `
      }
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    if (score >= 40) return '#EF4444'
    return '#DC2626'
  }

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Warning'
    return 'Critical'
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Geographical Health Map</h2>
          <p className="text-gray-300">Regional crop health visualization</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Map Style Selector */}
          <Select
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'satellite', label: 'Satellite' },
              { value: 'terrain', label: 'Terrain' }
            ]}
            value={mapStyle}
            onChange={(value) => setMapStyle(value as 'standard' | 'satellite' | 'terrain')}
            className="w-32"
          />

          {/* Region Selector */}
          <Select
            options={[
              { value: '', label: 'All Regions' },
              ...regions.map(region => ({ value: region.name, label: region.name }))
            ]}
            value={selectedRegion || ''}
            onChange={(value) => onRegionSelect?.(value)}
            placeholder="Select Region"
            className="w-40"
          />

          {/* Zoom Controls */}
          <div className="flex bg-[#1F2A44] rounded-lg">
            <button
              onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="px-3 py-2 text-sm text-white border-x border-gray-600">
              {zoomLevel}x
            </div>
            <button
              onClick={() => setZoomLevel(Math.min(15, zoomLevel + 1))}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Layer Controls Panel */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader title="Map Layers" description="Toggle visualization layers" />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layers.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between p-3 bg-[#1F2A44] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-white font-medium">{layer.name}</span>
                    </div>
                    <Switch
                      checked={layer.visible}
                      onChange={(e) => onLayerToggle?.(layer.id, e.target.checked)}
                      size="sm"
                    />
                  </div>
                ))}
                
                <div className="flex items-center justify-between p-3 bg-[#1F2A44] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">Clustering</span>
                  </div>
                  <Switch
                    checked={showClusters}
                    onChange={(e) => onClusterToggle?.(e.target.checked)}
                    size="sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Farms</p>
              <p className="text-2xl font-bold text-white">{data.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-[#2DD4BF]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Health Score</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(data.reduce((sum, point) => sum + point.healthScore, 0) / data.length)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold text-white">
                {data.reduce((sum, point) => sum + point.issues.filter(issue => issue.severity >= 70).length, 0)}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Area</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(data.reduce((sum, point) => sum + point.area, 0))} ha
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#8B5CF6]" />
          </div>
        </Card>
      </div>

      {/* Main Map and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Heatmap */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <Card>
            <CardHeader
              title="Interactive Health Map"
              description="Click on data points to view details"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(8)}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export
                  </Button>
                </div>
              }
            />
            <CardContent>
              {processedData.heatmapSeries.length > 0 ? (
                <Chart
                  options={heatmapOptions}
                  series={processedData.heatmapSeries}
                  type="heatmap"
                  height={500}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No geographical data available</p>
                    <p className="text-sm">Add location data to your crop analyses to see the heatmap</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Regional Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Regional Summary"
              description="Health status by region"
            />
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {processedData.regionStats.map((region, index) => (
                  <motion.div
                    key={region.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={cn(
                      'p-4 rounded-lg border transition-colors cursor-pointer',
                      selectedRegion === region.name
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : 'border-gray-600 bg-[#1F2A44] hover:border-gray-500'
                    )}
                    onClick={() => onRegionSelect?.(region.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{region.name}</h4>
                      <div className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        region.currentHealth >= 80 ? 'bg-[#10B981]/20 text-[#10B981]' :
                        region.currentHealth >= 60 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {Math.round(region.currentHealth)}%
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span>Farms:</span>
                        <span>{region.dataPoints}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Area:</span>
                        <span>{Math.round(region.totalArea)} ha</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Issues:</span>
                        <span className={region.activeIssues > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}>
                          {region.activeIssues}
                        </span>
                      </div>
                    </div>
                    
                    {region.majorCrops.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <div className="text-xs text-gray-400 mb-1">Major Crops:</div>
                        <div className="flex flex-wrap gap-1">
                          {region.majorCrops.slice(0, 3).map((crop) => (
                            <span
                              key={crop}
                              className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                            >
                              {crop}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Selected Point Details */}
      {selectedPoint && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title={`${selectedPoint.farmName} Details`}
              description="Detailed information for selected location"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPoint(null)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              }
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Farm Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Crop Type:</span>
                      <span className="text-white">{selectedPoint.cropType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Area:</span>
                      <span className="text-white">{selectedPoint.area} hectares</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Health Score:</span>
                      <span className={cn(
                        'font-medium',
                        getHealthColor(selectedPoint.healthScore) === '#10B981' ? 'text-[#10B981]' :
                        getHealthColor(selectedPoint.healthScore) === '#F59E0B' ? 'text-[#F59E0B]' :
                        'text-red-400'
                      )}>
                        {selectedPoint.healthScore}% ({getHealthStatus(selectedPoint.healthScore)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coordinates:</span>
                      <span className="text-white text-xs">
                        {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-white">Environmental Conditions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Temperature:</span>
                      <span className="text-white">{selectedPoint.weather.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Humidity:</span>
                      <span className="text-white">{selectedPoint.weather.humidity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rainfall:</span>
                      <span className="text-white">{selectedPoint.weather.rainfall}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Soil pH:</span>
                      <span className="text-white">{selectedPoint.soilConditions.ph}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Soil Moisture:</span>
                      <span className="text-white">{selectedPoint.soilConditions.moisture}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-white">Active Issues</h4>
                  {selectedPoint.issues.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPoint.issues.map((issue, index) => (
                        <div
                          key={index}
                          className="p-2 bg-[#1F2A44] rounded border border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm">{issue.name}</span>
                            <span className={cn(
                              'px-2 py-1 rounded text-xs',
                              issue.severity >= 70 ? 'bg-red-500/20 text-red-400' :
                              issue.severity >= 40 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                              'bg-[#10B981]/20 text-[#10B981]'
                            )}>
                              {issue.severity}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 capitalize">
                            {issue.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <div className="w-8 h-8 mx-auto mb-2 text-[#10B981] flex items-center justify-center">
                      ✓
                    </div>
                      <p className="text-sm">No active issues detected</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}