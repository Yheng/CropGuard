import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Pause,
  Play,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { ProgressChart } from '../ui/Chart'
import { cn } from '../../utils/cn'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import { useConnectionState } from '../../hooks/useConnectionState'
import { useConflictResolution, useConflictStats } from '../../hooks/useConflictResolution'
import type { OfflineAnalysis } from '../../utils/offlineStorage'
import { offlineStorage } from '../../utils/offlineStorage'
import ConflictResolutionModal from './ConflictResolutionModal'

interface SyncStatusCardProps {
  className?: string
  showDetails?: boolean
  onClose?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

export function SyncStatusCard({
  className,
  showDetails = true,
  onClose,
  autoRefresh = true,
  refreshInterval = 5000
}: SyncStatusCardProps) {
  const [queuedUploads, setQueuedUploads] = React.useState<OfflineAnalysis[]>([])
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)
  const [showConflictModal, setShowConflictModal] = React.useState(false)

  const {
    syncStatus,
    isSyncing,
    forceSync,
    forceSyncUploads,
    lastSyncError,
    hasPendingData
  } = useOfflineSync()

  const {
    isOnline,
    connectionDescription
  } = useConnectionState()

  // Conflict resolution
  const {
    conflicts,
    resolveConflict,
    autoResolveAll,
    refreshConflicts,
    isResolving
  } = useConflictResolution()

  const conflictStats = useConflictStats()

  // Load queued uploads
  const loadQueuedUploads = React.useCallback(async () => {
    try {
      const uploads = await offlineStorage.getQueuedUploads()
      setQueuedUploads(uploads.slice(0, 10)) // Show latest 10
    } catch (error) {
      console.error('[SyncStatusCard] Failed to load uploads:', error)
    }
  }, [])

  // Auto-refresh data
  React.useEffect(() => {
    if (!autoRefresh || isPaused) return

    const interval = setInterval(loadQueuedUploads, refreshInterval)
    loadQueuedUploads() // Initial load

    return () => clearInterval(interval)
  }, [loadQueuedUploads, autoRefresh, refreshInterval, isPaused])

  const handleForceSync = async () => {
    if (!isOnline) return
    
    try {
      await forceSync()
      setTimeout(loadQueuedUploads, 1000)
    } catch (error) {
      console.error('[SyncStatusCard] Force sync failed:', error)
    }
  }

  const handleRetryFailed = async () => {
    try {
      const failedUploads = queuedUploads.filter(upload => upload.status === 'failed')
      
      for (const upload of failedUploads) {
        await offlineStorage.updateUploadStatus(upload.id, 'queued')
      }
      
      await loadQueuedUploads()
      
      if (isOnline) {
        setTimeout(() => forceSyncUploads(), 500)
      }
    } catch (error) {
      console.error('[SyncStatusCard] Retry failed uploads error:', error)
    }
  }

  const getSyncProgress = () => {
    if (!syncStatus) return 0
    
    const total = syncStatus.pendingUploads + syncStatus.uploadedCount + syncStatus.failedUploads
    if (total === 0) return 100
    
    return Math.round((syncStatus.uploadedCount / total) * 100)
  }

  const getStatusIcon = (status: OfflineAnalysis['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-400 animate-pulse" />
      case 'uploaded':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: OfflineAnalysis['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10'
      case 'high': return 'text-orange-400 bg-orange-500/10'
      case 'normal': return 'text-blue-400 bg-blue-500/10'
      case 'low': return 'text-gray-400 bg-gray-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  if (!syncStatus && !hasPendingData) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader
        title="Sync Status"
        description={connectionDescription}
        action={
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPaused(!isPaused)}
                leftIcon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            
            {showDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                leftIcon={isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              >
                {isExpanded ? 'Hide' : 'Details'}
              </Button>
            )}
            
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        }
      />
      
      <CardContent>
        <div className="space-y-4">
          {/* Conflict Warning */}
          {conflictStats.pending > 0 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="font-medium text-orange-300">
                      {conflictStats.pending} Data Conflicts
                    </p>
                    <p className="text-sm text-orange-400">
                      {conflictStats.autoResolvable} auto-resolvable, {conflictStats.manualRequired} need attention
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowConflictModal(true)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Resolve
                </Button>
              </div>
            </div>
          )}

          {/* Sync Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[#1F2A44] rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">
                {syncStatus?.pendingUploads || 0}
              </div>
              <div className="text-sm text-gray-400">Queued</div>
            </div>
            
            <div className="text-center p-3 bg-[#1F2A44] rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {syncStatus?.uploadedCount || 0}
              </div>
              <div className="text-sm text-gray-400">Uploaded</div>
            </div>
            
            <div className="text-center p-3 bg-[#1F2A44] rounded-lg">
              <div className="text-2xl font-bold text-red-400">
                {syncStatus?.failedUploads || 0}
              </div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Sync Progress</span>
                <span className="text-sm text-white">{getSyncProgress()}%</span>
              </div>
              <ProgressChart
                label=""
                value={getSyncProgress()}
                max={100}
                color="#10B981"
                variant="linear"
                size="sm"
                showPercentage={false}
              />
            </div>
          )}

          {/* Error Display */}
          {lastSyncError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Sync Error</span>
              </div>
              <p className="text-sm text-red-300 mt-1">{lastSyncError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleForceSync}
              disabled={!isOnline || isSyncing}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />}
              className="flex-1"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            {syncStatus && syncStatus.failedUploads > 0 && (
              <Button
                onClick={handleRetryFailed}
                disabled={!isOnline || isSyncing}
                variant="outline"
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Retry Failed
              </Button>
            )}
          </div>

          {/* Detailed Queue View */}
          <AnimatePresence>
            {isExpanded && queuedUploads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-4 border-t border-gray-600"
              >
                <h4 className="font-medium text-white">Upload Queue</h4>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {queuedUploads.map((upload, index) => (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-2 bg-[#1F2A44] rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                        {getStatusIcon(upload.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {upload.metadata.cropType}
                          </p>
                          
                          {upload.priority !== 'normal' && (
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              getPriorityColor(upload.priority)
                            )}>
                              {upload.priority}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{new Date(upload.createdAt).toLocaleTimeString()}</span>
                          {upload.compressed && (
                            <span>• {(upload.compressedSize! / 1024 / 1024).toFixed(1)}MB</span>
                          )}
                          {upload.retryCount > 0 && (
                            <span>• Retry {upload.retryCount}</span>
                          )}
                        </div>
                        
                        {upload.error && (
                          <p className="text-xs text-red-400 mt-1 truncate">{upload.error}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last Sync Info */}
          {syncStatus?.lastSuccessfulSync && (
            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
              Last successful sync: {new Date(syncStatus.lastSuccessfulSync).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        conflicts={conflicts}
        onClose={() => setShowConflictModal(false)}
        onResolveConflict={resolveConflict}
        onAutoResolveAll={autoResolveAll}
        onRefresh={refreshConflicts}
        isResolving={isResolving}
      />
    </Card>
  )
}

export default SyncStatusCard