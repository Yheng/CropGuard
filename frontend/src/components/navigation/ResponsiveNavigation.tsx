import React from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Camera,
  BarChart3,
  Leaf,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronRight,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useConnectionState } from '../../hooks/useConnectionState'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string | number
  description?: string
  requiresConnection?: boolean
  isActive?: boolean
  children?: NavigationSubItem[]
}

interface NavigationSubItem {
  id: string
  label: string
  href: string
  badge?: string | number
  requiresConnection?: boolean
}

interface ResponsiveNavigationProps {
  items?: NavigationItem[]
  currentPath?: string
  onNavigate?: (href: string) => void
  className?: string
  showOfflineStatus?: boolean
  userRole?: 'farmer' | 'agronomist' | 'admin'
}

interface OfflineStatusProps {
  className?: string
}

const DEFAULT_FARMER_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/farmer/dashboard',
    description: 'View your crops and recent analyses'
  },
  {
    id: 'analyze',
    label: 'Analyze Crop',
    icon: Camera,
    href: '/farmer/analyze',
    description: 'Take photos to analyze crop health',
    badge: 'AI'
  },
  {
    id: 'history',
    label: 'Analysis History',
    icon: BarChart3,
    href: '/farmer/history',
    description: 'View past crop analyses and trends'
  },
  {
    id: 'treatments',
    label: 'Treatments',
    icon: Leaf,
    href: '/farmer/treatments',
    description: 'Follow treatment recommendations'
  },
  {
    id: 'support',
    label: 'Get Help',
    icon: MessageSquare,
    href: '/farmer/support',
    description: 'Contact agronomists for advice',
    requiresConnection: true
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/farmer/settings',
    description: 'Manage your account and preferences'
  }
]

const DEFAULT_AGRONOMIST_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/agronomist/dashboard',
    description: 'Overview of farmers and cases'
  },
  {
    id: 'cases',
    label: 'Active Cases',
    icon: Leaf,
    href: '/agronomist/cases',
    description: 'Review farmer submissions',
    badge: '12',
    requiresConnection: true
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/agronomist/analytics',
    description: 'Regional crop health insights',
    requiresConnection: true
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    href: '/agronomist/messages',
    description: 'Communicate with farmers',
    badge: '3',
    requiresConnection: true
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/agronomist/settings',
    description: 'Account and notification settings'
  }
]

export function ResponsiveNavigation({
  items,
  currentPath = '/',
  onNavigate,
  className,
  showOfflineStatus = true,
  userRole = 'farmer'
}: ResponsiveNavigationProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  
  // Use role-based navigation if no items provided
  const navigationItems = items || (userRole === 'farmer' ? DEFAULT_FARMER_NAVIGATION : DEFAULT_AGRONOMIST_NAVIGATION)

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleNavigate = (href: string) => {
    // Could add offline handling here
    onNavigate?.(href)
  }

  return (
    <nav className={cn('h-full flex flex-col', className)}>
      {/* Logo/Brand Section */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
              CropGuard
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 capitalize">
              {userRole} Portal
            </p>
          </div>
        </div>
      </div>

      {/* Offline Status */}
      {showOfflineStatus && (
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-dark-700">
          <OfflineStatus />
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2 sm:px-4">
          {navigationItems.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              currentPath={currentPath}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpanded={() => toggleExpanded(item.id)}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="border-t border-gray-200 dark:border-dark-700 p-4">
        <button
          onClick={() => handleNavigate('/help')}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors touch-target group"
        >
          <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
          <span className="text-sm font-medium">Help & Support</span>
        </button>
      </div>
    </nav>
  )
}

// Individual navigation item component
function NavigationItemComponent({
  item,
  currentPath,
  isExpanded,
  onToggleExpanded,
  onNavigate
}: {
  item: NavigationItem
  currentPath: string
  isExpanded: boolean
  onToggleExpanded: () => void
  onNavigate: (href: string, requiresConnection?: boolean) => void
}) {
  const { isConnected } = useConnectionState()
  const isActive = currentPath === item.href
  const isDisabled = item.requiresConnection && !isConnected
  const hasChildren = item.children && item.children.length > 0

  return (
    <div className="space-y-1">
      {/* Main item */}
      <motion.button
        onClick={() => {
          if (hasChildren) {
            onToggleExpanded()
          } else {
            onNavigate(item.href, item.requiresConnection)
          }
        }}
        disabled={isDisabled}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 sm:py-3 text-left rounded-lg transition-all duration-200 touch-target group',
          isActive
            ? 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
            : isDisabled
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700',
          !isDisabled && 'hover:transform hover:translate-x-1'
        )}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      >
        {/* Icon */}
        <div className="relative">
          <item.icon className={cn(
            'w-5 h-5 sm:w-6 sm:h-6 transition-colors',
            isActive
              ? 'text-brand-600 dark:text-brand-400'
              : isDisabled
              ? 'text-gray-400'
              : 'text-gray-500 group-hover:text-brand-500'
          )} />
          
          {/* Connection indicator for items that require connection */}
          {item.requiresConnection && (
            <div className="absolute -top-1 -right-1">
              {isConnected ? (
                <div className="w-2 h-2 bg-green-400 rounded-full" />
              ) : (
                <div className="w-2 h-2 bg-red-400 rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Label and description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium text-sm sm:text-base truncate',
              isActive && 'font-semibold'
            )}>
              {item.label}
            </span>
            
            {/* Badge */}
            {item.badge && (
              <span className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                isActive
                  ? 'bg-brand-200 dark:bg-brand-800 text-brand-800 dark:text-brand-200'
                  : 'bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
              )}>
                {item.badge}
              </span>
            )}
          </div>
          
          {/* Description for main items */}
          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {item.description}
            </p>
          )}
        </div>

        {/* Expand arrow for items with children */}
        {hasChildren && (
          <ChevronRight className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )} />
        )}
      </motion.button>

      {/* Sub-items */}
      {hasChildren && isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="ml-6 space-y-1"
        >
          {item.children?.map((subItem) => (
            <button
              key={subItem.id}
              onClick={() => onNavigate(subItem.href, subItem.requiresConnection)}
              disabled={subItem.requiresConnection && !isConnected}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors touch-target',
                currentPath === subItem.href
                  ? 'bg-brand-50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400'
                  : subItem.requiresConnection && !isConnected
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
              )}
            >
              <span className="text-sm font-medium">{subItem.label}</span>
              {subItem.badge && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded">
                  {subItem.badge}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// Offline status component
function OfflineStatus({ className }: OfflineStatusProps) {
  const { isOnline, isConnected, quality } = useConnectionState()
  const { syncStatus, hasPendingData } = useOfflineSync()

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline Mode',
        subtext: 'Working offline',
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20'
      }
    }

    if (!isConnected) {
      return {
        icon: WifiOff,
        text: 'Server Unreachable',
        subtext: 'Check connection',
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20'
      }
    }

    if (hasPendingData) {
      return {
        icon: Clock,
        text: 'Syncing Data',
        subtext: `${syncStatus?.pendingUploads || 0} pending`,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20'
      }
    }

    return {
      icon: Wifi,
      text: 'Online',
      subtext: `${quality} connection`,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    }
  }

  const status = getStatusConfig()
  const StatusIcon = status.icon

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg',
      status.bgColor,
      className
    )}>
      <StatusIcon className={cn('w-4 h-4', status.color)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', status.color)}>
          {status.text}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {status.subtext}
        </p>
      </div>
    </div>
  )
}

export default ResponsiveNavigation