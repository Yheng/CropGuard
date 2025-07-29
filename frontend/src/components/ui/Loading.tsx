import { Loader2, Upload, Brain, Search, Database } from 'lucide-react'
import { cn } from '../../utils/cn'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

interface LoadingStateProps {
  type?: 'upload' | 'analysis' | 'search' | 'data' | 'general'
  message?: string
  progress?: number
  className?: string
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

const sizeVariants = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const colorVariants = {
  primary: 'text-[#10B981]',
  white: 'text-white',
  gray: 'text-gray-400'
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className
}: LoadingProps) {
  const baseClasses = cn(sizeVariants[size], colorVariants[color], className)

  switch (variant) {
    case 'spinner':
      return <Loader2 className={cn(baseClasses, 'animate-spin')} />
    
    case 'dots':
      return (
        <div className={cn('flex space-x-1', className)}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full animate-bounce',
                size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4',
                colorVariants[color].replace('text-', 'bg-')
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      )
    
    case 'pulse':
      return (
        <div
          className={cn(
            'rounded-full animate-pulse',
            sizeVariants[size],
            colorVariants[color].replace('text-', 'bg-'),
            className
          )}
        />
      )
    
    case 'bars':
      return (
        <div className={cn('flex items-end space-x-1', className)}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'animate-pulse',
                size === 'sm' ? 'w-0.5 h-3' : size === 'md' ? 'w-1 h-4' : size === 'lg' ? 'w-1.5 h-6' : 'w-2 h-8',
                colorVariants[color].replace('text-', 'bg-')
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )
    
    default:
      return <Loader2 className={cn(baseClasses, 'animate-spin')} />
  }
}

export function LoadingState({
  type = 'general',
  message,
  progress,
  className
}: LoadingStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'upload':
        return <Upload className="w-8 h-8 text-[#10B981]" />
      case 'analysis':
        return <Brain className="w-8 h-8 text-[#10B981] animate-pulse" />
      case 'search':
        return <Search className="w-8 h-8 text-[#10B981]" />
      case 'data':
        return <Database className="w-8 h-8 text-[#10B981]" />
      default:
        return <Loading size="lg" />
    }
  }

  const getDefaultMessage = () => {
    switch (type) {
      case 'upload':
        return 'Uploading image...'
      case 'analysis':
        return 'Analyzing crop image...'
      case 'search':
        return 'Searching...'
      case 'data':
        return 'Loading data...'
      default:
        return 'Loading...'
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4 p-8', className)}>
      <div className="flex flex-col items-center space-y-3">
        {getIcon()}
        <div className="text-center space-y-2">
          <p className="text-white font-medium">
            {message || getDefaultMessage()}
          </p>
          {progress !== undefined && (
            <div className="w-48 space-y-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-[#10B981] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-600 rounded'
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
      default:
        return 'rounded'
    }
  }

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, getVariantClasses())}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(baseClasses, getVariantClasses(), className)}
      style={style}
    />
  )
}

// Page-level loading component
interface PageLoadingProps {
  message?: string
  fullScreen?: boolean
}

export function PageLoading({ message = 'Loading...', fullScreen = true }: PageLoadingProps) {
  return (
    <div className={cn(
      'flex items-center justify-center bg-[#1F2A44]',
      fullScreen ? 'fixed inset-0 z-50' : 'min-h-[400px] w-full'
    )}>
      <LoadingState message={message} />
    </div>
  )
}

// Card skeleton for loading states
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[#4A5B7C] rounded-lg p-6 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton variant="text" width="100%" lines={2} />
      <div className="flex justify-between items-center">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  )
}

// Table skeleton for loading states
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" className="flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="100%" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}