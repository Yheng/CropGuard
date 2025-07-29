import React from 'react'
import { motion } from 'framer-motion'
import { 
  Menu, 
  Search, 
  Settings, 
  HelpCircle,
  Leaf,
  User,
  LogOut,
  ChevronDown,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react'
import { RoleBasedNavigation, type User as UserType } from '../navigation/RoleBasedNavigation'
import { NotificationSystem, type Notification } from '../notifications/NotificationSystem'
import { cn } from '../../utils/cn'

interface RoleBasedLayoutProps {
  user: UserType
  children: React.ReactNode
  notifications?: Notification[]
  currentPath: string
  onNavigate?: (path: string) => void
  onLogout?: () => void
  onNotificationAction?: (action: string, notificationId: string) => void
  className?: string
}

interface LayoutConfig {
  showSidebar: boolean
  sidebarWidth: 'narrow' | 'normal' | 'wide'
  headerHeight: 'compact' | 'normal' | 'tall'
  contentPadding: 'tight' | 'normal' | 'spacious'
  breakpoints: {
    mobile: number
    tablet: number
    desktop: number
  }
}

// Role-specific layout configurations
const roleLayoutConfigs: Record<UserType['role'], LayoutConfig> = {
  farmer: {
    showSidebar: true,
    sidebarWidth: 'normal',
    headerHeight: 'normal',
    contentPadding: 'normal',
    breakpoints: {
      mobile: 768,  // Optimized for mobile-first (80% Android users)
      tablet: 1024,
      desktop: 1280
    }
  },
  agronomist: {
    showSidebar: true,
    sidebarWidth: 'wide',
    headerHeight: 'compact',
    contentPadding: 'tight',
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1440 // Wider for review workflows
    }
  },
  admin: {
    showSidebar: true,
    sidebarWidth: 'wide',
    headerHeight: 'tall',
    contentPadding: 'spacious',
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1600 // Widest for system management
    }
  }
}

function useResponsiveLayout(user: UserType) {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const config = roleLayoutConfigs[user.role]

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < config.breakpoints.mobile) {
        setScreenSize('mobile')
        setSidebarOpen(false) // Auto-close sidebar on mobile
      } else if (width < config.breakpoints.tablet) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
        setSidebarOpen(true) // Auto-open sidebar on desktop
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [config.breakpoints])

  const getSidebarWidth = () => {
    if (screenSize === 'mobile') return 'w-80' // Full mobile width
    
    switch (config.sidebarWidth) {
      case 'narrow': return 'w-64'
      case 'normal': return 'w-72'
      case 'wide': return 'w-80'
      default: return 'w-72'
    }
  }

  const getHeaderHeight = () => {
    switch (config.headerHeight) {
      case 'compact': return 'h-14'
      case 'normal': return 'h-16'
      case 'tall': return 'h-20'
      default: return 'h-16'
    }
  }

  const getContentPadding = () => {
    if (screenSize === 'mobile') return 'p-4'
    
    switch (config.contentPadding) {
      case 'tight': return 'p-4'
      case 'normal': return 'p-6'
      case 'spacious': return 'p-8'
      default: return 'p-6'
    }
  }

  return {
    screenSize,
    sidebarOpen,
    setSidebarOpen,
    config,
    getSidebarWidth,
    getHeaderHeight,
    getContentPadding,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop'
  }
}

function RoleOptimizedHeader({
  user,
  notifications = [],
  screenSize,
  headerHeight,
  onMenuToggle,
  onLogout,
  className
}: {
  user: UserType
  notifications: Notification[]
  screenSize: 'mobile' | 'tablet' | 'desktop'
  headerHeight: string
  onMenuToggle: () => void
  onLogout?: () => void
  className?: string
}) {
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showSearch, setShowSearch] = React.useState(false)

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'farmer':
        return { color: '#10B981', icon: '🌱', label: 'Farmer' }
      case 'agronomist':
        return { color: '#F59E0B', icon: '🔬', label: 'Agronomist' }
      case 'admin':
        return { color: '#8B5CF6', icon: '👑', label: 'Admin' }
      default:
        return { color: '#6B7280', icon: '👤', label: 'User' }
    }
  }

  const roleInfo = getRoleInfo(user.role)

  return (
    <header className={cn(
      'bg-[#0F1A2E] border-b border-gray-700 flex items-center justify-between px-4',
      headerHeight,
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {screenSize === 'mobile' && (
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          {screenSize !== 'mobile' && (
            <div>
              <h1 className="text-lg font-bold text-white">CropGuard</h1>
              {user.role === 'admin' && (
                <p className="text-xs text-gray-400">Admin Panel</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Section - Search (Desktop/Tablet only) */}
      {screenSize !== 'mobile' && (
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                user.role === 'farmer' ? 'Search analyses...' :
                user.role === 'agronomist' ? 'Search reviews...' :
                'Search system...'
              }
              className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Toggle */}
        {screenSize === 'mobile' && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* Notifications */}
        <NotificationSystem
          notifications={notifications}
          userRole={user.role}
        />

        {/* Quick Actions */}
        {user.role === 'farmer' && screenSize !== 'mobile' && (
          <button className="px-3 py-1.5 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#10B981]/80 transition-colors">
            Upload Photo
          </button>
        )}

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1F2A44] transition-colors"
          >
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm">{roleInfo.icon}</span>
              )}
            </div>
            {screenSize !== 'mobile' && (
              <>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{user.name}</p>
                  <p className="text-xs" style={{ color: roleInfo.color }}>
                    {roleInfo.label}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </>
            )}
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full right-0 mt-2 w-64 bg-[#1F2A44] rounded-lg border border-gray-600 shadow-lg z-50"
            >
              <div className="p-4 border-b border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{roleInfo.icon}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-sm" style={{ color: roleInfo.color }}>{roleInfo.label}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#4A5B7C] rounded transition-colors">
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#4A5B7C] rounded transition-colors">
                  <Settings className="w-4 h-4" />
                  Preferences
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#4A5B7C] rounded transition-colors">
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </button>
                <hr className="my-2 border-gray-600" />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {screenSize === 'mobile' && showSearch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 p-4 bg-[#0F1A2E] border-b border-gray-700"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                user.role === 'farmer' ? 'Search analyses...' :
                user.role === 'agronomist' ? 'Search reviews...' :
                'Search system...'
              }
              className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </motion.div>
      )}
    </header>
  )
}

function ResponsiveDeviceIndicator({ screenSize }: { screenSize: 'mobile' | 'tablet' | 'desktop' }) {
  const getIcon = () => {
    switch (screenSize) {
      case 'mobile': return <Smartphone className="w-3 h-3" />
      case 'tablet': return <Tablet className="w-3 h-3" />
      default: return <Monitor className="w-3 h-3" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg shadow-lg">
        {getIcon()}
        <span className="text-xs text-gray-300 capitalize">{screenSize}</span>
      </div>
    </div>
  )
}

export function RoleBasedLayout({
  user,
  children,
  notifications = [],
  currentPath,
  onNavigate,
  onLogout,
  onNotificationAction: _onNotificationAction,
  className
}: RoleBasedLayoutProps) {
  const layout = useResponsiveLayout(user)
  const [showDeviceIndicator, setShowDeviceIndicator] = React.useState(false)

  // Show device indicator in development
  React.useEffect(() => {
    setShowDeviceIndicator(process.env.NODE_ENV === 'development')
  }, [])

  const handleSidebarToggle = () => {
    layout.setSidebarOpen(!layout.sidebarOpen)
  }

  return (
    <div className={cn('min-h-screen bg-[#0F1A2E] flex', className)}>
      {/* Sidebar */}
      <RoleBasedNavigation
        user={user}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogout={onLogout}
        notifications={notifications.filter(n => !n.read).length}
        className={cn(
          'transition-all duration-300 ease-in-out',
          layout.config.showSidebar ? 'block' : 'hidden',
          layout.getSidebarWidth(),
          layout.isMobile && !layout.sidebarOpen && 'hidden',
          layout.isMobile && layout.sidebarOpen && 'fixed inset-y-0 left-0 z-50'
        )}
      />

      {/* Mobile Sidebar Overlay */}
      {layout.isMobile && layout.sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => layout.setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        layout.config.showSidebar && layout.isDesktop && layout.getSidebarWidth()
      )}>
        {/* Header */}
        <RoleOptimizedHeader
          user={user}
          notifications={notifications}
          screenSize={layout.screenSize}
          headerHeight={layout.getHeaderHeight()}
          onMenuToggle={handleSidebarToggle}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className={cn(
          'flex-1 overflow-auto',
          layout.getContentPadding()
        )}>
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Role-specific Footer for mobile */}
        {layout.isMobile && (
          <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-[#1F2A44] border-t border-gray-700 p-4"
          >
            {user.role === 'farmer' && (
              <div className="text-center">
                <button className="w-full py-3 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#10B981]/80 transition-colors">
                  Upload Crop Photo
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Tap to start analysis
                </p>
              </div>
            )}
            
            {user.role === 'agronomist' && (
              <div className="text-center">
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-[#F59E0B]">
                    {notifications.filter(n => !n.read && n.category === 'review').length}
                  </span> pending reviews
                </p>
              </div>
            )}
            
            {user.role === 'admin' && (
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  System Administrator
                </p>
              </div>
            )}
          </motion.footer>
        )}
      </div>

      {/* Development Device Indicator */}
      {showDeviceIndicator && (
        <ResponsiveDeviceIndicator screenSize={layout.screenSize} />
      )}
    </div>
  )
}

export default RoleBasedLayout