import React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../utils/cn'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  error?: string
  indeterminate?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
}

const sizeVariants = {
  sm: {
    checkbox: 'h-4 w-4',
    icon: 'h-3 w-3',
    text: 'text-sm'
  },
  md: {
    checkbox: 'h-5 w-5',
    icon: 'h-4 w-4',
    text: 'text-sm'
  },
  lg: {
    checkbox: 'h-6 w-6',
    icon: 'h-5 w-5',
    text: 'text-base'
  }
}

export function Checkbox({
  className,
  label,
  description,
  error,
  indeterminate = false,
  size = 'md',
  variant = 'default',
  checked,
  disabled,
  id,
  ...props
}: CheckboxProps) {
  const checkboxRef = React.useRef<HTMLInputElement>(null)
  const checkboxId = id || React.useId()

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const sizes = sizeVariants[size]

  const checkboxElement = (
    <div className="relative flex items-center">
      <input
        ref={checkboxRef}
        type="checkbox"
        id={checkboxId}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      
      <div
        className={cn(
          'flex items-center justify-center rounded border-2 transition-all',
          sizes.checkbox,
          checked || indeterminate
            ? 'bg-[#10B981] border-[#10B981] text-white'
            : 'border-gray-600 bg-[#1F2A44] hover:border-gray-500',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500',
          !disabled && 'cursor-pointer',
          className
        )}
      >
        {checked && !indeterminate && (
          <Check className={cn(sizes.icon, 'text-white')} />
        )}
        {indeterminate && (
          <Minus className={cn(sizes.icon, 'text-white')} />
        )}
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border border-gray-600 bg-[#1F2A44] transition-colors cursor-pointer hover:bg-[#4A5B7C]/50',
          checked && 'border-[#10B981] bg-[#10B981]/5',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-500'
        )}
      >
        {checkboxElement}
        <div className="flex-1 space-y-1">
          {label && (
            <div className={cn('font-medium text-white', sizes.text)}>
              {label}
            </div>
          )}
          {description && (
            <div className="text-sm text-gray-300">
              {description}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}
        </div>
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-center gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed'
        )}
      >
        {checkboxElement}
        <div className="flex-1 space-y-1">
          {label && (
            <div className={cn('text-white', sizes.text, disabled && 'text-gray-500')}>
              {label}
            </div>
          )}
          {description && (
            <div className={cn('text-gray-300', disabled && 'text-gray-500')}>
              {description}
            </div>
          )}
        </div>
      </label>
      
      {error && (
        <div className="text-sm text-red-500 ml-8">
          {error}
        </div>
      )}
    </div>
  )
}

// Checkbox group component
interface CheckboxGroupProps {
  name: string
  value: string[]
  onChange: (value: string[]) => void
  options: Array<{
    value: string
    label: string
    description?: string
    disabled?: boolean
  }>
  label?: string
  description?: string
  error?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  max?: number
  className?: string
}

export function CheckboxGroup({
  name,
  value,
  onChange,
  options,
  label,
  description,
  error,
  required = false,
  size = 'md',
  variant = 'default',
  max,
  className
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      if (!max || value.length < max) {
        onChange([...value, optionValue])
      }
    } else {
      onChange(value.filter(v => v !== optionValue))
    }
  }

  return (
    <fieldset className={cn('space-y-4', className)}>
      {label && (
        <legend className="text-sm font-medium text-gray-200">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </legend>
      )}
      
      {description && (
        <p className="text-sm text-gray-400">
          {description}
        </p>
      )}

      <div className={cn('space-y-3', variant === 'card' && 'space-y-2')}>
        {options.map((option) => {
          const isChecked = value.includes(option.value)
          const isDisabled = option.disabled || (max && !isChecked && value.length >= max)
          
          return (
            <Checkbox
              key={option.value}
              name={name}
              value={option.value}
              checked={isChecked}
              onChange={(e) => handleChange(option.value, e.target.checked)}
              label={option.label}
              description={option.description}
              disabled={!!isDisabled}
              size={size}
              variant={variant}
            />
          )
        })}
      </div>

      {max && (
        <p className="text-xs text-gray-400">
          Select up to {max} option{max !== 1 ? 's' : ''}
          {value.length > 0 && ` (${value.length}/${max} selected)`}
        </p>
      )}

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
    </fieldset>
  )
}