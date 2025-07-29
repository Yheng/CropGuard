import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WifiOff,
  CloudOff,
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Settings
} from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { useConnectionState } from '../../hooks/useConnectionState'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface OfflineBannerProps {
  className?: string
  showActions?: boolean
  dismissible?: boolean
  persistent?: boolean
  onDismiss?: () => void
  onSettingsClick?: () => void
}

export function OfflineBanner({
  className,
  showActions = true,
  dismissible = false,
  persistent = false,
  onDismiss,
  onSettingsClick
}: OfflineBannerProps) {
  const [isDismissed, setIsDismissed] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)

  const {
    isOnline,
    isConnected,
    quality,
    connectionDescription,
    shouldShowOfflineWarning
  } = useConnectionState()

  const {
    syncStatus,
    isSyncing,
    hasPendingData,
    forceSync,
    lastSyncError
  } = useOfflineSync()

  // Auto-dismiss logic for temporary connection issues
  React.useEffect(() => {
    if (!persistent && isOnline && isConnected && !hasPendingData) {
      const timer = setTimeout(() => {
        setIsDismissed(true)
      }, 3000) // Auto-dismiss after 3 seconds when back online

      return () => clearTimeout(timer)
    }
  }, [isOnline, isConnected, hasPendingData, persistent])

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleRetrySync = async () => {
    if (!isOnline) return
    
    try {
      await forceSync()
    } catch (error) {
      console.error('[OfflineBanner] Retry sync failed:', error)
    }
  }

  // Determine banner type and content
  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        type: 'offline',
        icon: <WifiOff className="w-5 h-5" />,
        title: 'You\'re Offline',
        message: 'Your work is being saved locally and will sync when connection is restored.',
        color: 'bg-red-500/10 border-red-500/20 text-red-400',
        iconColor: 'text-red-400'
      }
    }

    if (!isConnected) {
      return {
        type: 'no-server',
        icon: <CloudOff className="w-5 h-5" />,
        title: 'Server Unreachable',
        message: 'Cannot connect to CropGuard servers. Your data will sync when connection is restored.',
        color: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        iconColor: 'text-orange-400'
      }
    }

    if (quality === 'poor' && hasPendingData) {
      return {
        type: 'poor-connection',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'Slow Connection',
        message: 'Connection quality is poor. Uploads may take longer than usual.',
        color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        iconColor: 'text-yellow-400'
      }
    }

    if (hasPendingData && !isSyncing) {
      return {
        type: 'pending-sync',
        icon: <Clock className="w-5 h-5" />,
        title: 'Data Pending',
        message: `${syncStatus?.pendingUploads || 0} uploads waiting to sync.`,
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        iconColor: 'text-blue-400'
      }
    }

    if (isSyncing) {
      return {
        type: 'syncing',
        icon: <Upload className="w-5 h-5 animate-pulse" />,
        title: 'Syncing Data',
        message: 'Uploading your crop analysis data to the cloud.',
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        iconColor: 'text-blue-400'
      }
    }

    if (lastSyncError) {
      return {
        type: 'sync-error',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'Sync Failed',
        message: 'Some uploads failed to sync. Check your connection and try again.',
        color: 'bg-red-500/10 border-red-500/20 text-red-400',
        iconColor: 'text-red-400'
      }
    }

    return null
  }

  const bannerConfig = getBannerConfig()

  // Don't show banner if dismissed or no relevant status
  if (isDismissed || !bannerConfig) {
    return null
  }

  // Don't show for minor issues unless persistent
  if (!persistent && !shouldShowOfflineWarning && bannerConfig.type === 'poor-connection') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -50, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'border rounded-lg p-4 mb-4',
          bannerConfig.color,
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className={bannerConfig.iconColor}>
            {bannerConfig.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">{bannerConfig.title}</h3>
              
              {dismissible && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="opacity-70 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <p className="text-sm mt-1 opacity-90">
              {bannerConfig.message}
            </p>

            {/* Detailed Status */}
            <AnimatePresence>
              {showDetails && syncStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-current/20"
                >
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="opacity-70">Queued:</span>
                      <span className="ml-2 font-medium">{syncStatus.pendingUploads}</span>
                    </div>
                    <div>
                      <span className="opacity-70">Uploaded:</span>
                      <span className="ml-2 font-medium">{syncStatus.uploadedCount || 0}</span>
                    </div>
                    <div>
                      <span className="opacity-70">Failed:</span>
                      <span className="ml-2 font-medium">{syncStatus.failedUploads}</span>
                    </div>
                  </div>
                  
                  {syncStatus.lastSuccessfulSync && (
                    <p className="text-xs mt-2 opacity-70">
                      Last sync: {new Date(syncStatus.lastSuccessfulSync).toLocaleTimeString()}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex items-center gap-2 mt-3">
                {(bannerConfig.type === 'offline' || bannerConfig.type === 'no-server' || bannerConfig.type === 'sync-error') && isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetrySync}
                    disabled={isSyncing}
                    leftIcon={<RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />}
                    className="text-current border-current/30 hover:bg-current/10"
                  >
                    {isSyncing ? 'Syncing...' : 'Retry Sync'}
                  </Button>
                )}
                
                {hasPendingData && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-current hover:bg-current/10"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                )}
                
                {onSettingsClick && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onSettingsClick}
                    leftIcon={<Settings className="w-4 h-4" />}
                    className="text-current hover:bg-current/10"
                  >
                    Settings
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OfflineBanner