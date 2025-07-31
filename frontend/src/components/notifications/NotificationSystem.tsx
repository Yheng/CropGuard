import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Info,
  CheckCircle,
  User,
  Leaf,
  Settings,
  Award,
  FileText,
  Cloud
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  category: 'analysis' | 'review' | 'system' | 'account' | 'crop_health' | 'weather' | 'achievement'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: string
  read: boolean
  actionable: boolean
  actions?: NotificationAction[]
  metadata?: {
    userId?: string
    analysisId?: string
    cropType?: string
    region?: string
    severity?: number
    [key: string]: unknown
  }
  targetRoles: ('farmer' | 'agronomist' | 'admin')[]
  expiresAt?: string
}

export interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  onClick: (notification: Notification) => void
}

interface NotificationSystemProps {
  notifications: Notification[]
  userRole: 'farmer' | 'agronomist' | 'admin'
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
  onDismiss?: (notificationId: string) => void
  onClearAll?: () => void
  className?: string
}

interface NotificationPanelProps extends NotificationSystemProps {
  isOpen: boolean
  onClose: () => void
  maxHeight?: number
}

// Role-specific notification filtering and prioritization
const filterNotificationsForRole = (
  notifications: Notification[],
  userRole: 'farmer' | 'agronomist' | 'admin'
): Notification[] => {
  const now = new Date()
  
  return notifications
    .filter(notification => {
      // Check if notification is for this role
      if (!notification.targetRoles.includes(userRole)) {
        return false
      }
      
      // Check if notification hasn't expired
      if (notification.expiresAt && new Date(notification.expiresAt) < now) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by read status (unread first)
      if (a.read !== b.read) return a.read ? 1 : -1
      
      // Finally by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
}

// Get role-specific notification templates
// Note: This function is available for future use in generating role-specific templates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNotificationTemplatesForRole = (role: 'farmer' | 'agronomist' | 'admin') => {
  const baseTemplates = {
    farmer: [
      {
        category: 'analysis',
        examples: [
          'Analysis complete: Pest detected in your tomato crop',
          'High severity issue found - immediate action recommended',
          'Treatment suggestion updated based on weather conditions'
        ]
      },
      {
        category: 'crop_health',
        examples: [
          'Weekly crop health report available',
          'Improvement detected in Field A health score',
          'New organic treatment recommendation'
        ]
      },
      {
        category: 'weather',
        examples: [
          'Weather alert: Heavy rain expected - check drainage',
          'Optimal spraying conditions for next 48 hours',
          'Frost warning - protect sensitive crops'
        ]
      }
    ],
    agronomist: [
      {
        category: 'review',
        examples: [
          '5 new analyses pending your review',
          'High-priority review: Severe pest infestation detected',
          'Review deadline approaching for Case #1234'
        ]
      },
      {
        category: 'achievement',
        examples: [
          'Congratulations! 100 reviews completed',
          '95% accuracy rate achieved this month',
          'New expertise badge earned: Organic Treatments'
        ]
      },
      {
        category: 'system',
        examples: [
          'New farmers assigned to your region',
          'Regional crop health summary available',
          'Training module updated with new content'
        ]
      }
    ],
    admin: [
      {
        category: 'system',
        examples: [
          'System maintenance scheduled for tonight',
          'New user registrations: 15 farmers, 2 agronomists',
          'API usage threshold exceeded - scaling recommended'
        ]
      },
      {
        category: 'account',
        examples: [
          'Suspicious login activity detected for user #5678',
          'Monthly system report generated',
          'Backup completed successfully'
        ]
      }
    ]
  }
  
  return baseTemplates[role] || []
}

function NotificationIcon({ type, category }: { type: string; category: string }) {
  const iconProps = { className: "w-5 h-5" }
  
  // Category-specific icons
  switch (category) {
    case 'analysis': return <FileText {...iconProps} />
    case 'review': return <CheckCircle {...iconProps} />
    case 'crop_health': return <Leaf {...iconProps} />
    case 'weather': return <Cloud {...iconProps} />
    case 'achievement': return <Award {...iconProps} />
    case 'account': return <User {...iconProps} />
    default:
      // Fall back to type-based icons
      switch (type) {
        case 'success': return <CheckCircle {...iconProps} />
        case 'warning': return <AlertTriangle {...iconProps} />
        case 'error': return <AlertTriangle {...iconProps} />
        case 'system': return <Settings {...iconProps} />
        default: return <Info {...iconProps} />
      }
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  className
}: {
  notification: Notification
  onMarkAsRead?: (id: string) => void
  onDismiss?: (id: string) => void
  className?: string
}) {
  const getTypeStyles = (type: string, priority: string) => {
    const baseStyles = "border-l-4"
    
    if (priority === 'urgent') {
      return `${baseStyles} border-l-red-500 bg-red-500/5`
    }
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-l-[#10B981] bg-[#10B981]/5`
      case 'warning':
        return `${baseStyles} border-l-[#F59E0B] bg-[#F59E0B]/5`
      case 'error':
        return `${baseStyles} border-l-red-500 bg-red-500/5`
      case 'system':
        return `${baseStyles} border-l-[#2DD4BF] bg-[#2DD4BF]/5`
      default:
        return `${baseStyles} border-l-gray-500 bg-gray-500/5`
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20'
      case 'high': return 'text-[#F59E0B] bg-[#F59E0B]/20'
      case 'medium': return 'text-[#2DD4BF] bg-[#2DD4BF]/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'p-4 rounded-lg transition-colors hover:bg-[#1F2A44]/50',
        getTypeStyles(notification.type, notification.priority),
        !notification.read && 'ring-1 ring-[#10B981]/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <NotificationIcon type={notification.type} category={notification.category} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-white line-clamp-1">
              {notification.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notification.priority !== 'low' && (
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium capitalize',
                  getPriorityColor(notification.priority)
                )}>
                  {notification.priority}
                </span>
              )}
              {!notification.read && (
                <div className="w-2 h-2 bg-[#10B981] rounded-full" />
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-300 line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{new Date(notification.timestamp).toLocaleString()}</span>
              {notification.metadata?.cropType && (
                <span className="capitalize">• {notification.metadata.cropType}</span>
              )}
              {notification.metadata?.region && (
                <span>• {notification.metadata.region}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {notification.actionable && notification.actions && (
                <div className="flex gap-1">
                  {notification.actions.slice(0, 2).map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.type === 'primary' ? 'primary' : 'outline'}
                      onClick={() => action.onClick(notification)}
                      className="text-xs px-2 py-1"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-1 ml-2">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead?.(notification.id)}
                    className="p-1 text-gray-400 hover:text-[#10B981] transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => onDismiss?.(notification.id)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function NotificationBadge({
  count,
  className,
  onClick
}: {
  count: number
  className?: string
  onClick?: () => void
}) {
  if (count === 0) return null

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative p-2 text-gray-400 hover:text-white transition-colors',
        className
      )}
    >
      <Bell className="w-6 h-6" />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
      >
        <span className="text-xs text-white font-medium">
          {count > 99 ? '99+' : count}
        </span>
      </motion.div>
    </motion.button>
  )
}

export function NotificationPanel({
  notifications,
  userRole,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  maxHeight = 600,
  className
}: NotificationPanelProps) {
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'urgent'>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')

  const filteredNotifications = React.useMemo(() => {
    const roleFiltered = filterNotificationsForRole(notifications, userRole)
    
    return roleFiltered.filter(notification => {
      if (filter === 'unread' && notification.read) return false
      if (filter === 'urgent' && notification.priority !== 'urgent') return false
      if (categoryFilter !== 'all' && notification.category !== categoryFilter) return false
      return true
    })
  }, [notifications, userRole, filter, categoryFilter])

  const unreadCount = filteredNotifications.filter(n => !n.read).length
  const categories = React.useMemo(() => {
    const cats = [...new Set(notifications.map(n => n.category))]
    return cats
  }, [notifications])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'absolute right-0 top-full mt-2 w-96 bg-[#0F1A2E] border border-gray-600 rounded-lg shadow-xl z-50',
        className
      )}
    >
      <Card>
        <CardHeader
          title="Notifications"
          description={`${unreadCount} unread of ${filteredNotifications.length}`}
          action={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onMarkAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          }
        />
        
        <div className="px-4 pb-2 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'urgent')}
              className="flex-1 px-2 py-1 bg-[#1F2A44] border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-[#10B981]"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="urgent">Urgent</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 px-2 py-1 bg-[#1F2A44] border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-[#10B981]"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category} className="capitalize">
                  {category.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div 
            className="space-y-2 p-4 overflow-y-auto"
            style={{ maxHeight }}
          >
            <AnimatePresence>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onDismiss={onDismiss}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-400"
                >
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-t border-gray-600">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="w-full text-xs"
              >
                Clear all notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function NotificationSystem({
  notifications,
  userRole,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  className
}: NotificationSystemProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const roleFilteredNotifications = React.useMemo(() => 
    filterNotificationsForRole(notifications, userRole),
    [notifications, userRole]
  )
  
  const unreadCount = roleFilteredNotifications.filter(n => !n.read).length

  return (
    <div className={cn('relative', className)}>
      <NotificationBadge
        count={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      <AnimatePresence>
        <NotificationPanel
          notifications={notifications}
          userRole={userRole}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDismiss={onDismiss}
          onClearAll={onClearAll}
        />
      </AnimatePresence>
    </div>
  )
}

export default NotificationSystem