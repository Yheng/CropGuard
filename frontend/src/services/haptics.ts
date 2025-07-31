/**
 * Haptic Feedback Service for CropGuard
 * Provides tactile feedback optimized for field conditions and farming workflows
 */

export type HapticPattern = 
  | 'light_tap'           // Quick confirmation
  | 'medium_tap'          // Standard interaction
  | 'heavy_tap'           // Important action
  | 'double_tap'          // Confirmation or selection
  | 'success_pulse'       // Task completed successfully
  | 'error_buzz'          // Error or warning
  | 'analysis_complete'   // AI analysis finished
  | 'plant_healthy'       // Good plant health detected
  | 'plant_warning'       // Plant issue detected
  | 'field_mode_toggle'   // Field mode activated/deactivated
  | 'weather_alert'       // Weather condition change
  | 'long_press_start'    // Long press initiated
  | 'navigation_change'   // Page/section change
  | 'sync_complete'       // Offline sync completed

export interface HapticConfig {
  enabled: boolean
  intensity: 'light' | 'medium' | 'strong'
  adaptToEnvironment: boolean
  fieldModeIntensity: 'normal' | 'enhanced'
  weatherAdaptation: boolean
}

export interface EnvironmentalConditions {
  isFieldMode: boolean
  isGloveMode: boolean
  weatherCondition: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'night'
  ambientNoise: 'quiet' | 'moderate' | 'loud'
  deviceInPocket: boolean
}

/**
 * Haptic patterns defined as vibration sequences
 * Each number represents milliseconds of vibration, followed by pause
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  light_tap: [10],
  medium_tap: [25],
  heavy_tap: [50],
  double_tap: [15, 50, 15],
  success_pulse: [30, 100, 60, 100, 30],
  error_buzz: [100, 50, 100, 50, 100],
  analysis_complete: [20, 80, 40, 80, 60],
  plant_healthy: [30, 100, 30, 100, 30],
  plant_warning: [50, 100, 50, 100, 100, 100, 50],
  field_mode_toggle: [40, 150, 80, 150, 40],
  weather_alert: [25, 75, 25, 75, 25, 75, 50],
  long_press_start: [40],
  navigation_change: [20, 50, 20],
  sync_complete: [15, 50, 30, 50, 15]
}

/**
 * Intensity multipliers for different conditions
 */
const INTENSITY_MULTIPLIERS = {
  light: 0.6,
  medium: 1.0,
  strong: 1.4
}

const ENVIRONMENTAL_MULTIPLIERS = {
  field_mode: 1.3,
  glove_mode: 1.5,
  rainy_weather: 1.4,
  windy_weather: 1.2,
  in_pocket: 1.6,
  loud_ambient: 1.3
}

class HapticsService {
  private config: HapticConfig = {
    enabled: true,
    intensity: 'medium',
    adaptToEnvironment: true,
    fieldModeIntensity: 'enhanced',
    weatherAdaptation: true
  }

  private environmental: EnvironmentalConditions = {
    isFieldMode: false,
    isGloveMode: false,
    weatherCondition: 'sunny',
    ambientNoise: 'moderate',
    deviceInPocket: false
  }

  private lastHapticTime = 0
  private hapticCooldown = 50 // Minimum ms between haptic events

  constructor() {
    this.loadConfig()
    this.detectEnvironmentalConditions()
  }

  /**
   * Trigger a haptic pattern
   */
  async triggerHaptic(pattern: HapticPattern, force: boolean = false): Promise<void> {
    if (!this.isHapticSupported() || (!this.config.enabled && !force)) {
      return
    }

    // Prevent rapid-fire haptics
    const now = Date.now()
    if (now - this.lastHapticTime < this.hapticCooldown) {
      return
    }
    this.lastHapticTime = now

    try {
      const vibrationPattern = this.calculateVibrationPattern(pattern)
      
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate(vibrationPattern)
      } else {
        // Fallback for devices without vibration API
        this.simulateHapticFeedback(pattern)
      }

      // Track haptic usage for analytics
      this.trackHapticUsage(pattern)
      
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HapticConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
  }

  /**
   * Update environmental conditions
   */
  updateEnvironmentalConditions(conditions: Partial<EnvironmentalConditions>): void {
    this.environmental = { ...this.environmental, ...conditions }
  }

  /**
   * Get current configuration
   */
  getConfig(): HapticConfig {
    return { ...this.config }
  }

  /**
   * Test haptic feedback
   */
  async testHaptic(pattern: HapticPattern = 'medium_tap'): Promise<void> {
    await this.triggerHaptic(pattern, true) // Force feedback even if disabled
  }

  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return 'vibrate' in navigator || 'hapticFeedback' in navigator
  }

  /**
   * Calculate vibration pattern based on config and environment
   */
  private calculateVibrationPattern(pattern: HapticPattern): number[] {
    const basePattern = [...HAPTIC_PATTERNS[pattern]]
    
    // Apply intensity multiplier
    const intensityMultiplier = INTENSITY_MULTIPLIERS[this.config.intensity]
    
    // Apply environmental multipliers
    let environmentalMultiplier = 1.0
    
    if (this.config.adaptToEnvironment) {
      if (this.environmental.isFieldMode && this.config.fieldModeIntensity === 'enhanced') {
        environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.field_mode
      }
      
      if (this.environmental.isGloveMode) {
        environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.glove_mode
      }
      
      if (this.config.weatherAdaptation) {
        switch (this.environmental.weatherCondition) {
          case 'rainy':
            environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.rainy_weather
            break
          case 'windy':
            environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.windy_weather
            break
        }
      }
      
      if (this.environmental.deviceInPocket) {
        environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.in_pocket
      }
      
      if (this.environmental.ambientNoise === 'loud') {
        environmentalMultiplier *= ENVIRONMENTAL_MULTIPLIERS.loud_ambient
      }
    }
    
    // Apply multipliers to vibration durations (not pauses)
    const finalMultiplier = intensityMultiplier * environmentalMultiplier
    
    return basePattern.map((duration, index) => {
      // Apply multiplier to vibration durations, keep pauses as-is
      return index % 2 === 0 
        ? Math.round(Math.max(5, Math.min(200, duration * finalMultiplier)))
        : duration
    })
  }

  /**
   * Simulate haptic feedback for devices without vibration API
   */
  private simulateHapticFeedback(): void {
    // Create visual feedback as fallback
    const body = document.body
    const originalTransform = body.style.transform
    
    // Quick screen shake for visual feedback
    body.style.transform = 'translateX(1px)'
    setTimeout(() => {
      body.style.transform = 'translateX(-1px)'
      setTimeout(() => {
        body.style.transform = originalTransform
      }, 10)
    }, 10)
  }

  /**
   * Detect environmental conditions automatically
   */
  private detectEnvironmentalConditions(): void {
    // Monitor device orientation changes to detect if in pocket
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', (event) => {
        const isFlat = Math.abs(event.beta || 0) < 15 && Math.abs(event.gamma || 0) < 15
        this.environmental.deviceInPocket = !isFlat
      })
    }

    // Monitor ambient light if available (for pocket detection)
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-expect-error AmbientLightSensor is experimental API not in TypeScript types
        const sensor = new AmbientLightSensor()
        sensor.addEventListener('reading', () => {
          // @ts-expect-error illuminance property not in TypeScript types
          this.environmental.deviceInPocket = sensor.illuminance < 10
        })
        sensor.start()
      } catch {
        // AmbientLightSensor not supported
      }
    }
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('cropguard-haptic-config')
      if (saved) {
        const parsed = JSON.parse(saved)
        this.config = { ...this.config, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load haptic config:', error)
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('cropguard-haptic-config', JSON.stringify(this.config))
    } catch (error) {
      console.warn('Failed to save haptic config:', error)
    }
  }

  /**
   * Track haptic usage for analytics
   */
  private trackHapticUsage(pattern: HapticPattern): void {
    // Send analytics data about haptic usage
    const analyticsData = {
      pattern,
      timestamp: Date.now(),
      environmental: this.environmental,
      config: this.config
    }
    
    // Store for later analysis
    const usage = JSON.parse(localStorage.getItem('cropguard-haptic-usage') || '[]')
    usage.push(analyticsData)
    
    // Keep only last 100 events
    if (usage.length > 100) {
      usage.splice(0, usage.length - 100)
    }
    
    localStorage.setItem('cropguard-haptic-usage', JSON.stringify(usage))
  }

  /**
   * Provide contextual haptic patterns for farming scenarios
   */
  async plantHealthFeedback(healthScore: number, confidence: number): Promise<void> {
    if (healthScore > 0.8 && confidence > 0.7) {
      await this.triggerHaptic('plant_healthy')
    } else if (healthScore < 0.4 || confidence < 0.5) {
      await this.triggerHaptic('plant_warning')
    } else {
      await this.triggerHaptic('analysis_complete')
    }
  }

  /**
   * Weather-aware haptic feedback
   */
  async weatherBasedFeedback(weatherCondition: string): Promise<void> {
    this.environmental.weatherCondition = weatherCondition as EnvironmentalConditions['weatherCondition']
    
    if (weatherCondition === 'rainy' || weatherCondition === 'windy') {
      // Use stronger feedback in challenging weather
      this.config.intensity = 'strong'
      await this.triggerHaptic('weather_alert')
    }
  }

  /**
   * Field work completion feedback
   */
  async fieldWorkCompleteFeedback(taskType: 'analysis' | 'sync' | 'navigation'): Promise<void> {
    switch (taskType) {
      case 'analysis':
        await this.triggerHaptic('analysis_complete')
        break
      case 'sync':
        await this.triggerHaptic('sync_complete')
        break
      case 'navigation':
        await this.triggerHaptic('navigation_change')
        break
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(): {
    totalHaptics: number
    mostUsedPattern: HapticPattern | null
    averageIntensity: number
    environmentalUsage: Record<string, number>
  } {
    const usage = JSON.parse(localStorage.getItem('cropguard-haptic-usage') || '[]')
    
    if (usage.length === 0) {
      return {
        totalHaptics: 0,
        mostUsedPattern: null,
        averageIntensity: 0,
        environmentalUsage: {}
      }
    }

    const patternCounts: Record<string, number> = {}
    const environmentalUsage: Record<string, number> = {}
    
    usage.forEach((event: { pattern: string; environmental: EnvironmentalConditions; config: HapticConfig }) => {
      patternCounts[event.pattern] = (patternCounts[event.pattern] || 0) + 1
      
      if (event.environmental.isFieldMode) {
        environmentalUsage.fieldMode = (environmentalUsage.fieldMode || 0) + 1
      }
      if (event.environmental.isGloveMode) {
        environmentalUsage.gloveMode = (environmentalUsage.gloveMode || 0) + 1
      }
    })

    const mostUsedPattern = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as HapticPattern || null

    return {
      totalHaptics: usage.length,
      mostUsedPattern,
      averageIntensity: usage.reduce((sum: number, event: { config: HapticConfig }) => {
        const intensityValue = { light: 1, medium: 2, strong: 3 }[event.config.intensity] || 2
        return sum + intensityValue
      }, 0) / usage.length,
      environmentalUsage
    }
  }
}

export const hapticsService = new HapticsService()
export default hapticsService