import React from 'react'
import { cn } from '../../utils/cn'

// Screen reader only text component
interface ScreenReaderOnlyProps {
  children: React.ReactNode
  className?: string
}

export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        className
      )}
    >
      {children}
    </span>
  )
}

// Skip navigation link
interface SkipNavProps {
  href?: string
  children?: React.ReactNode
  className?: string
}

export function SkipNav({ href = '#main-content', children = 'Skip to main content', className }: SkipNavProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'px-4 py-2 bg-[#10B981] text-white rounded-lg font-medium',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  )
}

// Focus trap component
interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  restoreFocus?: boolean
  initialFocus?: React.RefObject<HTMLElement>
  className?: string
}

export function FocusTrap({ 
  children, 
  active = true, 
  restoreFocus = true,
  initialFocus,
  className 
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  const getFocusableElements = React.useCallback(() => {
    if (!containerRef.current) return []
    
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }, [])

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!active || e.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }, [active, getFocusableElements])

  React.useEffect(() => {
    if (!active) return

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement

    // Set initial focus
    const focusableElements = getFocusableElements()
    if (initialFocus?.current) {
      initialFocus.current.focus()
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore previous focus
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [active, handleKeyDown, restoreFocus, initialFocus, getFocusableElements])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

// Announce component for screen readers
interface AnnounceProps {
  message: string
  priority?: 'polite' | 'assertive'
  delay?: number
}

export function Announce({ message, priority = 'polite', delay = 100 }: AnnounceProps) {
  const [announcement, setAnnouncement] = React.useState('')

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnnouncement(message)
    }, delay)

    return () => clearTimeout(timer)
  }, [message, delay])

  React.useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        setAnnouncement('')
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [announcement])

  if (!announcement) return null

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// Roving tabindex manager
interface RovingTabIndexProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
  className?: string
}

export function RovingTabIndex({ 
  children, 
  orientation = 'both', 
  wrap = true,
  className 
}: RovingTabIndexProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const getNavigableElements = React.useCallback(() => {
    if (!containerRef.current) return []
    
    return Array.from(
      containerRef.current.querySelectorAll('[data-roving-tabindex-item]')
    ) as HTMLElement[]
  }, [])

  const updateTabIndices = React.useCallback((activeIdx: number) => {
    const elements = getNavigableElements()
    
    elements.forEach((element, index) => {
      element.tabIndex = index === activeIdx ? 0 : -1
    })
  }, [getNavigableElements])

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    const elements = getNavigableElements()
    if (elements.length === 0) return

    let newIndex = activeIndex

    const isHorizontalKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight'
    const isVerticalKey = e.key === 'ArrowUp' || e.key === 'ArrowDown'

    if (
      (orientation === 'horizontal' && isHorizontalKey) ||
      (orientation === 'vertical' && isVerticalKey) ||
      (orientation === 'both' && (isHorizontalKey || isVerticalKey))
    ) {
      e.preventDefault()

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIndex = activeIndex > 0 ? activeIndex - 1 : wrap ? elements.length - 1 : 0
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIndex = activeIndex < elements.length - 1 ? activeIndex + 1 : wrap ? 0 : elements.length - 1
      }

      setActiveIndex(newIndex)
      elements[newIndex]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
      elements[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const lastIndex = elements.length - 1
      setActiveIndex(lastIndex)
      elements[lastIndex]?.focus()
    }
  }, [activeIndex, orientation, wrap, getNavigableElements])

  React.useEffect(() => {
    updateTabIndices(activeIndex)
  }, [activeIndex, updateTabIndices])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

// High contrast mode detector
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    setIsHighContrast(mediaQuery.matches)
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [])

  return isHighContrast
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    setPrefersReducedMotion(mediaQuery.matches)
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}

// Live region for dynamic content announcements
interface LiveRegionProps {
  message: string
  priority?: 'off' | 'polite' | 'assertive'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

export function LiveRegion({ 
  message, 
  priority = 'polite', 
  atomic = true,
  relevant = 'all',
  className 
}: LiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  )
}

// Accessible disclosure widget
interface DisclosureProps {
  children: React.ReactNode
  trigger: React.ReactNode
  defaultOpen?: boolean
  onToggle?: (isOpen: boolean) => void
  className?: string
}

export function Disclosure({ 
  children, 
  trigger, 
  defaultOpen = false, 
  onToggle,
  className 
}: DisclosureProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const triggerId = React.useId()
  const contentId = React.useId()

  const handleToggle = React.useCallback(() => {
    const newState = !isOpen
    setIsOpen(newState)
    onToggle?.(newState)
  }, [isOpen, onToggle])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }, [handleToggle])

  return (
    <div className={className}>
      <div
        id={triggerId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {trigger}
      </div>
      
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  )
}

// Accessible tooltip
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({ 
  children, 
  content, 
  placement = 'top', 
  delay = 500,
  className 
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [shouldShow, setShouldShow] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  const tooltipId = React.useId()

  const showTooltip = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }, [delay])

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
    setShouldShow(false)
  }, [])

  const handleMouseEnter = React.useCallback(() => {
    setShouldShow(true)
    showTooltip()
  }, [showTooltip])

  const handleFocus = React.useCallback(() => {
    setShouldShow(true)
    setIsVisible(true)
  }, [])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideTooltip()
    }
  }, [hideTooltip])

  React.useEffect(() => {
    const currentTimeout = timeoutRef.current
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [])

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTooltip}
        onFocus={handleFocus}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
      
      {shouldShow && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg',
            'opacity-0 transition-opacity duration-200',
            isVisible && 'opacity-100',
            {
              'bottom-full mb-2 left-1/2 transform -translate-x-1/2': placement === 'top',
              'top-full mt-2 left-1/2 transform -translate-x-1/2': placement === 'bottom',
              'right-full mr-2 top-1/2 transform -translate-y-1/2': placement === 'left',
              'left-full ml-2 top-1/2 transform -translate-y-1/2': placement === 'right'
            }
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}