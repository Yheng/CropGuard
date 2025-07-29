import React from 'react'
import { cn } from '../../utils/cn'
import { Loading, LoadingState, PageLoading } from './Loading'

// Enhanced Suspense wrapper with better loading states
interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  type?: 'page' | 'component' | 'inline'
  message?: string
  delay?: number
}

export function SuspenseWrapper({
  children,
  fallback,
  className,
  type = 'component',
  message,
  delay = 200
}: SuspenseWrapperProps) {
  const [showFallback, setShowFallback] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const defaultFallback = React.useMemo(() => {
    if (!showFallback) {
      return <div className="min-h-[50px]" /> // Prevent layout shift
    }

    switch (type) {
      case 'page':
        return <PageLoading message={message} />
      case 'inline':
        return (
          <div className={cn('flex items-center justify-center py-4', className)}>
            <Loading />
          </div>
        )
      case 'component':
      default:
        return (
          <div className={cn('flex items-center justify-center min-h-[200px]', className)}>
            <LoadingState message={message} />
          </div>
        )
    }
  }, [showFallback, type, message, className])

  return (
    <React.Suspense fallback={fallback || defaultFallback}>
      {children}
    </React.Suspense>
  )
}

// Lazy component wrapper with enhanced loading
interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>
  fallback?: React.ReactNode
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
  retryCount?: number
  delay?: number
  className?: string
}

export function LazyComponent({
  loader,
  fallback,
  errorFallback: ErrorFallback,
  retryCount = 3,
  className
}: LazyComponentProps) {
  const [error, setError] = React.useState<Error | null>(null)
  const [retries, setRetries] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)

  const LazyComponentRef = React.useRef<React.ComponentType<any> | null>(null)

  const loadComponent = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const component = await loader()
      LazyComponentRef.current = component.default
      setIsLoading(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsLoading(false)
    }
  }, [loader])

  const retry = React.useCallback(() => {
    if (retries < retryCount) {
      setRetries(prev => prev + 1)
      loadComponent()
    }
  }, [loadComponent, retries, retryCount])

  React.useEffect(() => {
    loadComponent()
  }, [loadComponent])

  if (error) {
    if (ErrorFallback) {
      return <ErrorFallback error={error} retry={retry} />
    }

    return (
      <div className={cn('flex items-center justify-center min-h-[200px] p-8', className)}>
        <div className="text-center space-y-4">
          <div className="text-red-400">⚠️</div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Failed to load component</p>
            <p className="text-xs text-gray-400">{error.message}</p>
          </div>
          {retries < retryCount && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm hover:bg-[#10B981]/80 transition-colors"
            >
              Retry ({retries + 1}/{retryCount})
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className={cn('flex items-center justify-center min-h-[200px]', className)}>
        <LoadingState message="Loading component..." />
      </div>
    )
  }

  const Component = LazyComponentRef.current
  if (!Component) {
    return null
  }

  return <Component />
}

// Resource loader with Suspense
interface ResourceLoaderProps<T> {
  resource: () => Promise<T>
  children: (data: T) => React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
  className?: string
}

export function ResourceLoader<T>({
  resource,
  children,
  fallback,
  errorFallback: ErrorFallback,
  className
}: ResourceLoaderProps<T>) {
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<Error | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadResource = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await resource()
      setData(result)
      setIsLoading(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsLoading(false)
    }
  }, [resource])

  const retry = React.useCallback(() => {
    loadResource()
  }, [loadResource])

  React.useEffect(() => {
    loadResource()
  }, [loadResource])

  if (error) {
    if (ErrorFallback) {
      return <ErrorFallback error={error} retry={retry} />
    }

    return (
      <div className={cn('flex items-center justify-center min-h-[200px] p-8', className)}>
        <div className="text-center space-y-4">
          <div className="text-red-400">⚠️</div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Failed to load resource</p>
            <p className="text-xs text-gray-400">{error.message}</p>
          </div>
          <button
            onClick={retry}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm hover:bg-[#10B981]/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className={cn('flex items-center justify-center min-h-[200px]', className)}>
        <LoadingState message="Loading resource..." />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return <>{children(data)}</>
}

// Progressive image loading with Suspense
interface ProgressiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  src: string
  placeholder?: string
  fallback?: React.ReactNode
  className?: string
  onLoad?: () => void
  onError?: (error: Error) => void
}

export function ProgressiveImage({
  src,
  placeholder,
  fallback,
  className,
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [showPlaceholder, setShowPlaceholder] = React.useState(true)

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true)
    setShowPlaceholder(false)
    onLoad?.()
  }, [onLoad])

  const handleError = React.useCallback(() => {
    const error = new Error(`Failed to load image: ${src}`)
    setError(error)
    setShowPlaceholder(false)
    onError?.(error)
  }, [src, onError])

  if (error) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className={cn('flex items-center justify-center bg-gray-700 rounded', className)}>
        <div className="text-center text-gray-400 text-sm">
          Failed to load image
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {showPlaceholder && placeholder && (
        <img
          src={placeholder}
          className={cn('absolute inset-0 w-full h-full object-cover filter blur-sm', className)}
          alt=""
        />
      )}
      
      <img
        {...props}
        src={src}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
      
      {!isLoaded && !placeholder && (
        <div className={cn('absolute inset-0 bg-gray-700 animate-pulse', className)} />
      )}
    </div>
  )
}

// Intersection Observer based lazy loading
interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
}

export function LazyLoad({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  className
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback || <div className="min-h-[100px]" />}
    </div>
  )
}

// Code splitting utilities
export const lazy = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode
    delay?: number
    retryCount?: number
  } = {}
) => {
  const LazyComponentWrapper = React.lazy(importFunc)
  
  return React.forwardRef((props: any, ref: any) => (
    <SuspenseWrapper
      fallback={options.fallback}
      delay={options.delay}
    >
      <LazyComponentWrapper {...props} ref={ref} />
    </SuspenseWrapper>
  ))
}