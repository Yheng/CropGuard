import React from 'react'

export interface ConnectionState {
  isOnline: boolean
  isConnected: boolean // Actual server connectivity
  connectionType: 'unknown' | 'ethernet' | 'wifi' | 'cellular' | 'bluetooth' | 'mixed'
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number // Mbps
  rtt: number // Round trip time in milliseconds
  saveData: boolean
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
  lastConnected?: Date
  lastDisconnected?: Date
  outageCount: number
  totalOutageTime: number // in milliseconds
}

export interface ConnectivityTest {
  timestamp: Date
  latency: number
  success: boolean
  error?: string
}

export interface ConnectionMetrics {
  averageLatency: number
  successRate: number
  recentTests: ConnectivityTest[]
  longestOutage: number
  shortestOutage: number
  averageOutageDuration: number
}

interface UseConnectionStateOptions {
  testInterval?: number // How often to test connectivity (ms)
  testUrl?: string // URL to test connectivity against
  timeout?: number // Timeout for connectivity tests (ms)
  enableBackgroundTesting?: boolean
  storageKey?: string // LocalStorage key for persistence
}

const DEFAULT_OPTIONS: Required<UseConnectionStateOptions> = {
  testInterval: 30000, // 30 seconds
  testUrl: '/api/health', // CropGuard health endpoint
  timeout: 5000, // 5 seconds
  enableBackgroundTesting: true,
  storageKey: 'cropguard_connection_state'
}

class ConnectionMonitor {
  private options: Required<UseConnectionStateOptions>
  private listeners: Set<(state: ConnectionState) => void> = new Set()
  private testInterval: NodeJS.Timeout | null = null
  private connectionState: ConnectionState
  private connectivityTests: ConnectivityTest[] = []
  private outages: Array<{ start: Date; end?: Date }> = []
  
  constructor(options: UseConnectionStateOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.connectionState = this.getInitialState()
    this.loadPersistedState()
    this.setupEventListeners()
    this.startMonitoring()
  }

  private getInitialState(): ConnectionState {
    const connection = this.getConnectionInfo()
    
    return {
      isOnline: navigator.onLine,
      isConnected: navigator.onLine,
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      quality: this.calculateQuality(connection),
      outageCount: 0,
      totalOutageTime: 0
    }
  }

  private getConnectionInfo() {
    const nav = navigator as Navigator & {
      connection?: {
        type?: string
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
      }
      mozConnection?: {
        type?: string
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
      }
      webkitConnection?: {
        type?: string
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
      }
    }
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection

    if (!connection) {
      return {
        type: 'unknown' as const,
        effectiveType: 'unknown' as const,
        downlink: 0,
        rtt: 0,
        saveData: false
      }
    }

    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    }
  }

  private calculateQuality(connection: ReturnType<typeof this.getConnectionInfo>): ConnectionState['quality'] {
    if (!navigator.onLine) return 'offline'

    const { effectiveType, downlink, rtt } = connection

    // Quality based on effective connection type and metrics
    if (effectiveType === '4g' && downlink >= 5 && rtt <= 100) {
      return 'excellent'
    } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink >= 2 && rtt <= 300)) {
      return 'good'
    } else if (effectiveType === '3g' || (effectiveType === '2g' && rtt <= 1000)) {
      return 'fair'
    } else {
      return 'poor'
    }
  }

  private setupEventListeners(): void {
    // Browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Connection change events
    const nav = navigator as Navigator & {
      connection?: {
        addEventListener?: (event: string, handler: () => void) => void
      }
    }
    const connection = nav.connection
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', this.handleConnectionChange.bind(this))
    }

    // Page visibility changes (for background testing)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))

    // Before unload - save state
    window.addEventListener('beforeunload', this.saveState.bind(this))
  }

  private handleOnline(): void {
    const wasOffline = !this.connectionState.isOnline
    
    this.updateConnectionState({
      isOnline: true,
      lastConnected: new Date()
    })

    if (wasOffline) {
      this.handleOutageEnd()
      this.performConnectivityTest()
    }
  }

  private handleOffline(): void {
    const wasOnline = this.connectionState.isOnline
    
    this.updateConnectionState({
      isOnline: false,
      isConnected: false,
      quality: 'offline',
      lastDisconnected: new Date()
    })

    if (wasOnline) {
      this.handleOutageStart()
    }
  }

  private handleConnectionChange(): void {
    const connection = this.getConnectionInfo()
    const quality = this.calculateQuality(connection)

    this.updateConnectionState({
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      quality
    })

    // Test actual connectivity on connection changes
    if (this.connectionState.isOnline) {
      this.performConnectivityTest()
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.connectionState.isOnline) {
      // Test connectivity when page becomes visible
      this.performConnectivityTest()
    }
  }

  private handleOutageStart(): void {
    this.outages.push({ start: new Date() })
    this.updateConnectionState({
      outageCount: this.connectionState.outageCount + 1
    })
  }

  private handleOutageEnd(): void {
    const currentOutage = this.outages[this.outages.length - 1]
    if (currentOutage && !currentOutage.end) {
      currentOutage.end = new Date()
      const outageDuration = currentOutage.end.getTime() - currentOutage.start.getTime()
      
      this.updateConnectionState({
        totalOutageTime: this.connectionState.totalOutageTime + outageDuration
      })
    }
  }

  private async performConnectivityTest(): Promise<void> {
    const startTime = Date.now()
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

      const response = await fetch(this.options.testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const latency = Date.now() - startTime
      const success = response.ok

      const test: ConnectivityTest = {
        timestamp: new Date(),
        latency,
        success
      }

      this.addConnectivityTest(test)

      this.updateConnectionState({
        isConnected: success,
        quality: success ? this.calculateQuality(this.getConnectionInfo()) : 'poor'
      })

    } catch (error) {
      const latency = Date.now() - startTime
      
      const test: ConnectivityTest = {
        timestamp: new Date(),
        latency,
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }

      this.addConnectivityTest(test)

      this.updateConnectionState({
        isConnected: false,
        quality: 'offline'
      })
    }
  }

  private addConnectivityTest(test: ConnectivityTest): void {
    this.connectivityTests.push(test)
    
    // Keep only last 100 tests
    if (this.connectivityTests.length > 100) {
      this.connectivityTests = this.connectivityTests.slice(-100)
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates }
    this.notifyListeners()
    this.saveState()
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.connectionState)
      } catch (error) {
        console.error('[ConnectionMonitor] Listener error:', error)
      }
    })
  }

  private startMonitoring(): void {
    if (!this.options.enableBackgroundTesting) return

    this.testInterval = setInterval(() => {
      if (this.connectionState.isOnline && document.visibilityState === 'visible') {
        this.performConnectivityTest()
      }
    }, this.options.testInterval)
  }

  private stopMonitoring(): void {
    if (this.testInterval) {
      clearInterval(this.testInterval)
      this.testInterval = null
    }
  }

  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        
        // Restore some persistent data
        this.connectionState.outageCount = parsed.outageCount || 0
        this.connectionState.totalOutageTime = parsed.totalOutageTime || 0
        this.connectivityTests = parsed.connectivityTests || []
        this.outages = parsed.outages?.map((o: { start: string; end?: string }) => ({
          start: new Date(o.start),
          end: o.end ? new Date(o.end) : undefined
        })) || []
      }
    } catch (error) {
      console.warn('[ConnectionMonitor] Failed to load persisted state:', error)
    }
  }

  private saveState(): void {
    try {
      const state = {
        outageCount: this.connectionState.outageCount,
        totalOutageTime: this.connectionState.totalOutageTime,
        connectivityTests: this.connectivityTests.slice(-20), // Save last 20 tests
        outages: this.outages.slice(-10) // Save last 10 outages
      }
      
      localStorage.setItem(this.options.storageKey, JSON.stringify(state))
    } catch (error) {
      console.warn('[ConnectionMonitor] Failed to save state:', error)
    }
  }

  // Public API
  getState(): ConnectionState {
    return { ...this.connectionState }
  }

  getMetrics(): ConnectionMetrics {
    const recentTests = this.connectivityTests.slice(-10)
    const successfulTests = recentTests.filter(t => t.success)
    
    const averageLatency = successfulTests.length > 0
      ? successfulTests.reduce((sum, test) => sum + test.latency, 0) / successfulTests.length
      : 0

    const successRate = recentTests.length > 0
      ? (successfulTests.length / recentTests.length) * 100
      : 0

    const completedOutages = this.outages.filter(o => o.end)
    const outageDurations = completedOutages.map(o => o.end!.getTime() - o.start.getTime())
    
    return {
      averageLatency,
      successRate,
      recentTests: recentTests.slice(-5),
      longestOutage: outageDurations.length > 0 ? Math.max(...outageDurations) : 0,
      shortestOutage: outageDurations.length > 0 ? Math.min(...outageDurations) : 0,
      averageOutageDuration: outageDurations.length > 0
        ? outageDurations.reduce((sum, duration) => sum + duration, 0) / outageDurations.length
        : 0
    }
  }

  async testConnectivity(): Promise<ConnectivityTest> {
    await this.performConnectivityTest()
    return this.connectivityTests[this.connectivityTests.length - 1]
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener)
    
    // Immediately notify with current state
    listener(this.connectionState)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  destroy(): void {
    this.stopMonitoring()
    this.listeners.clear()
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    
    const nav = navigator as Navigator & {
      connection?: {
        removeEventListener?: (event: string, handler: () => void) => void
      }
    }
    const connection = nav.connection
    if (connection && connection.removeEventListener) {
      connection.removeEventListener('change', this.handleConnectionChange.bind(this))
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.removeEventListener('beforeunload', this.saveState.bind(this))
    
    this.saveState()
  }
}

// Global monitor instance
let globalMonitor: ConnectionMonitor | null = null

// React hook
export function useConnectionState(options?: UseConnectionStateOptions) {
  const [connectionState, setConnectionState] = React.useState<ConnectionState | null>(null)
  const [metrics, setMetrics] = React.useState<ConnectionMetrics | null>(null)

  // Initialize monitor
  React.useEffect(() => {
    if (!globalMonitor) {
      globalMonitor = new ConnectionMonitor(options)
    }

    const unsubscribe = globalMonitor.subscribe((state) => {
      setConnectionState(state)
      setMetrics(globalMonitor!.getMetrics())
    })

    return unsubscribe
  }, [options])

  // Test connectivity manually
  const testConnectivity = React.useCallback(async () => {
    if (!globalMonitor) return null
    return await globalMonitor.testConnectivity()
  }, [])

  // Get detailed metrics
  const getDetailedMetrics = React.useCallback(() => {
    if (!globalMonitor) return null
    return globalMonitor.getMetrics()
  }, [])

  // Connection quality helpers
  const isGoodConnection = React.useMemo(() => {
    return connectionState?.quality === 'excellent' || connectionState?.quality === 'good'
  }, [connectionState?.quality])

  const isSuitableForUploads = React.useMemo(() => {
    if (!connectionState) return false
    return connectionState.isConnected && 
           (connectionState.quality === 'excellent' || 
            connectionState.quality === 'good' || 
            connectionState.quality === 'fair')
  }, [connectionState])

  const shouldShowOfflineWarning = React.useMemo(() => {
    if (!connectionState) return false
    return !connectionState.isOnline || !connectionState.isConnected
  }, [connectionState])

  const connectionDescription = React.useMemo(() => {
    if (!connectionState) return 'Checking connection...'
    
    if (!connectionState.isOnline) return 'No internet connection'
    if (!connectionState.isConnected) return 'Server unreachable'
    
    const { effectiveType, quality } = connectionState
    const typeMap = {
      '4g': '4G',
      '3g': '3G', 
      '2g': '2G',
      'slow-2g': 'Slow 2G',
      'unknown': 'Unknown'
    }
    
    return `${typeMap[effectiveType]} • ${quality} quality`
  }, [connectionState])

  return {
    connectionState,
    metrics,
    testConnectivity,
    getDetailedMetrics,
    
    // Convenience properties
    isOnline: connectionState?.isOnline ?? false,
    isConnected: connectionState?.isConnected ?? false,
    quality: connectionState?.quality ?? 'unknown',
    effectiveType: connectionState?.effectiveType ?? 'unknown',
    isGoodConnection,
    isSuitableForUploads,
    shouldShowOfflineWarning,
    connectionDescription,
    
    // Raw connection info
    downlink: connectionState?.downlink ?? 0,
    rtt: connectionState?.rtt ?? 0,
    saveData: connectionState?.saveData ?? false
  }
}

// Utility functions
export function isConnectionSuitableForFeature(
  connectionState: ConnectionState,
  feature: 'upload' | 'sync' | 'realtime' | 'basic'
): boolean {
  if (!connectionState.isConnected) return false

  switch (feature) {
    case 'upload':
      return ['excellent', 'good', 'fair'].includes(connectionState.quality)
    case 'sync':
      return ['excellent', 'good'].includes(connectionState.quality)
    case 'realtime':
      return connectionState.quality === 'excellent'
    case 'basic':
      return true // Any connection works for basic features
    default:
      return false
  }
}

export function getOptimalUploadSettings(connectionState: ConnectionState) {
  switch (connectionState.quality) {
    case 'excellent':
      return {
        maxConcurrentUploads: 3,
        chunkSize: 1024 * 1024, // 1MB
        compressionQuality: 0.9,
        retryDelay: 1000
      }
    case 'good':
      return {
        maxConcurrentUploads: 2,
        chunkSize: 512 * 1024, // 512KB
        compressionQuality: 0.8,
        retryDelay: 2000
      }
    case 'fair':
      return {
        maxConcurrentUploads: 1,
        chunkSize: 256 * 1024, // 256KB
        compressionQuality: 0.7,
        retryDelay: 3000
      }
    case 'poor':
      return {
        maxConcurrentUploads: 1,
        chunkSize: 128 * 1024, // 128KB
        compressionQuality: 0.6,
        retryDelay: 5000
      }
    default:
      return {
        maxConcurrentUploads: 1,
        chunkSize: 64 * 1024, // 64KB
        compressionQuality: 0.5,
        retryDelay: 10000
      }
  }
}

// Cleanup on app unmount
export function cleanupConnectionMonitor(): void {
  if (globalMonitor) {
    globalMonitor.destroy()
    globalMonitor = null
  }
}

export default useConnectionState