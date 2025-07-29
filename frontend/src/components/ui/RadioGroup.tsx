import React from 'react'
import { cn } from '../../utils/cn'

interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  label?: string
  description?: string
  error?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

const sizeVariants = {
  sm: {
    radio: 'h-4 w-4',
    dot: 'h-2 w-2',
    text: 'text-sm'
  },
  md: {
    radio: 'h-5 w-5',
    dot: 'h-2.5 w-2.5',
    text: 'text-sm'
  },
  lg: {
    radio: 'h-6 w-6',
    dot: 'h-3 w-3',
    text: 'text-base'
  }
}

export function RadioGroup({
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
  orientation = 'vertical',
  className
}: RadioGroupProps) {
  const sizes = sizeVariants[size]

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

      <div
        className={cn(
          orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3',
          variant === 'card' && orientation === 'vertical' && 'space-y-2'
        )}
        role="radiogroup"
        aria-labelledby={label ? undefined : 'radio-group'}
        aria-required={required}
      >
        {options.map((option) => (
          <RadioOption
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            label={option.label}
            description={option.description}
            disabled={option.disabled}
            size={size}
            variant={variant}
            sizes={sizes}
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

interface RadioOptionProps {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  label: string
  description?: string
  disabled?: boolean
  size: 'sm' | 'md' | 'lg'
  variant: 'default' | 'card'
  sizes: typeof sizeVariants[keyof typeof sizeVariants]
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  variant,
  sizes
}: RadioOptionProps) {
  const radioId = React.useId()

  const radioElement = (
    <div className="relative flex items-center">
      <input
        type="radio"
        id={radioId}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2 transition-all',
          sizes.radio,
          checked
            ? 'bg-[#10B981] border-[#10B981]'
            : 'border-gray-600 bg-[#1F2A44] hover:border-gray-500',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        {checked && (
          <div
            className={cn(
              'rounded-full bg-white transition-all',
              sizes.dot
            )}
          />
        )}
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <label
        htmlFor={radioId}
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border border-gray-600 bg-[#1F2A44] transition-colors cursor-pointer hover:bg-[#4A5B7C]/50',
          checked && 'border-[#10B981] bg-[#10B981]/5',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {radioElement}
        <div className="flex-1 space-y-1">
          <div className={cn('font-medium text-white', sizes.text)}>
            {label}
          </div>
          {description && (
            <div className="text-sm text-gray-300">
              {description}
            </div>
          )}
        </div>
      </label>
    )
  }

  return (
    <label
      htmlFor={radioId}
      className={cn(
        'flex items-center gap-3 cursor-pointer',
        disabled && 'cursor-not-allowed'
      )}
    >
      {radioElement}
      <div className="flex-1 space-y-1">
        <div className={cn('text-white', sizes.text, disabled && 'text-gray-500')}>
          {label}
        </div>
        {description && (
          <div className={cn('text-sm text-gray-300', disabled && 'text-gray-500')}>
            {description}
          </div>
        )}
      </div>
    </label>
  )
}