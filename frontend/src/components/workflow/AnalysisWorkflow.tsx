import React from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
  Brain,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  User,
  Settings,
  Timer,
  Star,
  Flag
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

export type WorkflowStage = 
  | 'uploaded'
  | 'ai_processing' 
  | 'ai_completed'
  | 'pending_review'
  | 'in_review'
  | 'review_completed'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'completed'

export type WorkflowAction = 
  | 'submit_for_processing'
  | 'ai_analyze'
  | 'assign_reviewer'
  | 'start_review'
  | 'approve'
  | 'reject'
  | 'request_revision'
  | 'resubmit'
  | 'complete'
  | 'escalate'
  | 'reassign'

export interface WorkflowStep {
  id: string
  stage: WorkflowStage
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  estimatedDuration: number // in minutes
  requiredRole?: 'farmer' | 'agronomist' | 'admin' | 'system'
  isOptional?: boolean
  canSkip?: boolean
  actions: WorkflowAction[]
}

export interface WorkflowTransition {
  from: WorkflowStage
  to: WorkflowStage
  action: WorkflowAction
  requiredRole?: 'farmer' | 'agronomist' | 'admin' | 'system'
  conditions?: (analysis: AnalysisWorkflowData) => boolean
  autoTrigger?: boolean
  delay?: number // in minutes
}

export interface AnalysisWorkflowData {
  id: string
  farmerId: string
  farmerName: string
  agronomistId?: string
  agronomistName?: string
  currentStage: WorkflowStage
  previousStage?: WorkflowStage
  submittedAt: string
  lastUpdated: string
  estimatedCompletion?: string
  actualCompletion?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  cropType: string
  aiPrediction?: {
    issueName: string
    severity: number
    confidence: number
  }
  reviewNotes?: string
  revisionCount: number
  maxRevisions: number
  timeSpent: number // in minutes
  slaDeadline?: string
  escalated: boolean
  metadata?: Record<string, unknown>
}

interface AnalysisWorkflowProps {
  analysis: AnalysisWorkflowData
  currentUserRole: 'farmer' | 'agronomist' | 'admin'
  onAction?: (action: WorkflowAction, analysis: AnalysisWorkflowData) => void
  onStatusChange?: (newStage: WorkflowStage, analysis: AnalysisWorkflowData) => void
  showTimeline?: boolean
  showActions?: boolean
  compact?: boolean
  className?: string
}

// Define workflow steps
const workflowSteps: WorkflowStep[] = [
  {
    id: 'upload',
    stage: 'uploaded',
    title: 'Image Uploaded',
    description: 'Crop image has been uploaded by farmer',
    icon: Upload,
    color: '#2DD4BF',
    estimatedDuration: 0,
    requiredRole: 'farmer',
    actions: ['submit_for_processing']
  },
  {
    id: 'ai_processing',
    stage: 'ai_processing',
    title: 'AI Analysis',
    description: 'AI is analyzing the crop image',
    icon: Brain,
    color: '#8B5CF6',
    estimatedDuration: 2,
    requiredRole: 'system',
    actions: ['ai_analyze']
  },
  {
    id: 'ai_completed',
    stage: 'ai_completed',
    title: 'AI Analysis Complete',
    description: 'Initial AI analysis is ready for review',
    icon: CheckCircle,
    color: '#10B981',
    estimatedDuration: 0,
    actions: ['assign_reviewer']
  },
  {
    id: 'pending_review',
    stage: 'pending_review',
    title: 'Pending Review',
    description: 'Waiting for agronomist assignment',
    icon: Clock,
    color: '#F59E0B',
    estimatedDuration: 30,
    actions: ['assign_reviewer', 'escalate']
  },
  {
    id: 'in_review',
    stage: 'in_review',
    title: 'Under Review',
    description: 'Agronomist is reviewing the analysis',
    icon: Eye,
    color: '#F59E0B',
    estimatedDuration: 15,
    requiredRole: 'agronomist',
    actions: ['approve', 'reject', 'request_revision']
  },
  {
    id: 'review_completed',
    stage: 'review_completed',
    title: 'Review Complete',
    description: 'Agronomist has completed the review',
    icon: CheckCircle,
    color: '#10B981',
    estimatedDuration: 0,
    actions: ['complete']
  },
  {
    id: 'approved',
    stage: 'approved',
    title: 'Approved',
    description: 'Analysis approved by agronomist',
    icon: CheckCircle,
    color: '#10B981',
    estimatedDuration: 0,
    actions: ['complete']
  },
  {
    id: 'rejected',
    stage: 'rejected',
    title: 'Rejected',
    description: 'Analysis rejected - requires new submission',
    icon: XCircle,
    color: '#EF4444',
    estimatedDuration: 0,
    actions: ['resubmit']
  },
  {
    id: 'revision_requested',
    stage: 'revision_requested',
    title: 'Revision Requested',
    description: 'Agronomist requested additional information',
    icon: AlertTriangle,
    color: '#F59E0B',
    estimatedDuration: 0,
    requiredRole: 'farmer',
    actions: ['resubmit']
  },
  {
    id: 'completed',
    stage: 'completed',
    title: 'Completed',
    description: 'Analysis workflow completed successfully',
    icon: Flag,
    color: '#10B981',
    estimatedDuration: 0,
    actions: []
  }
]

// Define workflow transitions
const workflowTransitions: WorkflowTransition[] = [
  { from: 'uploaded', to: 'ai_processing', action: 'submit_for_processing', autoTrigger: true },
  { from: 'ai_processing', to: 'ai_completed', action: 'ai_analyze', requiredRole: 'system', autoTrigger: true },
  { from: 'ai_completed', to: 'pending_review', action: 'assign_reviewer', autoTrigger: true, delay: 1 },
  { from: 'pending_review', to: 'in_review', action: 'start_review', requiredRole: 'agronomist' },
  { from: 'in_review', to: 'approved', action: 'approve', requiredRole: 'agronomist' },
  { from: 'in_review', to: 'rejected', action: 'reject', requiredRole: 'agronomist' },
  { from: 'in_review', to: 'revision_requested', action: 'request_revision', requiredRole: 'agronomist' },
  { from: 'approved', to: 'completed', action: 'complete', autoTrigger: true },
  { from: 'rejected', to: 'uploaded', action: 'resubmit', requiredRole: 'farmer' },
  { from: 'revision_requested', to: 'ai_processing', action: 'resubmit', requiredRole: 'farmer' }
]

function WorkflowStepComponent({
  step,
  isActive,
  isCompleted,
  isPending,
  estimatedTime,
  actualTime,
  compact = false
}: {
  step: WorkflowStep
  isActive: boolean
  isCompleted: boolean
  isPending: boolean
  estimatedTime?: number
  actualTime?: number
  compact?: boolean
}) {
  const IconComponent = step.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all',
        isActive && 'bg-[#1F2A44] ring-2 ring-[#10B981]/50',
        isCompleted && 'opacity-75',
        isPending && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isCompleted ? 'bg-[#10B981]' : 
          isActive ? 'bg-[#F59E0B]' : 
          'bg-gray-600'
        )}
        style={{ 
          backgroundColor: isActive ? step.color : isCompleted ? '#10B981' : '#4B5563'
        }}
      >
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-white" />
        ) : (
          <IconComponent className="w-5 h-5 text-white" />
        )}
      </div>

      <div className="flex-1">
        <h4 className={cn(
          'font-medium',
          isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-400'
        )}>
          {step.title}
        </h4>
        {!compact && (
          <p className={cn(
            'text-sm',
            isActive ? 'text-gray-300' : 'text-gray-500'
          )}>
            {step.description}
          </p>
        )}
        
        {(estimatedTime !== undefined || actualTime !== undefined) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <Timer className="w-3 h-3" />
            {actualTime !== undefined ? (
              <span>Completed in {actualTime}m</span>
            ) : (
              <span>Est. {estimatedTime}m</span>
            )}
          </div>
        )}
      </div>

      {isActive && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-[#10B981] border-t-transparent rounded-full"
        />
      )}
    </motion.div>
  )
}

function WorkflowActions({
  analysis,
  availableActions,
  onAction,
  className
}: {
  analysis: AnalysisWorkflowData
  availableActions: WorkflowAction[]
  userRole: 'farmer' | 'agronomist' | 'admin'
  onAction?: (action: WorkflowAction, analysis: AnalysisWorkflowData) => void
  className?: string
}) {
  const getActionConfig = (action: WorkflowAction) => {
    switch (action) {
      case 'submit_for_processing':
        return { label: 'Submit for AI Analysis', icon: Brain, variant: 'primary' as const }
      case 'start_review':
        return { label: 'Start Review', icon: Play, variant: 'primary' as const }
      case 'approve':
        return { label: 'Approve', icon: CheckCircle, variant: 'primary' as const }
      case 'reject':
        return { label: 'Reject', icon: XCircle, variant: 'danger' as const }
      case 'request_revision':
        return { label: 'Request Revision', icon: AlertTriangle, variant: 'outline' as const }
      case 'resubmit':
        return { label: 'Resubmit', icon: RotateCcw, variant: 'primary' as const }
      case 'escalate':
        return { label: 'Escalate', icon: Flag, variant: 'outline' as const }
      case 'reassign':
        return { label: 'Reassign', icon: User, variant: 'outline' as const }
      default:
        return { label: action, icon: Settings, variant: 'outline' as const }
    }
  }

  if (availableActions.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {availableActions.map((action) => {
        const config = getActionConfig(action)
        const IconComponent = config.icon
        
        return (
          <Button
            key={action}
            size="sm"
            variant={config.variant}
            leftIcon={<IconComponent className="w-4 h-4" />}
            onClick={() => onAction?.(action, analysis)}
            className="text-sm"
          >
            {config.label}
          </Button>
        )
      })}
    </div>
  )
}

function WorkflowTimeline({
  analysis,
  compact = false,
  className
}: {
  analysis: AnalysisWorkflowData
  compact?: boolean
  className?: string
}) {
  const currentStepIndex = workflowSteps.findIndex(step => step.stage === analysis.currentStage)
  const progress = ((currentStepIndex + 1) / workflowSteps.length) * 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-[#10B981] h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Timeline Steps */}
      <div className="space-y-2">
        {workflowSteps.map((step, index) => {
          const isActive = step.stage === analysis.currentStage
          const isCompleted = index < currentStepIndex
          const isPending = index > currentStepIndex

          return (
            <div key={step.id} className="relative">
              <WorkflowStepComponent
                step={step}
                isActive={isActive}
                isCompleted={isCompleted}
                isPending={isPending}
                estimatedTime={step.estimatedDuration}
                compact={compact}
              />
              
              {index < workflowSteps.length - 1 && (
                <div className="ml-5 w-0.5 h-4 bg-gray-600" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WorkflowSummary({
  analysis,
  className
}: {
  analysis: AnalysisWorkflowData
  className?: string
}) {
  const currentStep = workflowSteps.find(step => step.stage === analysis.currentStage)
  const isOverdue = analysis.slaDeadline && new Date(analysis.slaDeadline) < new Date()

  return (
    <Card className={className}>
      <CardHeader
        title="Workflow Status"
        description={`Analysis ID: ${analysis.id}`}
      />
      <CardContent>
        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 bg-[#1F2A44] rounded-lg">
            {currentStep && (
              <>
                <currentStep.icon 
                  className="w-6 h-6" 
                />
                <div>
                  <h4 className="font-medium text-white">{currentStep.title}</h4>
                  <p className="text-sm text-gray-300">{currentStep.description}</p>
                </div>
              </>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{analysis.timeSpent}m</div>
              <div className="text-sm text-gray-400">Time Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{analysis.revisionCount}</div>
              <div className="text-sm text-gray-400">Revisions</div>
            </div>
          </div>

          {/* Priority & SLA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                analysis.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                analysis.priority === 'high' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                analysis.priority === 'medium' ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]' :
                'bg-gray-500/20 text-gray-400'
              )}>
                {analysis.priority} priority
              </span>
              {analysis.escalated && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                  Escalated
                </span>
              )}
            </div>
            
            {analysis.slaDeadline && (
              <div className={cn(
                'text-sm',
                isOverdue ? 'text-red-400' : 'text-gray-400'
              )}>
                {isOverdue ? 'Overdue' : 'Due'}: {new Date(analysis.slaDeadline).toLocaleString()}
              </div>
            )}
          </div>

          {/* Assigned Users */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Farmer:</span>
              <span className="text-white">{analysis.farmerName}</span>
            </div>
            {analysis.agronomistName && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Agronomist:</span>
                <span className="text-white">{analysis.agronomistName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalysisWorkflow({
  analysis,
  currentUserRole,
  onAction,
  onStatusChange,
  showTimeline = true,
  showActions = true,
  compact = false,
  className
}: AnalysisWorkflowProps) {
  const currentStep = workflowSteps.find(step => step.stage === analysis.currentStage)
  
  // Get available actions for current user
  const availableActions = React.useMemo(() => {
    if (!currentStep) return []
    
    return currentStep.actions.filter(action => {
      const transition = workflowTransitions.find(t => 
        t.from === analysis.currentStage && t.action === action
      )
      
      if (!transition) return false
      
      // Check role permissions
      if (transition.requiredRole && transition.requiredRole !== currentUserRole) {
        return false
      }
      
      // Check conditions
      if (transition.conditions && !transition.conditions(analysis)) {
        return false
      }
      
      return true
    })
  }, [currentStep, analysis, currentUserRole])

  const handleAction = (action: WorkflowAction) => {
    const transition = workflowTransitions.find(t => 
      t.from === analysis.currentStage && t.action === action
    )
    
    if (transition) {
      onStatusChange?.(transition.to, analysis)
    }
    
    onAction?.(action, analysis)
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep && (
                <>
                  <currentStep.icon 
                    className="w-5 h-5" 
                  />
                  <div>
                    <h4 className="font-medium text-white text-sm">{currentStep.title}</h4>
                    <p className="text-xs text-gray-400">{analysis.timeSpent}m elapsed</p>
                  </div>
                </>
              )}
            </div>
            
            {showActions && availableActions.length > 0 && (
              <WorkflowActions
                analysis={analysis}
                availableActions={availableActions}
                userRole={currentUserRole}
                onAction={handleAction}
              />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Workflow Summary */}
      <WorkflowSummary analysis={analysis} />

      {/* Timeline */}
      {showTimeline && (
        <Card>
          <CardHeader title="Progress Timeline" />
          <CardContent>
            <WorkflowTimeline analysis={analysis} />
          </CardContent>
        </Card>
      )}

      {/* Available Actions */}
      {showActions && availableActions.length > 0 && (
        <Card>
          <CardHeader title="Available Actions" />
          <CardContent>
            <WorkflowActions
              analysis={analysis}
              availableActions={availableActions}
              userRole={currentUserRole}
              onAction={handleAction}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AnalysisWorkflow