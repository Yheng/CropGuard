import React from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  variant?: 'default' | 'filled' | 'underlined'
}

export function Input({
  className,
  type,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  variant = 'default',
  id,
  disabled,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const generatedId = React.useId()
  const inputId = id || generatedId
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const baseStyles = 'flex h-10 w-full rounded-lg border border-gray-600 bg-[#1F2A44] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 disabled:cursor-not-allowed disabled:opacity-50'
  
  const variantStyles = {
    default: baseStyles,
    filled: 'flex h-10 w-full rounded-lg bg-[#4A5B7C] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 disabled:cursor-not-allowed disabled:opacity-50',
    underlined: 'flex h-10 w-full border-0 border-b border-gray-600 bg-transparent px-0 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-[#10B981] disabled:cursor-not-allowed disabled:opacity-50 rounded-none'
  }

  return (
    <div className={cn('space-y-2', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium text-gray-200',
            disabled && 'text-gray-500'
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          type={inputType}
          id={inputId}
          className={cn(
            variantStyles[variant],
            leftIcon && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            error && 'border-red-500 focus-visible:ring-red-500/50',
            className
          )}
          disabled={disabled}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
        
        {rightIcon && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="flex items-center gap-1 text-sm">
          {error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-500">{error}</span>
            </>
          ) : (
            <span className="text-gray-400">{helperText}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Specialized input components
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export function TextArea({
  className,
  label,
  error,
  helperText,
  fullWidth = false,
  id,
  disabled,
  ...props
}: TextAreaProps) {
  const generatedId = React.useId()
  const textareaId = id || generatedId

  return (
    <div className={cn('space-y-2', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={textareaId}
          className={cn(
            'text-sm font-medium text-gray-200',
            disabled && 'text-gray-500'
          )}
        >
          {label}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-gray-600 bg-[#1F2A44] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          error && 'border-red-500 focus-visible:ring-red-500/50',
          className
        )}
        disabled={disabled}
        {...props}
      />
      
      {(error || helperText) && (
        <div className="flex items-center gap-1 text-sm">
          {error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-500">{error}</span>
            </>
          ) : (
            <span className="text-gray-400">{helperText}</span>
          )}
        </div>
      )}
    </div>
  )
}