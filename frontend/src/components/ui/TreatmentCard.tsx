import { Clock, DollarSign, AlertTriangle, CheckCircle, Leaf } from 'lucide-react'
import type { Treatment } from '../../services/treatments'

interface TreatmentCardProps {
  treatment: Treatment
  isRecommended?: boolean
  onSelect?: () => void
}

export function TreatmentCard({ treatment, isRecommended = false, onSelect }: TreatmentCardProps) {
  const getTypeIcon = () => {
    switch (treatment.type) {
      case 'organic':
        return <Leaf className="w-5 h-5 text-[#10B981]" />
      case 'biological':
        return <CheckCircle className="w-5 h-5 text-[#2DD4BF]" />
      case 'cultural':
        return <Clock className="w-5 h-5 text-[#F59E0B]" />
      case 'preventive':
        return <AlertTriangle className="w-5 h-5 text-[#10B981]" />
    }
  }

  const getTypeColor = () => {
    switch (treatment.type) {
      case 'organic':
        return 'bg-[#10B981]/20 text-[#10B981]'
      case 'biological':
        return 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
      case 'cultural':
        return 'bg-[#F59E0B]/20 text-[#F59E0B]'
      case 'preventive':
        return 'bg-[#10B981]/20 text-[#10B981]'
    }
  }

  const getCostColor = () => {
    switch (treatment.cost) {
      case 'low':
        return 'text-[#10B981]'
      case 'medium':
        return 'text-[#F59E0B]'
      case 'high':
        return 'text-red-400'
    }
  }

  const getDifficultyColor = () => {
    switch (treatment.difficulty) {
      case 'easy':
        return 'text-[#10B981]'
      case 'moderate':
        return 'text-[#F59E0B]'
      case 'advanced':
        return 'text-red-400'
    }
  }

  const effectivenessPercentage = Math.round(treatment.effectiveness * 100)

  return (
    <div className={`bg-[#4A5B7C] rounded-lg p-6 border transition-all ${
      isRecommended 
        ? 'border-[#10B981] shadow-lg shadow-[#10B981]/20' 
        : 'border-gray-600 hover:border-gray-500'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getTypeIcon()}
          <div>
            <h3 className="text-lg font-semibold text-white">{treatment.name}</h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
              {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)}
            </span>
          </div>
        </div>
        {isRecommended && (
          <span className="bg-[#10B981] text-white px-2 py-1 rounded-full text-xs font-medium">
            Recommended
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-300 mb-4 leading-relaxed">
        {treatment.description}
      </p>

      {/* Effectiveness Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-300">Effectiveness</span>
          <span className="text-sm text-[#10B981] font-medium">{effectivenessPercentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#10B981] h-2 rounded-full transition-all duration-500"
            style={{ width: `${effectivenessPercentage}%` }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Cost:</span>
            <span className={`font-medium ${getCostColor()}`}>
              {treatment.cost.charAt(0).toUpperCase() + treatment.cost.slice(1)}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Difficulty:</span>
            <span className={`font-medium ${getDifficultyColor()}`}>
              {treatment.difficulty.charAt(0).toUpperCase() + treatment.difficulty.slice(1)}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-gray-400">Frequency:</span>
            <span className="text-white ml-2">{treatment.frequency}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Safety Period:</span>
            <span className="text-white ml-2">{treatment.safetyPeriod}</span>
          </div>
        </div>
      </div>

      {/* Application Method */}
      <div className="mb-4">
        <span className="text-sm text-gray-400">Application: </span>
        <span className="text-white text-sm font-medium">{treatment.applicationMethod}</span>
      </div>

      {/* Warnings */}
      {treatment.warnings && treatment.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-sm font-medium">Warnings</span>
          </div>
          <ul className="text-sm text-[#F59E0B] space-y-1">
            {treatment.warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      {onSelect && (
        <button
          onClick={onSelect}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isRecommended
              ? 'bg-[#10B981] hover:bg-[#10B981]/80 text-white'
              : 'border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
          }`}
        >
          View Instructions
        </button>
      )}
    </div>
  )
}