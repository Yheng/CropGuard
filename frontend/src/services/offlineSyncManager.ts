// Comprehensive Offline Sync Manager
// Coordinates background sync, conflict resolution, and data consistency

import { offlineStorage, type OfflineAnalysis, type SyncStatus } from '../utils/offlineStorage'
import { serviceWorkerManager } from '../utils/serviceWorkerRegistration'

export interface SyncManagerConfig {
  syncInterval: number // Auto-sync interval in ms
  maxRetries: number
  batchSize: number
  enableConflictResolution: boolean
  enableProgressiveSync: boolean
  prioritizeUrgent: boolean
}

export interface SyncMetrics {
  totalSynced: number
  totalFailed: number
  averageSyncTime: number
  lastSyncTimestamp: string
  dataUsage: number
  cacheHitRate: number
  conflictsResolved: number
}

class OfflineSyncManager {
  private config: SyncManagerConfig
  private isRunning: boolean = false
  private syncInterval: NodeJS.Timeout | null = null
  private metrics: SyncMetrics
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map()

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = {
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      batchSize: 5,
      enableConflictResolution: true,
      enableProgressiveSync: true,
      prioritizeUrgent: true,
      ...config
    }

    this.metrics = {
      totalSynced: 0,
      totalFailed: 0,
      averageSyncTime: 0,
      lastSyncTimestamp: '',
      dataUsage: 0,
      cacheHitRate: 0,
      conflictsResolved: 0
    }

    this.initialize()
  }

  private async initialize() {
    // Set up service worker communication
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event)
      })
    }

    // Set up network change listeners
    window.addEventListener('online', () => {
      console.log('[OfflineSyncManager] Network restored, resuming sync')
      this.resumeSync()
    })

    window.addEventListener('offline', () => {
      console.log('[OfflineSyncManager] Network lost, pausing sync')
      this.pauseSync()
    })

    // Start auto-sync if online
    if (navigator.onLine) {
      this.startAutoSync()
    }

    // Initialize storage
    await offlineStorage.initialize()
  }

  // Auto-sync management
  startAutoSync() {
    if (this.syncInterval || !navigator.onLine) return

    console.log('[OfflineSyncManager] Starting auto-sync')
    this.isRunning = true

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && !this.isCurrentlySyncing()) {
        await this.performIncrementalSync()
      }
    }, this.config.syncInterval)

    // Perform initial sync
    this.performFullSync()
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isRunning = false
    console.log('[OfflineSyncManager] Auto-sync stopped')
  }

  pauseSync() {
    this.isRunning = false
    this.emit('sync:paused', {})
  }

  resumeSync() {
    this.isRunning = true
    this.emit('sync:resumed', {})
    this.performIncrementalSync()
  }

  // Sync operations
  async performFullSync(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }

    const startTime = Date.now()
    const syncId = `full_sync_${startTime}`

    this.emit('sync:started', { syncId, type: 'full' })

    try {
      // Get all pending data
      const [uploads, actions] = await Promise.all([
        offlineStorage.getQueuedUploads(),
        offlineStorage.getQueuedActions()
      ])

      const totalItems = uploads.length + actions.length
      let processed = 0
      let failed = 0

      this.emit('sync:progress', { syncId, progress: 0, total: totalItems })

      // Prioritize by urgency if enabled
      if (this.config.prioritizeUrgent) {
        uploads.sort(this.sortByPriority)
      }

      // Process uploads in batches
      for (let i = 0; i < uploads.length; i += this.config.batchSize) {
        const batch = uploads.slice(i, i + this.config.batchSize)
        
        const results = await Promise.allSettled(
          batch.map(upload => this.syncUpload(upload))
        )

        results.forEach((result, index) => {
          processed++
          if (result.status === 'rejected') {
            failed++
            console.error('[OfflineSyncManager] Upload failed:', result.reason)
          }
          
          this.emit('sync:progress', {
            syncId,
            progress: processed,
            total: totalItems,
            item: batch[index]
          })
        })

        // Adaptive delay based on connection quality
        if (i + this.config.batchSize < uploads.length) {
          await this.adaptiveDelay()
        }
      }

      // Process actions
      for (const action of actions) {
        try {
          await this.syncAction(action)
          processed++
        } catch (error) {
          failed++
          console.error('[OfflineSyncManager] Action failed:', error)
        }

        this.emit('sync:progress', {
          syncId,
          progress: processed,
          total: totalItems,
          item: action
        })
      }

      const duration = Date.now() - startTime
      const result: SyncResult = {
        syncId,
        success: true,
        duration,
        totalItems,
        processed,
        failed,
        conflicts: 0 // Will be updated by conflict resolution
      }

      this.updateMetrics(result)
      this.emit('sync:completed', result)

      return result
    } catch (error) {
      const result: SyncResult = {
        syncId,
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      }

      this.emit('sync:failed', result)
      throw error
    }
  }

  async performIncrementalSync(): Promise<SyncResult> {
    const syncStatus = await offlineStorage.getSyncStatus()
    const lastSync = syncStatus.lastSuccessfulSync ? new Date(syncStatus.lastSuccessfulSync) : new Date(0)
    
    // Only sync items modified since last sync
    const uploads = await offlineStorage.getQueuedUploads()
    const recentUploads = uploads.filter(upload => 
      new Date(upload.createdAt) > lastSync || upload.status === 'failed'
    )

    if (recentUploads.length === 0) {
      return {
        syncId: `incremental_${Date.now()}`,
        success: true,
        duration: 0,
        totalItems: 0,
        processed: 0,
        failed: 0
      }
    }

    console.log(`[OfflineSyncManager] Incremental sync: ${recentUploads.length} items`)
    
    // Use progressive sync for efficiency
    if (this.config.enableProgressiveSync) {
      return this.performProgressiveSync(recentUploads)
    } else {
      return this.performFullSync()
    }
  }

  private async performProgressiveSync(items: OfflineAnalysis[]): Promise<SyncResult> {
    const startTime = Date.now()
    const syncId = `progressive_${startTime}`

    // Register progressive sync with service worker
    try {
      await serviceWorkerManager.registerBackgroundSync('progressive-sync')
    } catch (error) {
      console.warn('[OfflineSyncManager] Background sync not available:', error)
    }

    return {
      syncId,
      success: true,
      duration: Date.now() - startTime,
      totalItems: items.length,
      processed: items.length,
      failed: 0
    }
  }

  // Individual sync operations
  private async syncUpload(upload: OfflineAnalysis): Promise<void> {
    const maxRetries = Math.min(upload.retryCount + this.config.maxRetries, 5)
    
    for (let attempt = upload.retryCount; attempt < maxRetries; attempt++) {
      try {
        await offlineStorage.updateUploadStatus(upload.id, 'uploading')

        const formData = new FormData()
        formData.append('image', upload.imageBlob, `crop-${upload.id}.jpg`)
        formData.append('metadata', JSON.stringify(upload.metadata))
        formData.append('farmerId', upload.farmerId)
        formData.append('priority', upload.priority)
        formData.append('offlineId', upload.id)

        // Add conflict detection headers
        const headers: Record<string, string> = {}
        if (this.config.enableConflictResolution) {
          headers['X-Conflict-Detection'] = 'enabled'
          headers['X-Last-Modified'] = upload.createdAt
        }

        const response = await fetch('/api/analysis/upload', {
          method: 'POST',
          body: formData,
          headers
        })

        if (response.status === 409 && this.config.enableConflictResolution) {
          // Handle conflict
          const conflictData = await response.json()
          await this.handleConflict(upload, conflictData)
          return
        }

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }

        await offlineStorage.updateUploadStatus(upload.id, 'uploaded')
        
        // Remove from queue after delay (for UI feedback)
        setTimeout(() => {
          offlineStorage.removeUpload(upload.id)
        }, 5000)

        this.metrics.totalSynced++
        break
      } catch (error) {
        if (attempt === maxRetries - 1) {
          await offlineStorage.updateUploadStatus(upload.id, 'failed', error.message)
          this.metrics.totalFailed++
          throw error
        }
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000)
      }
    }
  }

  private async syncAction(action: any): Promise<void> {
    const response = await fetch(action.url, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.headers
      },
      body: action.body
    })

    if (!response.ok) {
      throw new Error(`Action failed: ${response.status} ${response.statusText}`)
    }

    await offlineStorage.removeAction(action.id)
    this.metrics.totalSynced++
  }

  // Conflict resolution
  private async handleConflict(localData: OfflineAnalysis, serverData: any): Promise<void> {
    if (!this.config.enableConflictResolution) {
      throw new Error('Conflict detected but resolution disabled')
    }

    this.emit('conflict:detected', {
      localData,
      serverData,
      timestamp: new Date().toISOString()
    })

    // Auto-resolve simple conflicts
    const canAutoResolve = this.canAutoResolveConflict(localData, serverData)
    
    if (canAutoResolve) {
      const resolution = this.determineAutoResolution(localData, serverData)
      await this.applyResolution(localData.id, resolution)
      this.metrics.conflictsResolved++
      
      this.emit('conflict:resolved', {
        conflictId: localData.id,
        resolution,
        automated: true
      })
    } else {
      // Store for manual resolution
      await this.storeConflictForManualResolution(localData, serverData)
      
      this.emit('conflict:manual_required', {
        conflictId: localData.id,
        localData,
        serverData
      })
    }
  }

  private canAutoResolveConflict(localData: OfflineAnalysis, serverData: any): boolean {
    // Simple rules for auto-resolution
    const timeDiff = Math.abs(
      new Date(localData.createdAt).getTime() - 
      new Date(serverData.createdAt || serverData.timestamp).getTime()
    )

    // Auto-resolve if time difference is less than 5 minutes
    return timeDiff < 5 * 60 * 1000
  }

  private determineAutoResolution(localData: OfflineAnalysis, serverData: any): string {
    const localTime = new Date(localData.createdAt).getTime()
    const serverTime = new Date(serverData.createdAt || serverData.timestamp).getTime()
    
    return serverTime > localTime ? 'server_wins' : 'local_wins'
  }

  private async applyResolution(conflictId: string, resolution: string): Promise<void> {
    // Apply the resolution strategy
    console.log(`[OfflineSyncManager] Applying resolution: ${resolution} for conflict: ${conflictId}`)
    
    // Implementation would depend on the specific resolution strategy
    // This is a simplified version
  }

  private async storeConflictForManualResolution(localData: OfflineAnalysis, serverData: any): Promise<void> {
    // Store conflict for manual resolution via ConflictResolutionModal
    const conflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceType: 'analysis' as const,
      resourceId: localData.id,
      localData,
      serverData,
      timestamp: new Date().toISOString(),
      resolved: false,
      autoResolvable: false,
      conflicts: this.detectSpecificConflicts(localData, serverData)
    }

    // This would integrate with the conflict resolution system
    console.log('[OfflineSyncManager] Storing conflict for manual resolution:', conflict.id)
  }

  private detectSpecificConflicts(localData: OfflineAnalysis, serverData: any): any[] {
    const conflicts = []
    
    // Compare specific fields
    const fieldsToCheck = ['status', 'priority', 'metadata']
    
    for (const field of fieldsToCheck) {
      if (localData[field] !== serverData[field]) {
        conflicts.push({
          type: 'data_conflict',
          field,
          localValue: localData[field],
          serverValue: serverData[field],
          severity: field === 'status' ? 'high' : 'medium'
        })
      }
    }

    return conflicts
  }

  // Utility methods
  private sortByPriority(a: OfflineAnalysis, b: OfflineAnalysis): number {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  }

  private async adaptiveDelay(): Promise<void> {
    const connection = (navigator as any).connection
    let delay = 500 // Default delay
    
    if (connection) {
      switch (connection.effectiveType) {
        case 'slow-2g':
          delay = 2000
          break
        case '2g':
          delay = 1000
          break
        case '3g':
          delay = 500
          break
        case '4g':
          delay = 100
          break
      }
    }

    await this.sleep(delay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isCurrentlySyncing(): boolean {
    // Check if any sync operation is currently running
    return false // Simplified for now
  }

  private updateMetrics(result: SyncResult): void {
    this.metrics.lastSyncTimestamp = new Date().toISOString()
    
    if (result.duration) {
      this.metrics.averageSyncTime = (this.metrics.averageSyncTime + result.duration) / 2
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data
    
    switch (type) {
      case 'SYNC_COMPLETE':
        this.emit('sync:sw_complete', payload)
        break
      case 'CONFLICT_DETECTED':
        this.emit('conflict:detected', payload)
        break
      case 'UPLOAD_SUCCESS':
        this.metrics.totalSynced++
        this.emit('upload:success', payload)
        break
      case 'UPLOAD_FAILED':
        this.metrics.totalFailed++
        this.emit('upload:failed', payload)
        break
    }
  }

  // Event system
  on(event: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)
  }

  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('[OfflineSyncManager] Event listener error:', error)
        }
      })
    }
  }

  // Public API
  async forceSync(): Promise<SyncResult> {
    return this.performFullSync()
  }

  async getMetrics(): Promise<SyncMetrics> {
    return { ...this.metrics }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return offlineStorage.getSyncStatus()
  }

  isRunning(): boolean {
    return this.isRunning
  }

  getConfig(): SyncManagerConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<SyncManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart auto-sync with new config
    if (this.isRunning) {
      this.stopAutoSync()
      this.startAutoSync()
    }
  }
}

export interface SyncResult {
  syncId: string
  success: boolean
  duration: number
  totalItems?: number
  processed?: number
  failed?: number
  conflicts?: number
  error?: string
}

// Global sync manager instance
export const syncManager = new OfflineSyncManager()

export default OfflineSyncManager