import { useCallback, useEffect, useRef, useState } from 'react'
import { useFieldMode } from '../contexts/FieldModeContext'
import { useActivityTracking } from './useActivityTracking'
import { authService } from '../services/auth'

export interface FieldUsabilityMetrics {
  // Task completion metrics
  taskCompletionRate: number
  averageTaskTime: number
  taskSuccessRate: number
  taskAbandonmentRate: number
  
  // Field-specific metrics
  timeToAnalysis: number
  analysisAccuracy: number
  oneHandedOperationSuccess: number
  gloveInteractionSuccess: number
  
  // Accessibility metrics
  highContrastUsage: number
  fontSizeAdjustments: number
  hapticFeedbackUtilization: number
  
  // Environmental adaptation
  weatherAdaptationEvents: number
  brightnessAdjustments: number
  fieldModeActivations: number
  
  // Offline capabilities
  offlineUsageTime: number
  offlineSyncSuccessRate: number
  offlineTasksCompleted: number
  
  // Error rates
  touchTargetMisses: number
  inputErrors: number
  navigationErrors: number
  
  // Performance metrics
  sessionDuration: number
  actionsPerSession: number
  returnUserRate: number
}

interface TaskSession {
  id: string
  type: 'analysis' | 'navigation' | 'settings' | 'review'
  startTime: number
  endTime?: number
  completed: boolean
  abandoned: boolean
  errors: number
  environmentalConditions: {
    fieldMode: boolean
    gloveMode: boolean
    highContrast: boolean
    weather?: string
    brightness?: number
  }
}

interface InteractionEvent {
  type: 'touch_miss' | 'input_error' | 'navigation_error' | 'success'
  timestamp: number
  context: string
  fieldModeActive: boolean
  details?: Record<string, unknown>
}

export function useFieldMetrics() {
  const { fieldMode, settings, weatherData, isFieldOptimized } = useFieldMode()
  const { track } = useActivityTracking(authService.getCurrentUser())
  
  const [currentSession, setCurrentSession] = useState<TaskSession | null>(null)
  const [interactions, setInteractions] = useState<InteractionEvent[]>([])
  const [metrics, setMetrics] = useState<FieldUsabilityMetrics | null>(null)
  
  const sessionStartTime = useRef<number>(Date.now())
  const actionsCount = useRef<number>(0)
  const metricsUpdateTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize session tracking
  useEffect(() => {
    sessionStartTime.current = Date.now()
    
    // Load existing metrics from localStorage
    const savedMetrics = localStorage.getItem('cropguard-field-metrics')
    if (savedMetrics) {
      try {
        setMetrics(JSON.parse(savedMetrics))
      } catch {
        // Initialize with default metrics
        initializeMetrics()
      }
    } else {
      initializeMetrics()
    }

    // Set up periodic metrics update
    metricsUpdateTimer.current = setInterval(() => {
      updateMetrics()
    }, 30000) // Update every 30 seconds

    return () => {
      if (metricsUpdateTimer.current) {
        clearInterval(metricsUpdateTimer.current)
      }
      finalizeSession()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track field mode changes
  useEffect(() => {
    track('field_mode.changed', {
      fieldMode,
      isFieldOptimized,
      gloveMode: settings.gloveMode,
      oneHandedMode: settings.oneHandedMode,
      highContrastMode: settings.highContrastMode
    })
    
    recordInteraction('success', 'field_mode_change', {
      newMode: fieldMode,
      settings
    })
  }, [fieldMode, settings, isFieldOptimized, track, recordInteraction])

  // Track weather adaptations
  useEffect(() => {
    if (weatherData) {
      track('weather.adaptation', {
        condition: weatherData.condition,
        brightness: weatherData.brightness,
        timeOfDay: weatherData.timeOfDay,
        adaptationTriggered: settings.autoWeatherAdaptation
      })
    }
  }, [weatherData, settings, track])

  const initializeMetrics = () => {
    const defaultMetrics: FieldUsabilityMetrics = {
      taskCompletionRate: 0,
      averageTaskTime: 0,
      taskSuccessRate: 0,
      taskAbandonmentRate: 0,
      timeToAnalysis: 0,
      analysisAccuracy: 0,
      oneHandedOperationSuccess: 0,
      gloveInteractionSuccess: 0,
      highContrastUsage: 0,
      fontSizeAdjustments: 0,
      hapticFeedbackUtilization: 0,
      weatherAdaptationEvents: 0,
      brightnessAdjustments: 0,
      fieldModeActivations: 0,
      offlineUsageTime: 0,
      offlineSyncSuccessRate: 0,
      offlineTasksCompleted: 0,
      touchTargetMisses: 0,
      inputErrors: 0,
      navigationErrors: 0,
      sessionDuration: 0,
      actionsPerSession: 0,
      returnUserRate: 0
    }
    setMetrics(defaultMetrics)
  }

  const startTask = useCallback((taskType: TaskSession['type']) => {
    const session: TaskSession = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskType,
      startTime: Date.now(),
      completed: false,
      abandoned: false,
      errors: 0,
      environmentalConditions: {
        fieldMode: isFieldOptimized,
        gloveMode: settings.gloveMode,
        highContrast: settings.highContrastMode,
        weather: weatherData?.condition,
        brightness: weatherData?.brightness
      }
    }
    
    setCurrentSession(session)
    
    track('task.started', {
      taskId: session.id,
      taskType,
      ...session.environmentalConditions
    })
    
    return session.id
  }, [isFieldOptimized, settings, weatherData, track])

  const completeTask = useCallback((taskId?: string, success: boolean = true) => {
    if (!currentSession || (taskId && currentSession.id !== taskId)) return
    
    const endTime = Date.now()
    const duration = endTime - currentSession.startTime
    
    const completedSession = {
      ...currentSession,
      endTime,
      completed: success,
      abandoned: !success
    }
    
    track('task.completed', {
      taskId: completedSession.id,
      taskType: completedSession.type,
      duration,
      success,
      errors: completedSession.errors,
      ...completedSession.environmentalConditions
    })
    
    recordInteraction(success ? 'success' : 'navigation_error', 'task_completion', {
      taskType: completedSession.type,
      duration,
      success
    })
    
    setCurrentSession(null)
    actionsCount.current++
    
    return duration
  }, [currentSession, track, recordInteraction])

  const recordTaskError = useCallback((errorType: 'touch_miss' | 'input_error' | 'navigation_error') => {
    if (currentSession) {
      setCurrentSession(prev => prev ? { ...prev, errors: prev.errors + 1 } : null)
    }
    
    recordInteraction(errorType, 'task_error', {
      taskId: currentSession?.id,
      taskType: currentSession?.type
    })
  }, [currentSession, recordInteraction])

  const recordInteraction = useCallback((
    type: InteractionEvent['type'],
    context: string,
    details?: Record<string, unknown>
  ) => {
    const interaction: InteractionEvent = {
      type,
      timestamp: Date.now(),
      context,
      fieldModeActive: isFieldOptimized,
      details
    }
    
    setInteractions(prev => [...prev.slice(-99), interaction]) // Keep last 100 interactions
    
    track('interaction.recorded', {
      type,
      context,
      fieldModeActive: isFieldOptimized,
      ...details
    })
  }, [isFieldOptimized, track])

  const recordAnalysis = useCallback((
    timeToComplete: number,
    accuracy: number,
    confidence: number
  ) => {
    track('analysis.metrics', {
      timeToComplete,
      accuracy,
      confidence,
      fieldModeActive: isFieldOptimized,
      environmentalConditions: {
        weather: weatherData?.condition,
        brightness: weatherData?.brightness
      }
    })
    
    recordInteraction('success', 'analysis_completed', {
      timeToComplete,
      accuracy,
      confidence
    })
  }, [isFieldOptimized, weatherData, track, recordInteraction])

  const recordOfflineUsage = useCallback((duration: number, tasksCompleted: number, syncSuccess: boolean) => {
    track('offline.usage', {
      duration,
      tasksCompleted,
      syncSuccess,
      fieldModeActive: isFieldOptimized
    })
    
    recordInteraction('success', 'offline_usage', {
      duration,
      tasksCompleted,
      syncSuccess
    })
  }, [isFieldOptimized, track, recordInteraction])

  const updateMetrics = useCallback(() => {
    if (!metrics) return
    
    const now = Date.now()
    const sessionDuration = now - sessionStartTime.current
    
    // Calculate metrics from recent interactions
    const recentInteractions = interactions.filter(i => now - i.timestamp < 3600000) // Last hour
    const totalInteractions = recentInteractions.length
    const errorInteractions = recentInteractions.filter(i => i.type !== 'success').length
    const successRate = totalInteractions > 0 ? (totalInteractions - errorInteractions) / totalInteractions : 0
    
    const touchMisses = recentInteractions.filter(i => i.type === 'touch_miss').length
    const inputErrors = recentInteractions.filter(i => i.type === 'input_error').length
    const navigationErrors = recentInteractions.filter(i => i.type === 'navigation_error').length
    
    // Update metrics
    const updatedMetrics: FieldUsabilityMetrics = {
      ...metrics,
      taskSuccessRate: successRate * 100,
      touchTargetMisses: touchMisses,
      inputErrors: inputErrors,
      navigationErrors: navigationErrors,
      sessionDuration: sessionDuration,
      actionsPerSession: actionsCount.current,
      fieldModeActivations: isFieldOptimized ? metrics.fieldModeActivations + 1 : metrics.fieldModeActivations,
      highContrastUsage: settings.highContrastMode ? metrics.highContrastUsage + 1 : metrics.highContrastUsage,
      hapticFeedbackUtilization: settings.hapticFeedback ? metrics.hapticFeedbackUtilization + 1 : metrics.hapticFeedbackUtilization,
      oneHandedOperationSuccess: settings.oneHandedMode ? metrics.oneHandedOperationSuccess + successRate * 100 : metrics.oneHandedOperationSuccess,
      gloveInteractionSuccess: settings.gloveMode ? metrics.gloveInteractionSuccess + successRate * 100 : metrics.gloveInteractionSuccess
    }
    
    setMetrics(updatedMetrics)
    
    // Save to localStorage
    localStorage.setItem('cropguard-field-metrics', JSON.stringify(updatedMetrics))
    
    // Send to backend (if online)
    if (navigator.onLine) {
      submitMetricsToBackend(updatedMetrics)
    }
  }, [metrics, interactions, isFieldOptimized, settings, submitMetricsToBackend])

  const submitMetricsToBackend = useCallback(async (metricsData: FieldUsabilityMetrics) => {
    try {
      // In a real implementation, this would call your analytics API
      await fetch('/api/analytics/field-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({
          userId: authService.getCurrentUser()?.id,
          timestamp: Date.now(),
          metrics: metricsData,
          session: {
            duration: Date.now() - sessionStartTime.current,
            actions: actionsCount.current,
            fieldModeActive: isFieldOptimized
          }
        })
      })
    } catch (error) {
      console.warn('Failed to submit field metrics:', error)
      // Store for later retry
      const pending = JSON.parse(localStorage.getItem('cropguard-pending-metrics') || '[]')
      pending.push({ timestamp: Date.now(), metrics: metricsData })
      localStorage.setItem('cropguard-pending-metrics', JSON.stringify(pending))
    }
  }, [isFieldOptimized])

  const finalizeSession = () => {
    if (currentSession) {
      completeTask(currentSession.id, false) // Mark as abandoned
    }
    updateMetrics() // Final metrics update
  }

  const getFieldUsabilityScore = useCallback((): number => {
    if (!metrics) return 0
    
    // Calculate composite usability score (0-100)
    const weights = {
      taskSuccess: 0.25,
      lowErrors: 0.2,
      fastCompletion: 0.15,
      fieldOptimization: 0.15,
      accessibility: 0.15,
      offline: 0.1
    }
    
    const taskSuccessScore = metrics.taskSuccessRate
    const errorScore = Math.max(0, 100 - (metrics.touchTargetMisses + metrics.inputErrors + metrics.navigationErrors) * 2)
    const speedScore = metrics.averageTaskTime > 0 ? Math.min(100, 100 - (metrics.averageTaskTime / 1000 - 30) * 2) : 50
    const fieldScore = (metrics.oneHandedOperationSuccess + metrics.gloveInteractionSuccess) / 2
    const accessibilityScore = (metrics.highContrastUsage + metrics.hapticFeedbackUtilization) / 2
    const offlineScore = metrics.offlineSyncSuccessRate
    
    return Math.round(
      taskSuccessScore * weights.taskSuccess +
      errorScore * weights.lowErrors +
      speedScore * weights.fastCompletion +
      fieldScore * weights.fieldOptimization +
      accessibilityScore * weights.accessibility +
      offlineScore * weights.offline
    )
  }, [metrics])

  const getRecommendations = useCallback((): string[] => {
    if (!metrics) return []
    
    const recommendations: string[] = []
    
    if (metrics.touchTargetMisses > 5) {
      recommendations.push('Consider enabling larger touch targets in field mode')
    }
    
    if (metrics.taskSuccessRate < 80) {
      recommendations.push('Try using glove mode for better interaction accuracy')
    }
    
    if (metrics.inputErrors > 3) {
      recommendations.push('Enable haptic feedback for better input confirmation')
    }
    
    if (metrics.navigationErrors > 2) {
      recommendations.push('Use one-handed navigation mode for easier access')
    }
    
    if (metrics.averageTaskTime > 60000) { // > 1 minute
      recommendations.push('Consider using high contrast mode for faster recognition')
    }
    
    if (metrics.offlineSyncSuccessRate < 90) {
      recommendations.push('Check your offline storage settings')
    }
    
    return recommendations
  }, [metrics])

  return {
    // Session management
    startTask,
    completeTask,
    recordTaskError,
    
    // Interaction tracking
    recordInteraction,
    recordAnalysis,
    recordOfflineUsage,
    
    // Metrics and analysis
    metrics,
    getFieldUsabilityScore,
    getRecommendations,
    
    // Current state
    currentSession,
    isTracking: !!currentSession,
    interactions: interactions.slice(-10) // Return last 10 interactions
  }
}

export default useFieldMetrics