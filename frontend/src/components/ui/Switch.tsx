import React from 'react'
import { cn } from '../../utils/cn'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  labelPosition?: 'left' | 'right'
}

const sizeVariants = {
  sm: {
    switch: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
    text: 'text-sm'
  },
  md: {
    switch: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
    text: 'text-sm'
  },
  lg: {
    switch: 'h-7 w-12',
    thumb: 'h-6 w-6',
    translate: 'translate-x-5',
    text: 'text-base'
  }
}

export function Switch({
  className,
  label,
  description,
  error,
  size = 'md',
  variant = 'default',
  labelPosition = 'right',
  checked,
  disabled,
  id,
  ...props
}: SwitchProps) {
  const switchId = id || React.useId()
  const sizes = sizeVariants[size]

  const switchElement = (
    <div className="relative flex items-center">
      <input
        type="checkbox"
        id={switchId}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      
      <div
        className={cn(
          'relative inline-flex items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2A44]',
          sizes.switch,
          checked
            ? 'bg-[#10B981]'
            : 'bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer',
          className
        )}
      >
        <div
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-lg transform ring-0 transition-transform',
            sizes.thumb,
            checked ? sizes.translate : 'translate-x-0.5'
          )}
        />
      </div>
    </div>
  )

  const textContent = (
    <div className="flex-1">
      {label && (
        <div className={cn('font-medium text-white', sizes.text, disabled && 'text-gray-500')}>
          {label}
        </div>
      )}
      {description && (
        <div className={cn('text-sm text-gray-300', disabled && 'text-gray-500')}>
          {description}
        </div>
      )}
    </div>
  )

  if (variant === 'card') {
    return (
      <div className="space-y-2">
        <label
          htmlFor={switchId}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg border border-gray-600 bg-[#1F2A44] transition-colors cursor-pointer hover:bg-[#4A5B7C]/50',
            checked && 'border-[#10B981] bg-[#10B981]/5',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {labelPosition === 'left' && textContent}
          {switchElement}
          {labelPosition === 'right' && textContent}
        </label>
        
        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={switchId}
        className={cn(
          'flex items-center gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed'
        )}
      >
        {labelPosition === 'left' && textContent}
        {switchElement}
        {labelPosition === 'right' && textContent}
      </label>
      
      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  )
}

// Switch group component for multiple related switches
interface SwitchGroupProps {
  switches: Array<{
    id: string
    label: string
    description?: string
    checked: boolean
    disabled?: boolean
  }>
  onChange: (id: string, checked: boolean) => void
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  className?: string
}

export function SwitchGroup({
  switches,
  onChange,
  label,
  description,
  error,
  size = 'md',
  variant = 'default',
  className
}: SwitchGroupProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      {label && (
        <legend className="text-sm font-medium text-gray-200">
          {label}
        </legend>
      )}
      
      {description && (
        <p className="text-sm text-gray-400">
          {description}
        </p>
      )}

      <div className={cn('space-y-3', variant === 'card' && 'space-y-2')}>
        {switches.map((switchItem) => (
          <Switch
            key={switchItem.id}
            checked={switchItem.checked}
            onChange={(e) => onChange(switchItem.id, e.target.checked)}
            label={switchItem.label}
            description={switchItem.description}
            disabled={switchItem.disabled}
            size={size}
            variant={variant}
          />
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
    </fieldset>
  )
}