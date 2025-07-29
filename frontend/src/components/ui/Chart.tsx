import React from 'react'
import { cn } from '../../utils/cn'

// Chart container component
interface ChartProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  loading?: boolean
  error?: string
  actions?: React.ReactNode
}

export function Chart({
  title,
  description,
  children,
  className,
  loading = false,
  error,
  actions
}: ChartProps) {
  if (error) {
    return (
      <div className={cn('bg-[#4A5B7C] rounded-lg p-6', className)}>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center space-y-2">
            <div className="text-red-400">⚠️</div>
            <p className="text-sm text-red-400">Failed to load chart</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn('bg-[#4A5B7C] rounded-lg p-6', className)}>
        <div className="animate-pulse space-y-4">
          {title && <div className="h-6 bg-gray-600 rounded w-1/3" />}
          <div className="h-48 bg-gray-600 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-[#4A5B7C] rounded-lg p-6', className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-gray-300">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Simple bar chart component
interface BarChartProps {
  data: Array<{
    label: string
    value: number
    color?: string
  }>
  maxValue?: number
  height?: number
  showValues?: boolean
  className?: string
}

export function BarChart({
  data,
  maxValue,
  height = 200,
  showValues = true,
  className
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value))
  
  return (
    <div className={cn('space-y-4', className)}>
      <div 
        className="flex items-end justify-between gap-2"
        style={{ height: `${height}px` }}
      >
        {data.map((item) => {
          const percentage = (item.value / max) * 100
          const barColor = item.color || '#10B981'
          
          return (
            <div key={item.label} className="flex flex-col items-center flex-1 gap-2">
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80 relative group"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: barColor,
                  minHeight: item.value > 0 ? '4px' : '0px'
                }}
              >
                {showValues && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.value}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-300 text-center break-words">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Simple line chart component
interface LineChartProps {
  data: Array<{
    label: string
    value: number
  }>
  color?: string
  height?: number
  showDots?: boolean
  showGrid?: boolean
  className?: string
}

export function LineChart({
  data,
  color = '#10B981',
  height = 200,
  showDots = true,
  showGrid = true,
  className
}: LineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = ((maxValue - item.value) / range) * 100
    return { x, y, value: item.value, label: item.label }
  })
  
  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="opacity-20">
              {[0, 25, 50, 75, 100].map(y => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#6B7280"
                  strokeWidth="0.5"
                />
              ))}
            </g>
          )}
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Area fill */}
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill={color}
            fillOpacity="0.1"
          />
          
          {/* Data points */}
          {showDots && points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              className="drop-shadow-sm hover:r-3 transition-all cursor-pointer"
            >
              <title>{`${point.label}: ${point.value}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-300">
        {data.map((item, index) => (
          <span key={index} className="text-center">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Donut chart component
interface DonutChartProps {
  data: Array<{
    label: string
    value: number
    color: string
  }>
  size?: number
  strokeWidth?: number
  showLegend?: boolean
  showPercentages?: boolean
  className?: string
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 20,
  showLegend = true,
  showPercentages = true,
  className
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  let accumulatedPercentage = 0
  
  const segments = data.map(item => {
    const percentage = (item.value / total) * 100
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((accumulatedPercentage / 100) * circumference)
    
    accumulatedPercentage += percentage
    
    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset
    }
  })
  
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
          />
          
          {/* Segments */}
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              className="transition-all duration-300 hover:opacity-80"
              style={{ strokeLinecap: 'round' }}
            />
          ))}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex-1">
                <div className="text-sm text-white">{segment.label}</div>
                <div className="text-xs text-gray-400">
                  {segment.value}
                  {showPercentages && ` (${segment.percentage.toFixed(1)}%)`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Metric card component
interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon?: React.ReactNode
  color?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  color = '#10B981',
  className
}: MetricCardProps) {
  return (
    <div className={cn('bg-[#4A5B7C] rounded-lg p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {change && (
              <span
                className={cn(
                  'text-sm font-medium',
                  change.type === 'increase' ? 'text-green-400' : 'text-red-400'
                )}
              >
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </span>
            )}
          </div>
          {change && (
            <p className="text-xs text-gray-400">vs {change.period}</p>
          )}
        </div>
        
        {icon && (
          <div className="text-3xl" style={{ color }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Progress chart component
interface ProgressChartProps {
  label: string
  value: number
  max: number
  color?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'linear' | 'circular'
  className?: string
}

export function ProgressChart({
  label,
  value,
  max,
  color = '#10B981',
  showPercentage = true,
  size = 'md',
  variant = 'linear',
  className
}: ProgressChartProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const sizeClasses = {
    sm: variant === 'circular' ? 'w-12 h-12' : 'h-2',
    md: variant === 'circular' ? 'w-16 h-16' : 'h-3',
    lg: variant === 'circular' ? 'w-20 h-20' : 'h-4'
  }
  
  if (variant === 'circular') {
    const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 34
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="relative">
          <svg className={cn(sizeClasses[size], 'transform -rotate-90')}>
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="#374151"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {showPercentage ? `${Math.round(percentage)}%` : value}
            </span>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-gray-400">
            {value} of {max}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        {showPercentage && (
          <span className="text-sm text-gray-400">{Math.round(percentage)}%</span>
        )}
      </div>
      <div className={cn('bg-gray-600 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color 
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{value}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}