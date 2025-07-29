import React, { useCallback, useRef, useState } from 'react'
import { useFieldMode, useFieldOptimizedStyles } from '../../contexts/FieldModeContext'

interface FieldOptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  hapticFeedback?: boolean
  autoFocusOnFieldMode?: boolean
  largeText?: boolean
}

export function FieldOptimizedInput({
  label,
  error,
  helpText,
  hapticFeedback = true,
  autoFocusOnFieldMode = false,
  largeText = false,
  className = '',
  onFocus,
  onBlur,
  ...props
}: FieldOptimizedInputProps) {
  const { settings, isFieldOptimized } = useFieldMode()
  const { getInputClasses, colors } = useFieldOptimizedStyles()
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' = 'light') => {
    if (!hapticFeedback || !settings.hapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [5],
        medium: [15]
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [hapticFeedback, settings.hapticFeedback])

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    triggerHapticFeedback('light')
    onFocus?.(event)
  }, [triggerHapticFeedback, onFocus])

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(event)
  }, [onBlur])

  const getInputSizeClasses = () => {
    if (isFieldOptimized) {
      if (settings.gloveMode) {
        return 'min-h-[76px] px-6 py-5 text-xl'
      }
      return largeText ? 'min-h-[68px] px-5 py-4 text-lg' : 'min-h-[60px] px-4 py-3 text-base'
    }
    return 'min-h-[44px] px-3 py-2 text-sm'
  }

  const getLabelClasses = () => {
    const baseClasses = 'block font-medium mb-2 transition-colors duration-200'
    const sizeClasses = isFieldOptimized ? 'text-lg' : 'text-sm'
    const colorClasses = error 
      ? 'text-red-600' 
      : isFocused 
        ? `text-[${colors.accent}]` 
        : 'text-gray-700 dark:text-gray-300'
    
    return `${baseClasses} ${sizeClasses} ${colorClasses}`
  }

  const getErrorClasses = () => {
    const baseClasses = 'mt-2 text-red-600'
    const sizeClasses = isFieldOptimized ? 'text-base font-medium' : 'text-sm'
    return `${baseClasses} ${sizeClasses}`
  }

  const getHelpTextClasses = () => {
    const baseClasses = 'mt-2 text-gray-500 dark:text-gray-400'
    const sizeClasses = isFieldOptimized ? 'text-base' : 'text-sm'
    return `${baseClasses} ${sizeClasses}`
  }

  const inputClasses = `
    ${getInputClasses()}
    ${getInputSizeClasses()}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
    ${isFocused ? 'ring-2' : ''}
    ${isFieldOptimized ? 'font-medium shadow-md' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id} className={getLabelClasses()}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          {...props}
          className={inputClasses}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocusOnFieldMode && isFieldOptimized ? true : props.autoFocus}
          style={{
            // Ensure proper touch target size
            minHeight: isFieldOptimized ? (settings.gloveMode ? '76px' : '60px') : '44px',
            fontSize: isFieldOptimized ? (settings.gloveMode ? '18px' : '16px') : '14px',
            // Disable zoom on iOS when focusing inputs
            ...(isFieldOptimized && {
              fontSize: Math.max(16, parseInt(getComputedStyle(document.documentElement).fontSize))
            })
          }}
        />
        
        {/* Focus indicator for high contrast mode */}
        {isFocused && isFieldOptimized && (
          <div 
            className="absolute inset-0 pointer-events-none border-2 rounded-lg animate-pulse"
            style={{
              borderColor: colors.accent,
              boxShadow: `0 0 0 2px ${colors.accent}40`
            }}
          />
        )}
      </div>

      {error && (
        <div className={getErrorClasses()} role="alert" aria-live="polite">
          {error}
        </div>
      )}

      {helpText && !error && (
        <div className={getHelpTextClasses()}>
          {helpText}
        </div>
      )}
    </div>
  )
}

export default FieldOptimizedInput