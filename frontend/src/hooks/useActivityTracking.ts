import React from 'react'

export interface ActivityEvent {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: 'farmer' | 'agronomist' | 'admin'
  action: string
  category: 'authentication' | 'analysis' | 'review' | 'user_management' | 'system' | 'data_access'
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  targetResource?: {
    type: 'analysis' | 'user' | 'system' | 'file'
    id: string
    name?: string
  }
  outcome: 'success' | 'failure' | 'partial'
  duration?: number // in milliseconds
  metadata?: Record<string, any>
}

export interface ActivityFilter {
  dateRange?: {
    start: string
    end: string
  }
  userId?: string
  userRole?: 'farmer' | 'agronomist' | 'admin'
  category?: string
  severity?: string
  action?: string
  outcome?: 'success' | 'failure' | 'partial'
  searchQuery?: string
}

interface ActivityTrackingConfig {
  enableTracking: boolean
  trackSensitiveActions: boolean
  retentionDays: number
  batchSize: number
  flushInterval: number // in milliseconds
  categories: {
    [key: string]: {
      enabled: boolean
      sensitivityLevel: 'low' | 'medium' | 'high'
      retentionDays?: number
    }
  }
}

const defaultConfig: ActivityTrackingConfig = {
  enableTracking: true,
  trackSensitiveActions: true,
  retentionDays: 90,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  categories: {
    authentication: { enabled: true, sensitivityLevel: 'high', retentionDays: 365 },
    analysis: { enabled: true, sensitivityLevel: 'medium' },
    review: { enabled: true, sensitivityLevel: 'medium' },
    user_management: { enabled: true, sensitivityLevel: 'high', retentionDays: 365 },
    system: { enabled: true, sensitivityLevel: 'high', retentionDays: 180 },
    data_access: { enabled: true, sensitivityLevel: 'high', retentionDays: 180 }
  }
}

// Activity templates for different actions
const activityTemplates = {
  // Authentication
  'user.login': {
    category: 'authentication' as const,
    severity: 'info' as const,
    description: 'User logged in'
  },
  'user.logout': {
    category: 'authentication' as const,
    severity: 'info' as const,
    description: 'User logged out'
  },
  'user.login_failed': {
    category: 'authentication' as const,
    severity: 'warning' as const,
    description: 'Login attempt failed'
  },
  'user.password_changed': {
    category: 'authentication' as const,
    severity: 'info' as const,
    description: 'User changed password'
  },

  // Analysis
  'analysis.created': {
    category: 'analysis' as const,
    severity: 'info' as const,
    description: 'New analysis created'
  },
  'analysis.updated': {
    category: 'analysis' as const,
    severity: 'info' as const,
    description: 'Analysis updated'
  },
  'analysis.deleted': {
    category: 'analysis' as const,
    severity: 'warning' as const,
    description: 'Analysis deleted'
  },
  'analysis.submitted': {
    category: 'analysis' as const,
    severity: 'info' as const,
    description: 'Analysis submitted for review'
  },

  // Review
  'review.started': {
    category: 'review' as const,
    severity: 'info' as const,
    description: 'Review process started'
  },
  'review.completed': {
    category: 'review' as const,
    severity: 'info' as const,
    description: 'Review completed'
  },
  'review.approved': {
    category: 'review' as const,
    severity: 'info' as const,
    description: 'Analysis approved'
  },
  'review.rejected': {
    category: 'review' as const,
    severity: 'warning' as const,
    description: 'Analysis rejected'
  },

  // User Management
  'user.created': {
    category: 'user_management' as const,
    severity: 'info' as const,
    description: 'New user account created'
  },
  'user.updated': {
    category: 'user_management' as const,
    severity: 'info' as const,
    description: 'User account updated'
  },
  'user.deactivated': {
    category: 'user_management' as const,
    severity: 'warning' as const,
    description: 'User account deactivated'
  },
  'user.role_changed': {
    category: 'user_management' as const,
    severity: 'warning' as const,
    description: 'User role changed'
  },

  // System
  'system.config_changed': {
    category: 'system' as const,
    severity: 'warning' as const,
    description: 'System configuration changed'
  },
  'system.backup_created': {
    category: 'system' as const,
    severity: 'info' as const,
    description: 'System backup created'
  },
  'system.error': {
    category: 'system' as const,
    severity: 'error' as const,
    description: 'System error occurred'
  },

  // Data Access
  'data.exported': {
    category: 'data_access' as const,
    severity: 'info' as const,
    description: 'Data exported'
  },
  'data.imported': {
    category: 'data_access' as const,
    severity: 'info' as const,
    description: 'Data imported'
  },
  'data.accessed': {
    category: 'data_access' as const,
    severity: 'info' as const,
    description: 'Sensitive data accessed'
  }
}

class ActivityTracker {
  private config: ActivityTrackingConfig
  private eventQueue: ActivityEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private sessionId: string

  constructor(config: Partial<ActivityTrackingConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.sessionId = this.generateSessionId()
    this.startFlushTimer()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  private async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // In a real implementation, this would send to your backend
      await this.submitEvents(events)
    } catch (error) {
      console.error('Failed to submit activity events:', error)
      // Re-queue events on failure (with some limit to prevent memory issues)
      if (this.eventQueue.length < 1000) {
        this.eventQueue.unshift(...events)
      }
    }
  }

  private async submitEvents(events: ActivityEvent[]): Promise<void> {
    // Simulated API call - replace with actual implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Activity logs submitted:', events)
        resolve()
      }, 100)
    })
  }

  public track(
    action: string,
    user: { id: string; name: string; role: 'farmer' | 'agronomist' | 'admin' },
    details: Record<string, any> = {},
    options: {
      category?: string
      severity?: 'info' | 'warning' | 'error' | 'critical'
      description?: string
      targetResource?: ActivityEvent['targetResource']
      outcome?: 'success' | 'failure' | 'partial'
      duration?: number
    } = {}
  ) {
    if (!this.config.enableTracking) return

    const template = activityTemplates[action as keyof typeof activityTemplates]
    const category = options.category || template?.category || 'system'

    // Check if category is enabled
    if (!this.config.categories[category]?.enabled) return

    // Check sensitivity level for sensitive actions
    const categoryConfig = this.config.categories[category]
    if (!this.config.trackSensitiveActions && categoryConfig?.sensitivityLevel === 'high') {
      return
    }

    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      category: category as ActivityEvent['category'],
      severity: options.severity || template?.severity || 'info',
      description: options.description || template?.description || `User performed ${action}`,
      details: this.sanitizeDetails(details, categoryConfig?.sensitivityLevel),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      targetResource: options.targetResource,
      outcome: options.outcome || 'success',
      duration: options.duration,
      metadata: {
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language
      }
    }

    this.eventQueue.push(event)

    // Flush immediately for critical events
    if (event.severity === 'critical' || event.category === 'authentication') {
      this.flush()
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush()
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientIP(): string {
    // In a real implementation, this would be obtained from your backend
    return 'client_ip'
  }

  private sanitizeDetails(details: Record<string, any>, sensitivityLevel?: string): Record<string, any> {
    if (sensitivityLevel === 'low') return details

    const sanitized = { ...details }
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'ssn', 'creditCard']
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    })

    // Limit string lengths for medium/high sensitivity
    if (sensitivityLevel === 'high') {
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
          sanitized[key] = sanitized[key].substring(0, 100) + '...'
        }
      })
    }

    return sanitized
  }

  public async getActivities(filter: ActivityFilter = {}): Promise<ActivityEvent[]> {
    // In a real implementation, this would fetch from your backend
    // For now, return mock data
    return []
  }

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush() // Final flush
  }
}

// Global tracker instance
let globalTracker: ActivityTracker | null = null

// Hook for activity tracking
export function useActivityTracking(
  user?: { id: string; name: string; role: 'farmer' | 'agronomist' | 'admin' } | null,
  config?: Partial<ActivityTrackingConfig>
) {
  // Initialize tracker
  React.useEffect(() => {
    if (!globalTracker) {
      globalTracker = new ActivityTracker(config)
    }

    return () => {
      // Don't destroy on unmount - keep global instance
    }
  }, [config])

  // Track page views
  React.useEffect(() => {
    if (user && globalTracker) {
      globalTracker.track('page.viewed', user, {
        url: window.location.href,
        pathname: window.location.pathname,
        referrer: document.referrer
      })
    }
  }, [user])

  const track = React.useCallback((
    action: string,
    details: Record<string, any> = {},
    options: Parameters<ActivityTracker['track']>[3] = {}
  ) => {
    if (user && globalTracker) {
      globalTracker.track(action, user, details, options)
    }
  }, [user])

  const trackAnalysisAction = React.useCallback((
    action: 'created' | 'updated' | 'deleted' | 'submitted' | 'viewed',
    analysisId: string,
    additionalDetails: Record<string, any> = {}
  ) => {
    track(`analysis.${action}`, {
      analysisId,
      ...additionalDetails
    }, {
      category: 'analysis',
      targetResource: {
        type: 'analysis',
        id: analysisId
      }
    })
  }, [track])

  const trackReviewAction = React.useCallback((
    action: 'started' | 'completed' | 'approved' | 'rejected',
    analysisId: string,
    additionalDetails: Record<string, any> = {}
  ) => {
    track(`review.${action}`, {
      analysisId,
      ...additionalDetails
    }, {
      category: 'review',
      targetResource: {
        type: 'analysis',
        id: analysisId
      }
    })
  }, [track])

  const trackUserAction = React.useCallback((
    action: 'created' | 'updated' | 'deactivated' | 'role_changed',
    targetUserId: string,
    additionalDetails: Record<string, any> = {}
  ) => {
    track(`user.${action}`, {
      targetUserId,
      ...additionalDetails
    }, {
      category: 'user_management',
      severity: 'warning',
      targetResource: {
        type: 'user',
        id: targetUserId
      }
    })
  }, [track])

  const trackDataAccess = React.useCallback((
    action: 'exported' | 'imported' | 'accessed',
    dataType: string,
    additionalDetails: Record<string, any> = {}
  ) => {
    track(`data.${action}`, {
      dataType,
      ...additionalDetails
    }, {
      category: 'data_access',
      severity: 'info'
    })
  }, [track])

  const trackError = React.useCallback((
    error: Error,
    context: string,
    additionalDetails: Record<string, any> = {}
  ) => {
    track('system.error', {
      error: error.message,
      stack: error.stack,
      context,
      ...additionalDetails
    }, {
      category: 'system',
      severity: 'error',
      outcome: 'failure'
    })
  }, [track])

  const getActivities = React.useCallback(async (filter: ActivityFilter = {}) => {
    if (!globalTracker) return []
    return globalTracker.getActivities(filter)
  }, [])

  return {
    track,
    trackAnalysisAction,
    trackReviewAction,
    trackUserAction,
    trackDataAccess,
    trackError,
    getActivities,
    isEnabled: !!user && !!globalTracker
  }
}

// Cleanup on app unmount
export function cleanupActivityTracking() {
  if (globalTracker) {
    globalTracker.destroy()
    globalTracker = null
  }
}

// Higher-order component for automatic activity tracking
export function withActivityTracking<T extends object>(
  Component: React.ComponentType<T>,
  trackingConfig?: {
    trackMount?: boolean
    trackUnmount?: boolean
    trackProps?: string[]
    componentName?: string
  }
) {
  return function TrackedComponent(props: T & { 
    user?: { id: string; name: string; role: 'farmer' | 'agronomist' | 'admin' } 
  }) {
    const { track } = useActivityTracking(props.user)
    const componentName = trackingConfig?.componentName || Component.displayName || Component.name

    React.useEffect(() => {
      if (trackingConfig?.trackMount) {
        track('component.mounted', { 
          componentName,
          props: trackingConfig.trackProps?.reduce((acc, key) => {
            if (key in props) {
              acc[key] = (props as any)[key]
            }
            return acc
          }, {} as any)
        })
      }

      return () => {
        if (trackingConfig?.trackUnmount) {
          track('component.unmounted', { componentName })
        }
      }
    }, [track, componentName])

    return <Component {...props} />
  }
}

export default useActivityTracking