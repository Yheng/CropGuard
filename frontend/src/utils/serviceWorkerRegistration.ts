// Service Worker Registration with Enhanced Offline Sync
// Handles registration, updates, and communication with the service worker

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
)

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onOfflineReady?: () => void
  onMessage?: (event: MessageEvent) => void
}

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(window.location.href)
    if (publicUrl.origin !== window.location.origin) {
      return
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config)
        navigator.serviceWorker.ready.then(() => {
          console.log(
            '[ServiceWorker] This web app is being served cache-first by a service worker for offline use.'
          )
          config?.onOfflineReady?.()
        })
      } else {
        registerValidServiceWorker(swUrl, config)
      }
    })
  }
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[ServiceWorker] Registered successfully')
      
      // Set up message listener
      if (config?.onMessage) {
        navigator.serviceWorker.addEventListener('message', config.onMessage)
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing
        if (installingWorker == null) {
          return
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[ServiceWorker] New content available, will reload automatically')
              config?.onUpdate?.(registration)
              
              // Auto-update for enhanced offline sync
              if (window.confirm('New version available. Update now?')) {
                installingWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            } else {
              console.log('[ServiceWorker] Content cached for offline use')
              config?.onSuccess?.(registration)
              config?.onOfflineReady?.()
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error('[ServiceWorker] Registration failed:', error)
    })
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type')
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload()
          })
        })
      } else {
        registerValidServiceWorker(swUrl, config)
      }
    })
    .catch(() => {
      console.log('[ServiceWorker] No internet connection found. App is running in offline mode.')
      config?.onOfflineReady?.()
    })
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
        console.log('[ServiceWorker] Unregistered successfully')
      })
      .catch((error) => {
        console.error('[ServiceWorker] Unregistration failed:', error)
      })
  }
}

// Enhanced service worker communication
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private isReady = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready
        this.isReady = true
        console.log('[ServiceWorkerManager] Ready')
      } catch (error) {
        console.error('[ServiceWorkerManager] Failed to initialize:', error)
      }
    }
  }

  async sendMessage(message: any): Promise<any> {
    if (!this.isReady || !this.registration?.active) {
      throw new Error('Service worker not ready')
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      const timeout = setTimeout(() => {
        reject(new Error('Service worker message timeout'))
      }, 10000)

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout)
        resolve(event.data)
      }

      this.registration!.active!.postMessage(message, [channel.port2])
    })
  }

  async forceSync(syncType: 'all' | 'uploads' | 'data' = 'all'): Promise<void> {
    if (!this.isReady || !this.registration?.active) {
      throw new Error('Service worker not ready')
    }

    this.registration.active.postMessage({
      type: 'FORCE_SYNC',
      payload: { syncType }
    })
  }

  async getCacheSize(): Promise<Record<string, number>> {
    return this.sendMessage({ type: 'GET_CACHE_SIZE' })
  }

  async clearCache(cacheType: 'all' | 'static' | 'api' | 'images' = 'all'): Promise<void> {
    if (!this.isReady || !this.registration?.active) {
      throw new Error('Service worker not ready')
    }

    this.registration.active.postMessage({
      type: 'CLEAR_CACHE',
      payload: { cacheType }
    })
  }

  async cacheImage(url: string, priority: 'normal' | 'high' = 'normal'): Promise<void> {
    if (!this.isReady || !this.registration?.active) {
      throw new Error('Service worker not ready')
    }

    this.registration.active.postMessage({
      type: 'CACHE_IMAGE',
      payload: { url, priority }
    })
  }

  // Background sync registration
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.isReady || !this.registration) {
      throw new Error('Service worker not ready')
    }

    if ('sync' in this.registration) {
      try {
        await (this.registration as any).sync.register(tag)
        console.log(`[ServiceWorkerManager] Background sync registered: ${tag}`)
      } catch (error) {
        console.error('[ServiceWorkerManager] Background sync registration failed:', error)
      }
    }
  }

  // Periodic sync for data updates (if supported)
  async registerPeriodicSync(tag: string, minInterval: number): Promise<void> {
    if (!this.isReady || !this.registration) {
      throw new Error('Service worker not ready')
    }

    if ('periodicSync' in this.registration) {
      try {
        await (this.registration as any).periodicSync.register(tag, { minInterval })
        console.log(`[ServiceWorkerManager] Periodic sync registered: ${tag}`)
      } catch (error) {
        console.error('[ServiceWorkerManager] Periodic sync registration failed:', error)
      }
    }
  }

  // Push notification subscription
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.isReady || !this.registration) {
      throw new Error('Service worker not ready')
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      })

      console.log('[ServiceWorkerManager] Push subscription created')
      return subscription
    } catch (error) {
      console.error('[ServiceWorkerManager] Push subscription failed:', error)
      return null
    }
  }

  // Check if service worker supports specific features
  get features() {
    return {
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      periodicSync: this.registration ? 'periodicSync' in this.registration : false,
      pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
      storage: 'storage' in navigator,
      indexedDB: 'indexedDB' in window
    }
  }

  // Get storage quota information
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate()
      } catch (error) {
        console.error('[ServiceWorkerManager] Storage estimate failed:', error)
      }
    }
    return null
  }
}

// Global service worker manager instance
export const serviceWorkerManager = new ServiceWorkerManager()

// Helper functions for common operations
export const swHelpers = {
  async syncNow() {
    try {
      await serviceWorkerManager.forceSync('all')
    } catch (error) {
      console.error('[SW Helper] Sync failed:', error)
    }
  },

  async syncUploadsOnly() {
    try {
      await serviceWorkerManager.forceSync('uploads')
    } catch (error) {
      console.error('[SW Helper] Upload sync failed:', error)
    }
  },

  async getCacheInfo() {
    try {
      const [cacheSize, storageEstimate] = await Promise.all([
        serviceWorkerManager.getCacheSize(),
        serviceWorkerManager.getStorageEstimate()
      ])

      return { cacheSize, storageEstimate }
    } catch (error) {
      console.error('[SW Helper] Cache info failed:', error)
      return null
    }
  },

  async preloadCriticalImages(imageUrls: string[]) {
    try {
      await Promise.all(
        imageUrls.map(url => serviceWorkerManager.cacheImage(url, 'high'))
      )
    } catch (error) {
      console.error('[SW Helper] Image preload failed:', error)
    }
  }
}

export default {
  register: registerServiceWorker,
  unregister: unregisterServiceWorker,
  manager: serviceWorkerManager,
  helpers: swHelpers
}