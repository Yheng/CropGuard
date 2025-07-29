import React from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Camera,
  BarChart3,
  Settings,
  Users,
  FileText,
  Shield,
  Activity,
  Leaf,
  CheckCircle,
  Clock,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  MapPin,
  Award,
  TrendingUp
} from 'lucide-react'
import { cn } from '../../utils/cn'

export interface User {
  id: string
  name: string
  email: string
  role: 'farmer' | 'agronomist' | 'admin'
  avatar?: string
  location?: string
  subscriptionPlan?: string
  expertiseLevel?: string
  creditsEarned?: number
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  roles: ('farmer' | 'agronomist' | 'admin')[]
  badge?: number
  submenu?: NavigationItem[]
}

interface RoleBasedNavigationProps {
  user: User
  currentPath: string
  onNavigate?: (path: string) => void
  onLogout?: () => void
  notifications?: number
  className?: string
}

const navigationItems: NavigationItem[] = [
  // Farmer Navigation
  {
    id: 'farmer-dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/farmer/dashboard',
    roles: ['farmer']
  },
  {
    id: 'upload-analysis',
    label: 'Upload Photo',
    icon: Camera,
    href: '/farmer/upload',
    roles: ['farmer']
  },
  {
    id: 'crop-health',
    label: 'Crop Health',
    icon: Leaf,
    href: '/farmer/crop-health',
    roles: ['farmer'],
    submenu: [
      {
        id: 'health-overview',
        label: 'Overview',
        icon: BarChart3,
        href: '/farmer/crop-health/overview',
        roles: ['farmer']
      },
      {
        id: 'health-trends',
        label: 'Trends',
        icon: TrendingUp,
        href: '/farmer/crop-health/trends',
        roles: ['farmer']
      },
      {
        id: 'field-map',
        label: 'Field Map',
        icon: MapPin,
        href: '/farmer/crop-health/map',
        roles: ['farmer']
      }
    ]
  },
  {
    id: 'my-analyses',
    label: 'My Analyses',
    icon: FileText,
    href: '/farmer/analyses',
    roles: ['farmer']
  },

  // Agronomist Navigation
  {
    id: 'agronomist-dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/agronomist/dashboard',
    roles: ['agronomist']
  },
  {
    id: 'pending-reviews',
    label: 'Pending Reviews',
    icon: Clock,
    href: '/agronomist/reviews',
    roles: ['agronomist'],
    badge: 12 // Dynamic badge count
  },
  {
    id: 'completed-reviews',
    label: 'Completed Reviews',
    icon: CheckCircle,
    href: '/agronomist/completed',
    roles: ['agronomist']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/agronomist/analytics',
    roles: ['agronomist']
  },
  {
    id: 'certifications',
    label: 'Certifications',
    icon: Award,
    href: '/agronomist/certifications',
    roles: ['agronomist']
  },

  // Admin Navigation
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/admin/dashboard',
    roles: ['admin']
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: Users,
    href: '/admin/users',
    roles: ['admin'],
    submenu: [
      {
        id: 'all-users',
        label: 'All Users',
        icon: Users,
        href: '/admin/users/all',
        roles: ['admin']
      },
      {
        id: 'farmers',
        label: 'Farmers',
        icon: Leaf,
        href: '/admin/users/farmers',
        roles: ['admin']
      },
      {
        id: 'agronomists',
        label: 'Agronomists',
        icon: CheckCircle,
        href: '/admin/users/agronomists',
        roles: ['admin']
      }
    ]
  },
  {
    id: 'system-settings',
    label: 'System Settings',
    icon: Settings,
    href: '/admin/settings',
    roles: ['admin'],
    submenu: [
      {
        id: 'ai-config',
        label: 'AI Configuration',
        icon: Activity,
        href: '/admin/settings/ai',
        roles: ['admin']
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        href: '/admin/settings/security',
        roles: ['admin']
      }
    ]
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: Shield,
    href: '/admin/audit',
    roles: ['admin']
  },
  {
    id: 'system-analytics',
    label: 'System Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
    roles: ['admin']
  },

  // Common Navigation
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    roles: ['farmer', 'agronomist', 'admin']
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: HelpCircle,
    href: '/help',
    roles: ['farmer', 'agronomist', 'admin']
  }
]

export function RoleBasedNavigation({
  user,
  currentPath,
  onNavigate,
  onLogout,
  notifications = 0,
  className
}: RoleBasedNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([])
  const [showUserMenu, setShowUserMenu] = React.useState(false)

  const filteredNavItems = React.useMemo(() => {
    return navigationItems.filter(item => item.roles.includes(user.role))
  }, [user.role])

  const handleNavigation = (href: string) => {
    onNavigate?.(href)
    setIsMobileMenuOpen(false)
  }

  const toggleSubmenu = (itemId: string) => {
    setExpandedMenus(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActiveItem = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/')
  }

  const getRoleDisplayInfo = (role: string) => {
    switch (role) {
      case 'farmer':
        return { label: 'Farmer', color: '#10B981', icon: '🌱' }
      case 'agronomist':
        return { label: 'Agronomist', color: '#F59E0B', icon: '🔬' }
      case 'admin':
        return { label: 'Administrator', color: '#8B5CF6', icon: '👑' }
      default:
        return { label: 'User', color: '#6B7280', icon: '👤' }
    }
  }

  const roleInfo = getRoleDisplayInfo(user.role)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1F2A44] rounded-lg text-white hover:bg-[#4A5B7C] transition-colors"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <motion.nav
        initial={{ x: -280 }}
        animate={{ x: isMobileMenuOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed left-0 top-0 h-full w-72 bg-[#0F1A2E] border-r border-gray-700 z-40 overflow-y-auto',
          'lg:relative lg:translate-x-0 lg:z-auto',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#10B981] rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CropGuard</h1>
                <p className="text-xs text-gray-400">AI-Powered Crop Protection</p>
              </div>
            </div>

            {/* User Info */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-3 bg-[#1F2A44] rounded-lg hover:bg-[#4A5B7C] transition-colors"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">{roleInfo.icon}</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium text-sm">{user.name}</p>
                  <p className="text-xs" style={{ color: roleInfo.color }}>
                    {roleInfo.label}
                  </p>
                  {user.location && (
                    <p className="text-xs text-gray-400">{user.location}</p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1F2A44] rounded-lg border border-gray-600 shadow-lg z-50"
                >
                  <div className="p-3 border-b border-gray-600">
                    <div className="text-xs text-gray-400 mb-1">Signed in as</div>
                    <div className="text-sm text-white font-medium">{user.email}</div>
                    {user.role === 'agronomist' && user.creditsEarned && (
                      <div className="text-xs text-[#10B981] mt-1">
                        {user.creditsEarned} Credits Earned
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => handleNavigation('/settings/profile')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#4A5B7C] rounded transition-colors"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={() => handleNavigation('/settings/preferences')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#4A5B7C] rounded transition-colors"
                    >
                      Preferences
                    </button>
                    <hr className="my-2 border-gray-600" />
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              {filteredNavItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.submenu ? (
                    <div>
                      <button
                        onClick={() => toggleSubmenu(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                          expandedMenus.includes(item.id)
                            ? 'bg-[#1F2A44] text-white'
                            : 'text-gray-300 hover:text-white hover:bg-[#1F2A44]'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-1 bg-[#EF4444] text-white text-xs rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            expandedMenus.includes(item.id) ? 'rotate-180' : ''
                          )}
                        />
                      </button>
                      
                      {expandedMenus.includes(item.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="ml-8 mt-2 space-y-1"
                        >
                          {item.submenu.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => handleNavigation(subItem.href)}
                              className={cn(
                                'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left text-sm',
                                isActiveItem(subItem.href)
                                  ? 'bg-[#10B981] text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-[#1F2A44]'
                              )}
                            >
                              <subItem.icon className="w-4 h-4" />
                              <span>{subItem.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                        isActiveItem(item.href)
                          ? 'bg-[#10B981] text-white'
                          : 'text-gray-300 hover:text-white hover:bg-[#1F2A44]'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-1 bg-[#EF4444] text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            {/* Notifications */}
            {notifications > 0 && (
              <button
                onClick={() => handleNavigation('/notifications')}
                className="w-full flex items-center gap-3 p-3 mb-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="flex-1 font-medium">Notifications</span>
                <span className="px-2 py-1 bg-[#F59E0B] text-white text-xs rounded-full">
                  {notifications > 99 ? '99+' : notifications}
                </span>
              </button>
            )}

            {/* Role-specific footer info */}
            {user.role === 'farmer' && (
              <div className="text-xs text-gray-400 text-center">
                <p>Early detection prevents up to</p>
                <p className="text-[#10B981] font-medium">80% of crop losses</p>
              </div>
            )}

            {user.role === 'agronomist' && user.creditsEarned && (
              <div className="text-xs text-gray-400 text-center">
                <p>Total Credits Earned</p>
                <p className="text-[#10B981] font-medium text-lg">{user.creditsEarned}</p>
              </div>
            )}

            {user.role === 'admin' && (
              <div className="text-xs text-gray-400 text-center">
                <p>System Administrator</p>
                <p className="text-[#8B5CF6] font-medium">Full Access</p>
              </div>
            )}
          </div>
        </div>
      </motion.nav>
    </>
  )
}