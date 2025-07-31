import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon, Monitor, Bell, User } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTheme } from '../../contexts/ThemeContext'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  navigation?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  sidebar?: React.ReactNode
  className?: string
  showMobileMenu?: boolean
  onMobileMenuToggle?: (show: boolean) => void
}

interface ResponsiveHeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  showNotifications?: boolean
  className?: string
}

interface ResponsiveSidebarProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown'
  className?: string
}

// Main responsive layout component
export function ResponsiveLayout({
  children,
  navigation,
  header,
  footer,
  // sidebar prop intentionally unused
  className,
  // showMobileMenu prop intentionally unused
  onMobileMenuToggle
}: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const handleMobileMenuToggle = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)
    onMobileMenuToggle?.(newState)
  }

  return (
    <div className={cn(
      'min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200',
      className
    )}>
      {/* Mobile menu button - fixed positioning for accessibility */}
      {navigation && (
        <button
          onClick={handleMobileMenuToggle}
          className="fixed top-4 left-4 z-50 p-3 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-dark-700 lg:hidden touch-target"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      )}

      {/* Mobile navigation overlay */}
      <AnimatePresence>
        {navigation && isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile sidebar */}
            <ResponsiveSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              className="lg:hidden"
            >
              {navigation}
            </ResponsiveSidebar>
          </>
        )}
      </AnimatePresence>

      {/* Desktop layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Desktop sidebar */}
        {navigation && (
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
              {navigation}
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          {header && (
            <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 safe-top">
              {header}
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8 safe-bottom">
              {children}
            </div>
          </main>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 safe-bottom">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Responsive header component
export function ResponsiveHeader({
  title,
  subtitle,
  actions,
  showNotifications = true,
  className
}: ResponsiveHeaderProps) {
  const [showNotificationDropdown, setShowNotificationDropdown] = React.useState(false)

  return (
    <div className={cn(
      'px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Title section */}
        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions section */}
        <div className="flex items-center gap-2 sm:gap-4 ml-4">
          {/* Notifications */}
          {showNotifications && (
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors touch-target"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full"></span>
              </button>
              
              {/* Notification dropdown would go here */}
            </div>
          )}

          {/* Theme toggle */}
          <ThemeToggle variant="button" />

          {/* Custom actions */}
          {actions}

          {/* User menu */}
          <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors touch-target">
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Responsive sidebar component
export function ResponsiveSidebar({
  children,
  isOpen,
  onClose,
  className
}: ResponsiveSidebarProps) {
  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: isOpen ? 0 : -320 }}
      exit={{ x: -320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 z-50 overflow-y-auto safe-top safe-bottom',
        className
      )}
    >
      {/* Close button */}
      <div className="sticky top-0 z-10 bg-white dark:bg-dark-800 p-4 border-b border-gray-200 dark:border-dark-700">
        <button
          onClick={onClose}
          className="p-2 -m-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors touch-target"
          aria-label="Close sidebar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar content */}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  )
}

// Theme toggle component
export function ThemeToggle({ variant = 'button', className }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme()
  const [showDropdown, setShowDropdown] = React.useState(false)

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            'p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors touch-target',
            className
          )}
          aria-label="Theme settings"
        >
          {theme === 'light' && <Sun className="w-5 h-5" />}
          {theme === 'dark' && <Moon className="w-5 h-5" />}
          {theme === 'auto' && <Monitor className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-dark-700 py-2 z-50"
            >
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'auto', label: 'System', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value as 'light' | 'dark' | 'auto')
                    setShowDropdown(false)
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors',
                    theme === value && 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                  {theme === value && (
                    <div className="ml-auto w-2 h-2 bg-brand-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors touch-target',
        className
      )}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        {theme === 'light' && (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.div>
        )}
        {theme === 'dark' && (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.div>
        )}
        {theme === 'auto' && (
          <motion.div
            key="monitor"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

export default ResponsiveLayout