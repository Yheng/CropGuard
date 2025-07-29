import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Compress,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  RotateCcw,
  Zap,
  HardDrive,
  Settings
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { ProgressChart } from '../ui/Chart'
import { cn } from '../../utils/cn'
import { offlineStorage, OfflineAnalysis } from '../../utils/offlineStorage'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface OfflineImageUploadProps {
  farmerId: string
  onUploadSuccess?: (analysisId: string) => void
  onUploadError?: (error: string) => void
  maxFileSize?: number // in bytes
  acceptedTypes?: string[]
  compressionQuality?: number
  className?: string
}

interface UploadState {
  status: 'idle' | 'selecting' | 'compressing' | 'queued' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  originalSize?: number
  compressedSize?: number
  compressionRatio?: number
}

interface QueuedUpload extends OfflineAnalysis {
  localPreview: string
}

export function OfflineImageUpload({
  farmerId,
  onUploadSuccess,
  onUploadError,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  compressionQuality = 0.8,
  className
}: OfflineImageUploadProps) {
  const [uploadState, setUploadState] = React.useState<UploadState>({
    status: 'idle',
    progress: 0
  })
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [queuedUploads, setQueuedUploads] = React.useState<QueuedUpload[]>([])
  const [cropType, setCropType] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [useAdvancedOptions, setUseAdvancedOptions] = React.useState(false)
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  
  const { 
    connectivityInfo, 
    syncStatus, 
    isSyncing, 
    addEventListener, 
    removeEventListener,
    forceSyncUploads 
  } = useOfflineSync()

  // Load queued uploads
  React.useEffect(() => {
    loadQueuedUploads()
  }, [])

  // Listen for sync events
  React.useEffect(() => {
    const handleSyncEvent = (event: any) => {
      if (event.type === 'upload_completed') {
        setQueuedUploads(prev => prev.filter(upload => upload.id !== event.data.id))
        onUploadSuccess?.(event.data.analysisId)
      } else if (event.type === 'upload_failed') {
        loadQueuedUploads() // Refresh to show updated status
        onUploadError?.(event.data.error)
      }
    }

    addEventListener(handleSyncEvent)
    return () => removeEventListener(handleSyncEvent)
  }, [addEventListener, removeEventListener, onUploadSuccess, onUploadError])

  const loadQueuedUploads = async () => {
    try {
      const uploads = await offlineStorage.getQueuedUploads()
      const farmersUploads = uploads
        .filter(upload => upload.farmerId === farmerId)
        .map(upload => ({
          ...upload,
          localPreview: upload.imageUrl
        }))
      setQueuedUploads(farmersUploads)
    } catch (error) {
      console.error('[OfflineImageUpload] Failed to load queued uploads:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!acceptedTypes.includes(file.type)) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: `File type ${file.type} not supported. Please use JPEG, PNG, or WebP.`
      })
      return
    }

    if (file.size > maxFileSize) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${maxFileSize / 1024 / 1024}MB`
      })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadState({
      status: 'selecting',
      progress: 0,
      originalSize: file.size
    })
  }

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event)
  }

  const compressImage = async (file: File): Promise<{
    blob: Blob
    compressed: boolean
    compressedSize: number
    compressionRatio: number
  }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Calculate optimal dimensions for mobile upload
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        // Maintain aspect ratio while fitting within max dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        // Apply image enhancements for better AI analysis
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Apply subtle sharpening filter for crop analysis
        const imageData = ctx.getImageData(0, 0, width, height)
        const sharpened = applySharpeningFilter(imageData)
        ctx.putImageData(sharpened, 0, 0)

        canvas.toBlob(
          (blob) => {
            const compressedSize = blob!.size
            const compressionRatio = ((file.size - compressedSize) / file.size) * 100

            resolve({
              blob: blob!,
              compressed: compressedSize < file.size,
              compressedSize,
              compressionRatio
            })
          },
          'image/jpeg',
          compressionQuality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const applySharpeningFilter = (imageData: ImageData): ImageData => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const result = new ImageData(width, height)
    
    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixel = ((y + ky) * width + (x + kx)) * 4 + c
              const kernelValue = kernel[(ky + 1) * 3 + (kx + 1)]
              sum += data[pixel] * kernelValue
            }
          }
          
          const outputPixel = (y * width + x) * 4 + c
          result.data[outputPixel] = Math.max(0, Math.min(255, sum))
        }
        
        // Copy alpha channel
        const outputAlpha = (y * width + x) * 4 + 3
        const inputAlpha = (y * width + x) * 4 + 3
        result.data[outputAlpha] = data[inputAlpha]
      }
    }
    
    return result
  }

  const getLocationData = async (): Promise<{latitude: number, longitude: number, accuracy: number} | undefined> => {
    if (!navigator.geolocation) return undefined

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        () => resolve(undefined),
        { 
          timeout: 5000, 
          enableHighAccuracy: false, // Faster for poor connections
          maximumAge: 300000 // Accept 5-minute old location
        }
      )
    })
  }

  const handleUpload = async () => {
    if (!selectedFile || !cropType.trim()) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: 'Please select an image and specify crop type'
      })
      return
    }

    setUploadState({ status: 'compressing', progress: 20 })

    try {
      // Compress image
      const compressed = await compressImage(selectedFile)
      
      setUploadState({
        status: 'compressing',
        progress: 50,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio
      })

      // Get location data
      const gpsCoordinates = await getLocationData()
      
      setUploadState({ status: 'compressing', progress: 70 })

      // Prepare metadata
      const metadata = {
        cropType: cropType.trim(),
        location: location.trim() || 'Unknown',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          connection: connectivityInfo.effectiveType
        },
        gpsCoordinates,
        weatherConditions: undefined // Could be fetched from weather API
      }

      // Queue for offline storage
      const uploadId = await offlineStorage.queueAnalysisUpload(
        farmerId,
        selectedFile,
        metadata,
        'normal'
      )

      setUploadState({
        status: 'queued',
        progress: 100,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio
      })

      // Refresh queue display
      await loadQueuedUploads()

      // Clear form
      setSelectedFile(null)
      setPreviewUrl(null)
      setCropType('')
      setLocation('')

      // Reset form state after delay
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0 })
      }, 2000)

      // Trigger sync if online
      if (connectivityInfo.isOnline) {
        setTimeout(() => {
          forceSyncUploads()
        }, 1000)
      }

    } catch (error) {
      console.error('[OfflineImageUpload] Upload failed:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        error: error.message || 'Failed to process upload'
      })
      onUploadError?.(error.message)
    }
  }

  const handleRetryUpload = async (uploadId: string) => {
    try {
      await offlineStorage.updateUploadStatus(uploadId, 'queued')
      await loadQueuedUploads()
      
      if (connectivityInfo.isOnline) {
        forceSyncUploads()
      }
    } catch (error) {
      console.error('[OfflineImageUpload] Retry failed:', error)
    }
  }

  const handleRemoveUpload = async (uploadId: string) => {
    try {
      await offlineStorage.removeUpload(uploadId)
      await loadQueuedUploads()
    } catch (error) {
      console.error('[OfflineImageUpload] Remove failed:', error)
    }
  }

  const getStatusIcon = (status: UploadState['status']) => {
    switch (status) {
      case 'compressing':
        return <Compress className="w-5 h-5 animate-pulse" />
      case 'queued':
        return <Clock className="w-5 h-5 text-[#F59E0B]" />
      case 'uploading':
        return <Upload className="w-5 h-5 animate-pulse" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#10B981]" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      default:
        return <Camera className="w-5 h-5" />
    }
  }

  const getQueueStatusIcon = (status: OfflineAnalysis['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-[#F59E0B]" />
      case 'uploading':
        return <Upload className="w-4 h-4 text-[#2DD4BF] animate-pulse" />
      case 'uploaded':
        return <CheckCircle className="w-4 h-4 text-[#10B981]" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-[#1F2A44] rounded-lg border border-gray-600">
        <div className="flex items-center gap-3">
          {connectivityInfo.isOnline ? (
            <Wifi className="w-5 h-5 text-[#10B981]" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {connectivityInfo.isOnline ? 'Online' : 'Offline Mode'}
            </p>
            <p className="text-xs text-gray-400">
              {connectivityInfo.isOnline 
                ? `${connectivityInfo.effectiveType.toUpperCase()} connection`
                : 'Images will sync when connected'
              }
            </p>
          </div>
        </div>

        {syncStatus && (
          <div className="text-right text-sm">
            <p className="text-white">
              {syncStatus.pendingUploads} queued
            </p>
            {syncStatus.failedUploads > 0 && (
              <p className="text-red-400">
                {syncStatus.failedUploads} failed
              </p>
            )}
          </div>
        )}
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader
          title="Upload Crop Image"
          description={connectivityInfo.isOnline ? 'Analyze your crops instantly' : 'Queue for analysis when online'}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUseAdvancedOptions(!useAdvancedOptions)}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              {useAdvancedOptions ? 'Simple' : 'Advanced'}
            </Button>
          }
        />
        <CardContent>
          <div className="space-y-4">
            {/* Image Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<ImageIcon className="w-5 h-5" />}
                className="h-20 border-dashed"
                disabled={uploadState.status === 'compressing'}
              >
                Select from Gallery
              </Button>
              
              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<Camera className="w-5 h-5" />}
                className="h-20 border-dashed"
                disabled={uploadState.status === 'compressing'}
              >
                Take Photo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />

            {/* Image Preview */}
            <AnimatePresence>
              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Crop preview"
                      className="w-full h-64 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                        setUploadState({ status: 'idle', progress: 0 })
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Compression Info */}
                  {uploadState.compressedSize && (
                    <div className="p-3 bg-[#1F2A44] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Image Optimization</span>
                        <Compress className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Original:</span>
                          <span className="text-white ml-2">
                            {((uploadState.originalSize || 0) / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Optimized:</span>
                          <span className="text-white ml-2">
                            {(uploadState.compressedSize / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      </div>
                      {uploadState.compressionRatio && uploadState.compressionRatio > 0 && (
                        <div className="mt-2 text-xs text-[#10B981]">
                          {uploadState.compressionRatio.toFixed(1)}% size reduction
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Crop Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Crop Type *
                </label>
                <input
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g., Tomato, Wheat, Rice"
                  className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
                  disabled={uploadState.status === 'compressing'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Field name or location"
                  className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
                  disabled={uploadState.status === 'compressing'}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <AnimatePresence>
              {useAdvancedOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-[#1F2A44] rounded-lg border border-gray-600 space-y-4"
                >
                  <h4 className="font-medium text-white">Advanced Options</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Image Quality
                      </label>
                      <select
                        value={compressionQuality}
                        onChange={(e) => setUploadState(prev => ({ ...prev, compressionQuality: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      >
                        <option value={0.6}>High Compression (Faster)</option>
                        <option value={0.8}>Standard Quality</option>
                        <option value={0.9}>High Quality (Slower)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Upload Priority
                      </label>
                      <select className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]">
                        <option value="normal">Normal</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Progress */}
            <AnimatePresence>
              {uploadState.status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(uploadState.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white capitalize">
                        {uploadState.status === 'compressing' ? 'Optimizing Image' :
                         uploadState.status === 'queued' ? 'Ready for Upload' :
                         uploadState.status}
                      </p>
                      {uploadState.error && (
                        <p className="text-xs text-red-400 mt-1">{uploadState.error}</p>
                      )}
                    </div>
                  </div>

                  {uploadState.progress > 0 && (
                    <ProgressChart
                      label=""
                      value={uploadState.progress}
                      max={100}
                      color="#10B981"
                      variant="linear"
                      size="sm"
                      showPercentage={true}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !cropType.trim() || uploadState.status === 'compressing'}
                leftIcon={connectivityInfo.isOnline ? <Zap className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
                className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80"
              >
                {connectivityInfo.isOnline ? 'Analyze Now' : 'Queue for Analysis'}
              </Button>
              
              {uploadState.status === 'error' && (
                <Button
                  onClick={() => setUploadState({ status: 'idle', progress: 0 })}
                  variant="outline"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      <AnimatePresence>
        {queuedUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader
                title="Upload Queue"
                description={`${queuedUploads.length} image${queuedUploads.length !== 1 ? 's' : ''} in queue`}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => forceSyncUploads()}
                    disabled={!connectivityInfo.isOnline || isSyncing}
                    leftIcon={<Upload className={cn('w-4 h-4', isSyncing && 'animate-pulse')} />}
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                }
              />
              <CardContent>
                <div className="space-y-3">
                  {queuedUploads.map((upload, index) => (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-[#1F2A44] rounded-lg"
                    >
                      <img
                        src={upload.localPreview}
                        alt="Queued upload"
                        className="w-12 h-12 object-cover rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getQueueStatusIcon(upload.status)}
                          <p className="text-sm font-medium text-white truncate">
                            {upload.metadata.cropType}
                          </p>
                          {upload.priority !== 'normal' && (
                            <span className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              upload.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              upload.priority === 'high' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                              'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                            )}>
                              {upload.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(upload.createdAt).toLocaleString()}
                          {upload.compressed && (
                            <span className="ml-2">
                              • {(upload.compressedSize! / 1024 / 1024).toFixed(1)}MB
                            </span>
                          )}
                        </p>
                        {upload.error && (
                          <p className="text-xs text-red-400 mt-1">{upload.error}</p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {upload.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetryUpload(upload.id)}
                            disabled={!connectivityInfo.isOnline}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUpload(upload.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OfflineImageUpload