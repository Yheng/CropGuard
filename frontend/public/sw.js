// CropGuard Service Worker - Offline-First Image Caching
// Optimized for rural farmers with intermittent connectivity

const CACHE_NAME = 'cropguard-v1.0.0'
const API_CACHE_NAME = 'cropguard-api-v1.0.0'
const IMAGES_CACHE_NAME = 'cropguard-images-v1.0.0'
const OFFLINE_CACHE_NAME = 'cropguard-offline-v1.0.0'

// Cache size limits (important for mobile devices with limited storage)
const MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB total
const MAX_IMAGE_CACHE_SIZE = 50 * 1024 * 1024 // 50MB for images
const MAX_API_CACHE_SIZE = 10 * 1024 * 1024 // 10MB for API responses

// URLs to cache immediately for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  // Essential farmer dashboard assets
  '/farmer/dashboard',
  '/farmer/upload',
  // Critical UI assets
  '/static/images/logo.png',
  '/static/images/icons/offline.svg',
  '/static/images/icons/sync.svg'
]

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/user\/profile/,
  /\/api\/analyses\/recent/,
  /\/api\/crop-types/,
  /\/api\/weather\/current/,
  /\/api\/settings/
]

// Background sync tags for different operations
const SYNC_TAGS = {
  UPLOAD_ANALYSIS: 'upload-analysis',
  SYNC_DATA: 'sync-data',
  SEND_REVIEW: 'send-review'
}

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('[CropGuard SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('[CropGuard SW] Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      }),
      
      // Initialize offline storage
      initializeOfflineStorage(),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[CropGuard SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim(),
      
      // Initialize background sync
      initializeBackgroundSync()
    ])
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests for caching (except for offline queue)
  if (request.method !== 'GET') {
    if (shouldQueueRequest(request)) {
      event.respondWith(handleOfflineRequest(request))
    }
    return
  }
  
  // Handle different resource types with appropriate strategies
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request))
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

// Background sync for upload operations
self.addEventListener('sync', event => {
  console.log('[CropGuard SW] Background sync triggered:', event.tag)
  
  switch (event.tag) {
    case SYNC_TAGS.UPLOAD_ANALYSIS:
      event.waitUntil(syncAnalysisUploads())
      break
    case SYNC_TAGS.SYNC_DATA:
      event.waitUntil(syncOfflineData())
      break
    case SYNC_TAGS.SEND_REVIEW:
      event.waitUntil(syncReviewData())
      break
    case 'progressive-sync':
      event.waitUntil(performProgressiveSync())
      break
    case 'priority-sync-urgent':
      event.waitUntil(syncByPriority('urgent'))
      break
    case 'priority-sync-high':
      event.waitUntil(syncByPriority('high'))
      break
    case 'priority-sync-normal':
      event.waitUntil(syncByPriority('normal'))
      break
    default:
      // Handle dynamic priority sync tags
      if (event.tag.startsWith('priority-sync-')) {
        const priority = event.tag.replace('priority-sync-', '')
        event.waitUntil(syncByPriority(priority))
      } else {
        console.log('[CropGuard SW] Unknown sync tag:', event.tag)
      }
  }
})

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'CACHE_IMAGE':
      handleCacheImageMessage(payload)
      break
    case 'CLEAR_CACHE':
      handleClearCacheMessage(payload)
      break
    case 'GET_CACHE_SIZE':
      handleGetCacheSizeMessage(event.ports[0])
      break
    case 'FORCE_SYNC':
      handleForceSyncMessage(payload)
      break
    default:
      console.log('[CropGuard SW] Unknown message type:', type)
  }
})

// Cache management functions
async function cleanupOldCaches() {
  const cacheNames = await caches.keys()
  const currentCaches = [CACHE_NAME, API_CACHE_NAME, IMAGES_CACHE_NAME, OFFLINE_CACHE_NAME]
  
  return Promise.all(
    cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => {
        console.log('[CropGuard SW] Deleting old cache:', cacheName)
        return caches.delete(cacheName)
      })
  )
}

async function maintainCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  
  let currentSize = 0
  const sizePromises = keys.map(async request => {
    const response = await cache.match(request)
    const size = await estimateResponseSize(response)
    return { request, size }
  })
  
  const requestSizes = await Promise.all(sizePromises)
  currentSize = requestSizes.reduce((total, item) => total + item.size, 0)
  
  if (currentSize > maxSize) {
    // Sort by last access time (LRU eviction)
    requestSizes.sort((a, b) => {
      // In a real implementation, you'd track access times
      // For now, we'll use a simple approach
      return Math.random() - 0.5
    })
    
    while (currentSize > maxSize && requestSizes.length > 0) {
      const item = requestSizes.shift()
      await cache.delete(item.request)
      currentSize -= item.size
      console.log('[CropGuard SW] Evicted from cache:', item.request.url)
    }
  }
}

// Request handling strategies
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE_NAME)
  
  // Try cache first (Cache First strategy for images)
  let response = await cache.match(request)
  
  if (!response) {
    try {
      // Fetch from network
      response = await fetch(request)
      
      if (response.status === 200) {
        // Clone and cache the response
        const responseClone = response.clone()
        await cache.put(request, responseClone)
        
        // Maintain cache size
        await maintainCacheSize(IMAGES_CACHE_NAME, MAX_IMAGE_CACHE_SIZE)
      }
    } catch (error) {
      console.log('[CropGuard SW] Network failed for image:', request.url)
      // Return placeholder image for failed loads
      return await caches.match('/static/images/placeholder-crop.jpg')
    }
  }
  
  return response || await caches.match('/static/images/placeholder-crop.jpg')
}

async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME)
  const url = new URL(request.url)
  
  // Check if this API endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (!shouldCache) {
    try {
      return await fetch(request)
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Network unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  // Network First strategy for API requests
  try {
    const response = await fetch(request)
    
    if (response.status === 200) {
      // Cache successful responses
      const responseClone = response.clone()
      await cache.put(request, responseClone)
      
      // Maintain cache size
      await maintainCacheSize(API_CACHE_NAME, MAX_API_CACHE_SIZE)
    }
    
    return response
  } catch (error) {
    console.log('[CropGuard SW] Network failed for API:', request.url)
    
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone()
      response.headers.set('X-Served-From', 'cache')
      return response
    }
    
    // Return offline response
    return new Response(JSON.stringify({ 
      error: 'Offline - data not available',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  // Cache First strategy for static assets
  let response = await cache.match(request)
  
  if (!response) {
    try {
      response = await fetch(request)
      if (response.status === 200) {
        const responseClone = response.clone()
        await cache.put(request, responseClone)
      }
    } catch (error) {
      console.log('[CropGuard SW] Failed to fetch static asset:', request.url)
    }
  }
  
  return response
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first for navigation
    const response = await fetch(request)
    return response
  } catch (error) {
    console.log('[CropGuard SW] Navigation failed, serving from cache')
    
    // Fallback to cached page or offline page
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Serve offline page
    return await cache.match('/offline.html')
  }
}

// Offline request handling
async function handleOfflineRequest(request) {
  if (navigator.onLine) {
    try {
      return await fetch(request)
    } catch (error) {
      // Network failed, queue for later
    }
  }
  
  // Queue request for background sync
  await queueOfflineRequest(request)
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Request queued for when online',
    queued: true
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Background sync functions
async function syncAnalysisUploads() {
  console.log('[CropGuard SW] Syncing analysis uploads...')
  
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['uploadQueue'], 'readonly')
    const store = transaction.objectStore('uploadQueue')
    const uploads = await getAllFromStore(store)
    
    for (const upload of uploads) {
      try {
        const formData = new FormData()
        formData.append('image', upload.imageBlob)
        formData.append('metadata', JSON.stringify(upload.metadata))
        
        const response = await fetch('/api/analyses', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          // Remove from queue
          await removeFromUploadQueue(upload.id)
          
          // Notify main thread
          await notifyClients('UPLOAD_SUCCESS', { 
            uploadId: upload.id,
            analysisId: (await response.json()).id 
          })
        }
      } catch (error) {
        console.error('[CropGuard SW] Failed to sync upload:', error)
      }
    }
  } catch (error) {
    console.error('[CropGuard SW] Sync analysis uploads failed:', error)
  }
}

async function syncOfflineData() {
  console.log('[CropGuard SW] Syncing offline data...')
  
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['offlineActions'], 'readonly')
    const store = transaction.objectStore('offlineActions')
    const actions = await getAllFromStore(store)
    
    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        if (response.ok) {
          await removeFromOfflineQueue(action.id)
          await notifyClients('SYNC_SUCCESS', { actionId: action.id })
        }
      } catch (error) {
        console.error('[CropGuard SW] Failed to sync action:', error)
      }
    }
  } catch (error) {
    console.error('[CropGuard SW] Sync offline data failed:', error)
  }
}

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(request.url)
}

function isAPIRequest(request) {
  return request.url.includes('/api/')
}

function isStaticAsset(request) {
  return request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'font' ||
         /\.(js|css|woff|woff2|ttf|eot)$/i.test(request.url)
}

function shouldQueueRequest(request) {
  // Queue POST/PUT/DELETE requests when offline
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
         request.url.includes('/api/')
}

async function estimateResponseSize(response) {
  if (!response) return 0
  
  try {
    const clone = response.clone()
    const arrayBuffer = await clone.arrayBuffer()
    return arrayBuffer.byteLength
  } catch (error) {
    return 0
  }
}

async function initializeOfflineStorage() {
  // Initialize IndexedDB for offline operations
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CropGuardOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Upload queue store
      if (!db.objectStoreNames.contains('uploadQueue')) {
        const uploadStore = db.createObjectStore('uploadQueue', { keyPath: 'id', autoIncrement: true })
        uploadStore.createIndex('timestamp', 'timestamp', { unique: false })
        uploadStore.createIndex('priority', 'priority', { unique: false })
      }
      
      // Offline actions store
      if (!db.objectStoreNames.contains('offlineActions')) {
        const actionsStore = db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true })
        actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
        actionsStore.createIndex('type', 'type', { unique: false })
      }
      
      // Cached data store
      if (!db.objectStoreNames.contains('cachedData')) {
        const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' })
        cacheStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false })
      }
    }
  })
}

async function initializeBackgroundSync() {
  // Register background sync events
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await self.registration
      
      // Register periodic sync for data updates (if supported)
      if ('periodicSync' in registration) {
        await registration.periodicSync.register('sync-data', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        })
      }
    } catch (error) {
      console.log('[CropGuard SW] Background sync not supported')
    }
  }
}

async function queueOfflineRequest(request) {
  const db = await openOfflineDB()
  const transaction = db.transaction(['offlineActions'], 'readwrite')
  const store = transaction.objectStore('offlineActions')
  
  const action = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
    type: 'api_request'
  }
  
  await store.add(action)
}

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CropGuardOffline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function removeFromUploadQueue(id) {
  const db = await openOfflineDB()
  const transaction = db.transaction(['uploadQueue'], 'readwrite')
  const store = transaction.objectStore('uploadQueue')
  await store.delete(id)
}

async function removeFromOfflineQueue(id) {
  const db = await openOfflineDB()
  const transaction = db.transaction(['offlineActions'], 'readwrite')
  const store = transaction.objectStore('offlineActions')
  await store.delete(id)
}

async function notifyClients(type, payload) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type, payload })
  })
}

// Message handlers
async function handleCacheImageMessage(payload) {
  const { url, priority = 'normal' } = payload
  
  try {
    const cache = await caches.open(IMAGES_CACHE_NAME)
    const response = await fetch(url)
    
    if (response.ok) {
      await cache.put(url, response)
      await maintainCacheSize(IMAGES_CACHE_NAME, MAX_IMAGE_CACHE_SIZE)
    }
  } catch (error) {
    console.error('[CropGuard SW] Failed to cache image:', error)
  }
}

async function handleClearCacheMessage(payload) {
  const { cacheType } = payload
  
  try {
    if (cacheType === 'all') {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    } else {
      await caches.delete(cacheType)
    }
  } catch (error) {
    console.error('[CropGuard SW] Failed to clear cache:', error)
  }
}

async function handleGetCacheSizeMessage(port) {
  try {
    const cacheNames = await caches.keys()
    const sizes = {}
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      let size = 0
      
      for (const request of keys) {
        const response = await cache.match(request)
        size += await estimateResponseSize(response)
      }
      
      sizes[cacheName] = size
    }
    
    port.postMessage({ type: 'CACHE_SIZE_RESULT', payload: sizes })
  } catch (error) {
    port.postMessage({ type: 'CACHE_SIZE_ERROR', payload: error.message })
  }
}

async function handleForceSyncMessage(payload) {
  const { syncType } = payload
  
  try {
    switch (syncType) {
      case 'uploads':
        await syncAnalysisUploads()
        break
      case 'data':
        await syncOfflineData()
        break
      default:
        await syncAnalysisUploads()
        await syncOfflineData()
    }
    
    await notifyClients('FORCE_SYNC_COMPLETE', { syncType })
  } catch (error) {
    await notifyClients('FORCE_SYNC_ERROR', { syncType, error: error.message })
  }
}

// Enhanced background sync functions for progressive sync

async function performProgressiveSync() {
  console.log('[CropGuard SW] Starting progressive sync')
  
  try {
    const db = await initializeOfflineStorage()
    
    // Get all pending uploads and actions sorted by priority
    const uploads = await getAllFromStore(db, 'uploadQueue')
    const actions = await getAllFromStore(db, 'offlineActions')
    
    // Combine and sort by priority
    const allItems = [...uploads, ...actions].sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
      const priorityA = priorityOrder[a.priority] || 1
      const priorityB = priorityOrder[b.priority] || 1
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority first
      }
      
      // Same priority: sort by timestamp (older first)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
    
    // Process items in adaptive batches
    const connectionQuality = getConnectionQuality()
    const batchSize = getOptimalBatchSize(connectionQuality)
    
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (item) => {
        try {
          if (item.imageBlob) {
            await syncSingleUpload(item)
          } else {
            await syncSingleAction(item)
          }
        } catch (error) {
          console.error('[CropGuard SW] Failed to sync item:', error)
          await incrementRetryCount(db, item)
        }
      }))
      
      // Adaptive delay between batches
      if (i + batchSize < allItems.length) {
        await new Promise(resolve => setTimeout(resolve, getAdaptiveDelay(connectionQuality)))
      }
    }
    
    await notifyClients('PROGRESSIVE_SYNC_COMPLETE', { itemsProcessed: allItems.length })
    
  } catch (error) {
    console.error('[CropGuard SW] Progressive sync failed:', error)
    await notifyClients('PROGRESSIVE_SYNC_ERROR', { error: error.message })
  }
}

async function syncByPriority(priority) {
  console.log(`[CropGuard SW] Starting priority sync for: ${priority}`)
  
  try {
    const db = await initializeOfflineStorage()
    
    // Get items with specific priority
    const uploads = await getItemsByPriority(db, 'uploadQueue', priority)
    const actions = await getItemsByPriority(db, 'offlineActions', priority)
    
    const items = [...uploads, ...actions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    let processedCount = 0
    let failedCount = 0
    
    for (const item of items) {
      try {
        if (item.imageBlob) {
          await syncSingleUpload(item)
        } else {
          await syncSingleAction(item)
        }
        processedCount++
      } catch (error) {
        console.error('[CropGuard SW] Failed to sync priority item:', error)
        failedCount++
        await incrementRetryCount(db, item)
      }
    }
    
    await notifyClients('PRIORITY_SYNC_COMPLETE', { 
      priority, 
      processed: processedCount, 
      failed: failedCount 
    })
    
  } catch (error) {
    console.error(`[CropGuard SW] Priority sync failed for ${priority}:`, error)
    await notifyClients('PRIORITY_SYNC_ERROR', { priority, error: error.message })
  }
}

async function syncSingleUpload(upload) {
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

  // Remove successful upload
  const db = await initializeOfflineStorage()
  await removeFromStore(db, 'uploadQueue', upload.id)
  
  await notifyClients('UPLOAD_SUCCESS', { 
    uploadId: upload.id, 
    analysisId: response.headers.get('X-Analysis-ID') 
  })
}

async function syncSingleAction(action) {
  const response = await fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: action.body
  })

  if (!response.ok) {
    throw new Error(`Action failed: ${response.status} ${response.statusText}`)
  }

  // Remove successful action
  const db = await initializeOfflineStorage()
  await removeFromStore(db, 'offlineActions', action.id)
  
  await notifyClients('ACTION_SUCCESS', { actionId: action.id })
}

// Utility functions for progressive sync

function getConnectionQuality() {
  // Estimate connection quality (simplified for service worker context)
  return 'good' // Default assumption, real implementation would use performance metrics
}

function getOptimalBatchSize(connectionQuality) {
  switch (connectionQuality) {
    case 'excellent': return 5
    case 'good': return 3
    case 'fair': return 2
    case 'poor': return 1
    default: return 2
  }
}

function getAdaptiveDelay(connectionQuality) {
  switch (connectionQuality) {
    case 'excellent': return 100
    case 'good': return 500
    case 'fair': return 1000
    case 'poor': return 2000
    default: return 1000
  }
}

async function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getItemsByPriority(db, storeName, priority) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('priority')
    const request = index.getAll(priority)
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removeFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function incrementRetryCount(db, item) {
  const retryCount = (item.retryCount || 0) + 1
  const maxRetries = item.maxRetries || 3
  
  if (retryCount >= maxRetries) {
    // Mark as permanently failed
    item.status = 'failed'
    item.error = 'Max retries exceeded'
  } else {
    item.retryCount = retryCount
    item.status = 'queued'
  }
  
  // Update item in store
  const storeName = item.imageBlob ? 'uploadQueue' : 'offlineActions'
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

console.log('[CropGuard SW] Service worker loaded and ready')