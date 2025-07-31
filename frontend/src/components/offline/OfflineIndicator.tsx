import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  Upload,
  Clock,
  AlertTriangle,
  Signal,
  CloudOff
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useConnectionState } from '../../hooks/useConnectionState'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface OfflineIndicatorProps {
  className?: string
  variant?: 'compact' | 'detailed' | 'minimal'
  showSyncStatus?: boolean
  showConnectionQuality?: boolean
  onClick?: () => void
}

export function OfflineIndicator({
  className,
  variant = 'compact',
  showSyncStatus = true,
  showConnectionQuality = false,
  onClick
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isConnected,
    quality,
    effectiveType,
    connectionDescription,
    shouldShowOfflineWarning
  } = useConnectionState()

  const {
    syncStatus,
    isSyncing,
    hasPendingData
  } = useOfflineSync()

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-400'
    if (!isConnected) return 'text-orange-400'
    
    switch (quality) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-green-500'
      case 'fair': return 'text-yellow-400'
      case 'poor': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Upload className="w-4 h-4 animate-pulse" />
    }
    
    if (!isOnline) {
      return <WifiOff className="w-4 h-4" />
    }
    
    if (!isConnected) {
      return <CloudOff className="w-4 h-4" />
    }
    
    return <Wifi className="w-4 h-4" />
  }

  const getSignalBars = () => {
    if (!isOnline) return 0
    
    switch (quality) {
      case 'excellent': return 4
      case 'good': return 3
      case 'fair': return 2
      case 'poor': return 1
      default: return 0
    }
  }

  const renderMinimal = () => (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors',
        shouldShowOfflineWarning 
          ? 'bg-red-500/10 text-red-400' 
          : 'bg-green-500/10 text-green-400',
        onClick && 'cursor-pointer hover:bg-opacity-20',
        className
      )}
      onClick={onClick}
    >
      {getStatusIcon()}
      {hasPendingData && (
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      )}
    </div>
  )

  const renderCompact = () => (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-[#1F2A44] rounded-lg border border-gray-600 transition-colors',
        onClick && 'cursor-pointer hover:bg-[#2A3B5A]',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('flex items-center gap-1.5', getStatusColor())}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {showConnectionQuality && isOnline && (
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-3 rounded-full transition-colors',
                i < getSignalBars() ? getStatusColor() : 'bg-gray-600'
              )}
            />
          ))}
        </div>
      )}
      
      {showSyncStatus && syncStatus && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {syncStatus.pendingUploads > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {syncStatus.pendingUploads}
            </span>
          )}
          {syncStatus.failedUploads > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {syncStatus.failedUploads}
            </span>
          )}
        </div>
      )}
    </div>
  )

  const renderDetailed = () => (
    <div 
      className={cn(
        'p-4 bg-[#1F2A44] rounded-lg border border-gray-600 space-y-3',
        onClick && 'cursor-pointer hover:bg-[#2A3B5A] transition-colors',
        className
      )}
      onClick={onClick}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2', getStatusColor())}>
          {getStatusIcon()}
          <span className="font-medium">
            {isSyncing ? 'Syncing Data' : connectionDescription}
          </span>
        </div>
        
        {showConnectionQuality && isOnline && (
          <div className="flex items-center gap-1">
            <Signal className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 h-4 rounded-full transition-colors',
                    i < getSignalBars() ? getStatusColor() : 'bg-gray-600'
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Details */}
      {isOnline && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Connection:</span>
            <span className="text-white ml-2">{effectiveType.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-gray-400">Quality:</span>
            <span className={cn('ml-2 capitalize', getStatusColor())}>{quality}</span>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {showSyncStatus && syncStatus && (
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-600">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {syncStatus.pendingUploads}
            </div>
            <div className="text-xs text-gray-400">Queued</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">
              {syncStatus.uploadedCount || 0}
            </div>
            <div className="text-xs text-gray-400">Uploaded</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-400">
              {syncStatus.failedUploads}
            </div>
            <div className="text-xs text-gray-400">Failed</div>
          </div>
        </div>
      )}

      {/* Last Sync */}
      {syncStatus?.lastSuccessfulSync && (
        <div className="text-xs text-gray-400 text-center">
          Last sync: {new Date(syncStatus.lastSuccessfulSync).toLocaleTimeString()}
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (variant) {
      case 'minimal': return renderMinimal()
      case 'detailed': return renderDetailed()
      default: return renderCompact()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  )
}

export default OfflineIndicator