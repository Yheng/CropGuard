import { AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react'

export interface AnalysisResult {
  id: string
  confidence: number
  condition: 'healthy' | 'pest' | 'disease' | 'unknown'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
  timestamp: Date
}

interface AnalysisResultsProps {
  result: AnalysisResult
  onViewTreatments?: () => void
}

export function AnalysisResults({ result, onViewTreatments }: AnalysisResultsProps) {
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
        <button className="flex-1 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors">
          Save Analysis
        </button>
        <button className="flex-1 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors">
          Share Results
        </button>
      </div>
    </div>
  )
}