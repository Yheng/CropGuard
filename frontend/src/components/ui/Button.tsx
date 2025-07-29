import React from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  rounded?: boolean
  elevated?: boolean
  animated?: boolean
}

const buttonVariants = {
  primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-sm dark:shadow-dark-sm border border-transparent focus:ring-brand-200 dark:focus:ring-brand-800',
  secondary: 'bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700 active:bg-gray-100 dark:active:bg-dark-600 text-gray-900 dark:text-white shadow-sm dark:shadow-dark-sm border border-gray-200 dark:border-dark-600 focus:ring-gray-200 dark:focus:ring-dark-600',
  outline: 'bg-transparent hover:bg-brand-50 dark:hover:bg-brand-900/20 active:bg-brand-100 dark:active:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 focus:ring-brand-200 dark:focus:ring-brand-800',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-dark-700 active:bg-gray-200 dark:active:bg-dark-600 text-gray-700 dark:text-gray-300 border border-transparent focus:ring-gray-200 dark:focus:ring-dark-600',
  danger: 'bg-error-500 hover:bg-error-600 active:bg-error-700 text-white shadow-sm dark:shadow-dark-sm border border-transparent focus:ring-error-200 dark:focus:ring-error-800',
  success: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white shadow-sm dark:shadow-dark-sm border border-transparent focus:ring-success-200 dark:focus:ring-success-800',
  warning: 'bg-warning-500 hover:bg-warning-600 active:bg-warning-700 text-white shadow-sm dark:shadow-dark-sm border border-transparent focus:ring-warning-200 dark:focus:ring-warning-800'
}

const buttonSizes = {
  xs: 'h-8 px-2.5 text-xs gap-1.5 min-w-[2rem]',
  sm: 'h-9 px-3 text-sm gap-2 min-w-[2.25rem] touch-target',
  md: 'h-10 px-4 text-sm gap-2 min-w-[2.5rem] touch-target',
  lg: 'h-11 px-6 text-base gap-2.5 min-w-[2.75rem] touch-target',
  xl: 'h-12 px-8 text-lg gap-3 min-w-[3rem] touch-target'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  elevated = false,
  animated = true,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const buttonElement = (
    <button
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
        
        // Disabled styles
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none',
        
        // Size and spacing
        buttonSizes[size],
        
        // Variant styles
        buttonVariants[variant],
        
        // Shape modifications
        rounded ? 'rounded-full' : 'rounded-lg',
        
        // Elevation
        elevated && !isDisabled && 'shadow-lg hover:shadow-xl',
        
        // Width
        fullWidth && 'w-full',
        
        // Animation enhancement
        animated && !isDisabled && 'hover:transform hover:-translate-y-0.5 active:transform active:translate-y-0',
        
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className={cn(
            'animate-spin',
            size === 'xs' && 'h-3 w-3',
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )} />
        </div>
      )}
      
      {/* Content wrapper with opacity control for loading */}
      <div className={cn(
        'flex items-center justify-center',
        loading && 'opacity-0'
      )}>
        {/* Left icon */}
        {leftIcon && (
          <span className={cn(
            'flex items-center justify-center flex-shrink-0',
            size === 'xs' && 'h-3 w-3',
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-4 w-4', 
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )}>
            {leftIcon}
          </span>
        )}
        
        {/* Button text */}
        {children && (
          <span className={cn(
            'truncate',
            (leftIcon || rightIcon) && children && 'mx-1'
          )}>
            {children}
          </span>
        )}
        
        {/* Right icon */}
        {rightIcon && (
          <span className={cn(
            'flex items-center justify-center flex-shrink-0',
            size === 'xs' && 'h-3 w-3',
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )}>
            {rightIcon}
          </span>
        )}
      </div>
    </button>
  )

  // Wrap with motion if animated
  if (animated && !isDisabled) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {buttonElement}
      </motion.div>
    )
  }

  return buttonElement
}

// Specialized button components
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />
}

export function OutlineButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="outline" {...props} />
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />
}

export function SuccessButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="success" {...props} />
}

export function WarningButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="warning" {...props} />
}

// Floating Action Button (FAB) for mobile
export function FloatingActionButton({
  className,
  children,
  ...props
}: Omit<ButtonProps, 'variant' | 'size' | 'rounded'>) {
  return (
    <Button
      variant="primary"
      size="lg"
      rounded
      elevated
      className={cn(
        'fixed bottom-6 right-6 z-50 shadow-glow hover:shadow-glow-lg',
        'sm:bottom-8 sm:right-8',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

// Icon-only button
export function IconButton({
  children,
  className,
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <Button
      className={cn('aspect-square p-0', className)}
      size={size}
      {...props}
    >
      {children}
    </Button>
  )
}

// Button group for related actions
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  size = 'md',
  variant = 'secondary'
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        '[&>button]:rounded-none',
        '[&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg',
        orientation === 'vertical' && '[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-r-none',
        '[&>button:not(:first-child)]:border-l-0',
        orientation === 'vertical' && '[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0',
        className
      )}
      role="group"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Button) {
          return React.cloneElement(child as React.ReactElement<ButtonProps>, {
            size: child.props.size || size,
            variant: child.props.variant || variant
          })
        }
        return child
      })}
    </div>
  )
}