import { useEffect, useState, useCallback } from 'react'

interface PerformanceMetrics {
  loadTime: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  totalBlockingTime: number
  renderTime: number
}

interface APIPerformanceMetrics {
  averageResponseTime: number
  slowRequestsCount: number
  totalRequests: number
  errorRate: number
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [apiMetrics, setApiMetrics] = useState<APIPerformanceMetrics>({
    averageResponseTime: 0,
    slowRequestsCount: 0,
    totalRequests: 0,
    errorRate: 0
  })

  // Measure page load performance
  useEffect(() => {
    const measurePerformance = () => {
      if (!window.performance) return

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart
      const firstPaint = paint.find(p => p.name === 'first-paint')?.startTime || 0
      const firstContentfulPaint = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      
      // Get Core Web Vitals
      let largestContentfulPaint = 0
      let cumulativeLayoutShift = 0
      let totalBlockingTime = 0

      try {
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          largestContentfulPaint = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // CLS
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cumulativeLayoutShift += (entry as any).value
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // TBT (approximated)
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const blockingTime = Math.max(0, entry.duration - 50)
            totalBlockingTime += blockingTime
          }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })

        // Set metrics after a delay to capture web vitals
        setTimeout(() => {
          setMetrics({
            loadTime,
            firstPaint,
            firstContentfulPaint,
            largestContentfulPaint,
            cumulativeLayoutShift,
            totalBlockingTime,
            renderTime: performance.now()
          })
        }, 3000)

      } catch {
        // Fallback for browsers that don't support observers
        setMetrics({
          loadTime,
          firstPaint,
          firstContentfulPaint,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          totalBlockingTime: 0,
          renderTime: performance.now()
        })
      }
    }

    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
      return () => window.removeEventListener('load', measurePerformance)
    }
  }, [])

  // Track API performance
  const trackAPICall = useCallback((responseTime: number, success: boolean) => {
    setApiMetrics(prev => {
      const newTotalRequests = prev.totalRequests + 1
      const newSlowRequestsCount = responseTime > 5000 ? prev.slowRequestsCount + 1 : prev.slowRequestsCount
      const newErrorRate = success ? prev.errorRate : ((prev.errorRate * prev.totalRequests) + 1) / newTotalRequests
      const newAverageResponseTime = ((prev.averageResponseTime * prev.totalRequests) + responseTime) / newTotalRequests

      return {
        averageResponseTime: newAverageResponseTime,
        slowRequestsCount: newSlowRequestsCount,
        totalRequests: newTotalRequests,
        errorRate: newErrorRate * 100
      }
    })
  }, [])

  // Performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = []
    
    if (metrics) {
      if (metrics.loadTime > 2000) {
        recommendations.push('Consider code splitting and lazy loading to reduce initial bundle size')
      }
      if (metrics.firstContentfulPaint > 1500) {
        recommendations.push('Optimize critical rendering path and reduce render-blocking resources')
      }
      if (metrics.largestContentfulPaint > 2500) {
        recommendations.push('Optimize images and ensure fast server response times')
      }
      if (metrics.cumulativeLayoutShift > 0.1) {
        recommendations.push('Add explicit dimensions to images and reserve space for dynamic content')
      }
      if (metrics.totalBlockingTime > 300) {
        recommendations.push('Break up long tasks and optimize JavaScript execution')
      }
    }

    if (apiMetrics.averageResponseTime > 3000) {
      recommendations.push('API response times are slow - consider caching and optimization')
    }
    if (apiMetrics.errorRate > 5) {
      recommendations.push('High API error rate detected - check network stability and error handling')
    }

    return recommendations
  }, [metrics, apiMetrics])

  // Performance score (0-100)
  const getPerformanceScore = useCallback(() => {
    if (!metrics) return 0

    let score = 100

    // Load time penalty
    if (metrics.loadTime > 2000) score -= 20
    else if (metrics.loadTime > 1000) score -= 10

    // FCP penalty
    if (metrics.firstContentfulPaint > 1500) score -= 15
    else if (metrics.firstContentfulPaint > 1000) score -= 7

    // LCP penalty
    if (metrics.largestContentfulPaint > 2500) score -= 20
    else if (metrics.largestContentfulPaint > 1500) score -= 10

    // CLS penalty
    if (metrics.cumulativeLayoutShift > 0.1) score -= 15
    else if (metrics.cumulativeLayoutShift > 0.05) score -= 7

    // API performance penalty
    if (apiMetrics.averageResponseTime > 5000) score -= 15
    else if (apiMetrics.averageResponseTime > 3000) score -= 10

    return Math.max(0, Math.round(score))
  }, [metrics, apiMetrics])

  return {
    metrics,
    apiMetrics,
    trackAPICall,
    getRecommendations,
    getPerformanceScore,
    isLoading: !metrics
  }
}

// Create a performance monitoring wrapper for API calls
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  trackAPICall?: (responseTime: number, success: boolean) => void
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now()
    
    try {
      const result = await fn(...args)
      const responseTime = performance.now() - startTime
      
      if (trackAPICall) {
        trackAPICall(responseTime, true)
      }
      
      // Log slow API calls
      if (responseTime > 5000) {
        console.warn(`Slow API call detected: ${responseTime.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const responseTime = performance.now() - startTime
      
      if (trackAPICall) {
        trackAPICall(responseTime, false)
      }
      
      throw error
    }
  }
}