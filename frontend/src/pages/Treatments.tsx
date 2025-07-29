import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Clock, AlertCircle, Target, Calendar, BookOpen } from 'lucide-react'
import { TreatmentCard } from '../components/ui/TreatmentCard'
import { TreatmentInstructions } from '../components/ui/TreatmentInstructions'
import { treatmentService, type TreatmentPlan, type Treatment } from '../services/treatments'
import type { AnalysisResult } from '../services/analysis'

export function Treatments() {
  const navigate = useNavigate()
  const location = useLocation()
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Get analysis result from navigation state
  const analysisResult = location.state?.analysisResult as AnalysisResult | undefined

  useEffect(() => {
    if (!analysisResult) {
      navigate('/analysis')
      return
    }

    const loadTreatmentPlan = async () => {
      try {
        setLoading(true)
        const plan = await treatmentService.getTreatmentPlan(
          analysisResult.id,
          analysisResult.title,
          analysisResult.severity
        )
        setTreatmentPlan(plan)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load treatment plan')
      } finally {
        setLoading(false)
      }
    }

    loadTreatmentPlan()
  }, [analysisResult, navigate])

  const getUrgencyColor = () => {
    if (!treatmentPlan) return 'text-gray-400'
    switch (treatmentPlan.urgency) {
      case 'immediate':
        return 'text-red-400'
      case 'within_week':
        return 'text-[#F59E0B]'
      case 'monitor':
        return 'text-[#10B981]'
    }
  }

  const getUrgencyText = () => {
    if (!treatmentPlan) return 'Loading...'
    switch (treatmentPlan.urgency) {
      case 'immediate':
        return 'Immediate Action Required'
      case 'within_week':
        return 'Treat Within 1 Week'
      case 'monitor':
        return 'Monitor and Prevent'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2A44] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10B981] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading treatment recommendations...</p>
        </div>
      </div>
    )
  }

  if (error || !treatmentPlan) {
    return (
      <div className="min-h-screen bg-[#1F2A44] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error || 'Treatment plan not found'}</p>
          <button
            onClick={() => navigate('/analysis')}
            className="bg-[#10B981] hover:bg-[#10B981]/80 text-white px-6 py-2 rounded-lg"
          >
            Back to Analysis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1F2A44] text-white">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Analysis</span>
              </button>
            </div>
            
            <h1 className="text-2xl font-bold">Treatment Plan</h1>
            
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#10B981]">Organic Solutions</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Plan Overview */}
        <div className="bg-[#4A5B7C] rounded-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Treatment Plan for {treatmentPlan.condition}</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <AlertCircle className={`w-5 h-5 ${getUrgencyColor()}`} />
                  <span className={`font-medium ${getUrgencyColor()}`}>
                    {getUrgencyText()}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-[#2DD4BF]" />
                  <span className="text-gray-300">
                    Estimated Recovery: {treatmentPlan.estimatedRecoveryTime}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-[#F59E0B]" />
                  <span className="text-gray-300">
                    Monitor: {treatmentPlan.monitoringSchedule.frequency}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1F2A44] rounded-lg p-4">
              <h3 className="font-semibold mb-3">Monitoring Schedule</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Frequency:</span>
                  <span className="text-white ml-2">{treatmentPlan.monitoringSchedule.frequency}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white ml-2">{treatmentPlan.monitoringSchedule.duration}</span>
                </div>
                <div>
                  <span className="text-gray-400">Estimated Cost:</span>
                  <span className="text-[#10B981] ml-2 font-medium">{treatmentPlan.totalCost}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Treatments */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Target className="w-6 h-6 text-[#10B981]" />
            <span>Recommended Treatments</span>
          </h3>
          {treatmentPlan.primaryTreatments.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-6">
              {treatmentPlan.primaryTreatments.map((treatment) => (
                <TreatmentCard
                  key={treatment.id}
                  treatment={treatment}
                  isRecommended={true}
                  onSelect={() => setSelectedTreatment(treatment)}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-8">
              No specific treatments needed. Continue monitoring and apply preventive measures.
            </p>
          )}
        </section>

        {/* Alternative Treatments */}
        {treatmentPlan.alternativeTreatments.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-4">Alternative Options</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              {treatmentPlan.alternativeTreatments.map((treatment) => (
                <TreatmentCard
                  key={treatment.id}
                  treatment={treatment}
                  onSelect={() => setSelectedTreatment(treatment)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Preventive Measures */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-[#F59E0B]" />
            <span>Preventive Measures</span>
          </h3>
          <div className="grid lg:grid-cols-2 gap-6">
            {treatmentPlan.preventiveMeasures.map((treatment) => (
              <TreatmentCard
                key={treatment.id}
                treatment={treatment}
                onSelect={() => setSelectedTreatment(treatment)}
              />
            ))}
          </div>
        </section>

        {/* Monitoring Checklist */}
        <section>
          <h3 className="text-xl font-bold mb-4">Monitoring Checklist</h3>
          <div className="bg-[#4A5B7C] rounded-lg p-6">
            <p className="text-gray-300 mb-4">
              Check your plants {treatmentPlan.monitoringSchedule.frequency.toLowerCase()} for the following:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {treatmentPlan.monitoringSchedule.checkpoints.map((checkpoint, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#10B981] bg-[#1F2A44] border-gray-600 rounded focus:ring-[#10B981]"
                  />
                  <span className="text-gray-300">{checkpoint}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="mt-8 text-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Save Treatment Plan
          </button>
          <button
            onClick={() => navigate('/analysis')}
            className="border border-gray-600 hover:border-gray-500 text-gray-300 font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Analyze Another Image
          </button>
        </div>
      </main>

      {/* Treatment Instructions Modal */}
      {selectedTreatment && (
        <TreatmentInstructions
          treatment={selectedTreatment}
          onClose={() => setSelectedTreatment(null)}
          onSave={() => {
            // Handle saving treatment
            setSelectedTreatment(null)
          }}
        />
      )}
    </div>
  )
}