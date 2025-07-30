import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, History } from 'lucide-react'
import { ImageUpload } from '../components/ui/ImageUpload'
import { AnalysisResults } from '../components/ui/AnalysisResults'
import { analysisService, type AnalysisResult } from '../services/analysis'

export function Analysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
    setAnalysisResult(null)
    setError('')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError('')

    try {
      const result = await analysisService.analyzeImage(selectedFile)
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleViewTreatments = () => {
    // Navigate to treatment recommendations
    navigate('/treatments', { state: { analysisResult } })
  }

  const handleAnalysisSaved = () => {
    console.log('Analysis saved successfully')
    // Could show a toast notification here
  }

  const startNewAnalysis = () => {
    setSelectedFile(null)
    setAnalysisResult(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
            
            <h1 className="text-2xl font-bold">Crop Analysis</h1>
            
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center space-x-2 text-[#10B981] hover:text-[#10B981]/80 transition-colors"
            >
              <History className="w-5 h-5" />
              <span>View History</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!analysisResult ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Upload Image for Analysis
              </h2>
              <p className="text-gray-300 text-lg">
                Take or upload a photo of your crop leaves to get instant AI-powered 
                disease and pest detection with organic treatment recommendations.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <ImageUpload
              onImageSelect={handleImageSelect}
              onAnalyze={handleAnalyze}
              loading={loading}
            />

            {/* Instructions */}
            <div className="mt-8 bg-[#4A5B7C] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Tips for Best Results</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                  <span>Take clear, well-lit photos of affected leaves</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                  <span>Include both healthy and affected areas if possible</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                  <span>Avoid blurry or very dark images</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                  <span>Focus on individual leaves rather than entire plants</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold mb-2">Analysis Complete</h2>
              <p className="text-gray-300">
                Here are the results from your crop image analysis
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Original Image */}
              <div className="bg-[#4A5B7C] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Original Image</h3>
                {analysisResult.imageUrl && (
                  <img
                    src={analysisResult.imageUrl}
                    alt="Analyzed crop"
                    className="w-full rounded-lg"
                  />
                )}
              </div>

              {/* Analysis Results */}
              <div>
                <AnalysisResults
                  result={analysisResult}
                  onViewTreatments={handleViewTreatments}
                  onAnalysisSaved={handleAnalysisSaved}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 text-center">
              <button
                onClick={startNewAnalysis}
                className="bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium py-3 px-8 rounded-lg transition-colors mr-4"
              >
                Analyze Another Image
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="border border-gray-600 hover:border-gray-500 text-gray-300 font-medium py-3 px-8 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}