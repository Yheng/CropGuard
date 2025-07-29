import React, { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from './ThemeContext'

type FieldMode = 'standard' | 'field' | 'high-contrast'
type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'dawn' | 'dusk' | 'night'
type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

interface FieldModeSettings {
  touchTargetSize: 'standard' | 'large' | 'extra-large'
  pressTimeout: number
  hapticFeedback: boolean
  autoWeatherAdaptation: boolean
  highContrastMode: boolean
  fontSizeMultiplier: number
  oneHandedMode: boolean
  gloveMode: boolean
}

interface WeatherData {
  condition: WeatherCondition
  brightness: number // 0-100, higher = brighter
  timeOfDay: TimeOfDay
  lastUpdated: string
}

interface FieldModeContextType {
  fieldMode: FieldMode
  settings: FieldModeSettings
  weatherData: WeatherData | null
  setFieldMode: (mode: FieldMode) => void
  updateSettings: (settings: Partial<FieldModeSettings>) => void
  refreshWeatherData: () => Promise<void>
  isFieldOptimized: boolean
  getAdaptiveColors: () => AdaptiveColors
}

interface AdaptiveColors {
  background: string
  foreground: string
  accent: string
  danger: string
  warning: string
  success: string
  contrast: string
}

const defaultSettings: FieldModeSettings = {
  touchTargetSize: 'standard',
  pressTimeout: 300,
  hapticFeedback: true,
  autoWeatherAdaptation: true,
  highContrastMode: false,
  fontSizeMultiplier: 1,
  oneHandedMode: false,
  gloveMode: false
}

const defaultWeatherData: WeatherData = {
  condition: 'sunny',
  brightness: 80,
  timeOfDay: 'midday',
  lastUpdated: new Date().toISOString()
}

const FieldModeContext = createContext<FieldModeContextType | undefined>(undefined)

export function FieldModeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [fieldMode, setFieldMode] = useState<FieldMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cropguard-field-mode')
      if (saved && ['standard', 'field', 'high-contrast'].includes(saved)) {
        return saved as FieldMode
      }
    }
    return 'standard'
  })

  const [settings, setSettings] = useState<FieldModeSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cropguard-field-settings')
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) }
        } catch {
          return defaultSettings
        }
      }
    }
    return defaultSettings
  })

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)

  // Initialize weather data
  useEffect(() => {
    initializeWeatherData()
  }, [])

  // Auto-adapt based on weather conditions
  useEffect(() => {
    if (settings.autoWeatherAdaptation && weatherData) {
      adaptToWeatherConditions(weatherData)
    }
  }, [weatherData, settings.autoWeatherAdaptation])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('cropguard-field-mode', fieldMode)
  }, [fieldMode])

  useEffect(() => {
    localStorage.setItem('cropguard-field-settings', JSON.stringify(settings))
  }, [settings])

  // Apply CSS custom properties for field mode
  useEffect(() => {
    const root = document.documentElement
    const colors = getAdaptiveColors()
    
    // Apply touch target sizes
    const touchSize = getTouchTargetSize()
    root.style.setProperty('--touch-target-min', `${touchSize}px`)
    root.style.setProperty('--touch-target-preferred', `${touchSize + 8}px`)
    
    // Apply font size multiplier
    root.style.setProperty('--font-size-multiplier', settings.fontSizeMultiplier.toString())
    
    // Apply adaptive colors
    root.style.setProperty('--field-bg', colors.background)
    root.style.setProperty('--field-fg', colors.foreground)
    root.style.setProperty('--field-accent', colors.accent)
    root.style.setProperty('--field-contrast', colors.contrast)
    
    // Apply mode classes
    root.classList.remove('field-mode', 'high-contrast-mode', 'glove-mode', 'one-handed-mode')
    if (fieldMode === 'field' || fieldMode === 'high-contrast') {
      root.classList.add('field-mode')
    }
    if (fieldMode === 'high-contrast' || settings.highContrastMode) {
      root.classList.add('high-contrast-mode')
    }
    if (settings.gloveMode) {
      root.classList.add('glove-mode')
    }
    if (settings.oneHandedMode) {
      root.classList.add('one-handed-mode')
    }
  }, [fieldMode, settings, weatherData, resolvedTheme])

  const initializeWeatherData = async () => {
    // Check if we have recent weather data in localStorage
    const cached = localStorage.getItem('cropguard-weather-data')
    if (cached) {
      try {
        const data = JSON.parse(cached)
        const lastUpdated = new Date(data.lastUpdated)
        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceUpdate < 1) { // Use cached data if less than 1 hour old
          setWeatherData(data)
          return
        }
      } catch {
        // Ignore cache errors
      }
    }

    // Simulate weather data or use defaults
    await refreshWeatherData()
  }

  const refreshWeatherData = async (): Promise<void> => {
    try {
      // In a real implementation, this would call a weather API
      const mockWeatherData = await simulateWeatherAPI()
      setWeatherData(mockWeatherData)
      localStorage.setItem('cropguard-weather-data', JSON.stringify(mockWeatherData))
    } catch (error) {
      console.warn('Failed to fetch weather data, using defaults:', error)
      setWeatherData(defaultWeatherData)
    }
  }

  const simulateWeatherAPI = async (): Promise<WeatherData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: TimeOfDay
    let condition: WeatherCondition
    let brightness: number

    // Determine time of day
    if (hour >= 6 && hour < 10) timeOfDay = 'morning'
    else if (hour >= 10 && hour < 15) timeOfDay = 'midday'
    else if (hour >= 15 && hour < 18) timeOfDay = 'afternoon'
    else if (hour >= 18 && hour < 21) timeOfDay = 'evening'
    else timeOfDay = 'night'

    // Simulate weather conditions based on time
    if (timeOfDay === 'night') {
      condition = 'night'
      brightness = 10
    } else if (timeOfDay === 'morning' && hour < 8) {
      condition = 'dawn'
      brightness = 40
    } else if (timeOfDay === 'evening' && hour > 19) {
      condition = 'dusk'
      brightness = 30
    } else {
      // Random weather for daytime
      const conditions: WeatherCondition[] = ['sunny', 'cloudy', 'rainy']
      condition = conditions[Math.floor(Math.random() * conditions.length)]
      brightness = condition === 'sunny' ? 90 : condition === 'cloudy' ? 60 : 40
    }

    return {
      condition,
      brightness,
      timeOfDay,
      lastUpdated: now.toISOString()
    }
  }

  const adaptToWeatherConditions = (weather: WeatherData) => {
    // Auto-switch to high contrast in bright sunlight
    if (weather.condition === 'sunny' && weather.brightness > 85) {
      if (fieldMode === 'standard') {
        setFieldMode('field')
      }
      updateSettings({ highContrastMode: true })
    }
    
    // Enable glove mode in rainy conditions
    if (weather.condition === 'rainy') {
      updateSettings({ gloveMode: true, touchTargetSize: 'large' })
    }
    
    // Adjust font size in low light
    if (weather.brightness < 30) {
      updateSettings({ fontSizeMultiplier: Math.max(1.1, settings.fontSizeMultiplier) })
    }
  }

  const updateSettings = (newSettings: Partial<FieldModeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const getTouchTargetSize = (): number => {
    const baseSize = 44 // iOS minimum
    const gloveBonus = settings.gloveMode ? 16 : 0
    
    switch (settings.touchTargetSize) {
      case 'large': return baseSize + 16 + gloveBonus
      case 'extra-large': return baseSize + 32 + gloveBonus
      default: return baseSize + gloveBonus
    }
  }

  const getAdaptiveColors = (): AdaptiveColors => {
    const isHighContrast = fieldMode === 'high-contrast' || settings.highContrastMode
    const isDark = resolvedTheme === 'dark'
    const weather = weatherData
    
    // Base colors
    let colors: AdaptiveColors = {
      background: isDark ? '#0f172a' : '#ffffff',
      foreground: isDark ? '#f8fafc' : '#0f172a',
      accent: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#22c55e',
      contrast: isDark ? '#ffffff' : '#000000'
    }

    // High contrast adjustments
    if (isHighContrast) {
      colors = {
        background: isDark ? '#000000' : '#ffffff',
        foreground: isDark ? '#ffffff' : '#000000',
        accent: isDark ? '#00ff00' : '#008800',
        danger: isDark ? '#ff4444' : '#cc0000',
        warning: isDark ? '#ffaa00' : '#cc8800',
        success: isDark ? '#00ff00' : '#008800',
        contrast: isDark ? '#ffffff' : '#000000'
      }
    }

    // Weather-based adjustments
    if (weather) {
      // Bright sunlight - increase contrast
      if (weather.condition === 'sunny' && weather.brightness > 80) {
        colors.background = isDark ? '#000000' : '#ffffff'
        colors.foreground = isDark ? '#ffffff' : '#000000'
        colors.contrast = isDark ? '#ffffff' : '#000000'
      }
      
      // Low light conditions - softer colors
      if (weather.brightness < 30) {
        colors.background = isDark ? '#1e293b' : '#f8fafc'
        colors.foreground = isDark ? '#e2e8f0' : '#334155'
      }
    }

    return colors
  }

  const isFieldOptimized = fieldMode === 'field' || fieldMode === 'high-contrast' || 
                          settings.gloveMode || settings.oneHandedMode

  const value: FieldModeContextType = {
    fieldMode,
    settings,
    weatherData,
    setFieldMode,
    updateSettings,
    refreshWeatherData,
    isFieldOptimized,
    getAdaptiveColors
  }

  return (
    <FieldModeContext.Provider value={value}>
      {children}
    </FieldModeContext.Provider>
  )
}

export function useFieldMode() {
  const context = useContext(FieldModeContext)
  if (context === undefined) {
    throw new Error('useFieldMode must be used within a FieldModeProvider')
  }
  return context
}

// Hook for components to get field-optimized styling
export function useFieldOptimizedStyles() {
  const { settings, isFieldOptimized, getAdaptiveColors } = useFieldMode()
  
  const getButtonClasses = (variant: 'primary' | 'secondary' = 'primary') => {
    const baseClasses = 'transition-all duration-200 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2'
    const sizeClasses = isFieldOptimized 
      ? 'min-h-[60px] px-6 py-4 text-lg'
      : 'min-h-[44px] px-4 py-2 text-base'
    
    const colors = getAdaptiveColors()
    const variantClasses = variant === 'primary'
      ? `bg-[${colors.accent}] hover:bg-[${colors.accent}]/80 text-white focus:ring-[${colors.accent}]/20`
      : `bg-transparent border-2 border-[${colors.accent}] text-[${colors.accent}] hover:bg-[${colors.accent}]/10 focus:ring-[${colors.accent}]/20`
    
    return `${baseClasses} ${sizeClasses} ${variantClasses}`
  }

  const getInputClasses = () => {
    const colors = getAdaptiveColors()
    const baseClasses = 'w-full rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200'
    const sizeClasses = isFieldOptimized
      ? 'min-h-[60px] px-4 py-4 text-lg'
      : 'min-h-[44px] px-3 py-2 text-base'
    
    return `${baseClasses} ${sizeClasses} bg-[${colors.background}] border-[${colors.foreground}]/20 text-[${colors.foreground}] focus:ring-[${colors.accent}]/20 focus:border-[${colors.accent}]`
  }

  const getTouchTargetSize = () => {
    return isFieldOptimized ? 60 : 44
  }

  const getPressTimeout = () => {
    return settings.gloveMode ? settings.pressTimeout + 200 : settings.pressTimeout
  }

  return {
    getButtonClasses,
    getInputClasses,
    getTouchTargetSize,
    getPressTimeout,
    isFieldOptimized,
    colors: getAdaptiveColors(),
    settings
  }
}

export default FieldModeProvider