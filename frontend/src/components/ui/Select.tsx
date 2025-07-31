import React from 'react'
import { ChevronDown, Check, AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  helperText?: string
  disabled?: boolean
  fullWidth?: boolean
  searchable?: boolean
  clearable?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  error,
  helperText,
  disabled = false,
  fullWidth = false,
  searchable = false,
  clearable = false,
  className
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const selectRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const optionsRef = React.useRef<HTMLDivElement>(null)
  const selectId = React.useId()

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm, searchable])

  const selectedOption = options.find(option => option.value === value)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      setSearchTerm('')
    }
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault()
          setIsOpen(true)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          // Focus first option
          const firstOption = optionsRef.current?.querySelector('[role="option"]') as HTMLElement
          firstOption?.focus()
        }
        break
    }
  }

  const handleOptionKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleSelect(optionValue)
        break
      case 'Escape':
        setIsOpen(false)
        break
      case 'ArrowDown': {
        e.preventDefault()
        const nextElement = (e.target as HTMLElement).nextElementSibling as HTMLElement
        nextElement?.focus()
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prevElement = (e.target as HTMLElement).previousElementSibling as HTMLElement
        prevElement?.focus()
        break
      }
    }
  }

  return (
    <div className={cn('relative', fullWidth && 'w-full')} ref={selectRef}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'block text-sm font-medium text-gray-200 mb-2',
            disabled && 'text-gray-500'
          )}
        >
          {label}
        </label>
      )}
      
      <div
        id={selectId}
        className={cn(
          'relative flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-600 bg-[#1F2A44] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-500 focus-visible:ring-red-500/50',
          className
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex-1 flex items-center gap-2">
          {searchable && isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={cn(!selectedOption && 'text-gray-400')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {clearable && value && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-200"
              tabIndex={-1}
            >
              ✕
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          ref={optionsRef}
          className="absolute z-50 w-full mt-1 bg-[#1F2A44] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              {searchable ? 'No options found' : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-[#4A5B7C] focus:bg-[#4A5B7C] focus:outline-none',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  value === option.value && 'bg-[#10B981]/10 text-[#10B981]'
                )}
                onClick={() => !option.disabled && handleSelect(option.value)}
                onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
                role="option"
                aria-selected={value === option.value}
                tabIndex={-1}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {(error || helperText) && (
        <div className="flex items-center gap-1 text-sm mt-2">
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

// Multi-select component
interface MultiSelectProps extends Omit<SelectProps, 'value' | 'onChange'> {
  value: string[]
  onChange: (value: string[]) => void
  maxSelected?: number
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  label,
  error,
  helperText,
  disabled = false,
  fullWidth = false,
  searchable = false,
  maxSelected,
  className
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const selectRef = React.useRef<HTMLDivElement>(null)
  const selectId = React.useId()

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm, searchable])

  const selectedOptions = options.filter(option => value.includes(option.value))

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      setSearchTerm('')
    }
  }

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      if (!maxSelected || value.length < maxSelected) {
        onChange([...value, optionValue])
      }
    }
  }

  const handleRemoveTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }

  // const getDisplayText = () => {
  //   if (selectedOptions.length === 0) return placeholder
  //   if (selectedOptions.length === 1) return selectedOptions[0].label
  //   return `${selectedOptions.length} selected`
  // }

  return (
    <div className={cn('relative', fullWidth && 'w-full')} ref={selectRef}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'block text-sm font-medium text-gray-200 mb-2',
            disabled && 'text-gray-500'
          )}
        >
          {label}
        </label>
      )}
      
      <div
        id={selectId}
        className={cn(
          'relative flex min-h-[2.5rem] w-full cursor-pointer items-center justify-between rounded-lg border border-gray-600 bg-[#1F2A44] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-500 focus-visible:ring-red-500/50',
          className
        )}
        onClick={handleToggle}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <>
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#10B981]/20 text-[#10B981] rounded text-xs"
                >
                  {option.label}
                  <button
                    onClick={(e) => handleRemoveTag(option.value, e)}
                    className="hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{selectedOptions.length - 3} more
                </span>
              )}
            </>
          )}
        </div>
        
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform ml-2',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1F2A44] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-600">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1 bg-[#4A5B7C] rounded text-sm outline-none"
              />
            </div>
          )}
          
          <div role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {searchable ? 'No options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value)
                const isDisabled = option.disabled || (maxSelected && !isSelected && value.length >= maxSelected)
                
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-[#4A5B7C]',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      isSelected && 'bg-[#10B981]/10 text-[#10B981]'
                    )}
                    onClick={() => !isDisabled && handleSelect(option.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {(error || helperText) && (
        <div className="flex items-center gap-1 text-sm mt-2">
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