import React from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const cardVariants = {
  default: 'bg-[#4A5B7C] border border-gray-600',
  outlined: 'bg-transparent border border-gray-600',
  elevated: 'bg-[#4A5B7C] shadow-lg border border-gray-600',
  flat: 'bg-[#4A5B7C] border-0'
}

const paddingVariants = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8'
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg text-white transition-colors',
        cardVariants[variant],
        paddingVariants[padding],
        hover && 'hover:bg-[#4A5B7C]/80 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              {title}
            </h3>
          )}
          {action && action}
        </div>
      )}
      {description && (
        <p className="text-sm text-gray-300">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={cn('text-gray-200', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn('flex items-center pt-4', className)}
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
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className
}: StatsCardProps) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-400' : 'text-red-400'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
                {trend.label && ` ${trend.label}`}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-[#10B981]">
            {icon}
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
}

export function FeatureCard({
  title,
  description,
  icon,
  action,
  className,
  onClick
}: FeatureCardProps) {
  return (
    <Card 
      className={cn('p-6 cursor-pointer hover:bg-[#4A5B7C]/80', className)}
      onClick={onClick}
    >
      <div className="space-y-4">
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#10B981]/10 text-[#10B981]">
            {icon}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
        {action && (
          <div className="pt-2">
            {action}
          </div>
        )}
      </div>
    </Card>
  )
}