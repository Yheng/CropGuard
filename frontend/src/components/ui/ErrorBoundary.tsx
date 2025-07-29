import React from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolate?: boolean
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  errorId: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: this.generateErrorId()
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.generateErrorId()
    })

    // Log error to console and external service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call onError prop if provided
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys![index] !== key
      )
      
      if (hasResetKeyChanged) {
        this.resetError()
      }
    }

    // Reset error boundary when any prop changes
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetError()
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId)
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: this.generateErrorId()
      })
    }, 0)
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback: Fallback, isolate } = this.props

    if (hasError && error) {
      const fallbackProps: ErrorFallbackProps = {
        error,
        resetError: this.resetError,
        errorId
      }

      if (Fallback) {
        return <Fallback {...fallbackProps} />
      }

      return (
        <DefaultErrorFallback 
          {...fallbackProps} 
          isolate={isolate}
        />
      )
    }

    return children
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  isolate?: boolean
}

function DefaultErrorFallback({ 
  error, 
  resetError, 
  errorId, 
  isolate = false 
}: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className={cn(
      'flex items-center justify-center p-8',
      isolate ? 'min-h-[200px] bg-[#4A5B7C] rounded-lg' : 'min-h-screen bg-[#1F2A44]'
    )}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            Something went wrong
          </h2>
          <p className="text-gray-300">
            {isolate 
              ? 'This component encountered an error and stopped working.'
              : 'An unexpected error occurred. Please try refreshing the page.'
            }
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={resetError}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="w-full"
          >
            Try Again
          </Button>
          
          {!isolate && (
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              leftIcon={<Home className="w-4 h-4" />}
              className="w-full"
            >
              Go Home
            </Button>
          )}
        </div>

        {isDevelopment && (
          <div className="space-y-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <span>Error Details</span>
              <ChevronDown 
                className={cn(
                  'w-4 h-4 transition-transform',
                  showDetails && 'rotate-180'
                )} 
              />
            </button>
            
            {showDetails && (
              <div className="text-left space-y-3">
                <div className="bg-[#1F2A44] rounded-lg p-4 space-y-2">
                  <div className="text-xs text-gray-400">Error ID:</div>
                  <div className="font-mono text-xs text-gray-300">{errorId}</div>
                </div>
                
                <div className="bg-[#1F2A44] rounded-lg p-4 space-y-2">
                  <div className="text-xs text-gray-400">Error Message:</div>
                  <div className="font-mono text-xs text-red-400">{error.message}</div>
                </div>
                
                {error.stack && (
                  <div className="bg-[#1F2A44] rounded-lg p-4 space-y-2">
                    <div className="text-xs text-gray-400">Stack Trace:</div>
                    <pre className="font-mono text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Async error boundary for catching async errors
interface AsyncErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
  fallback?: React.ComponentType<ErrorFallbackProps>
}

export function AsyncErrorBoundary({ 
  children, 
  onError, 
  fallback 
}: AsyncErrorBoundaryProps) {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      setAsyncError(error)
      onError?.(error)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [onError])

  const resetError = () => setAsyncError(null)

  if (asyncError) {
    const fallbackProps: ErrorFallbackProps = {
      error: asyncError,
      resetError,
      errorId: `async_error_${Date.now()}`
    }

    if (fallback) {
      return React.createElement(fallback, fallbackProps)
    }

    return <DefaultErrorFallback {...fallbackProps} />
  }

  return <>{children}</>
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for throwing errors to nearest error boundary
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return React.useCallback((error: Error) => {
    setError(error)
  }, [])
}

// Custom error classes
export class ChunkLoadError extends Error {
  constructor(message = 'Failed to load application chunk') {
    super(message)
    this.name = 'ChunkLoadError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

// Error boundary for specific error types
interface TypedErrorBoundaryProps extends ErrorBoundaryProps {
  errorTypes?: Array<new (...args: any[]) => Error>
  onSpecificError?: (error: Error) => void
}

export class TypedErrorBoundary extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorTypes, onSpecificError } = this.props as TypedErrorBoundaryProps

    // Check if error matches specified types
    if (errorTypes && errorTypes.some(ErrorType => error instanceof ErrorType)) {
      onSpecificError?.(error)
    }

    super.componentDidCatch(error, errorInfo)
  }
}