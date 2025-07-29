import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'flat' | 'glass'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  animated?: boolean
  loading?: boolean
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
  divider?: boolean
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean
}

const cardVariants = {
  default: 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 shadow-sm dark:shadow-dark-sm',
  outlined: 'bg-transparent border border-gray-200 dark:border-dark-700',
  elevated: 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 shadow-lg dark:shadow-dark-lg',
  flat: 'bg-white dark:bg-dark-800',
  glass: 'bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-dark-700/50'
}

const paddingVariants = {
  none: 'p-0',
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
  xl: 'p-8 sm:p-10'
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  animated = false,
  loading = false,
  children,
  ...props
}: CardProps) {
  const cardContent = (
    <div
      className={cn(
        'rounded-xl transition-all duration-200 overflow-hidden',
        'text-gray-900 dark:text-white',
        cardVariants[variant],
        paddingVariants[padding],
        hover && 'hover:shadow-md dark:hover:shadow-dark-md cursor-pointer transform hover:-translate-y-1',
        loading && 'opacity-50 pointer-events-none',
        className
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm z-10">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {children}
    </div>
  )

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
        whileTap={hover ? { scale: 0.98 } : undefined}
      >
        {cardContent}
      </motion.div>
    )
  }

  return cardContent
}

export function CardHeader({
  className,
  title,
  description,
  action,
  divider = false,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-2',
        divider && 'pb-4 border-b border-gray-200 dark:border-dark-700 mb-4',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          {title && (
            <h3 className="text-lg sm:text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

export function CardContent({
  className,
  loading = false,
  children,
  ...props
}: CardContentProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)} {...props}>
        {/* Skeleton loading */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded animate-pulse w-5/6" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('text-gray-700 dark:text-gray-300', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  divider = false,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 flex-wrap',
        divider && 'pt-4 border-t border-gray-200 dark:border-dark-700 mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Specialized card components
interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  className?: string
  animated?: boolean
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  animated = true,
  loading = false
}: StatsCardProps) {
  return (
    <Card className={className} animated={animated} loading={loading} padding="lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              ) : (
                value
              )}
            </span>
            {trend && !loading && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  trend.isPositive 
                    ? 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400' 
                    : 'bg-error-100 dark:bg-error-900/20 text-error-700 dark:text-error-400'
                )}
              >
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                {trend.label && ` ${trend.label}`}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {loading ? (
                <div className="h-4 w-32 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              ) : (
                description
              )}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400">
              {loading ? (
                <div className="w-6 h-6 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              ) : (
                icon
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  animated?: boolean
}

export function FeatureCard({
  title,
  description,
  icon,
  action,
  className,
  onClick,
  disabled = false,
  loading = false,
  animated = true
}: FeatureCardProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={disabled ? undefined : onClick}
      hover={!disabled}
      animated={animated}
      loading={loading}
      padding="lg"
    >
      <div className="space-y-4">
        {icon && (
          <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400">
            {loading ? (
              <div className="w-6 h-6 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
            ) : (
              icon
            )}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {loading ? (
              <div className="h-6 w-32 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
            ) : (
              title
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              </div>
            ) : (
              description
            )}
          </p>
        </div>
        {action && !loading && (
          <div className="pt-2">
            {action}
          </div>
        )}
      </div>
    </Card>
  )
}

// Additional specialized cards for CropGuard
interface ImageCardProps {
  src: string
  alt: string
  title?: string
  description?: string
  overlay?: React.ReactNode
  className?: string
  onClick?: () => void
  loading?: boolean
}

export function ImageCard({
  src,
  alt,
  title,
  description,
  overlay,
  className,
  onClick,
  loading = false
}: ImageCardProps) {
  return (
    <Card 
      className={cn('overflow-hidden group', className)}
      onClick={onClick}
      hover={!!onClick}
      padding="none"
    >
      <div className="relative">
        {loading ? (
          <div className="aspect-video bg-gray-200 dark:bg-dark-700 animate-pulse" />
        ) : (
          <img 
            src={src} 
            alt={alt}
            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {overlay && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {overlay}
          </div>
        )}
      </div>
      {(title || description) && (
        <div className="p-4 space-y-2">
          {title && (
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {loading ? (
                <div className="h-5 w-24 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              ) : (
                title
              )}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? (
                <div className="h-4 w-32 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
              ) : (
                description
              )}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// Compact card for mobile-first design
interface CompactCardProps {
  title: string
  value?: string | number
  icon?: React.ReactNode
  status?: 'success' | 'warning' | 'error' | 'info'
  className?: string
  onClick?: () => void
}

export function CompactCard({
  title,
  value,
  icon,
  status,
  className,
  onClick
}: CompactCardProps) {
  const statusColors = {
    success: 'border-l-success-500 bg-success-50 dark:bg-success-900/10',
    warning: 'border-l-warning-500 bg-warning-50 dark:bg-warning-900/10',
    error: 'border-l-error-500 bg-error-50 dark:bg-error-900/10',
    info: 'border-l-brand-500 bg-brand-50 dark:bg-brand-900/10'
  }

  return (
    <Card
      className={cn(
        'border-l-4',
        status && statusColors[status],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      hover={!!onClick}
      padding="md"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </p>
          {value && (
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-3 text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}