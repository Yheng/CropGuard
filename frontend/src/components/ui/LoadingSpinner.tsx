import { motion } from 'framer-motion'
import { Leaf, Sprout, Sun, Droplets } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'plant-growth' | 'leaf-spin' | 'farm-ecosystem' | 'simple'
  message?: string
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'plant-growth', 
  message,
  className = '' 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6'
      case 'md': return 'w-8 h-8'
      case 'lg': return 'w-12 h-12'
      case 'xl': return 'w-16 h-16'
      default: return 'w-8 h-8'
    }
  }

  const getContainerSize = () => {
    switch (size) {
      case 'sm': return 'w-16 h-16'
      case 'md': return 'w-24 h-24'
      case 'lg': return 'w-32 h-32'
      case 'xl': return 'w-40 h-40'
      default: return 'w-24 h-24'
    }
  }

  if (variant === 'simple') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`${getSizeClasses()} text-emerald-400`}
        >
          <Leaf className="w-full h-full" />
        </motion.div>
        {message && (
          <p className="text-sm text-slate-400 animate-pulse">{message}</p>
        )}
      </div>
    )
  }

  if (variant === 'leaf-spin') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className={`${getContainerSize()} relative flex items-center justify-center`}>
          {/* Multiple rotating leaves */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute"
          >
            <Leaf className={`${getSizeClasses()} text-emerald-400`} />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute"
          >
            <Leaf className={`${getSizeClasses()} text-green-500 opacity-60`} style={{ transform: 'scale(0.7)' }} />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute"
          >
            <Leaf className={`${getSizeClasses()} text-emerald-300 opacity-40`} style={{ transform: 'scale(0.4)' }} />
          </motion.div>
        </div>
        {message && (
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-slate-400 text-center"
          >
            {message}
          </motion.p>
        )}
      </div>
    )
  }

  if (variant === 'plant-growth') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className={`${getContainerSize()} relative flex items-center justify-center`}>
          {/* Growing plant animation */}
          <motion.div
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute bottom-0"
          >
            <Sprout className={`${getSizeClasses()} text-emerald-500`} />
          </motion.div>
          
          {/* Pulsing glow effect */}
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className={`absolute ${getSizeClasses()} bg-emerald-400/20 rounded-full blur-sm`}
          />
        </div>
        {message && (
          <motion.p 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-sm text-emerald-300 text-center font-medium"
          >
            {message}
          </motion.p>
        )}
      </div>
    )
  }

  if (variant === 'farm-ecosystem') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className={`${getContainerSize()} relative flex items-center justify-center`}>
          {/* Sun */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2"
          >
            <Sun className="w-4 h-4 text-yellow-400" />
          </motion.div>
          
          {/* Water droplets */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute -top-1 -left-2"
          >
            <Droplets className="w-3 h-3 text-blue-400" />
          </motion.div>
          
          {/* Main plant */}
          <motion.div
            animate={{ 
              scale: [0.9, 1.1, 0.9],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative z-10"
          >
            <Leaf className={`${getSizeClasses()} text-emerald-400`} />
          </motion.div>
          
          {/* Secondary leaves */}
          <motion.div
            animate={{ 
              scale: [0.7, 0.9, 0.7],
              rotate: [0, -3, 3, 0]
            }}
            transition={{ 
              duration: 2.2, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.3
            }}
            className="absolute -bottom-1 -left-1"
          >
            <Leaf className="w-4 h-4 text-green-500 opacity-70" />
          </motion.div>
          
          <motion.div
            animate={{ 
              scale: [0.6, 0.8, 0.6],
              rotate: [0, 4, -4, 0]
            }}
            transition={{ 
              duration: 2.8, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.7
            }}
            className="absolute -bottom-1 -right-1"
          >
            <Leaf className="w-3 h-3 text-emerald-300 opacity-50" />
          </motion.div>

          {/* Soil line */}
          <motion.div
            animate={{ scaleX: [0.8, 1.2, 0.8] }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute bottom-0 w-8 h-0.5 bg-amber-600/40 rounded-full"
          />
        </div>
        {message && (
          <motion.p 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-slate-400 text-center"
          >
            {message}
          </motion.p>
        )}
      </div>
    )
  }

  // Default fallback
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={`${getSizeClasses()} text-emerald-400`}
      >
        <Leaf className="w-full h-full" />
      </motion.div>
      {message && (
        <p className="text-sm text-slate-400 animate-pulse">{message}</p>
      )}
    </div>
  )
}

// Full screen loading overlay
export function LoadingOverlay({ 
  message = "Loading...", 
  variant = 'farm-ecosystem',
  className = '' 
}: { 
  message?: string
  variant?: LoadingSpinnerProps['variant']
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-[#1F2A44]/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-[#0F1A2E]/90 backdrop-blur-md rounded-2xl p-8 border border-slate-700/50 shadow-2xl"
      >
        <LoadingSpinner 
          size="xl" 
          variant={variant} 
          message={message}
          className="text-center"
        />
      </motion.div>
    </motion.div>
  )
}

// Navigation loading indicator
export function NavigationLoader({ 
  message = "Navigating...",
  className = '' 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`fixed top-4 right-4 bg-[#0F1A2E]/95 backdrop-blur-md rounded-lg px-4 py-3 border border-emerald-500/30 shadow-lg z-40 ${className}`}
    >
      <div className="flex items-center gap-3">
        <LoadingSpinner size="sm" variant="plant-growth" />
        <span className="text-sm text-emerald-300 font-medium">{message}</span>
      </div>
    </motion.div>
  )
}