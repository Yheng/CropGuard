import React from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  MoreVertical,
  Filter,
  Download,
  Share,
  Info,
  ChevronLeft,
  ChevronRight,
  // ChevronUp,
  // ChevronDown
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch'
  direction?: 'left' | 'right' | 'up' | 'down'
  scale?: number
  deltaX?: number
  deltaY?: number
}

interface MobileChartData {
  id: string
  title: string
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'heatmap'
  data: any[]
  options: ApexOptions
  height?: number
  responsive?: {
    breakpoint: number
    options: Partial<ApexOptions>
  }[]
}

interface MobileOptimizedChartProps {
  charts: MobileChartData[]
  activeChart?: number
  onChartChange?: (index: number) => void
  showControls?: boolean
  allowFullscreen?: boolean
  enableSwipeNavigation?: boolean
  enablePinchZoom?: boolean
  onGesture?: (gesture: TouchGesture) => void
  className?: string
}

export function MobileOptimizedChart({
  charts,
  activeChart = 0,
  onChartChange,
  showControls = true,
  allowFullscreen = true,
  enableSwipeNavigation = true,
  enablePinchZoom = true,
  onGesture,
  className
}: MobileOptimizedChartProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [showMenu, setShowMenu] = React.useState(false)
  const [zoomLevel, setZoomLevel] = React.useState(1)
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)

  const chartContainerRef = React.useRef<HTMLDivElement>(null)
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTouchDistanceRef = React.useRef<number>(0)

  const currentChart = charts[activeChart]

  // Touch event handlers
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    if (e.touches.length === 2 && enablePinchZoom) {
      // Pinch zoom start
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      lastTouchDistanceRef.current = distance
    }
  }, [enablePinchZoom])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 2 && enablePinchZoom) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      const scale = distance / lastTouchDistanceRef.current
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel * scale))
      
      setZoomLevel(newZoom)
      lastTouchDistanceRef.current = distance

      onGesture?.({
        type: 'pinch',
        scale: newZoom
      })
    } else if (e.touches.length === 1 && isDragging) {
      // Pan
      const touch = e.touches[0]
      if (touchStartRef.current) {
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y
        
        setPanOffset({ x: deltaX, y: deltaY })
      }
    }
  }, [enablePinchZoom, isDragging, zoomLevel, onGesture])

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touchEnd = e.changedTouches[0]
    const deltaX = touchEnd.clientX - touchStartRef.current.x
    const deltaY = touchEnd.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Detect gesture type
    if (deltaTime < 300 && distance < 10) {
      // Tap or double tap
      onGesture?.({ type: 'tap' })
    } else if (deltaTime > 500 && distance < 10) {
      // Long press
      onGesture?.({ type: 'long-press' })
      setShowMenu(true)
    } else if (distance > 50 && enableSwipeNavigation) {
      // Swipe
      const direction = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX > 0 ? 'right' : 'left')
        : (deltaY > 0 ? 'down' : 'up')

      onGesture?.({
        type: 'swipe',
        direction,
        deltaX,
        deltaY
      })

      // Handle chart navigation
      if (direction === 'left' && activeChart < charts.length - 1) {
        onChartChange?.(activeChart + 1)
      } else if (direction === 'right' && activeChart > 0) {
        onChartChange?.(activeChart - 1)
      }
    }

    touchStartRef.current = null
    setIsDragging(false)
    setPanOffset({ x: 0, y: 0 })
  }, [activeChart, charts.length, enableSwipeNavigation, onChartChange, onGesture])

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Mobile-optimized chart options
  const getMobileChartOptions = React.useCallback((options: ApexOptions): ApexOptions => {
    const isMobile = window.innerWidth < 768

    return {
      ...options,
      chart: {
        ...options.chart,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: enablePinchZoom,
          type: 'xy',
          autoScaleYaxis: true
        },
        selection: {
          enabled: false
        },
        animations: {
          enabled: !isMobile, // Disable animations on mobile for better performance
          dynamicAnimation: {
            speed: isMobile ? 300 : 800
          }
        }
      },
      dataLabels: {
        enabled: !isMobile // Hide data labels on mobile to reduce clutter
      },
      legend: {
        show: !isMobile,
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        labels: {
          colors: '#9CA3AF'
        }
      },
      tooltip: {
        enabled: true,
        theme: 'dark',
        style: {
          fontSize: isMobile ? '14px' : '12px'
        },
        marker: {
          show: true
        },
        fixed: {
          enabled: isMobile,
          position: 'topRight',
          offsetX: 0,
          offsetY: 0
        }
      },
      xaxis: {
        ...options.xaxis,
        labels: {
          ...options.xaxis?.labels,
          style: {
            ...options.xaxis?.labels?.style,
            fontSize: isMobile ? '10px' : '12px'
          },
          rotate: isMobile ? -45 : 0,
          maxHeight: isMobile ? 60 : undefined
        },
        tickAmount: isMobile ? 4 : undefined
      },
      yaxis: Array.isArray(options.yaxis) ? options.yaxis : {
        ...options.yaxis,
        labels: {
          ...(options.yaxis as any)?.labels,
          style: {
            ...(options.yaxis as any)?.labels?.style,
            fontSize: isMobile ? '10px' : '12px'
          }
        }
      },
      grid: {
        ...options.grid,
        strokeDashArray: 3,
        borderColor: '#4B5563'
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: '80%'
              }
            },
            legend: {
              show: false
            }
          }
        },
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 250
            },
            plotOptions: {
              bar: {
                horizontal: true
              }
            }
          }
        }
      ]
    }
  }, [enablePinchZoom])

  const handleFullscreen = () => {
    if (allowFullscreen) {
      setIsFullscreen(!isFullscreen)
    }
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoomLevel + 0.2)
    setZoomLevel(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(0.5, zoomLevel - 0.2)
    setZoomLevel(newZoom)
  }

  const handleReset = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const navigateChart = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && activeChart > 0) {
      onChartChange?.(activeChart - 1)
    } else if (direction === 'next' && activeChart < charts.length - 1) {
      onChartChange?.(activeChart + 1)
    }
  }

  if (!currentChart) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No chart data available</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1F2A44] overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Fullscreen Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-600">
                <h3 className="text-lg font-semibold text-white">{currentChart.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  leftIcon={<Minimize2 className="w-4 h-4" />}
                >
                  Exit
                </Button>
              </div>

              {/* Fullscreen Chart */}
              <div className="flex-1 p-4">
                <div
                  ref={chartContainerRef}
                  className="h-full"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <Chart
                    options={getMobileChartOptions(currentChart.options)}
                    series={currentChart.data}
                    type={currentChart.type}
                    height="100%"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal Chart Container */}
      <Card>
        <CardHeader
          title={currentChart.title}
          description={`${activeChart + 1} of ${charts.length}`}
          action={
            showControls && (
              <div className="flex items-center gap-2">
                {/* Chart Navigation */}
                {charts.length > 1 && (
                  <div className="flex bg-[#1F2A44] rounded-lg">
                    <button
                      onClick={() => navigateChart('prev')}
                      disabled={activeChart === 0}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 py-2 text-sm text-white border-x border-gray-600">
                      {activeChart + 1}/{charts.length}
                    </div>
                    <button
                      onClick={() => navigateChart('next')}
                      disabled={activeChart === charts.length - 1}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Mobile Controls */}
                <div className="flex md:hidden bg-[#1F2A44] rounded-lg">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-gray-400 hover:text-white transition-colors border-x border-gray-600"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Fullscreen Toggle */}
                {allowFullscreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreen}
                    leftIcon={<Maximize2 className="w-4 h-4" />}
                  />
                )}

                {/* Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMenu(!showMenu)}
                  leftIcon={<MoreVertical className="w-4 h-4" />}
                />
              </div>
            )
          }
        />

        <CardContent>
          <div
            ref={chartContainerRef}
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <Chart
              options={getMobileChartOptions(currentChart.options)}
              series={currentChart.data}
              type={currentChart.type}
              height={currentChart.height || 300}
            />
          </div>

          {/* Zoom Level Indicator */}
          {zoomLevel !== 1 && (
            <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
              {Math.round(zoomLevel * 100)}%
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1F2A44] rounded-lg border border-gray-600 shadow-lg z-10"
          >
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setShowMenu(false)
                  // Handle download
                }}
                className="flex items-center gap-3 w-full p-2 text-left text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Chart</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false)
                  // Handle share
                }}
                className="flex items-center gap-3 w-full p-2 text-left text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Share className="w-4 h-4" />
                <span>Share Chart</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false)
                  // Handle filter
                }}
                className="flex items-center gap-3 w-full p-2 text-left text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filter Data</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false)
                  // Handle info
                }}
                className="flex items-center gap-3 w-full p-2 text-left text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Info className="w-4 h-4" />
                <span>Chart Info</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch Gesture Instructions */}
      {charts.length > 1 && enableSwipeNavigation && (
        <div className="mt-2 text-center text-xs text-gray-400 md:hidden">
          Swipe left/right to navigate • Pinch to zoom • Long press for menu
        </div>
      )}

      {/* Chart Dots Indicator */}
      {charts.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {charts.map((_, index) => (
            <button
              key={index}
              onClick={() => onChartChange?.(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === activeChart ? 'bg-[#10B981]' : 'bg-gray-600'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}