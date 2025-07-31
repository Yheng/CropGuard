import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Sun, 
  Hand, 
  Smartphone, 
  Volume2, 
  Eye, 
  Settings, 
  Save,
  RotateCcw
} from 'lucide-react'
import { useFieldMode } from '../contexts/FieldModeContext'

export function FieldSettings() {
  const navigate = useNavigate()
  const { 
    fieldMode, 
    settings, 
    setFieldMode, 
    updateSettings,
  } = useFieldMode()

  const [tempSettings, setTempSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)

  const handleSettingChange = (key: keyof typeof settings, value: string | number | boolean) => {
    setTempSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      updateSettings(tempSettings)
      setTimeout(() => setIsSaving(false), 500)
    } catch {
      setIsSaving(false)
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-white">
                Farm Settings
              </h1>
              <p className="text-sm text-gray-300">
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
          <section className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Sun className="w-6 h-6 text-yellow-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Field Mode
                </h2>
                <p className="text-sm text-gray-300">
                  Choose your working environment
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                { mode: 'standard', title: 'Standard Mode', desc: 'Regular interface for indoor or office use' },
                { mode: 'field', title: 'Field Mode', desc: 'Regular interface for indoor or office use' },
                { mode: 'high-contrast', title: 'High Contrast Mode', desc: 'Regular interface for indoor or office use' }
              ].map(({ mode, title, desc }) => (
                <button
                  key={mode}
                  onClick={() => setFieldMode(mode as 'standard' | 'field' | 'high-contrast')}
                  className={`p-4 text-left rounded-lg border transition-colors ${
                    fieldMode === mode
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-slate-700 border-gray-600 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">{title}</h3>
                    {fieldMode === mode && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs opacity-80">{desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Touch & Interaction Settings */}
          <section className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Hand className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Touch & Interaction
                </h2>
                <p className="text-sm text-gray-300">
                  Optimize for your working conditions
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Touch Target Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Touch Target Size
                </label>
                <div className="grid gap-3">
                  {[
                    { value: 'standard', label: 'Standard', desc: '44px - Standard mobile size' },
                    { value: 'large', label: 'Large', desc: '60px - Better for gloved hands' },
                    { value: 'extra-large', label: 'Extra Large', desc: '76px - Maximum accessibility' }
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => handleSettingChange('touchTargetSize', value)}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        tempSettings.touchTargetSize === value
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-700 border-gray-600 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{label}</span>
                        {tempSettings.touchTargetSize === value && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs opacity-80">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Press Response Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Press Response Time (ms)
                </label>
                <input
                  type="number"
                  value={tempSettings.pressTimeout}
                  onChange={(e) => handleSettingChange('pressTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  min="100"
                  max="1000"
                  step="50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Higher values help prevent accidental touches when wearing gloves
                </p>
              </div>

              {/* Toggle Options */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-gray-600">
                  <div>
                    <div className="flex items-center gap-2">
                      <Hand className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-white">Glove Mode</span>
                    </div>
                    <p className="text-xs text-gray-400">Larger targets and extended timeouts</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('gloveMode', !tempSettings.gloveMode)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      tempSettings.gloveMode ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      tempSettings.gloveMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-gray-600">
                  <div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-white">One-Handed Mode</span>
                    </div>
                    <p className="text-xs text-gray-400">Navigation optimized for thumb reach</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('oneHandedMode', !tempSettings.oneHandedMode)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      tempSettings.oneHandedMode ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      tempSettings.oneHandedMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Visibility & Accessibility */}
          <section className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-purple-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Visibility & Accessibility
                </h2>
                <p className="text-sm text-gray-300">
                  Improve visibility in field conditions
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Text Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Text Size: {Math.round(tempSettings.fontSizeMultiplier * 100)}%
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Smaller</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.1"
                    value={tempSettings.fontSizeMultiplier}
                    onChange={(e) => handleSettingChange('fontSizeMultiplier', parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">Larger</span>
                </div>
              </div>

              {/* High Contrast Mode */}              
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-gray-600">
                <div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-white">High Contrast Mode</span>
                  </div>
                  <p className="text-xs text-gray-400">Maximum contrast for bright conditions</p>
                </div>
                <button
                  onClick={() => handleSettingChange('highContrastMode', !tempSettings.highContrastMode)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    tempSettings.highContrastMode ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    tempSettings.highContrastMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Haptic Feedback */}
          <section className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Haptic Feedback
                </h2>
                <p className="text-sm text-gray-300">
                  Tactile feedback for field work
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-gray-600">
              <div>
                <span className="font-medium text-white">Enable Haptic Feedback</span>
                <p className="text-xs text-gray-400">Vibration feedback for actions and alerts</p>
              </div>
              <button
                onClick={() => handleSettingChange('hapticFeedback', !tempSettings.hapticFeedback)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  tempSettings.hapticFeedback ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  tempSettings.hapticFeedback ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </section>

          {/* Weather Integration */}
          <section className="bg-slate-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Sun className="w-6 h-6 text-orange-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Weather Integration
                </h2>
                <p className="text-sm text-gray-300">
                  Automatic adjustments based on conditions
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-gray-600">
              <div>
                <span className="font-medium text-white">Auto Weather Adaptation</span>
                <p className="text-xs text-gray-400">Automatically adjust interface based on weather</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoWeatherAdaptation', !tempSettings.autoWeatherAdaptation)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  tempSettings.autoWeatherAdaptation ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  tempSettings.autoWeatherAdaptation ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8 pb-8">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-gray-600"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </main>
    </div>
  )
}