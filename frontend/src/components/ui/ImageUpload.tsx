import { useState, useRef } from 'react'
import { Upload, Camera, X, Loader } from 'lucide-react'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onAnalyze: () => void
  loading?: boolean
  disabled?: boolean
}

export function ImageUpload({ onImageSelect, onAnalyze, loading = false, disabled = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      onImageSelect(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const clearImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-[#10B981] bg-[#10B981]/10' : 'border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#10B981]'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={disabled ? undefined : openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-64 mx-auto rounded-lg"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearImage()
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-2">
                Upload crop image for analysis
              </p>
              <p className="text-sm text-gray-300">
                Drag and drop your image here, or click to browse
              </p>
            </div>
            <div className="flex justify-center space-x-4 text-sm text-gray-400">
              <span>JPG, PNG, WEBP</span>
              <span>•</span>
              <span>Max 10MB</span>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="mt-6 space-y-3">
          <button
            onClick={onAnalyze}
            disabled={loading || disabled}
            className="w-full bg-[#10B981] hover:bg-[#10B981]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Analyze Image</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openFileDialog}
              disabled={loading || disabled}
              className="bg-[#4A5B7C] hover:bg-[#4A5B7C]/80 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Choose Different Image
            </button>
            <button
              onClick={clearImage}
              disabled={loading || disabled}
              className="border border-gray-600 hover:border-gray-500 disabled:opacity-50 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}