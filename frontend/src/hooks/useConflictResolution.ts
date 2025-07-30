import React from 'react'
import type { ConflictData, ResolutionStrategy } from '../components/offline/ConflictResolutionModal'

export interface ConflictResolutionState {
  conflicts: ConflictData[]
  isLoading: boolean
  error: string | null
  isResolving: boolean
  lastResolved: string | null
}

export interface ConflictResolutionActions {
  refreshConflicts: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: ResolutionStrategy) => Promise<void>
  autoResolveAll: () => Promise<void>
  markResolved: (conflictId: string) => void
  clearError: () => void
}

class ConflictResolutionManager {
  private serviceWorkerReady: Promise<ServiceWorkerRegistration | null>
  private eventListeners: ((event: MessageEvent) => void)[] = []

  constructor() {
    this.serviceWorkerReady = this.getServiceWorkerRegistration()
    this.setupMessageListener()
  }

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        return await navigator.serviceWorker.ready
      } catch (error) {
        console.error('[ConflictResolution] Service worker not available:', error)
        return null
      }
    }
    return null
  }

  private setupMessageListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.eventListeners.forEach(listener => listener(event))
      })
    }
  }

  addEventListener(listener: (event: MessageEvent) => void) {
    this.eventListeners.push(listener)
  }

  removeEventListener(listener: (event: MessageEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  async getConflicts(): Promise<ConflictData[]> {
    const registration = await this.serviceWorkerReady
    if (!registration?.active) {
      throw new Error('Service worker not available')
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        const { type, payload } = event.data
        
        if (type === 'CONFLICTS_RESULT') {
          resolve(payload as ConflictData[])
        } else if (type === 'CONFLICTS_ERROR') {
          reject(new Error(payload))
        }
      }

      registration.active.postMessage(
        { type: 'GET_CONFLICTS' },
        [channel.port2]
      )
    })
  }

  async resolveConflict(conflictId: string, resolution: ResolutionStrategy): Promise<void> {
    const registration = await this.serviceWorkerReady
    if (!registration?.active) {
      throw new Error('Service worker not available')
    }

    registration.active.postMessage({
      type: 'RESOLVE_CONFLICT',
      payload: { conflictId, resolution }
    })

    // Wait for resolution confirmation
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Conflict resolution timeout'))
      }, 30000) // 30 second timeout

      const listener = (event: MessageEvent) => {
        const { type, payload } = event.data
        
        if (type === 'CONFLICT_RESOLUTION_SUCCESS' && payload.conflictId === conflictId) {
          clearTimeout(timeout)
          this.removeEventListener(listener)
          resolve()
        } else if (type === 'CONFLICT_RESOLUTION_ERROR' && payload.conflictId === conflictId) {
          clearTimeout(timeout)
          this.removeEventListener(listener)
          reject(new Error(payload.error))
        }
      }

      this.addEventListener(listener)
    })
  }

  async autoResolveAll(maxConflicts: number = 10): Promise<{ resolved: number; failed: number; total: number }> {
    const registration = await this.serviceWorkerReady
    if (!registration?.active) {
      throw new Error('Service worker not available')
    }

    registration.active.postMessage({
      type: 'AUTO_RESOLVE_CONFLICTS',
      payload: { maxConflicts }
    })

    // Wait for auto-resolution completion
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Auto-resolution timeout'))
      }, 60000) // 60 second timeout

      const listener = (event: MessageEvent) => {
        const { type, payload } = event.data
        
        if (type === 'AUTO_RESOLVE_COMPLETE') {
          clearTimeout(timeout)
          this.removeEventListener(listener)
          resolve(payload)
        } else if (type === 'AUTO_RESOLVE_ERROR') {
          clearTimeout(timeout)
          this.removeEventListener(listener)
          reject(new Error(payload.error))
        }
      }

      this.addEventListener(listener)
    })
  }

  // Real-time conflict detection
  startConflictMonitoring(callback: (conflicts: ConflictData[]) => void) {
    const listener = (event: MessageEvent) => {
      const { type, payload } = event.data
      
      if (type === 'CONFLICT_DETECTED') {
        // Refresh conflicts when new ones are detected
        this.getConflicts().then(callback).catch(console.error)
      } else if (type === 'CONFLICT_RESOLVED') {
        // Refresh conflicts when resolved
        this.getConflicts().then(callback).catch(console.error)
      }
    }

    this.addEventListener(listener)
    
    return () => {
      this.removeEventListener(listener)
    }
  }
}

// Global instance
const conflictManager = new ConflictResolutionManager()

export function useConflictResolution(): ConflictResolutionState & ConflictResolutionActions {
  const [state, setState] = React.useState<ConflictResolutionState>({
    conflicts: [],
    isLoading: false,
    error: null,
    isResolving: false,
    lastResolved: null
  })

  // Refresh conflicts from service worker
  const refreshConflicts = React.useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const conflicts = await conflictManager.getConflicts()
      setState(prev => ({
        ...prev,
        conflicts,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch conflicts',
        isLoading: false
      }))
    }
  }, [])

  // Resolve a specific conflict
  const resolveConflict = React.useCallback(async (conflictId: string, resolution: ResolutionStrategy) => {
    setState(prev => ({ ...prev, isResolving: true, error: null }))
    
    try {
      await conflictManager.resolveConflict(conflictId, resolution)
      
      setState(prev => ({
        ...prev,
        isResolving: false,
        lastResolved: conflictId,
        conflicts: prev.conflicts.map(c => 
          c.id === conflictId 
            ? { ...c, resolved: true, resolution }
            : c
        )
      }))

      // Refresh to get updated state from service worker
      setTimeout(refreshConflicts, 1000)
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict',
        isResolving: false
      }))
    }
  }, [refreshConflicts])

  // Auto-resolve all resolvable conflicts
  const autoResolveAll = React.useCallback(async () => {
    setState(prev => ({ ...prev, isResolving: true, error: null }))
    
    try {
      const result = await conflictManager.autoResolveAll()
      
      setState(prev => ({
        ...prev,
        isResolving: false
      }))

      // Refresh conflicts after auto-resolution
      setTimeout(refreshConflicts, 1000)
      
      return result
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Auto-resolution failed',
        isResolving: false
      }))
      throw error
    }
  }, [refreshConflicts])

  // Mark conflict as resolved (optimistic update)
  const markResolved = React.useCallback((conflictId: string) => {
    setState(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c =>
        c.id === conflictId
          ? { ...c, resolved: true }
          : c
      ),
      lastResolved: conflictId
    }))
  }, [])

  // Clear error state
  const clearError = React.useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Setup real-time conflict monitoring
  React.useEffect(() => {
    const cleanup = conflictManager.startConflictMonitoring((conflicts) => {
      setState(prev => ({ ...prev, conflicts }))
    })

    return cleanup
  }, [])

  // Initial load
  React.useEffect(() => {
    refreshConflicts()
  }, [refreshConflicts])

  // Listen for service worker messages
  React.useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, payload } = event.data
      
      switch (type) {
        case 'CONFLICT_DETECTED':
          // Add new conflict to state
          setState(prev => ({
            ...prev,
            conflicts: [...prev.conflicts, payload as ConflictData]
          }))
          break
          
        case 'CONFLICT_RESOLVED':
          // Update resolved conflict
          setState(prev => ({
            ...prev,
            conflicts: prev.conflicts.map(c =>
              c.id === payload.conflictId
                ? { ...c, resolved: true, resolution: payload.resolution }
                : c
            )
          }))
          break
          
        case 'AUTO_RESOLVE_COMPLETE':
          // Refresh after auto-resolution
          setTimeout(refreshConflicts, 500)
          break
      }
    }

    conflictManager.addEventListener(handleServiceWorkerMessage)
    
    return () => {
      conflictManager.removeEventListener(handleServiceWorkerMessage)
    }
  }, [refreshConflicts])

  return {
    ...state,
    refreshConflicts,
    resolveConflict,
    autoResolveAll,
    markResolved,
    clearError
  }
}

// Hook for conflict statistics and monitoring
export function useConflictStats() {
  const { conflicts } = useConflictResolution()
  
  const stats = React.useMemo(() => {
    const total = conflicts.length
    const resolved = conflicts.filter(c => c.resolved).length
    const autoResolvable = conflicts.filter(c => c.autoResolvable && !c.resolved).length
    const manualRequired = conflicts.filter(c => !c.autoResolvable && !c.resolved).length
    
    const severityStats = conflicts.reduce((acc, conflict) => {
      const maxSeverity = conflict.conflicts.reduce((max, c) => {
        const severityOrder = { low: 1, medium: 2, high: 3 }
        return severityOrder[c.severity] > severityOrder[max] ? c.severity : max
      }, 'low' as 'low' | 'medium' | 'high')
      
      acc[maxSeverity] = (acc[maxSeverity] || 0) + 1
      return acc
    }, {} as Record<'low' | 'medium' | 'high', number>)
    
    return {
      total,
      resolved,
      pending: total - resolved,
      autoResolvable,
      manualRequired,
      severity: {
        high: severityStats.high || 0,
        medium: severityStats.medium || 0,
        low: severityStats.low || 0
      }
    }
  }, [conflicts])
  
  return stats
}

export default useConflictResolution