import { AlertTriangle, CheckCircle, Info, Clock, Save, Share2, Copy, Download, Mail, MessageSquare } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { analysisService } from '../../services/analysis'

export interface AnalysisResult {
  id: string
  confidence: number
  condition: 'healthy' | 'pest' | 'disease' | 'unknown'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
  timestamp: Date
  imageUrl?: string
  detectedIssues?: {
    name: string
    confidence: number
    description: string
  }[]
}

interface AnalysisResultsProps {
  result: AnalysisResult
  onViewTreatments?: () => void
  onAnalysisSaved?: () => void
}

export function AnalysisResults({ result, onViewTreatments, onAnalysisSaved }: AnalysisResultsProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])
  
  const handleSaveAnalysis = async () => {
    if (saving || saved) return
    
    setSaving(true)
    try {
      await analysisService.saveAnalysis(result)
      setSaved(true)
      onAnalysisSaved?.()
      
      // Show success feedback
      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to save analysis:', error)
      alert('Failed to save analysis. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const generateShareText = () => {
    const confidencePercentage = Math.round(result.confidence * 100)
    const date = result.timestamp.toLocaleDateString()
    
    return `🌱 CropGuard Plant Analysis Report

📊 Analysis Results:
• Plant: ${result.title}
• Condition: ${result.condition.charAt(0).toUpperCase() + result.condition.slice(1)}
• Confidence: ${confidencePercentage}%
• Severity: ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
• Date: ${date}

📝 Description:
${result.description}

💡 Recommendations:
${result.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

🔬 Analyzed with CropGuard AI - Smart Crop Disease Detection
`
  }

  const handleCopyToClipboard = async () => {
    try {
      setSharing(true)
      const shareText = generateShareText()
      await navigator.clipboard.writeText(shareText)
      alert('✅ Analysis results copied to clipboard!')
      setShowShareMenu(false)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('❌ Failed to copy to clipboard. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const handleDownloadReport = () => {
    try {
      setSharing(true)
      const shareText = generateShareText()
      const blob = new Blob([shareText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CropGuard_Analysis_${result.id}_${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowShareMenu(false)
      alert('✅ Analysis report downloaded!')
    } catch (error) {
      console.error('Failed to download:', error)
      alert('❌ Failed to download report. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const handleEmailShare = () => {
    try {
      setSharing(true)
      const shareText = generateShareText()
      const subject = `CropGuard Analysis Report - ${result.title}`
      const body = encodeURIComponent(shareText)
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`
      window.open(mailtoUrl, '_blank')
      setShowShareMenu(false)
    } catch (error) {
      console.error('Failed to open email:', error)
      alert('❌ Failed to open email client. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const handleWebShare = async () => {
    if (!navigator.share) {
      // Fallback to copy to clipboard if Web Share API not available
      handleCopyToClipboard()
      return
    }

    try {
      setSharing(true)
      const shareText = generateShareText()
      
      await navigator.share({
        title: `CropGuard Analysis - ${result.title}`,
        text: shareText,
        url: window.location.href
      })
      
      setShowShareMenu(false)
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to share:', error)
        // Fallback to copy to clipboard
        handleCopyToClipboard()
      }
    } finally {
      setSharing(false)
    }
  }
  const getConditionIcon = () => {
    switch (result.condition) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-[#10B981]" />
      case 'pest':
      case 'disease':
        return <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
      default:
        return <Info className="w-6 h-6 text-[#2DD4BF]" />
    }
  }

  const getConditionColor = () => {
    switch (result.condition) {
      case 'healthy':
        return 'text-[#10B981]'
      case 'pest':
      case 'disease':
        return 'text-[#F59E0B]'
      default:
        return 'text-[#2DD4BF]'
    }
  }

  const getSeverityColor = () => {
    switch (result.severity) {
      case 'low':
        return 'bg-[#10B981]/20 text-[#10B981]'
      case 'medium':
        return 'bg-[#F59E0B]/20 text-[#F59E0B]'
      case 'high':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const confidencePercentage = Math.round(result.confidence * 100)

  return (
    <div className="bg-[#4A5B7C] rounded-lg p-6 border border-gray-600">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getConditionIcon()}
          <div>
            <h3 className={`text-xl font-semibold ${getConditionColor()}`}>
              {result.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                {result.timestamp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {confidencePercentage}%
          </div>
          <div className="text-sm text-gray-400">Confidence</div>
        </div>
      </div>

      {/* Severity Badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor()}`}>
          Severity: {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
        </span>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-300 leading-relaxed">
          {result.description}
        </p>
      </div>

      {/* Confidence Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">Confidence Level</span>
          <span className="text-sm text-gray-400">{confidencePercentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#10B981] h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${confidencePercentage}%` }}
          />
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Immediate Actions</h4>
          <ul className="space-y-2">
            {result.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                <span className="text-gray-300 text-sm leading-relaxed">
                  {recommendation}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {onViewTreatments && result.condition !== 'healthy' && (
          <button
            onClick={onViewTreatments}
            className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            View Treatment Options
          </button>
        )}
        <button 
          onClick={handleSaveAnalysis}
          disabled={saving || saved}
          className={`flex-1 border font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            saved 
              ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/10' 
              : saving
              ? 'border-gray-600 text-gray-500 cursor-not-allowed'
              : 'border-gray-600 hover:border-gray-500 text-gray-300'
          }`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Analysis
            </>
          )}
        </button>
        <div className="flex-1 relative" ref={shareMenuRef}>
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            disabled={sharing}
            className={`w-full border font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              sharing
                ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                : 'border-gray-600 hover:border-gray-500 text-gray-300'
            }`}
          >
            {sharing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Results
              </>
            )}
          </button>

          {/* Share Menu Dropdown */}
          {showShareMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-[#1F2A44] border border-gray-600 rounded-lg shadow-xl z-50">
              <div className="p-2 space-y-1">
                <button
                  onClick={handleWebShare}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#2A3441] rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#10B981]" />
                  <span>Share via Apps</span>
                </button>
                
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#2A3441] rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-[#2DD4BF]" />
                  <span>Copy to Clipboard</span>
                </button>
                
                <button
                  onClick={handleDownloadReport}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#2A3441] rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-[#F59E0B]" />
                  <span>Download Report</span>
                </button>
                
                <button
                  onClick={handleEmailShare}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#2A3441] rounded-lg transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Send via Email</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}