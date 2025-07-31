import React, { useCallback, useRef, useState } from 'react'
import { useFieldMode } from '../../contexts/FieldModeContext'

interface FieldOptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hapticFeedback?: boolean
  children: React.ReactNode
  onLongPress?: () => void
  longPressDelay?: number
}

export function FieldOptimizedButton({
  variant = 'primary',
  size = 'md',
  hapticFeedback = true,
  children,
  onLongPress,
  longPressDelay,
  onClick,
  onTouchStart,
  onTouchEnd,
  onMouseDown,
  onMouseUp,
  className = '',
  disabled,
  ...props
}: FieldOptimizedButtonProps) {
  const { settings, isFieldOptimized } = useFieldMode()
  const getButtonClasses = (_variant?: string) => ''
  const getPressTimeout = () => 300
  const [isPressed, setIsPressed] = useState(false)
  const [isLongPressed, setIsLongPressed] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const pressStartTime = useRef<number | null>(null)

  const effectiveLongPressDelay = longPressDelay || getPressTimeout()

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !settings.hapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [hapticFeedback, settings.hapticFeedback])

  const startPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return
    
    setIsPressed(true)
    pressStartTime.current = Date.now()
    triggerHapticFeedback('light')

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsLongPressed(true)
        triggerHapticFeedback('heavy')
        onLongPress()
      }, effectiveLongPressDelay)
    }

    // Call original handlers
    if ('touches' in event) {
      onTouchStart?.(event as React.TouchEvent<HTMLButtonElement>)
    } else {
      onMouseDown?.(event as React.MouseEvent<HTMLButtonElement>)
    }
  }, [disabled, onLongPress, effectiveLongPressDelay, triggerHapticFeedback, onTouchStart, onMouseDown])

  const endPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    const pressDuration = pressStartTime.current ? Date.now() - pressStartTime.current : 0
    
    setIsPressed(false)
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    // Only trigger click if it wasn't a long press and minimum press time is met
    const minPressTime = settings.gloveMode ? 150 : 100
    if (!isLongPressed && pressDuration >= minPressTime && onClick && !disabled) {
      triggerHapticFeedback('medium')
      onClick(event as React.MouseEvent<HTMLButtonElement>)
    }

    setIsLongPressed(false)

    // Call original handlers
    if ('touches' in event) {
      onTouchEnd?.(event as React.TouchEvent<HTMLButtonElement>)
    } else {
      onMouseUp?.(event as React.MouseEvent<HTMLButtonElement>)
    }
  }, [isLongPressed, onClick, disabled, settings.gloveMode, triggerHapticFeedback, onTouchEnd, onMouseUp])

  const getSizeClasses = () => {
    if (isFieldOptimized) {
      switch (size) {
        case 'sm': return 'min-h-[48px] px-4 py-2 text-sm'
        case 'lg': return 'min-h-[68px] px-8 py-4 text-xl'
        case 'xl': return 'min-h-[76px] px-10 py-5 text-2xl'
        default: return 'min-h-[60px] px-6 py-3 text-lg'
      }
    }
    
    switch (size) {
      case 'sm': return 'min-h-[36px] px-3 py-1.5 text-sm'
      case 'lg': return 'min-h-[52px] px-6 py-3 text-lg'
      case 'xl': return 'min-h-[60px] px-8 py-4 text-xl'
      default: return 'min-h-[44px] px-4 py-2 text-base'
    }
  }

  const getVariantClasses = () => {
    const baseClasses = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]'
    
    switch (variant) {
      case 'secondary':
        return `${baseClasses} ${getButtonClasses('secondary')}`
      case 'danger':
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/20 border-2 border-transparent ${isFieldOptimized ? 'border-red-800' : ''}`
      case 'success':
        return `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500/20 border-2 border-transparent ${isFieldOptimized ? 'border-green-800' : ''}`
      default:
        return `${baseClasses} ${getButtonClasses('primary')}`
    }
  }

  const getPressedClasses = () => {
    return isPressed ? 'scale-95 shadow-inner' : ''
  }

  const combinedClasses = `
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${getPressedClasses()}
    ${isFieldOptimized ? 'font-bold shadow-lg' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <button
      {...props}
      className={combinedClasses}
      disabled={disabled}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={() => {
        // Cancel long press if mouse leaves button
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
        }
        setIsPressed(false)
        setIsLongPressed(false)
      }}
      style={{
        // Ensure minimum touch target size
        minWidth: isFieldOptimized ? (settings.gloveMode ? '76px' : '60px') : '44px',
        touchAction: 'manipulation', // Prevent double-tap zoom
        WebkitTouchCallout: 'none', // Prevent callout on iOS
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </button>
  )
}

export default FieldOptimizedButton