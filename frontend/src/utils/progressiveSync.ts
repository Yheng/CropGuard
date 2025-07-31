// CropGuard Progressive Sync System
// Implements intelligent batching and priority-based synchronization for rural connectivity

import type { OfflineAnalysis, OfflineAction } from './offlineStorage'
import { offlineStorage } from './offlineStorage'

export interface SyncBatch {
  id: string
  items: (OfflineAnalysis | OfflineAction)[]
  priority: 'urgent' | 'high' | 'normal' | 'low'
  estimatedSize: number // bytes
  estimatedDuration: number // milliseconds
  createdAt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  maxRetries: number
}

export interface SyncStrategy {
  name: string
  maxBatchSize: number
  maxBatchDuration: number // max time to spend on a batch
  priorityWeights: Record<string, number>
  adaptiveSettings: {
    enabled: boolean
    connectionThresholds: {
      excellent: { batchSize: number; concurrency: number }
      good: { batchSize: number; concurrency: number }
      fair: { batchSize: number; concurrency: number }
      poor: { batchSize: number; concurrency: number }
    }
  }
}

export interface ProgressiveSyncConfig {
  strategy: SyncStrategy
  enableBackgroundSync: boolean
  maxConcurrentBatches: number
  retryDelayMs: number
  backoffMultiplier: number
  pauseOnPoorConnection: boolean
  respectDataSaver: boolean
}

export interface SyncProgress {
  totalItems: number
  completedItems: number
  failedItems: number
  currentBatch?: SyncBatch
  estimatedTimeRemaining: number
  averageSyncSpeed: number // items per second
  connectionQuality: string
  isPaused: boolean
}

const DEFAULT_STRATEGIES: Record<string, SyncStrategy> = {
  rural: {
    name: 'Rural Optimized',
    maxBatchSize: 3,
    maxBatchDuration: 30000, // 30 seconds
    priorityWeights: { urgent: 10, high: 5, normal: 2, low: 1 },
    adaptiveSettings: {
      enabled: true,
      connectionThresholds: {
        excellent: { batchSize: 5, concurrency: 3 },
        good: { batchSize: 3, concurrency: 2 },
        fair: { batchSize: 2, concurrency: 1 },
        poor: { batchSize: 1, concurrency: 1 }
      }
    }
  },
  urban: {
    name: 'Urban Optimized',
    maxBatchSize: 10,
    maxBatchDuration: 15000, // 15 seconds
    priorityWeights: { urgent: 8, high: 4, normal: 2, low: 1 },
    adaptiveSettings: {
      enabled: true,
      connectionThresholds: {
        excellent: { batchSize: 15, concurrency: 5 },
        good: { batchSize: 10, concurrency: 3 },
        fair: { batchSize: 5, concurrency: 2 },
        poor: { batchSize: 2, concurrency: 1 }
      }
    }
  },
  conservative: {
    name: 'Conservative',
    maxBatchSize: 1,
    maxBatchDuration: 60000, // 1 minute
    priorityWeights: { urgent: 10, high: 3, normal: 1, low: 0.5 },
    adaptiveSettings: {
      enabled: false,
      connectionThresholds: {
        excellent: { batchSize: 1, concurrency: 1 },
        good: { batchSize: 1, concurrency: 1 },
        fair: { batchSize: 1, concurrency: 1 },
        poor: { batchSize: 1, concurrency: 1 }
      }
    }
  }
}

class ProgressiveSyncManager {
  private config: ProgressiveSyncConfig
  private activeBatches: Map<string, SyncBatch> = new Map()
  private syncQueue: SyncBatch[] = []
  private syncProgress: SyncProgress
  private syncHistory: Array<{ timestamp: string; itemsProcessed: number; duration: number }> = []
  private isRunning: boolean = false
  private isPaused: boolean = false
  private listeners: Set<(progress: SyncProgress) => void> = new Set()

  constructor(config: Partial<ProgressiveSyncConfig> = {}) {
    this.config = {
      strategy: DEFAULT_STRATEGIES.rural,
      enableBackgroundSync: true,
      maxConcurrentBatches: 2,
      retryDelayMs: 2000,
      backoffMultiplier: 1.5,
      pauseOnPoorConnection: false,
      respectDataSaver: true,
      ...config
    }

    this.syncProgress = {
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      estimatedTimeRemaining: 0,
      averageSyncSpeed: 0,
      connectionQuality: 'unknown',
      isPaused: false
    }

    this.loadSyncHistory()
  }

  // Main sync orchestration
  async startProgressiveSync(): Promise<void> {
    if (this.isRunning) {
      console.log('[ProgressiveSync] Sync already running')
      return
    }

    this.isRunning = true
    this.isPaused = false

    try {
      console.log('[ProgressiveSync] Starting progressive sync')
      
      // Load pending items
      await this.loadPendingItems()
      
      // Create optimal batches
      await this.createSyncBatches()
      
      // Process batches
      await this.processSyncBatches()
      
      console.log('[ProgressiveSync] Progressive sync completed')
    } catch (error) {
      console.error('[ProgressiveSync] Sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
      this.updateProgress()
    }
  }

  async pauseSync(): Promise<void> {
    this.isPaused = true
    this.syncProgress.isPaused = true
    this.updateProgress()
    console.log('[ProgressiveSync] Sync paused')
  }

  async resumeSync(): Promise<void> {
    this.isPaused = false
    this.syncProgress.isPaused = false
    
    if (!this.isRunning && this.syncQueue.length > 0) {
      await this.startProgressiveSync()
    }
    
    this.updateProgress()
    console.log('[ProgressiveSync] Sync resumed')
  }

  // Batch creation and management
  private async loadPendingItems(): Promise<void> {
    const uploads = await offlineStorage.getQueuedUploads()
    const actions = await offlineStorage.getQueuedActions()
    
    this.syncProgress.totalItems = uploads.length + actions.length
    console.log(`[ProgressiveSync] Loaded ${this.syncProgress.totalItems} pending items`)
  }

  private async createSyncBatches(): Promise<void> {
    const uploads = await offlineStorage.getQueuedUploads()
    const actions = await offlineStorage.getQueuedActions()
    
    // Combine and sort by priority
    const allItems = [...uploads, ...actions].sort((a, b) => {
      const priorityA = this.config.strategy.priorityWeights[a.priority] || 1
      const priorityB = this.config.strategy.priorityWeights[b.priority] || 1
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority first
      }
      
      // Same priority: sort by creation time (older first)
      const aTime = (a as OfflineAnalysis).createdAt || (a as OfflineAction).timestamp || Date.now()
      const bTime = (b as OfflineAnalysis).createdAt || (b as OfflineAction).timestamp || Date.now()
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    // Get current connection quality for adaptive batching
    const connectionQuality = this.getCurrentConnectionQuality()
    const batchSettings = this.getBatchSettings(connectionQuality)
    
    this.syncQueue = []
    
    // Create batches based on priority and size constraints
    let currentBatch: (OfflineAnalysis | OfflineAction)[] = []
    let currentPriority: string | null = null
    let currentSize = 0
    
    for (const item of allItems) {
      // Start new batch if priority changes or size limit reached
      if (
        (currentPriority && item.priority !== currentPriority) ||
        currentBatch.length >= batchSettings.batchSize ||
        currentSize + this.estimateItemSize(item) > 5 * 1024 * 1024 // 5MB limit
      ) {
        if (currentBatch.length > 0) {
          this.syncQueue.push(this.createBatch(currentBatch, currentPriority || 'normal'))
          currentBatch = []
          currentSize = 0
        }
      }
      
      currentBatch.push(item)
      currentPriority = item.priority || 'normal'
      currentSize += this.estimateItemSize(item)
    }
    
    // Add final batch
    if (currentBatch.length > 0) {
      this.syncQueue.push(this.createBatch(currentBatch, currentPriority || 'normal'))
    }
    
    console.log(`[ProgressiveSync] Created ${this.syncQueue.length} sync batches`)
  }

  private createBatch(
    items: (OfflineAnalysis | OfflineAction)[],
    priority: string
  ): SyncBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: batchId,
      items,
      priority: priority as SyncBatch['priority'],
      estimatedSize: items.reduce((sum, item) => sum + this.estimateItemSize(item), 0),
      estimatedDuration: this.estimateBatchDuration(items),
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    }
  }

  private async processSyncBatches(): Promise<void> {
    const connectionQuality = this.getCurrentConnectionQuality()
    const batchSettings = this.getBatchSettings(connectionQuality)
    
    // Process batches with controlled concurrency
    while (this.syncQueue.length > 0 && !this.isPaused) {
      const concurrentBatches = Math.min(
        batchSettings.concurrency,
        this.config.maxConcurrentBatches,
        this.syncQueue.length
      )
      
      const batchPromises: Promise<void>[] = []
      
      for (let i = 0; i < concurrentBatches; i++) {
        const batch = this.syncQueue.shift()
        if (!batch) break
        
        this.activeBatches.set(batch.id, batch)
        batchPromises.push(this.processBatch(batch))
      }
      
      await Promise.allSettled(batchPromises)
      
      // Update progress
      this.updateProgress()
      
      // Adaptive delay between batch groups
      if (this.syncQueue.length > 0) {
        const delay = this.getAdaptiveDelay(connectionQuality)
        await this.sleep(delay)
      }
    }
  }

  private async processBatch(batch: SyncBatch): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`[ProgressiveSync] Processing batch ${batch.id} with ${batch.items.length} items`)
      
      batch.status = 'processing'
      this.syncProgress.currentBatch = batch
      this.updateProgress()
      
      // Process items in batch sequentially to avoid overwhelming the connection
      for (const item of batch.items) {
        if (this.isPaused) {
          console.log('[ProgressiveSync] Batch processing paused')
          return
        }
        
        try {
          await this.processItem(item)
          this.syncProgress.completedItems++
        } catch (error) {
          console.error(`[ProgressiveSync] Failed to process item ${item.id}:`, error)
          this.syncProgress.failedItems++
          
          // Update item status
          if ('farmerId' in item) {
            await offlineStorage.updateUploadStatus(item.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
          }
        }
        
        this.updateProgress()
      }
      
      batch.status = 'completed'
      const duration = Date.now() - startTime
      
      // Record performance metrics
      this.recordSyncMetrics(batch.items.length, duration)
      
    } catch (error) {
      console.error(`[ProgressiveSync] Batch ${batch.id} failed:`, error)
      batch.status = 'failed'
      
      // Retry logic
      if (batch.retryCount < batch.maxRetries) {
        batch.retryCount++
        batch.status = 'pending'
        
        const delay = this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, batch.retryCount)
        
        setTimeout(() => {
          if (!this.isPaused) {
            this.syncQueue.unshift(batch) // Add back to front of queue
          }
        }, delay)
      }
    } finally {
      this.activeBatches.delete(batch.id)
      this.syncProgress.currentBatch = undefined
    }
  }

  private async processItem(item: OfflineAnalysis | OfflineAction): Promise<void> {
    if ('farmerId' in item) {
      // Process upload
      await this.processUpload(item as OfflineAnalysis)
    } else {
      // Process action
      await this.processAction(item as OfflineAction)
    }
  }

  private async processUpload(upload: OfflineAnalysis): Promise<void> {
    const formData = new FormData()
    formData.append('image', upload.imageBlob, `crop-${upload.id}.jpg`)
    formData.append('metadata', JSON.stringify(upload.metadata))
    formData.append('farmerId', upload.farmerId)
    formData.append('priority', upload.priority)
    formData.append('offlineId', upload.id)

    const response = await fetch('/api/analyses', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    // Mark as uploaded
    await offlineStorage.updateUploadStatus(upload.id, 'uploaded')
    
    // Schedule cleanup
    setTimeout(() => {
      offlineStorage.removeUpload(upload.id)
    }, 5000)
  }

  private async processAction(action: OfflineAction): Promise<void> {
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

    // Remove successful action
    await offlineStorage.removeAction(action.id)
  }

  // Utility methods
  private getCurrentConnectionQuality(): string {
    const connection = (navigator as Navigator & { connection?: { effectiveType: string } }).connection
    if (!connection) return 'unknown'
    
    this.syncProgress.connectionQuality = connection.effectiveType || 'unknown'
    return this.syncProgress.connectionQuality
  }

  private getBatchSettings(connectionQuality: string) {
    const strategy = this.config.strategy
    
    if (!strategy.adaptiveSettings.enabled) {
      return {
        batchSize: strategy.maxBatchSize,
        concurrency: 1
      }
    }
    
    const thresholds = strategy.adaptiveSettings.connectionThresholds
    
    switch (connectionQuality) {
      case '4g':
        return thresholds.excellent
      case '3g':
        return thresholds.good
      case '2g':
        return thresholds.fair
      default:
        return thresholds.poor
    }
  }

  private estimateItemSize(item: OfflineAnalysis | OfflineAction): number {
    if ('farmerId' in item) {
      // Upload: estimate based on compressed size or default
      return (item as OfflineAnalysis).compressedSize || 1024 * 1024 // 1MB default
    } else {
      // Action: estimate based on body size
      const action = item as OfflineAction
      return action.body ? new Blob([action.body]).size : 1024 // 1KB default
    }
  }

  private estimateBatchDuration(items: (OfflineAnalysis | OfflineAction)[]): number {
    // Base estimate: 2 seconds per item + size-based calculation
    const baseTime = items.length * 2000
    const sizeTime = items.reduce((sum, item) => {
      const size = this.estimateItemSize(item)
      return sum + (size / (100 * 1024)) * 1000 // 100KB/s estimate
    }, 0)
    
    return baseTime + sizeTime
  }

  private getAdaptiveDelay(connectionQuality: string): number {
    switch (connectionQuality) {
      case '4g': return 100
      case '3g': return 500
      case '2g': return 1000
      default: return 2000
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private recordSyncMetrics(itemsProcessed: number, duration: number): void {
    this.syncHistory.push({
      timestamp: new Date().toISOString(),
      itemsProcessed,
      duration
    })
    
    // Keep only last 20 entries
    if (this.syncHistory.length > 20) {
      this.syncHistory = this.syncHistory.slice(-20)
    }
    
    // Update average sync speed
    if (this.syncHistory.length > 0) {
      const totalItems = this.syncHistory.reduce((sum, entry) => sum + entry.itemsProcessed, 0)
      const totalDuration = this.syncHistory.reduce((sum, entry) => sum + entry.duration, 0)
      
      this.syncProgress.averageSyncSpeed = totalItems / (totalDuration / 1000) // items per second
    }
    
    // Save to storage
    this.saveSyncHistory()
  }

  private updateProgress(): void {
    // Calculate estimated time remaining
    if (this.syncProgress.averageSyncSpeed > 0) {
      const remainingItems = this.syncProgress.totalItems - this.syncProgress.completedItems
      this.syncProgress.estimatedTimeRemaining = remainingItems / this.syncProgress.averageSyncSpeed * 1000
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.syncProgress })
      } catch (error) {
        console.error('[ProgressiveSync] Listener error:', error)
      }
    })
  }

  private loadSyncHistory(): void {
    try {
      const stored = localStorage.getItem('cropguard_sync_history')
      if (stored) {
        this.syncHistory = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('[ProgressiveSync] Failed to load sync history:', error)
    }
  }

  private saveSyncHistory(): void {
    try {
      localStorage.setItem('cropguard_sync_history', JSON.stringify(this.syncHistory))
    } catch (error) {
      console.warn('[ProgressiveSync] Failed to save sync history:', error)
    }
  }

  // Public API
  getProgress(): SyncProgress {
    return { ...this.syncProgress }
  }

  getActiveBatches(): SyncBatch[] {
    return Array.from(this.activeBatches.values())
  }

  getQueuedBatches(): SyncBatch[] {
    return [...this.syncQueue]
  }

  updateStrategy(strategyName: keyof typeof DEFAULT_STRATEGIES): void {
    if (DEFAULT_STRATEGIES[strategyName]) {
      this.config.strategy = DEFAULT_STRATEGIES[strategyName]
      console.log(`[ProgressiveSync] Strategy updated to: ${strategyName}`)
    }
  }

  addProgressListener(listener: (progress: SyncProgress) => void): () => void {
    this.listeners.add(listener)
    
    // Immediately notify with current progress
    listener({ ...this.syncProgress })
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  cleanup(): void {
    this.isPaused = true
    this.listeners.clear()
    this.activeBatches.clear()
    this.syncQueue = []
    this.saveSyncHistory()
  }
}

// Factory function
export function createProgressiveSyncManager(config?: Partial<ProgressiveSyncConfig>): ProgressiveSyncManager {
  return new ProgressiveSyncManager(config)
}

// Default strategies
export { DEFAULT_STRATEGIES }

export default ProgressiveSyncManager