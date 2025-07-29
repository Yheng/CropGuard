import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Sun, 
  Hand, 
  Smartphone, 
  Volume2, 
  Eye, 
  Settings, 
  Gauge,
  MapPin,
  Wifi,
  Save,
  RotateCcw
} from 'lucide-react'
import { useFieldMode } from '../contexts/FieldModeContext'
import { hapticsService } from '../services/haptics'
import FieldOptimizedButton from '../components/ui/FieldOptimizedButton'
import FieldOptimizedInput from '../components/ui/FieldOptimizedInput'

export function FieldSettings() {
  const navigate = useNavigate()
  const { 
    fieldMode, 
    settings, 
    weatherData, 
    setFieldMode, 
    updateSettings, 
    refreshWeatherData,
    isFieldOptimized 
  } = useFieldMode()

  const [tempSettings, setTempSettings] = useState(settings)
  const [isTestingHaptics, setIsTestingHaptics] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      updateSettings(tempSettings)
      
      // Update haptics service
      hapticsService.updateConfig({
        enabled: tempSettings.hapticFeedback,
        intensity: tempSettings.gloveMode ? 'strong' : 'medium',
        fieldModeIntensity: 'enhanced',
        adaptToEnvironment: true,
        weatherAdaptation: tempSettings.autoWeatherAdaptation
      })

      // Update environmental conditions for haptics
      hapticsService.updateEnvironmentalConditions({
        isFieldMode: isFieldOptimized,
        isGloveMode: tempSettings.gloveMode,
        weatherCondition: weatherData?.condition as any || 'sunny'
      })

      await hapticsService.triggerHaptic('success_pulse')
      
      setTimeout(() => {
        setIsSaving(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setIsSaving(false)
      await hapticsService.triggerHaptic('error_buzz')
    }
  }

  const handleTestHaptics = async () => {
    setIsTestingHaptics(true)
    try {
      await hapticsService.testHaptic('medium_tap')
      await new Promise(resolve => setTimeout(resolve, 300))
      await hapticsService.testHaptic('success_pulse')
    } finally {
      setIsTestingHaptics(false)
    }
  }

  const handleResetToDefaults = async () => {
    const defaultSettings = {
      touchTargetSize: 'standard' as const,
      pressTimeout: 300,
      hapticFeedback: true,
      autoWeatherAdaptation: true,
      highContrastMode: false,
      fontSizeMultiplier: 1,
      oneHandedMode: false,
      gloveMode: false
    }
    
    setTempSettings(defaultSettings)
    updateSettings(defaultSettings)
    await hapticsService.triggerHaptic('navigation_change')
  }

  const getFieldModeDescription = () => {
    switch (fieldMode) {
      case 'field':
        return 'Optimized for outdoor farming with larger buttons and enhanced visibility'
      case 'high-contrast':
        return 'Maximum contrast for bright sunlight conditions'
      case 'standard':
      default:
        return 'Regular interface for indoor or office use'
    }
  }

  const getTouchTargetSizeDescription = (size: string) => {
    switch (size) {
      case 'large': return '60px - Better for gloved hands'
      case 'extra-large': return '76px - Maximum accessibility'
      case 'standard':
      default: return '44px - Standard mobile size'
    }
  }

  return (
    <div className="min-h-screen field-background">
      {/* Header */}
      <header className={`border-b ${isFieldOptimized ? 'border-gray-400' : 'border-gray-600'} bg-field-adaptive-bg`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <FieldOptimizedButton
              onClick={() => navigate(-1)}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </FieldOptimizedButton>
            
            <div>
              <h1 className={`${isFieldOptimized ? 'text-3xl' : 'text-2xl'} font-bold high-contrast-text`}>
                Farm Settings
              </h1>
              <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                Configure your field work preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          
          {/* Field Mode Selection */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Sun className={`${isFieldOptimized ? 'w-8 h-8' : 'w-6 h-6'} text-yellow-500`} />
              <div>
                <h2 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold high-contrast-text`}>
                  Field Mode
                </h2>
                <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  Choose your working environment
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {(['standard', 'field', 'high-contrast'] as const).map((mode) => (
                <FieldOptimizedButton
                  key={mode}
                  onClick={() => setFieldMode(mode)}
                  variant={fieldMode === mode ? 'primary' : 'secondary'}
                  className="p-4 text-left flex-col items-start h-auto"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`${isFieldOptimized ? 'text-lg' : 'text-base'} font-semibold capitalize`}>
                        {mode === 'high-contrast' ? 'High Contrast' : mode} Mode
                      </h3>
                      {fieldMode === mode && (
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <p className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-80`}>
                      {getFieldModeDescription()}
                    </p>
                  </div>
                </FieldOptimizedButton>
              ))}
            </div>
          </section>

          {/* Touch & Interaction Settings */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Hand className={`${isFieldOptimized ? 'w-8 h-8' : 'w-6 h-6'} text-blue-500`} />
              <div>
                <h2 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold high-contrast-text`}>
                  Touch & Interaction
                </h2>
                <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  Optimize for your working conditions
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Touch Target Size */}
              <div>
                <label className={`block ${isFieldOptimized ? 'text-lg' : 'text-base'} font-medium mb-3 high-contrast-text`}>
                  Touch Target Size
                </label>
                <div className="grid gap-3">
                  {(['standard', 'large', 'extra-large'] as const).map((size) => (
                    <FieldOptimizedButton
                      key={size}
                      onClick={() => handleSettingChange('touchTargetSize', size)}
                      variant={tempSettings.touchTargetSize === size ? 'primary' : 'secondary'}
                      className="p-3 text-left flex items-center justify-between"
                    >
                      <span className="capitalize">{size.replace('-', ' ')}</span>
                      <span className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                        {getTouchTargetSizeDescription(size)}
                      </span>
                    </FieldOptimizedButton>
                  ))}
                </div>
              </div>

              {/* Press Timeout */}
              <div>
                <FieldOptimizedInput
                  label="Press Response Time (ms)"
                  type="number"
                  min="100"
                  max="1000"
                  step="50"
                  value={tempSettings.pressTimeout}
                  onChange={(e) => handleSettingChange('pressTimeout', parseInt(e.target.value))}
                  helpText="Higher values help prevent accidental touches when wearing gloves"
                />
              </div>

              {/* Toggle Options */}
              <div className="grid gap-4">
                <FieldOptimizedButton
                  onClick={() => handleSettingChange('gloveMode', !tempSettings.gloveMode)}
                  variant={tempSettings.gloveMode ? 'primary' : 'secondary'}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Hand className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Glove Mode</div>
                      <div className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                        Larger targets and extended timeouts
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded ${tempSettings.gloveMode ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </FieldOptimizedButton>

                <FieldOptimizedButton
                  onClick={() => handleSettingChange('oneHandedMode', !tempSettings.oneHandedMode)}
                  variant={tempSettings.oneHandedMode ? 'primary' : 'secondary'}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">One-Handed Mode</div>
                      <div className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                        Navigation optimized for thumb reach
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded ${tempSettings.oneHandedMode ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </FieldOptimizedButton>
              </div>
            </div>
          </section>

          {/* Accessibility Settings */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye className={`${isFieldOptimized ? 'w-8 h-8' : 'w-6 h-6'} text-purple-500`} />
              <div>
                <h2 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold high-contrast-text`}>
                  Visibility & Accessibility
                </h2>
                <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  Improve visibility in field conditions
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Font Size */}
              <div>
                <label className={`block ${isFieldOptimized ? 'text-lg' : 'text-base'} font-medium mb-3 high-contrast-text`}>
                  Text Size: {Math.round(tempSettings.fontSizeMultiplier * 100)}%
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={tempSettings.fontSizeMultiplier}
                  onChange={(e) => handleSettingChange('fontSizeMultiplier', parseFloat(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{ minHeight: isFieldOptimized ? '48px' : '32px' }}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Smaller</span>
                  <span>Larger</span>
                </div>
              </div>

              {/* High Contrast Toggle */}
              <FieldOptimizedButton
                onClick={() => handleSettingChange('highContrastMode', !tempSettings.highContrastMode)}
                variant={tempSettings.highContrastMode ? 'primary' : 'secondary'}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">High Contrast Mode</div>
                    <div className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                      Maximum contrast for bright conditions
                    </div>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded ${tempSettings.highContrastMode ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </FieldOptimizedButton>
            </div>
          </section>

          {/* Haptic Feedback */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className={`${isFieldOptimized ? 'w-8 h-8' : 'w-6 h-6'} text-green-500`} />
              <div>
                <h2 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold high-contrast-text`}>
                  Haptic Feedback
                </h2>
                <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  Tactile feedback for field work
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <FieldOptimizedButton
                onClick={() => handleSettingChange('hapticFeedback', !tempSettings.hapticFeedback)}
                variant={tempSettings.hapticFeedback ? 'primary' : 'secondary'}
                className="flex items-center justify-between p-4"
              >
                <div className="text-left">
                  <div className="font-medium">Enable Haptic Feedback</div>
                  <div className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                    Vibration feedback for actions and alerts
                  </div>
                </div>
                <div className={`w-6 h-6 rounded ${tempSettings.hapticFeedback ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </FieldOptimizedButton>

              {tempSettings.hapticFeedback && (
                <FieldOptimizedButton
                  onClick={handleTestHaptics}
                  disabled={isTestingHaptics}
                  variant="secondary"
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <Gauge className="w-5 h-5" />
                  <span>{isTestingHaptics ? 'Testing...' : 'Test Haptic Feedback'}</span>
                </FieldOptimizedButton>
              )}
            </div>
          </section>

          {/* Weather Integration */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className={`${isFieldOptimized ? 'w-8 h-8' : 'w-6 h-6'} text-orange-500`} />
              <div>
                <h2 className={`${isFieldOptimized ? 'text-2xl' : 'text-xl'} font-semibold high-contrast-text`}>
                  Weather Integration
                </h2>
                <p className={`${isFieldOptimized ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  Automatic adjustments based on conditions
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <FieldOptimizedButton
                onClick={() => handleSettingChange('autoWeatherAdaptation', !tempSettings.autoWeatherAdaptation)}
                variant={tempSettings.autoWeatherAdaptation ? 'primary' : 'secondary'}
                className="flex items-center justify-between p-4"
              >
                <div className="text-left">
                  <div className="font-medium">Auto Weather Adaptation</div>
                  <div className={`${isFieldOptimized ? 'text-sm' : 'text-xs'} opacity-70`}>
                    Automatically adjust interface based on weather
                  </div>
                </div>
                <div className={`w-6 h-6 rounded ${tempSettings.autoWeatherAdaptation ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </FieldOptimizedButton>

              {weatherData && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Current Conditions</span>
                    <FieldOptimizedButton
                      onClick={refreshWeatherData}
                      variant="secondary"
                      size="sm"
                    >
                      <Wifi className="w-4 h-4" />
                    </FieldOptimizedButton>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {weatherData.condition} • {weatherData.brightness}% brightness
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <FieldOptimizedButton
              onClick={handleSaveSettings}
              disabled={isSaving}
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </FieldOptimizedButton>

            <FieldOptimizedButton
              onClick={handleResetToDefaults}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset</span>
            </FieldOptimizedButton>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FieldSettings