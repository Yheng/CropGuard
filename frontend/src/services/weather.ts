/**
 * Weather Data Service for CropGuard
 * Provides weather information for adaptive UI theming and field optimization
 */

export interface WeatherCondition {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'dawn' | 'dusk' | 'night'
  temperature: number // Celsius
  humidity: number // Percentage
  windSpeed: number // km/h
  brightness: number // 0-100, calculated value for UI adaptation
  uvIndex: number // 0-12
  visibility: number // km
  pressure: number // hPa
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
  lastUpdated: string
  location?: {
    latitude: number
    longitude: number
    name: string
  }
}

export interface WeatherForecast {
  current: WeatherCondition
  hourly: WeatherCondition[]
  daily: WeatherCondition[]
}

export interface FieldWorkRecommendations {
  fieldWorkSuitability: 'excellent' | 'good' | 'fair' | 'poor' | 'not_recommended'
  recommendations: string[]
  optimalTimes: string[]
  warnings: string[]
  uiAdaptations: {
    enableHighContrast: boolean
    enableGloveMode: boolean
    increaseTextSize: boolean
    enableHapticFeedback: boolean
  }
}

class WeatherService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.openweathermap.org/data/2.5'
  private cache = new Map<string, { data: WeatherCondition; timestamp: number }>()
  private cacheExpiry = 10 * 60 * 1000 // 10 minutes

  constructor() {
    // In a real implementation, you'd get this from environment variables
    this.apiKey = process.env.REACT_APP_WEATHER_API_KEY || null
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(location?: { lat: number; lon: number }): Promise<WeatherCondition> {
    try {
      if (this.apiKey && location) {
        return await this.fetchRealWeatherData(location)
      } else {
        // Fallback to simulated weather data
        return this.generateSimulatedWeather()
      }
    } catch (error) {
      console.warn('Failed to fetch weather data, using simulated data:', error)
      return this.generateSimulatedWeather()
    }
  }

  /**
   * Get weather forecast
   */
  async getWeatherForecast(location?: { lat: number; lon: number }): Promise<WeatherForecast> {
    const current = await this.getCurrentWeather(location)
    
    // Generate forecast based on current conditions
    const hourly = this.generateHourlyForecast(current)
    const daily = this.generateDailyForecast(current)

    return { current, hourly, daily }
  }

  /**
   * Get field work recommendations based on weather
   */
  getFieldWorkRecommendations(weather: WeatherCondition): FieldWorkRecommendations {
    const recommendations: string[] = []
    const warnings: string[] = []
    const optimalTimes: string[] = []
    let fieldWorkSuitability: FieldWorkRecommendations['fieldWorkSuitability'] = 'good'

    // Analyze weather conditions
    if (weather.condition === 'rainy') {
      fieldWorkSuitability = 'poor'
      warnings.push('Wet conditions may damage plants and soil')
      recommendations.push('Wait for dry conditions before field work')
      recommendations.push('Enable glove mode for better grip in wet conditions')
    }

    if (weather.condition === 'sunny' && weather.brightness > 85) {
      recommendations.push('Wear sun protection and stay hydrated')
      recommendations.push('Work during early morning or late afternoon')
      optimalTimes.push('6:00 AM - 9:00 AM', '4:00 PM - 7:00 PM')
      
      if (weather.temperature > 30) {
        fieldWorkSuitability = 'fair'
        warnings.push('High temperature - risk of heat stress')
      }
    }

    if (weather.condition === 'cloudy') {
      fieldWorkSuitability = 'excellent'
      recommendations.push('Ideal conditions for extended field work')
      optimalTimes.push('All day suitable')
    }

    if (weather.windSpeed > 25) {
      warnings.push('High wind conditions - be careful with equipment')
      if (weather.windSpeed > 40) {
        fieldWorkSuitability = 'not_recommended'
        warnings.push('Dangerous wind conditions - avoid field work')
      }
    }

    if (weather.humidity > 80) {
      recommendations.push('High humidity - take frequent breaks')
    }

    // UI adaptations based on conditions
    const uiAdaptations = {
      enableHighContrast: weather.brightness > 80 || weather.condition === 'sunny',
      enableGloveMode: weather.condition === 'rainy' || weather.temperature < 10,
      increaseTextSize: weather.brightness < 30 || weather.condition === 'night',
      enableHapticFeedback: weather.condition === 'rainy' || weather.windSpeed > 15
    }

    return {
      fieldWorkSuitability,
      recommendations,
      optimalTimes,
      warnings,
      uiAdaptations
    }
  }

  /**
   * Calculate brightness level for UI adaptation
   */
  private calculateBrightness(condition: string, timeOfDay: string, cloudCover: number = 0): number {
    let baseBrightness = 50

    // Time-based brightness
    switch (timeOfDay) {
      case 'morning':
        baseBrightness = 60
        break
      case 'midday':
        baseBrightness = 90
        break
      case 'afternoon':
        baseBrightness = 75
        break
      case 'evening':
        baseBrightness = 40
        break
      case 'night':
        baseBrightness = 5
        break
    }

    // Weather condition adjustments
    switch (condition) {
      case 'sunny':
        baseBrightness = Math.min(100, baseBrightness + 20)
        break
      case 'cloudy':
        baseBrightness = Math.max(30, baseBrightness - 20)
        break
      case 'rainy':
        baseBrightness = Math.max(20, baseBrightness - 30)
        break
    }

    // Cloud cover adjustment
    baseBrightness = Math.max(10, baseBrightness - (cloudCover * 0.5))

    return Math.round(Math.max(0, Math.min(100, baseBrightness)))
  }

  /**
   * Determine time of day
   */
  private getTimeOfDay(): WeatherCondition['timeOfDay'] {
    const hour = new Date().getHours()
    
    if (hour >= 5 && hour < 10) return 'morning'
    if (hour >= 10 && hour < 15) return 'midday'
    if (hour >= 15 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  /**
   * Generate simulated weather data for testing/fallback
   */
  private generateSimulatedWeather(): WeatherCondition {
    const timeOfDay = this.getTimeOfDay()
    
    // Create realistic weather based on time
    let condition: WeatherCondition['condition']
    let temperature: number
    let humidity: number
    
    if (timeOfDay === 'night') {
      condition = 'night'
      temperature = 15 + Math.random() * 10
      humidity = 60 + Math.random() * 30
    } else {
      // weatherTypes array removed as unused
      const weights = timeOfDay === 'midday' ? [0.6, 0.3, 0.1] : [0.4, 0.4, 0.2]
      
      const random = Math.random()
      if (random < weights[0]) condition = 'sunny'
      else if (random < weights[0] + weights[1]) condition = 'cloudy'
      else condition = 'rainy'
      
      temperature = 20 + Math.random() * 15
      humidity = 40 + Math.random() * 40
    }

    const brightness = this.calculateBrightness(condition, timeOfDay)
    
    return {
      condition,
      temperature: Math.round(temperature),
      humidity: Math.round(humidity),
      windSpeed: Math.round(5 + Math.random() * 20),
      brightness,
      uvIndex: Math.round(Math.max(0, (brightness / 100) * 12)),
      visibility: Math.round(5 + Math.random() * 15),
      pressure: Math.round(1000 + Math.random() * 50),
      timeOfDay,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Fetch real weather data from OpenWeatherMap API
   */
  private async fetchRealWeatherData(location: { lat: number; lon: number }): Promise<WeatherCondition> {
    const cacheKey = `${location.lat},${location.lon}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    const response = await fetch(
      `${this.baseUrl}/weather?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`
    )
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }
    
    const data = await response.json()
    const timeOfDay = this.getTimeOfDay()
    
    const condition = this.mapWeatherCondition(data.weather[0].main, timeOfDay)
    const brightness = this.calculateBrightness(condition, timeOfDay, data.clouds?.all || 0)
    
    const weatherCondition: WeatherCondition = {
      condition,
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
      brightness,
      uvIndex: 0, // Would need separate UV API call
      visibility: Math.round((data.visibility || 10000) / 1000), // Convert m to km
      pressure: data.main.pressure,
      timeOfDay,
      lastUpdated: new Date().toISOString(),
      location: {
        latitude: location.lat,
        longitude: location.lon,
        name: data.name
      }
    }
    
    // Cache the result
    this.cache.set(cacheKey, { data: weatherCondition, timestamp: Date.now() })
    
    return weatherCondition
  }

  /**
   * Map OpenWeatherMap conditions to our simplified conditions
   */
  private mapWeatherCondition(owmCondition: string, timeOfDay: string): WeatherCondition['condition'] {
    if (timeOfDay === 'night') return 'night'
    if (timeOfDay === 'morning' && new Date().getHours() < 8) return 'dawn'
    if (timeOfDay === 'evening' && new Date().getHours() > 19) return 'dusk'
    
    switch (owmCondition.toLowerCase()) {
      case 'clear':
        return 'sunny'
      case 'clouds':
        return 'cloudy'
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'rainy'
      default:
        return 'cloudy'
    }
  }

  /**
   * Generate hourly forecast (simplified)
   */
  private generateHourlyForecast(current: WeatherCondition): WeatherCondition[] {
    const forecast: WeatherCondition[] = []
    
    for (let i = 1; i <= 24; i++) {
      const futureTime = new Date(Date.now() + i * 60 * 60 * 1000)
      const hour = futureTime.getHours()
      
      let timeOfDay: WeatherCondition['timeOfDay']
      if (hour >= 5 && hour < 10) timeOfDay = 'morning'
      else if (hour >= 10 && hour < 15) timeOfDay = 'midday'
      else if (hour >= 15 && hour < 18) timeOfDay = 'afternoon'
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening'
      else timeOfDay = 'night'
      
      // Simulate slight variations
      const tempVariation = (Math.random() - 0.5) * 6
      const humidityVariation = (Math.random() - 0.5) * 20
      
      forecast.push({
        ...current,
        temperature: Math.round(current.temperature + tempVariation),
        humidity: Math.max(20, Math.min(100, Math.round(current.humidity + humidityVariation))),
        timeOfDay,
        brightness: this.calculateBrightness(current.condition, timeOfDay),
        lastUpdated: futureTime.toISOString()
      })
    }
    
    return forecast
  }

  /**
   * Generate daily forecast (simplified)
   */
  private generateDailyForecast(current: WeatherCondition): WeatherCondition[] {
    const forecast: WeatherCondition[] = []
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      
      // Simulate weather changes over days
      const tempVariation = (Math.random() - 0.5) * 10
      const conditions: Array<WeatherCondition['condition']> = ['sunny', 'cloudy', 'rainy']
      const condition = conditions[Math.floor(Math.random() * conditions.length)]
      
      forecast.push({
        ...current,
        condition,
        temperature: Math.round(current.temperature + tempVariation),
        timeOfDay: 'midday', // Use midday as representative for daily forecast
        brightness: this.calculateBrightness(condition, 'midday'),
        lastUpdated: futureDate.toISOString()
      })
    }
    
    return forecast
  }

  /**
   * Get user's location for weather data
   */
  async getUserLocation(): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          resolve(null)
        },
        {
          timeout: 10000,
          maximumAge: 5 * 60 * 1000 // 5 minutes
        }
      )
    })
  }
}

export const weatherService = new WeatherService()
export default weatherService