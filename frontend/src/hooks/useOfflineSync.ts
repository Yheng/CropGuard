import React from 'react'
import type { OfflineAnalysis, OfflineAction, SyncStatus } from '../utils/offlineStorage'
import { offlineStorage } from '../utils/offlineStorage'

export interface SyncOptions {
  retryDelay: number // Base delay in ms
  maxRetries: number
  backoffMultiplier: number
  prioritizeFarmers: boolean // Prioritize farmer uploads over other actions
  batchSize: number
  syncInterval: number // Auto-sync interval in ms
}

export interface SyncEvent {
  type: 'upload_started' | 'upload_completed' | 'upload_failed' | 'action_synced' | 'sync_completed' | 'sync_error'
  data: {
    id?: string
    progress?: number
    total?: number
    error?: string
    [key: string]: unknown
  }
}

export interface ConnectivityInfo {
  isOnline: boolean
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number
  rtt: number
  saveData: boolean
}

const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  retryDelay: 1000,
  maxRetries: 3,
  backoffMultiplier: 2,
  prioritizeFarmers: true,
  batchSize: 5,
  syncInterval: 30000 // 30 seconds
}

class OfflineSyncManager {
  private isSync: boolean = false
  private syncOptions: SyncOptions
  private eventListeners: ((event: SyncEvent) => void)[] = []
  private syncInterval: NodeJS.Timeout | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(options: Partial<SyncOptions> = {}) {
    this.syncOptions = { ...DEFAULT_SYNC_OPTIONS, ...options }
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Connection restored, starting sync')
      this.startAutoSync()
      this.syncAll()
    })

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Connection lost, stopping auto-sync')
      this.stopAutoSync()
    })

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data
        
        switch (type) {
          case 'UPLOAD_SUCCESS':
            this.handleServiceWorkerUploadSuccess(payload)
            break
          case 'SYNC_SUCCESS':
            this.handleServiceWorkerSyncSuccess(payload)
            break
          case 'FORCE_SYNC_COMPLETE':
            this.emitEvent('sync_completed', payload)
            break
          case 'FORCE_SYNC_ERROR':
            this.emitEvent('sync_error', payload)
            break
        }
      })
    }
  }

  // Event management
  addEventListener(listener: (event: SyncEvent) => void) {
    this.eventListeners.push(listener)
  }

  removeEventListener(listener: (event: SyncEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  private emitEvent(type: SyncEvent['type'], data: SyncEvent['data'] = {}) {
    const event: SyncEvent = { type, data }
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[OfflineSync] Event listener error:', error)
      }
    })
  }

  // Auto-sync management
  startAutoSync() {
    if (this.syncInterval || !navigator.onLine) return

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSync) {
        this.syncAll()
      }
    }, this.syncOptions.syncInterval)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Main sync methods
  async syncAll(): Promise<void> {
    if (this.isSync || !navigator.onLine) {
      return
    }

    this.isSync = true
    await offlineStorage.updateSyncStatus({ 
      isSyncing: true, 
      lastSyncAttempt: new Date().toISOString() 
    })

    try {
      // Sync in priority order
      if (this.syncOptions.prioritizeFarmers) {
        await this.syncAnalysisUploads()
        await this.syncOfflineActions()
      } else {
        await Promise.all([
          this.syncAnalysisUploads(),
          this.syncOfflineActions()
        ])
      }

      await offlineStorage.updateSyncStatus({ 
        lastSuccessfulSync: new Date().toISOString() 
      })

      this.emitEvent('sync_completed', {})
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error)
      this.emitEvent('sync_error', { error: error.message })
    } finally {
      this.isSync = false
      await offlineStorage.updateSyncStatus({ isSyncing: false })
    }
  }

  async syncAnalysisUploads(): Promise<void> {
    const queuedUploads = await offlineStorage.getQueuedUploads('queued')
    const failedUploads = await offlineStorage.getQueuedUploads('failed')
    
    // Combine and sort by priority and creation time
    const allUploads = [...queuedUploads, ...failedUploads]
      .filter(upload => upload.retryCount < this.syncOptions.maxRetries)
      .sort((a, b) => {
        // Priority order: urgent > high > normal > low
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        
        if (priorityDiff !== 0) return priorityDiff
        
        // Then by creation time (oldest first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

    const total = allUploads.length
    let completed = 0

    for (let i = 0; i < allUploads.length; i += this.syncOptions.batchSize) {
      const batch = allUploads.slice(i, i + this.syncOptions.batchSize)
      
      await Promise.all(
        batch.map(async (upload) => {
          try {
            await this.uploadAnalysis(upload)
            completed++
            this.emitEvent('upload_completed', {
              id: upload.id,
              progress: completed,
              total
            })
          } catch (error) {
            console.error(`[OfflineSync] Failed to upload analysis ${upload.id}:`, error)
            await this.handleUploadFailure(upload, error.message)
            this.emitEvent('upload_failed', {
              id: upload.id,
              error: error.message
            })
          }
        })
      )

      // Adaptive delay based on connection quality
      if (i + this.syncOptions.batchSize < allUploads.length) {
        const delay = this.getAdaptiveDelay()
        await this.sleep(delay)
      }
    }
  }

  async syncOfflineActions(): Promise<void> {
    const actions = await offlineStorage.getQueuedActions()
    const pendingActions = actions
      .filter(action => action.retryCount < action.maxRetries)
      .sort((a, b) => b.priority - a.priority) // Higher priority first

    for (const action of pendingActions) {
      try {
        await this.executeAction(action)
        await offlineStorage.removeAction(action.id)
        this.emitEvent('action_synced', { id: action.id, type: action.type })
      } catch (error) {
        console.error(`[OfflineSync] Failed to execute action ${action.id}:`, error)
        await this.handleActionFailure(action, error.message)
      }
    }
  }

  // Individual sync operations
  private async uploadAnalysis(analysis: OfflineAnalysis): Promise<void> {
    this.emitEvent('upload_started', { id: analysis.id })
    
    await offlineStorage.updateUploadStatus(analysis.id, 'uploading')

    const formData = new FormData()
    formData.append('image', analysis.imageBlob, `crop-${analysis.id}.jpg`)
    formData.append('metadata', JSON.stringify(analysis.metadata))
    formData.append('farmerId', analysis.farmerId)
    formData.append('priority', analysis.priority)
    formData.append('offlineId', analysis.id)

    const response = await this.fetchWithRetry('/api/analyses', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    // Mark as uploaded and clean up
    await offlineStorage.updateUploadStatus(analysis.id, 'uploaded')
    
    // Remove from queue after successful upload
    setTimeout(() => {
      offlineStorage.removeUpload(analysis.id)
    }, 5000) // Keep for 5 seconds for UI feedback
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    const headers = {
      'Content-Type': 'application/json',
      ...action.headers
    }

    const response = await this.fetchWithRetry(action.url, {
      method: action.method,
      headers,
      body: action.body
    })

    if (!response.ok) {
      throw new Error(`Action failed: ${response.status} ${response.statusText}`)
    }
  }

  // Error handling
  private async handleUploadFailure(upload: OfflineAnalysis, error: string): Promise<void> {
    const retryCount = upload.retryCount + 1
    
    if (retryCount >= this.syncOptions.maxRetries) {
      await offlineStorage.updateUploadStatus(upload.id, 'failed', error)
      return
    }

    // Calculate retry delay with exponential backoff
    const delay = this.syncOptions.retryDelay * Math.pow(this.syncOptions.backoffMultiplier, retryCount)
    
    // Update retry count
    await offlineStorage.updateUploadStatus(upload.id, 'failed', error)
    
    // Schedule retry
    const timeoutId = setTimeout(async () => {
      this.retryTimeouts.delete(upload.id)
      try {
        await this.uploadAnalysis(upload)
      } catch (retryError) {
        await this.handleUploadFailure(upload, retryError.message)
      }
    }, delay)
    
    this.retryTimeouts.set(upload.id, timeoutId)
  }

  private async handleActionFailure(action: OfflineAction, error: string): Promise<void> {
    const retryCount = action.retryCount + 1
    
    if (retryCount >= action.maxRetries) {
      // Remove failed action after max retries
      await offlineStorage.removeAction(action.id)
      return
    }

    // Update retry count
    const updatedAction = {
      ...action,
      retryCount,
      lastAttempt: new Date().toISOString(),
      error
    }

    // Re-queue the action
    await offlineStorage.queueAction(updatedAction)
  }

  // Utility methods
  private async fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options)
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response
        }
        
        if (response.ok) {
          return response
        }
        
        // Retry on server errors (5xx) or network errors
        if (i === retries - 1) {
          return response
        }
      } catch (error) {
        if (i === retries - 1) {
          throw error
        }
      }
      
      // Wait before retry
      await this.sleep(1000 * Math.pow(2, i))
    }
    
    throw new Error('Max retries exceeded')
  }

  private getAdaptiveDelay(): number {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string
      }
    }
    const connection = nav.connection
    if (!connection) return 100

    // Adjust delay based on connection quality
    switch (connection.effectiveType) {
      case 'slow-2g':
        return 2000
      case '2g':
        return 1000
      case '3g':
        return 500
      case '4g':
        return 100
      default:
        return 200
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async handleServiceWorkerUploadSuccess(payload: { uploadId: string; analysisId: string }) {
    const { uploadId, analysisId } = payload
    this.emitEvent('upload_completed', { id: uploadId, analysisId })
  }

  private async handleServiceWorkerSyncSuccess(payload: { actionId: string }) {
    const { actionId } = payload
    this.emitEvent('action_synced', { id: actionId })
  }

  // Public API
  async forceSync(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({
        type: 'FORCE_SYNC',
        payload: { syncType: 'all' }
      })
    } else {
      await this.syncAll()
    }
  }

  async forceSyncUploads(): Promise<void> {
    await this.syncAnalysisUploads()
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return await offlineStorage.getSyncStatus()
  }

  getConnectivityInfo(): ConnectivityInfo {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
      }
    }
    const connection = nav.connection
    
    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    }
  }

  // Cleanup
  destroy() {
    this.stopAutoSync()
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
    
    // Remove event listeners
    this.eventListeners = []
  }
}

// React hook for offline sync
export function useOfflineSync(options?: Partial<SyncOptions>) {
  const [syncManager] = React.useState(() => new OfflineSyncManager(options))
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus | null>(null)
  const [connectivityInfo, setConnectivityInfo] = React.useState<ConnectivityInfo>(() => 
    syncManager.getConnectivityInfo()
  )
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [lastSyncError, setLastSyncError] = React.useState<string | null>(null)

  // Update sync status
  const updateSyncStatus = React.useCallback(async () => {
    try {
      const status = await syncManager.getSyncStatus()
      setSyncStatus(status)
      setConnectivityInfo(syncManager.getConnectivityInfo())
    } catch (error) {
      console.error('[useOfflineSync] Failed to get sync status:', error)
    }
  }, [syncManager])

  // Setup event listeners
  React.useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case 'upload_started':
          setIsSyncing(true)
          setLastSyncError(null)
          break
        case 'sync_completed':
          setIsSyncing(false)
          setLastSyncError(null)
          updateSyncStatus()
          break
        case 'sync_error':
        case 'upload_failed':
          setIsSyncing(false)
          setLastSyncError(event.data.error || 'Sync failed')
          updateSyncStatus()
          break
      }
    }

    syncManager.addEventListener(handleSyncEvent)

    return () => {
      syncManager.removeEventListener(handleSyncEvent)
    }
  }, [syncManager, updateSyncStatus])

  // Update connectivity info on network changes
  React.useEffect(() => {
    const updateConnectivity = () => {
      setConnectivityInfo(syncManager.getConnectivityInfo())
      updateSyncStatus()
    }

    window.addEventListener('online', updateConnectivity)
    window.addEventListener('offline', updateConnectivity)

    // Listen for connection changes
    const nav = navigator as Navigator & {
      connection?: {
        addEventListener?: (event: string, handler: () => void) => void
        removeEventListener?: (event: string, handler: () => void) => void
      }
    }
    const connection = nav.connection
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', updateConnectivity)
    }

    return () => {
      window.removeEventListener('online', updateConnectivity)
      window.removeEventListener('offline', updateConnectivity)
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', updateConnectivity)
      }
    }
  }, [syncManager, updateSyncStatus])

  // Initial status load
  React.useEffect(() => {
    updateSyncStatus()
  }, [updateSyncStatus])

  // Auto-sync management
  React.useEffect(() => {
    if (connectivityInfo.isOnline) {
      syncManager.startAutoSync()
    } else {
      syncManager.stopAutoSync()
    }

    return () => {
      syncManager.stopAutoSync()
    }
  }, [syncManager, connectivityInfo.isOnline])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      syncManager.destroy()
    }
  }, [syncManager])

  return {
    syncStatus,
    connectivityInfo,
    isSyncing,
    lastSyncError,
    
    // Actions
    forceSync: syncManager.forceSync.bind(syncManager),
    forceSyncUploads: syncManager.forceSyncUploads.bind(syncManager),
    
    // Event management
    addEventListener: syncManager.addEventListener.bind(syncManager),
    removeEventListener: syncManager.removeEventListener.bind(syncManager),
    
    // Utilities
    isOnline: connectivityInfo.isOnline,
    connectionQuality: connectivityInfo.effectiveType,
    hasPendingData: syncStatus ? (syncStatus.pendingUploads + syncStatus.pendingActions) > 0 : false
  }
}

export default useOfflineSync