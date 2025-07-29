import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Signal,
  X
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useConnectionState } from '../../hooks/useConnectionState'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface ConnectivityToastProps {
  className?: string
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  showQuality?: boolean
  autoHide?: boolean
}

interface ToastMessage {
  id: string
  type: 'online' | 'offline' | 'sync-complete' | 'sync-error' | 'poor-connection'
  title: string
  message: string
  icon: React.ReactNode
  color: string
  timestamp: number
  duration?: number
}

export function ConnectivityToast({
  className,
  duration = 4000,
  position = 'top-right',
  showQuality = true,
  autoHide = true
}: ConnectivityToastProps) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])
  const [lastConnectionState, setLastConnectionState] = React.useState<{
    isOnline: boolean
    isConnected: boolean
    quality: string
  } | null>(null)

  const {
    isOnline,
    isConnected,
    quality,
    effectiveType,
    connectionDescription
  } = useConnectionState()

  const {
    syncStatus,
    isSyncing,
    lastSyncError,
    addEventListener,
    removeEventListener
  } = useOfflineSync()

  // Generate unique toast ID
  const generateToastId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add toast message
  const addToast = React.useCallback((toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const newToast: ToastMessage = {
      ...toast,
      id: generateToastId(),
      timestamp: Date.now()
    }

    setToasts(prev => {
      // Limit to 3 toasts max
      const filtered = prev.slice(-2)
      return [...filtered, newToast]
    })

    // Auto-remove toast
    if (autoHide) {
      setTimeout(() => {
        removeToast(newToast.id)
      }, toast.duration || duration)
    }
  }, [autoHide, duration])

  // Remove toast
  const removeToast = React.useCallback((toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId))
  }, [])

  // Monitor connection state changes
  React.useEffect(() => {
    const currentState = { isOnline, isConnected, quality }
    
    if (lastConnectionState) {
      // Connection restored
      if (!lastConnectionState.isOnline && isOnline) {
        addToast({
          type: 'online',
          title: 'Back Online',
          message: `Connected via ${effectiveType.toUpperCase()}`,
          icon: <Wifi className="w-5 h-5" />,
          color: 'bg-green-500/90 text-white',
          duration: 3000
        })
      }
      
      // Connection lost
      else if (lastConnectionState.isOnline && !isOnline) {
        addToast({
          type: 'offline',
          title: 'Connection Lost',
          message: 'Working offline - data will sync when reconnected',
          icon: <WifiOff className="w-5 h-5" />,
          color: 'bg-red-500/90 text-white',
          duration: 5000
        })
      }
      
      // Server connectivity changed
      else if (lastConnectionState.isConnected !== isConnected && isOnline) {
        if (isConnected) {
          addToast({
            type: 'online',
            title: 'Server Connected',
            message: 'CropGuard servers are now reachable',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'bg-green-500/90 text-white',
            duration: 3000
          })
        } else {
          addToast({
            type: 'offline',
            title: 'Server Unreachable',
            message: 'Cannot connect to CropGuard servers',
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'bg-orange-500/90 text-white',
            duration: 4000
          })
        }
      }
      
      // Connection quality changed significantly
      else if (showQuality && lastConnectionState.quality !== quality && isOnline) {
        if (quality === 'poor' && lastConnectionState.quality !== 'poor') {
          addToast({
            type: 'poor-connection',
            title: 'Slow Connection',
            message: 'Uploads may take longer than usual',
            icon: <Signal className="w-5 h-5" />,
            color: 'bg-yellow-500/90 text-white',
            duration: 4000
          })
        }
      }
    }
    
    setLastConnectionState(currentState)
  }, [isOnline, isConnected, quality, effectiveType, lastConnectionState, addToast, showQuality])

  // Monitor sync events
  React.useEffect(() => {
    const handleSyncEvent = (event: any) => {
      switch (event.type) {
        case 'sync_completed':
          if (syncStatus && syncStatus.uploadedCount > 0) {
            addToast({
              type: 'sync-complete',
              title: 'Sync Complete',
              message: `${syncStatus.uploadedCount} upload${syncStatus.uploadedCount !== 1 ? 's' : ''} synced successfully`,
              icon: <CheckCircle className="w-5 h-5" />,
              color: 'bg-green-500/90 text-white',
              duration: 3000
            })
          }
          break
          
        case 'sync_error':
        case 'upload_failed':
          addToast({
            type: 'sync-error',
            title: 'Sync Failed',
            message: event.data.error || 'Some uploads failed to sync',
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'bg-red-500/90 text-white',
            duration: 5000
          })
          break
      }
    }

    addEventListener(handleSyncEvent)
    return () => removeEventListener(handleSyncEvent)
  }, [addEventListener, removeEventListener, addToast, syncStatus])

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className={cn(
      'fixed z-50 space-y-2 max-w-sm w-full',
      getPositionClasses(),
      className
    )}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.95 }}
            transition={{ 
              duration: 0.3, 
              ease: 'easeOut',
              layout: { duration: 0.2 }
            }}
            className={cn(
              'rounded-lg shadow-lg backdrop-blur-sm border border-white/10 p-4',
              toast.color
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {toast.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{toast.title}</h4>
                  
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm opacity-90 mt-1">{toast.message}</p>
                
                {/* Connection quality indicator */}
                {showQuality && toast.type === 'online' && quality && (
                  <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                    <Signal className="w-3 h-3" />
                    <span>{quality} quality</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar for auto-hide */}
            {autoHide && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ 
                  duration: (toast.duration || duration) / 1000,
                  ease: 'linear'
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ConnectivityToast