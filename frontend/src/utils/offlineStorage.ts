// CropGuard Offline Storage System
// IndexedDB wrapper for offline data management in rural environments

export interface OfflineAnalysis {
  id: string
  farmerId: string
  imageBlob: Blob
  imageUrl: string
  metadata: {
    cropType: string
    location: string
    timestamp: string
    deviceInfo: {
      userAgent: string
      platform: string
      connection?: string
    }
    gpsCoordinates?: {
      latitude: number
      longitude: number
      accuracy: number
    }
    weatherConditions?: {
      temperature: number
      humidity: number
      description: string
    }
  }
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  retryCount: number
  lastRetry?: string
  createdAt: string
  uploadedAt?: string
  error?: string
  compressed: boolean
  originalSize: number
  compressedSize?: number
}

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'analysis' | 'user' | 'review' | 'setting'
  resourceId: string
  data: Record<string, unknown>
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  timestamp: string
  priority: number
  retryCount: number
  maxRetries: number
  lastAttempt?: string
  error?: string
}

export interface CachedData {
  key: string
  data: Record<string, unknown>
  timestamp: string
  expiresAt?: string
  version: number
  size: number
  compressed: boolean
}

export interface SyncStatus {
  lastSyncAttempt?: string
  lastSuccessfulSync?: string
  pendingUploads: number
  pendingActions: number
  failedUploads: number
  failedActions: number
  uploadedCount: number
  isOnline: boolean
  isSyncing: boolean
}

class OfflineStorageManager {
  private dbName = 'CropGuardOffline'
  private dbVersion = 2
  private db: IDBDatabase | null = null
  private isInitialized = false

  // Storage quotas for mobile devices
  private readonly MAX_STORAGE_SIZE = 200 * 1024 * 1024 // 200MB
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB per image
  private readonly _MAX_QUEUE_SIZE = 100 // Maximum queued items
  private readonly COMPRESSION_QUALITY = 0.8 // JPEG compression quality

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.db = await this.openDatabase()
      this.isInitialized = true
      
      // Clean up expired data on initialization
      await this.cleanupExpiredData()
      
      console.log('[OfflineStorage] Initialized successfully')
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize:', error)
      throw error
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        this.setupObjectStores(db, event.oldVersion)
      }
    })
  }

  private setupObjectStores(db: IDBDatabase) {
    // Upload queue for analysis images
    if (!db.objectStoreNames.contains('uploadQueue')) {
      const uploadStore = db.createObjectStore('uploadQueue', { 
        keyPath: 'id' 
      })
      uploadStore.createIndex('status', 'status', { unique: false })
      uploadStore.createIndex('priority', 'priority', { unique: false })
      uploadStore.createIndex('farmerId', 'farmerId', { unique: false })
      uploadStore.createIndex('createdAt', 'createdAt', { unique: false })
      uploadStore.createIndex('retryCount', 'retryCount', { unique: false })
    }

    // Offline actions queue
    if (!db.objectStoreNames.contains('offlineActions')) {
      const actionsStore = db.createObjectStore('offlineActions', { 
        keyPath: 'id' 
      })
      actionsStore.createIndex('type', 'type', { unique: false })
      actionsStore.createIndex('resource', 'resource', { unique: false })
      actionsStore.createIndex('priority', 'priority', { unique: false })
      actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
      actionsStore.createIndex('retryCount', 'retryCount', { unique: false })
    }

    // Cached API data
    if (!db.objectStoreNames.contains('cachedData')) {
      const cacheStore = db.createObjectStore('cachedData', { 
        keyPath: 'key' 
      })
      cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
      cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false })
      cacheStore.createIndex('size', 'size', { unique: false })
    }

    // User settings and preferences
    if (!db.objectStoreNames.contains('userSettings')) {
      const settingsStore = db.createObjectStore('userSettings', { 
        keyPath: 'key' 
      })
      settingsStore.createIndex('userId', 'userId', { unique: false })
      settingsStore.createIndex('lastModified', 'lastModified', { unique: false })
    }

    // Sync status tracking
    if (!db.objectStoreNames.contains('syncStatus')) {
      db.createObjectStore('syncStatus', { keyPath: 'id' })
    }
  }

  // Upload queue management
  async queueAnalysisUpload(
    farmerId: string, 
    imageFile: File, 
    metadata: OfflineAnalysis['metadata'],
    priority: OfflineAnalysis['priority'] = 'normal'
  ): Promise<string> {
    await this.ensureInitialized()

    // Check storage quota
    await this.checkStorageQuota()

    const id = this.generateId()
    
    // Compress image if needed
    const { blob: imageBlob, compressed, originalSize, compressedSize } = 
      await this.compressImage(imageFile)

    const analysis: OfflineAnalysis = {
      id,
      farmerId,
      imageBlob,
      imageUrl: URL.createObjectURL(imageBlob),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          connection: (navigator as Navigator & { connection?: { effectiveType: string } }).connection?.effectiveType || 'unknown'
        }
      },
      status: 'queued',
      priority,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      compressed,
      originalSize,
      compressedSize
    }

    const transaction = this.db!.transaction(['uploadQueue'], 'readwrite')
    const store = transaction.objectStore('uploadQueue')
    
    try {
      await this.promisifyRequest(store.add(analysis))
      console.log(`[OfflineStorage] Queued analysis upload: ${id}`)
      
      // Trigger sync if online
      if (navigator.onLine) {
        this.requestBackgroundSync('upload-analysis')
      }
      
      return id
    } catch (error) {
      console.error('[OfflineStorage] Failed to queue upload:', error)
      throw error
    }
  }

  async getQueuedUploads(status?: OfflineAnalysis['status']): Promise<OfflineAnalysis[]> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['uploadQueue'], 'readonly')
    const store = transaction.objectStore('uploadQueue')
    
    if (status) {
      const index = store.index('status')
      return this.promisifyRequest(index.getAll(status))
    }
    
    return this.promisifyRequest(store.getAll())
  }

  async updateUploadStatus(
    id: string, 
    status: OfflineAnalysis['status'], 
    error?: string
  ): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['uploadQueue'], 'readwrite')
    const store = transaction.objectStore('uploadQueue')
    
    const analysis = await this.promisifyRequest(store.get(id))
    if (!analysis) {
      throw new Error(`Upload not found: ${id}`)
    }

    analysis.status = status
    analysis.lastRetry = new Date().toISOString()
    
    if (status === 'failed') {
      analysis.error = error
      analysis.retryCount += 1
    } else if (status === 'uploaded') {
      analysis.uploadedAt = new Date().toISOString()
    }

    await this.promisifyRequest(store.put(analysis))
  }

  async removeUpload(id: string): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['uploadQueue'], 'readwrite')
    const store = transaction.objectStore('uploadQueue')
    
    // Get the analysis to clean up blob URL
    const analysis = await this.promisifyRequest(store.get(id))
    if (analysis?.imageUrl) {
      URL.revokeObjectURL(analysis.imageUrl)
    }
    
    await this.promisifyRequest(store.delete(id))
  }

  // Offline actions management
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'lastAttempt'>): Promise<string> {
    await this.ensureInitialized()

    const id = this.generateId()
    const offlineAction: OfflineAction = {
      ...action,
      id,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3
    }

    const transaction = this.db!.transaction(['offlineActions'], 'readwrite')
    const store = transaction.objectStore('offlineActions')
    
    await this.promisifyRequest(store.add(offlineAction))
    
    // Trigger sync if online
    if (navigator.onLine) {
      this.requestBackgroundSync('sync-data')
    }
    
    return id
  }

  async getQueuedActions(resource?: string): Promise<OfflineAction[]> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['offlineActions'], 'readonly')
    const store = transaction.objectStore('offlineActions')
    
    if (resource) {
      const index = store.index('resource')
      return this.promisifyRequest(index.getAll(resource))
    }
    
    return this.promisifyRequest(store.getAll())
  }

  async removeAction(id: string): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['offlineActions'], 'readwrite')
    const store = transaction.objectStore('offlineActions')
    
    await this.promisifyRequest(store.delete(id))
  }

  // Cached data management
  async setCachedData(
    key: string, 
    data: Record<string, unknown>, 
    expirationHours: number = 24
  ): Promise<void> {
    await this.ensureInitialized()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000)
    
    // Compress data if it's large
    const serialized = JSON.stringify(data)
    const compressed = serialized.length > 10240 // Compress if >10KB
    const finalData = compressed ? await this.compressString(serialized) : serialized
    
    const cachedData: CachedData = {
      key,
      data: typeof finalData === 'string' ? finalData : finalData as Record<string, unknown>,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      version: 1,
      size: new Blob([typeof finalData === 'string' ? finalData : JSON.stringify(finalData)]).size,
      compressed
    }

    const transaction = this.db!.transaction(['cachedData'], 'readwrite')
    const store = transaction.objectStore('cachedData')
    
    await this.promisifyRequest(store.put(cachedData))
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['cachedData'], 'readonly')
    const store = transaction.objectStore('cachedData')
    
    const cached = await this.promisifyRequest(store.get(key)) as CachedData
    if (!cached) return null

    // Check expiration
    if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
      // Remove expired data
      const deleteTransaction = this.db!.transaction(['cachedData'], 'readwrite')
      const deleteStore = deleteTransaction.objectStore('cachedData')
      await this.promisifyRequest(deleteStore.delete(key))
      return null
    }

    // Decompress if needed
    let data = cached.data
    if (cached.compressed && typeof cached.data === 'string') {
      data = await this.decompressString(cached.data)
    }

    return typeof data === 'string' ? JSON.parse(data) : data as T
  }

  async clearCachedData(keyPattern?: string): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['cachedData'], 'readwrite')
    const store = transaction.objectStore('cachedData')
    
    if (keyPattern) {
      const keys = await this.promisifyRequest(store.getAllKeys()) as string[]
      const matchingKeys = keys.filter(key => key.includes(keyPattern))
      
      for (const key of matchingKeys) {
        await this.promisifyRequest(store.delete(key))
      }
    } else {
      await this.promisifyRequest(store.clear())
    }
  }

  // Sync status management
  async getSyncStatus(): Promise<SyncStatus> {
    await this.ensureInitialized()

    const [uploads, actions] = await Promise.all([
      this.getQueuedUploads(),
      this.getQueuedActions()
    ])

    const pendingUploads = uploads.filter(u => u.status === 'queued').length
    const failedUploads = uploads.filter(u => u.status === 'failed').length
    const pendingActions = actions.length
    const failedActions = actions.filter(a => a.retryCount >= a.maxRetries).length

    const transaction = this.db!.transaction(['syncStatus'], 'readonly')
    const store = transaction.objectStore('syncStatus')
    const stored = await this.promisifyRequest(store.get('main')) || {}

    return {
      lastSyncAttempt: stored.lastSyncAttempt,
      lastSuccessfulSync: stored.lastSuccessfulSync,
      pendingUploads,
      pendingActions,
      failedUploads,
      failedActions,
      uploadedCount: stored.uploadedCount || 0,
      isOnline: navigator.onLine,
      isSyncing: stored.isSyncing || false
    }
  }

  async updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['syncStatus'], 'readwrite')
    const store = transaction.objectStore('syncStatus')
    
    const current = await this.promisifyRequest(store.get('main')) || {}
    const updated = { ...current, ...status, id: 'main' }
    
    await this.promisifyRequest(store.put(updated))
  }

  // Storage management
  async getStorageUsage(): Promise<{
    used: number
    available: number
    quota: number
    breakdown: Record<string, number>
  }> {
    await this.ensureInitialized()

    const breakdown: Record<string, number> = {}
    let totalUsed = 0

    // Get size of each object store
    const storeNames = ['uploadQueue', 'offlineActions', 'cachedData', 'userSettings']
    
    for (const storeName of storeNames) {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const all = await this.promisifyRequest(store.getAll())
      
      const storeSize = all.reduce((size, item) => {
        return size + this.estimateObjectSize(item)
      }, 0)
      
      breakdown[storeName] = storeSize
      totalUsed += storeSize
    }

    // Get storage quota
    let quota = this.MAX_STORAGE_SIZE
    let available = quota - totalUsed

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        quota = estimate.quota || quota
        available = (estimate.quota || quota) - (estimate.usage || totalUsed)
      } catch (error) {
        console.warn('[OfflineStorage] Could not get storage estimate:', error)
      }
    }

    return {
      used: totalUsed,
      available: available,
      quota,
      breakdown
    }
  }

  async cleanupStorage(): Promise<void> {
    await this.ensureInitialized()

    // Remove expired cached data
    await this.cleanupExpiredData()

    // Remove old failed uploads (older than 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const uploads = await this.getQueuedUploads('failed')
    
    for (const upload of uploads) {
      if (new Date(upload.createdAt) < weekAgo) {
        await this.removeUpload(upload.id)
      }
    }

    // Remove old completed actions
    const actions = await this.getQueuedActions()
    const oldActions = actions.filter(a => 
      new Date(a.timestamp) < weekAgo && a.retryCount >= a.maxRetries
    )
    
    for (const action of oldActions) {
      await this.removeAction(action.id)
    }

    console.log('[OfflineStorage] Storage cleanup completed')
  }

  // Utility methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async compressImage(file: File): Promise<{
    blob: Blob
    compressed: boolean
    originalSize: number
    compressedSize: number
  }> {
    const originalSize = file.size
    
    // Don't compress if already small or not an image
    if (originalSize <= this.MAX_IMAGE_SIZE || !file.type.startsWith('image/')) {
      return {
        blob: file,
        compressed: false,
        originalSize,
        compressedSize: originalSize
      }
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080 for mobile)
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob!,
              compressed: true,
              originalSize,
              compressedSize: blob!.size
            })
          },
          'image/jpeg',
          this.COMPRESSION_QUALITY
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private async compressString(str: string): Promise<string> {
    // Simple compression using gzip (if available) or base64
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      writer.write(new TextEncoder().encode(str))
      writer.close()
      
      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }
      
      return btoa(String.fromCharCode(...compressed))
    }
    
    // Fallback: just return the string
    return str
  }

  private async decompressString(compressed: string): Promise<string> {
    if ('DecompressionStream' in window) {
      try {
        const bytes = Uint8Array.from(atob(compressed), c => c.charCodeAt(0))
        const stream = new DecompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(bytes)
        writer.close()
        
        const chunks: Uint8Array[] = []
        let done = false
        
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) chunks.push(value)
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        
        for (const chunk of chunks) {
          decompressed.set(chunk, offset)
          offset += chunk.length
        }
        
        return new TextDecoder().decode(decompressed)
      } catch (error) {
        console.warn('[OfflineStorage] Decompression failed, returning as-is:', error)
      }
    }
    
    return compressed
  }

  private estimateObjectSize(obj: unknown): number {
    const str = JSON.stringify(obj)
    return new Blob([str]).size
  }

  private async cleanupExpiredData(): Promise<void> {
    const transaction = this.db!.transaction(['cachedData'], 'readwrite')
    const store = transaction.objectStore('cachedData')
    const index = store.index('expiresAt')
    
    const now = new Date().toISOString()
    const expired = await this.promisifyRequest(
      index.getAll(IDBKeyRange.upperBound(now))
    )
    
    for (const item of expired) {
      await this.promisifyRequest(store.delete(item.key))
    }
  }

  private async checkStorageQuota(): Promise<void> {
    const usage = await this.getStorageUsage()
    
    if (usage.used > usage.quota * 0.9) {
      console.warn('[OfflineStorage] Storage quota almost exceeded, cleaning up...')
      await this.cleanupStorage()
    }
  }

  private requestBackgroundSync(tag: string): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register(tag)
      }).catch(error => {
        console.warn('[OfflineStorage] Background sync not available:', error)
      })
    }
  }

  // Clean up resources
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.isInitialized = false
  }
}

// Global instance
export const offlineStorage = new OfflineStorageManager()

// Initialize on import
if (typeof window !== 'undefined') {
  offlineStorage.initialize().catch(error => {
    console.error('[OfflineStorage] Failed to initialize:', error)
  })
}

export default offlineStorage