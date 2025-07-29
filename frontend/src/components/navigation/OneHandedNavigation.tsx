import React, { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Camera, 
  TrendingUp, 
  Settings, 
  Home,
  Menu,
  X,
  ChevronRight,
  Leaf
} from 'lucide-react'
import { useFieldMode } from '../../contexts/FieldModeContext'
import FieldOptimizedButton from '../ui/FieldOptimizedButton'

interface NavigationItem {
  id: string
  label: string
  agricultureLabel: string // Farmer-friendly label
  path: string
  icon: React.ElementType
  color: string
  quickAction?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    agricultureLabel: 'Check My Crops',
    path: '/dashboard',
    icon: Home,
    color: '#22c55e',
    quickAction: true
  },
  {
    id: 'analysis',
    label: 'Analysis',
    agricultureLabel: 'Examine Plant',
    path: '/analysis',
    icon: Camera,
    color: '#3b82f6',
    quickAction: true
  },
  {
    id: 'analytics',
    label: 'Analytics',
    agricultureLabel: 'Crop Reports',
    path: '/analytics',
    icon: TrendingUp,
    color: '#f59e0b'
  },
  {
    id: 'treatments',
    label: 'Treatments',
    agricultureLabel: 'Care Plans',
    path: '/treatments',
    icon: Leaf,
    color: '#10b981'
  },
  {
    id: 'settings',
    label: 'Settings',
    agricultureLabel: 'Farm Settings',
    path: '/settings',
    icon: Settings,
    color: '#6b7280'
  }
]

interface OneHandedNavigationProps {
  useAgriculturalTerms?: boolean
  onNavigate?: (path: string) => void
}

export function OneHandedNavigation({ 
  useAgriculturalTerms = true,
  onNavigate 
}: OneHandedNavigationProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings, isFieldOptimized, weatherData } = useFieldMode()
  const [isExpanded, setIsExpanded] = useState(false)
  const [recentActions, setRecentActions] = useState<string[]>([])

  const handleNavigate = useCallback((path: string, itemId: string) => {
    // Update recent actions
    setRecentActions(prev => {
      const updated = [itemId, ...prev.filter(id => id !== itemId)].slice(0, 3)
      localStorage.setItem('cropguard-recent-actions', JSON.stringify(updated))
      return updated
    })

    setIsExpanded(false)
    
    if (onNavigate) {
      onNavigate(path)
    } else {
      navigate(path)
    }
  }, [navigate, onNavigate])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  // Load recent actions from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('cropguard-recent-actions')
    if (saved) {
      try {
        setRecentActions(JSON.parse(saved))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  const isActive = (path: string) => location.pathname === path

  const getQuickActions = () => {
    const quickItems = navigationItems.filter(item => item.quickAction || recentActions.includes(item.id))
    const recentItems = recentActions
      .map(id => navigationItems.find(item => item.id === id))
      .filter(Boolean) as NavigationItem[]
    
    // Combine quick actions and recent actions, avoid duplicates
    const combined = [...quickItems]
    recentItems.forEach(item => {
      if (!combined.find(existing => existing.id === item.id)) {
        combined.push(item)
      }
    })
    
    return combined.slice(0, 4)
  }

  const getNavigationButtonProps = (item: NavigationItem) => {
    const isCurrentlyActive = isActive(item.path)
    return {
      variant: (isCurrentlyActive ? 'primary' : 'secondary') as 'primary' | 'secondary',
      className: `
        w-full justify-start gap-3 transition-all duration-200
        ${isCurrentlyActive ? 'shadow-lg transform scale-[1.02]' : 'hover:scale-[1.01]'}
        ${isFieldOptimized ? 'shadow-md border-2' : ''}
      `,
      style: {
        borderColor: isCurrentlyActive ? item.color : 'transparent',
        backgroundColor: isCurrentlyActive 
          ? `${item.color}20` 
          : isFieldOptimized 
            ? 'var(--field-bg)'
            : undefined
      }
    }
  }

  const getExpandedNavStyle = () => {
    if (!settings.oneHandedMode) return {}
    
    // Position for one-handed use - adjust based on screen size
    const isSmallScreen = window.innerWidth < 768
    return {
      maxWidth: isSmallScreen ? '280px' : '320px',
      marginLeft: 'auto',
      marginRight: settings.oneHandedMode ? '16px' : 'auto'
    }
  }

  const getWeatherIndicator = () => {
    if (!weatherData || !isFieldOptimized) return null
    
    const weatherIcons = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      dawn: '🌅',
      dusk: '🌆',
      night: '🌙'
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-black/10 rounded-lg text-sm">
        <span>{weatherIcons[weatherData.condition]}</span>
        <span className="font-medium">
          {weatherData.condition} • {weatherData.brightness}% bright
        </span>
      </div>
    )
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col gap-2 items-end">
          {/* Weather indicator */}
          {getWeatherIndicator()}
          
          {/* Quick actions */}
          <div className="flex flex-col gap-2">
            {getQuickActions().slice(0, 2).map((item) => {
              const Icon = item.icon
              const buttonProps = getNavigationButtonProps(item)
              
              return (
                <FieldOptimizedButton
                  key={item.id}
                  {...buttonProps}
                  onClick={() => handleNavigate(item.path, item.id)}
                  className={`
                    flex-shrink-0 w-auto px-4 gap-2
                    ${buttonProps.className}
                    ${isFieldOptimized ? 'shadow-lg' : 'shadow-md'}
                  `}
                  hapticFeedback={true}
                >
                  <Icon 
                    size={isFieldOptimized ? 24 : 20} 
                    style={{ color: item.color }} 
                  />
                  <span className="font-medium">
                    {useAgriculturalTerms ? item.agricultureLabel : item.label}
                  </span>
                </FieldOptimizedButton>
              )
            })}
          </div>

          {/* Expand button */}
          <FieldOptimizedButton
            onClick={toggleExpanded}
            variant="primary"
            className={`
              rounded-full flex-shrink-0
              ${isFieldOptimized ? 'w-16 h-16 shadow-xl' : 'w-12 h-12 shadow-lg'}
            `}
            hapticFeedback={true}
          >
            <Menu size={isFieldOptimized ? 28 : 24} />
          </FieldOptimizedButton>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div 
        className="absolute bottom-4 right-4 max-h-[80vh] overflow-y-auto"
        style={getExpandedNavStyle()}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-bold ${isFieldOptimized ? 'text-xl' : 'text-lg'}`}>
              {useAgriculturalTerms ? 'Farm Navigation' : 'Navigation'}
            </h2>
            <FieldOptimizedButton
              onClick={toggleExpanded}
              variant="secondary"
              size="sm"
              className="rounded-full"
            >
              <X size={20} />
            </FieldOptimizedButton>
          </div>

          {/* Weather info */}
          {getWeatherIndicator()}

          {/* Recent actions */}
          {recentActions.length > 0 && (
            <div>
              <h3 className={`font-semibold mb-2 ${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Recent Actions
              </h3>
              <div className="space-y-2">
                {recentActions.slice(0, 3).map((actionId) => {
                  const item = navigationItems.find(nav => nav.id === actionId)
                  if (!item) return null
                  
                  const Icon = item.icon
                  const buttonProps = getNavigationButtonProps(item)
                  
                  return (
                    <FieldOptimizedButton
                      key={item.id}
                      {...buttonProps}
                      onClick={() => handleNavigate(item.path, item.id)}
                    >
                      <Icon size={isFieldOptimized ? 22 : 18} style={{ color: item.color }} />
                      <span className="flex-1 text-left">
                        {useAgriculturalTerms ? item.agricultureLabel : item.label}
                      </span>
                      <ChevronRight size={16} className="opacity-50" />
                    </FieldOptimizedButton>
                  )
                })}
              </div>
            </div>
          )}

          {/* All navigation items */}
          <div>
            <h3 className={`font-semibold mb-2 ${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
              All Options
            </h3>
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const buttonProps = getNavigationButtonProps(item)
                
                return (
                  <FieldOptimizedButton
                    key={item.id}
                    {...buttonProps}
                    onClick={() => handleNavigate(item.path, item.id)}
                  >
                    <Icon size={isFieldOptimized ? 22 : 18} style={{ color: item.color }} />
                    <span className="flex-1 text-left">
                      {useAgriculturalTerms ? item.agricultureLabel : item.label}
                    </span>
                    <ChevronRight size={16} className="opacity-50" />
                  </FieldOptimizedButton>
                )
              })}
            </div>
          </div>

          {/* Field mode toggle */}
          {isFieldOptimized && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Field Mode Active • Glove Friendly • One-Handed
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OneHandedNavigation