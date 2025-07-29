import { X, Clock, AlertTriangle, CheckCircle, Leaf, ShoppingCart } from 'lucide-react'
import type { Treatment } from '../../services/treatments'

interface TreatmentInstructionsProps {
  treatment: Treatment
  onClose: () => void
  onSave?: () => void
}

export function TreatmentInstructions({ treatment, onClose, onSave }: TreatmentInstructionsProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1F2A44] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center space-x-3">
            <Leaf className="w-6 h-6 text-[#10B981]" />
            <h2 className="text-xl font-bold text-white">{treatment.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed">{treatment.description}</p>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Required Materials</span>
            </h3>
            <div className="bg-[#4A5B7C] rounded-lg p-4">
              <ul className="space-y-2">
                {treatment.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center space-x-2 text-gray-300">
                    <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Step-by-Step Instructions</h3>
            <div className="space-y-3">
              {treatment.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-[#10B981] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-gray-300 leading-relaxed">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Application Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#4A5B7C] rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#2DD4BF]" />
                <span>Application Schedule</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Method:</span>
                  <span className="text-white ml-2">{treatment.applicationMethod}</span>
                </div>
                <div>
                  <span className="text-gray-400">Frequency:</span>
                  <span className="text-white ml-2">{treatment.frequency}</span>
                </div>
                <div>
                  <span className="text-gray-400">Safety Period:</span>
                  <span className="text-white ml-2">{treatment.safetyPeriod}</span>
                </div>
                {treatment.seasonalNotes && (
                  <div>
                    <span className="text-gray-400">Best Conditions:</span>
                    <span className="text-white ml-2">{treatment.seasonalNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#4A5B7C] rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Treatment Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Effectiveness:</span>
                  <span className="text-[#10B981] ml-2 font-medium">
                    {Math.round(treatment.effectiveness * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Cost Level:</span>
                  <span className="text-white ml-2 capitalize">{treatment.cost}</span>
                </div>
                <div>
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="text-white ml-2 capitalize">{treatment.difficulty}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-2 capitalize">{treatment.type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {treatment.warnings && treatment.warnings.length > 0 && (
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4">
              <h4 className="font-semibold text-[#F59E0B] mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Important Warnings</span>
              </h4>
              <ul className="space-y-2">
                {treatment.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start space-x-2 text-[#F59E0B]">
                    <span className="font-bold mt-0.5">•</span>
                    <span className="text-sm">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-600 p-6 flex space-x-3">
          {onSave && (
            <button
              onClick={onSave}
              className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Save to My Treatments
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}