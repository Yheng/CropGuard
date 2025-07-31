import React from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  Star,
  Clock,
  AlertTriangle,
  Leaf,
  Bug,
  MapPin,
  Calendar,
  Award,
  TrendingUp,
  Camera,
  FileText,
  Send,
  Download,
  RefreshCw,
  Users,
  Activity
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MetricCard } from '../../components/ui/Chart'
import { cn } from '../../utils/cn'

interface PendingAnalysis {
  id: string
  farmerId: string
  farmerName: string
  farmerLocation: string
  submissionDate: string
  cropType: string
  imageUrl: string
  aiPrediction: {
    issueName: string
    issueType: 'pest' | 'disease' | 'nutrient' | 'environmental'
    severity: number
    confidence: number
    treatmentSuggestions: string[]
  }
  priority: 'high' | 'medium' | 'low'
  estimatedReviewTime: number // minutes
  fieldConditions: {
    weather: string
    soilType: string
    previousTreatments: string[]
  }
}

interface ReviewSubmission {
  analysisId: string
  agronomistId: string
  status: 'approved' | 'rejected' | 'needs_revision'
  confidence: number
  modifiedPrediction?: {
    issueName: string
    issueType: 'pest' | 'disease' | 'nutrient' | 'environmental'
    severity: number
    treatmentSuggestions: string[]
  }
  comments: string
  tags: string[]
  expertiseArea: string[]
  reviewTime: number // minutes
}

interface AgronomistStats {
  totalReviews: number
  weeklyReviews: number
  averageAccuracy: number
  creditsEarned: number
  expertiseLevel: 'junior' | 'senior' | 'expert'
  specializations: string[]
  reviewsCompleted: number
  reviewsPending: number
}

interface AgronomistDashboardProps {
  pendingAnalyses: PendingAnalysis[]
  stats: AgronomistStats
  onReviewSubmit?: (review: ReviewSubmission) => void
  onAnalysisFilter?: (filters: AnalysisFilters) => void
  onBulkAction?: (action: 'approve' | 'reject', analysisIds: string[]) => void
  className?: string
}

interface AnalysisFilters {
  priority?: 'high' | 'medium' | 'low'
  cropType?: string
  issueType?: 'pest' | 'disease' | 'nutrient' | 'environmental'
  confidenceRange?: [number, number]
  dateRange?: 'today' | 'week' | 'month'
}

export function AgronomistDashboard({
  pendingAnalyses,
  stats,
  onReviewSubmit,
  onAnalysisFilter: _onAnalysisFilter,
  onBulkAction,
  className
}: AgronomistDashboardProps) {
  const [selectedAnalyses, setSelectedAnalyses] = React.useState<string[]>([])
  const [filters, setFilters] = React.useState<AnalysisFilters>({})
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'priority' | 'date' | 'confidence'>('priority')
  const [viewMode, _setViewMode] = React.useState<'grid' | 'list'>('list')
  const [selectedAnalysis, setSelectedAnalysis] = React.useState<PendingAnalysis | null>(null)
  const [reviewForm, setReviewForm] = React.useState({
    status: 'approved' as 'approved' | 'rejected' | 'needs_revision',
    confidence: 85,
    comments: '',
    modifiedPrediction: null as { issueName: string; issueType: 'pest' | 'disease' | 'nutrient' | 'environmental'; severity: number; treatmentSuggestions: string[] } | null,
    tags: [] as string[]
  })

  const filteredAnalyses = React.useMemo(() => {
    const filtered = pendingAnalyses.filter(analysis => {
      if (searchQuery && !analysis.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !analysis.cropType.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !analysis.aiPrediction.issueName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filters.priority && analysis.priority !== filters.priority) return false
      if (filters.cropType && analysis.cropType !== filters.cropType) return false
      if (filters.issueType && analysis.aiPrediction.issueType !== filters.issueType) return false
      if (filters.confidenceRange) {
        const [min, max] = filters.confidenceRange
        if (analysis.aiPrediction.confidence < min || analysis.aiPrediction.confidence > max) return false
      }
      return true
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        case 'date':
          return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
        case 'confidence':
          return a.aiPrediction.confidence - b.aiPrediction.confidence
        default:
          return 0
      }
    })
  }, [pendingAnalyses, searchQuery, filters, sortBy])

  const handleSelectAnalysis = (analysisId: string) => {
    setSelectedAnalyses(prev => 
      prev.includes(analysisId) 
        ? prev.filter(id => id !== analysisId)
        : [...prev, analysisId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAnalyses.length === filteredAnalyses.length) {
      setSelectedAnalyses([])
    } else {
      setSelectedAnalyses(filteredAnalyses.map(a => a.id))
    }
  }

  const handleReviewAnalysis = (analysis: PendingAnalysis) => {
    setSelectedAnalysis(analysis)
    setReviewForm({
      status: 'approved',
      confidence: 85,
      comments: '',
      modifiedPrediction: null,
      tags: []
    })
  }

  const handleSubmitReview = () => {
    if (!selectedAnalysis) return

    const review: ReviewSubmission = {
      analysisId: selectedAnalysis.id,
      agronomistId: 'current-agronomist', // Would come from auth context
      status: reviewForm.status,
      confidence: reviewForm.confidence,
      modifiedPrediction: reviewForm.modifiedPrediction,
      comments: reviewForm.comments,
      tags: reviewForm.tags,
      expertiseArea: stats.specializations,
      reviewTime: selectedAnalysis.estimatedReviewTime
    }

    onReviewSubmit?.(review)
    setSelectedAnalysis(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-500/5'
      case 'medium': return 'border-l-[#F59E0B] bg-[#F59E0B]/5'
      default: return 'border-l-[#10B981] bg-[#10B981]/5'
    }
  }

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'pest': return <Bug className="w-4 h-4" />
      case 'disease': return <AlertTriangle className="w-4 h-4" />
      case 'nutrient': return <Leaf className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getExpertiseLevel = (level: string) => {
    switch (level) {
      case 'expert': return { label: 'Expert', color: '#10B981', icon: '🏆' }
      case 'senior': return { label: 'Senior', color: '#F59E0B', icon: '⭐' }
      default: return { label: 'Junior', color: '#2DD4BF', icon: '🌱' }
    }
  }

  const expertiseInfo = getExpertiseLevel(stats.expertiseLevel)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agronomist Dashboard</h1>
          <div className="flex items-center gap-4 text-gray-300 mt-1">
            <div className="flex items-center gap-2">
              <span>{expertiseInfo.icon}</span>
              <span className="font-medium" style={{ color: expertiseInfo.color }}>
                {expertiseInfo.label} Agronomist
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>{stats.creditsEarned} Credits</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export Reports
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard
            title="Pending Reviews"
            value={stats.reviewsPending}
            change={{
              value: 3,
              type: 'increase',
              period: 'since yesterday'
            }}
            icon={<Clock className="w-6 h-6" />}
            color="#F59E0B"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard
            title="Reviews This Week"
            value={stats.weeklyReviews}
            change={{
              value: 12,
              type: 'increase',
              period: 'vs last week'
            }}
            icon={<CheckCircle className="w-6 h-6" />}
            color="#10B981"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard
            title="Accuracy Rate"
            value={`${stats.averageAccuracy}%`}
            change={{
              value: 2.5,
              type: 'increase',
              period: 'vs last month'
            }}
            icon={<TrendingUp className="w-6 h-6" />}
            color="#2DD4BF"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard
            title="Total Reviews"
            value={stats.totalReviews}
            icon={<Star className="w-6 h-6" />}
            color="#8B5CF6"
          />
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by farmer, crop type, or issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: (e.target.value as 'high' | 'medium' | 'low') || undefined }))}
                  className="px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <select
                  value={filters.issueType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, issueType: (e.target.value as 'pest' | 'disease' | 'nutrient' | 'environmental') || undefined }))}
                  className="px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">All Issues</option>
                  <option value="pest">Pest</option>
                  <option value="disease">Disease</option>
                  <option value="nutrient">Nutrient</option>
                  <option value="environmental">Environmental</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'confidence')}
                  className="px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#10B981]"
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="date">Sort by Date</option>
                  <option value="confidence">Sort by Confidence</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Filter className="w-4 h-4" />}
                >
                  More Filters
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedAnalyses.length > 0 && (
              <div className="flex items-center justify-between mt-4 p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#10B981]" />
                  <span className="text-sm font-medium text-[#10B981]">
                    {selectedAnalyses.length} analyses selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => onBulkAction?.('approve', selectedAnalyses)}
                    className="bg-[#10B981] hover:bg-[#10B981]/80"
                  >
                    Bulk Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => onBulkAction?.('reject', selectedAnalyses)}
                  >
                    Bulk Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Analysis List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader
            title="Pending Analyses"
            description={`${filteredAnalyses.length} analyses awaiting review`}
            action={
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAnalyses.length === filteredAnalyses.length && filteredAnalyses.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-[#10B981] rounded focus:ring-[#10B981] focus:ring-2"
                />
                <span className="text-sm text-gray-400">Select All</span>
              </div>
            }
          />
          <CardContent>
            <div className="space-y-4">
              {filteredAnalyses.length > 0 ? (
                filteredAnalyses.map((analysis, index) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className={cn(
                      'p-4 rounded-lg border-l-4 border border-gray-600 hover:border-gray-500 transition-colors',
                      getPriorityColor(analysis.priority)
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedAnalyses.includes(analysis.id)}
                        onChange={() => handleSelectAnalysis(analysis.id)}
                        className="mt-1 w-4 h-4 text-[#10B981] rounded focus:ring-[#10B981] focus:ring-2"
                      />

                      {/* Crop Image */}
                      <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {analysis.imageUrl ? (
                          <img
                            src={analysis.imageUrl}
                            alt="Crop analysis"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Analysis Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-white">{analysis.farmerName}</h4>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{analysis.farmerLocation}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-300">
                              {analysis.cropType} • {analysis.aiPrediction.issueName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              analysis.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              analysis.priority === 'medium' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                              'bg-[#10B981]/20 text-[#10B981]'
                            )}>
                              {analysis.priority} priority
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            {getIssueIcon(analysis.aiPrediction.issueType)}
                            <span className="text-sm text-gray-300">
                              {analysis.aiPrediction.issueType}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            Severity: <span className="font-medium text-white">
                              {analysis.aiPrediction.severity}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            Confidence: <span className={cn(
                              'font-medium',
                              analysis.aiPrediction.confidence >= 80 ? 'text-[#10B981]' :
                              analysis.aiPrediction.confidence >= 60 ? 'text-[#F59E0B]' :
                              'text-red-400'
                            )}>
                              {analysis.aiPrediction.confidence}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(analysis.submissionDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>~{analysis.estimatedReviewTime} min</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Eye className="w-4 h-4" />}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              leftIcon={<Edit3 className="w-4 h-4" />}
                              onClick={() => handleReviewAnalysis(analysis)}
                              className="bg-[#10B981] hover:bg-[#10B981]/80"
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-white font-medium mb-2">No analyses to review</p>
                  <p className="text-gray-400 text-sm">
                    All caught up! Check back later for new submissions.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Review Modal */}
      {selectedAnalysis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAnalysis(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F1A2E] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Review Analysis</h2>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Analysis Details */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader title="Farmer Information" />
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-400">Name:</span>
                          <p className="text-white font-medium">{selectedAnalysis.farmerName}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Location:</span>
                          <p className="text-white">{selectedAnalysis.farmerLocation}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Crop Type:</span>
                          <p className="text-white">{selectedAnalysis.cropType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title="AI Prediction" />
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-400">Issue Identified:</span>
                          <p className="text-white font-medium">{selectedAnalysis.aiPrediction.issueName}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Issue Type:</span>
                          <p className="text-white capitalize">{selectedAnalysis.aiPrediction.issueType}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Severity:</span>
                          <p className="text-white">{selectedAnalysis.aiPrediction.severity}%</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">AI Confidence:</span>
                          <p className="text-white">{selectedAnalysis.aiPrediction.confidence}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title="Crop Image" />
                    <CardContent>
                      <div className="w-full h-64 bg-gray-700 rounded-lg overflow-hidden">
                        {selectedAnalysis.imageUrl ? (
                          <img
                            src={selectedAnalysis.imageUrl}
                            alt="Crop analysis"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Review Form */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader title="Your Review" />
                    <CardContent>
                      <div className="space-y-4">
                        {/* Review Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Review Decision
                          </label>
                          <div className="space-y-2">
                            {[
                              { value: 'approved', label: 'Approve AI Prediction', color: '#10B981' },
                              { value: 'needs_revision', label: 'Needs Revision', color: '#F59E0B' },
                              { value: 'rejected', label: 'Reject AI Prediction', color: '#EF4444' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  value={option.value}
                                  checked={reviewForm.status === option.value}
                                  onChange={(e) => setReviewForm(prev => ({ ...prev, status: e.target.value as 'approved' | 'rejected' | 'needs_revision' }))}
                                  className="w-4 h-4 text-[#10B981] focus:ring-[#10B981] focus:ring-2"
                                />
                                <span className="text-white">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Confidence Score */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Your Confidence ({reviewForm.confidence}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={reviewForm.confidence}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>

                        {/* Comments */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Comments & Recommendations
                          </label>
                          <textarea
                            value={reviewForm.comments}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, comments: e.target.value }))}
                            placeholder="Provide detailed feedback and recommendations..."
                            rows={4}
                            className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981] resize-none"
                          />
                        </div>

                        {/* Tags */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tags
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['urgent', 'complex', 'straightforward', 'requires-followup', 'educational'].map((tag) => (
                              <button
                                key={tag}
                                onClick={() => {
                                  setReviewForm(prev => ({
                                    ...prev,
                                    tags: prev.tags.includes(tag)
                                      ? prev.tags.filter(t => t !== tag)
                                      : [...prev.tags, tag]
                                  }))
                                }}
                                className={cn(
                                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                  reviewForm.tags.includes(tag)
                                    ? 'bg-[#10B981] text-white'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                )}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAnalysis(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      leftIcon={<Send className="w-4 h-4" />}
                      className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80"
                    >
                      Submit Review
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}