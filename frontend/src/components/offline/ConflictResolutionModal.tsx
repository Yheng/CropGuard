import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  Clock,
  FileText,
  User,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitMerge,
  Shield,
  AlertCircle
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'

export interface ConflictData {
  id: string
  resourceType: 'analysis' | 'action' | 'cached_data'
  resourceId: string
  timestamp: string
  resolved: boolean
  autoResolvable: boolean
  conflicts: ConflictDetail[]
  localData: any
  serverData: any
  syncAttempt: {
    timestamp: string
    error: string
  }
}

export interface ConflictDetail {
  type: 'version_conflict' | 'data_conflict'
  field: string
  localValue: any
  serverValue: any
  severity: 'low' | 'medium' | 'high'
}

export interface ResolutionStrategy {
  strategy: 'server_wins' | 'local_wins' | 'merge' | 'manual'
  reason: string
  selectedFields?: string[]
}

interface ConflictResolutionModalProps {
  isOpen: boolean
  conflicts: ConflictData[]
  onClose: () => void
  onResolveConflict: (conflictId: string, resolution: ResolutionStrategy) => void
  onAutoResolveAll: () => void
  onRefresh: () => void
  isResolving?: boolean
}

export function ConflictResolutionModal({
  isOpen,
  conflicts,
  onClose,
  onResolveConflict,
  onAutoResolveAll,
  onRefresh,
  isResolving = false
}: ConflictResolutionModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null)
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set())
  const [resolutionStrategy, setResolutionStrategy] = useState<ResolutionStrategy>({
    strategy: 'server_wins',
    reason: 'Default resolution'
  })
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())

  if (!isOpen) return null

  const autoResolvableConflicts = conflicts.filter(c => c.autoResolvable && !c.resolved)
  const manualConflicts = conflicts.filter(c => !c.autoResolvable && !c.resolved)
  const resolvedConflicts = conflicts.filter(c => c.resolved)

  const toggleExpanded = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts)
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId)
    } else {
      newExpanded.add(conflictId)
    }
    setExpandedConflicts(newExpanded)
  }

  const handleResolveConflict = (conflict: ConflictData) => {
    const finalStrategy = resolutionStrategy.strategy === 'manual' 
      ? { ...resolutionStrategy, selectedFields: Array.from(selectedFields) }
      : resolutionStrategy

    onResolveConflict(conflict.id, finalStrategy)
    setSelectedConflict(null)
    setSelectedFields(new Set())
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10'
      case 'low': return 'text-green-400 bg-green-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <FileText className="w-4 h-4" />
      case 'action': return <Settings className="w-4 h-4" />
      case 'cached_data': return <Shield className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0B1426] border border-gray-600 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Data Conflicts ({conflicts.length})
              </h2>
              <p className="text-gray-400 text-sm">
                Resolve synchronization conflicts to continue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {autoResolvableConflicts.length > 0 && (
              <Button
                onClick={onAutoResolveAll}
                disabled={isResolving}
                leftIcon={<Zap className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Auto-Resolve ({autoResolvableConflicts.length})
              </Button>
            )}

            <Button
              onClick={onRefresh}
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Conflict List */}
          <div className="w-1/2 border-r border-gray-600 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Auto-Resolvable Conflicts */}
              {autoResolvableConflicts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h3 className="font-medium text-white">
                      Auto-Resolvable ({autoResolvableConflicts.length})
                    </h3>
                  </div>
                  
                  {autoResolvableConflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      isSelected={selectedConflict?.id === conflict.id}
                      isExpanded={expandedConflicts.has(conflict.id)}
                      onSelect={() => setSelectedConflict(conflict)}
                      onToggleExpanded={() => toggleExpanded(conflict.id)}
                      getSeverityColor={getSeverityColor}
                      getResourceTypeIcon={getResourceTypeIcon}
                    />
                  ))}
                </div>
              )}

              {/* Manual Resolution Required */}
              {manualConflicts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="font-medium text-white">
                      Manual Resolution Required ({manualConflicts.length})
                    </h3>
                  </div>
                  
                  {manualConflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      isSelected={selectedConflict?.id === conflict.id}
                      isExpanded={expandedConflicts.has(conflict.id)}
                      onSelect={() => setSelectedConflict(conflict)}
                      onToggleExpanded={() => toggleExpanded(conflict.id)}
                      getSeverityColor={getSeverityColor}
                      getResourceTypeIcon={getResourceTypeIcon}
                    />
                  ))}
                </div>
              )}

              {/* Resolved Conflicts */}
              {resolvedConflicts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 text-green-400" />
                    <h3 className="font-medium text-white">
                      Resolved ({resolvedConflicts.length})
                    </h3>
                  </div>
                  
                  {resolvedConflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      isSelected={selectedConflict?.id === conflict.id}
                      isExpanded={expandedConflicts.has(conflict.id)}
                      onSelect={() => setSelectedConflict(conflict)}
                      onToggleExpanded={() => toggleExpanded(conflict.id)}
                      getSeverityColor={getSeverityColor}
                      getResourceTypeIcon={getResourceTypeIcon}
                      isResolved={true}
                    />
                  ))}
                </div>
              )}

              {conflicts.length === 0 && (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No Conflicts
                  </h3>
                  <p className="text-gray-400">
                    All data is synchronized successfully
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Panel */}
          <div className="w-1/2 overflow-y-auto">
            {selectedConflict ? (
              <ConflictResolutionPanel
                conflict={selectedConflict}
                resolutionStrategy={resolutionStrategy}
                selectedFields={selectedFields}
                onStrategyChange={setResolutionStrategy}
                onFieldToggle={(field) => {
                  const newFields = new Set(selectedFields)
                  if (newFields.has(field)) {
                    newFields.delete(field)
                  } else {
                    newFields.add(field)
                  }
                  setSelectedFields(newFields)
                }}
                onResolve={() => handleResolveConflict(selectedConflict)}
                isResolving={isResolving}
                formatValue={formatValue}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <GitMerge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conflict to view resolution options</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ConflictCard({
  conflict,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpanded,
  getSeverityColor,
  getResourceTypeIcon,
  isResolved = false
}: {
  conflict: ConflictData
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpanded: () => void
  getSeverityColor: (severity: string) => string
  getResourceTypeIcon: (type: string) => React.ReactNode
  isResolved?: boolean
}) {
  const highestSeverity = conflict.conflicts.reduce((highest, c) => {
    const severityOrder = { low: 1, medium: 2, high: 3 }
    return severityOrder[c.severity] > severityOrder[highest] ? c.severity : highest
  }, 'low')

  return (
    <motion.div
      layout
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-400 bg-blue-500/10'
          : isResolved
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-1.5 bg-gray-700 rounded">
            {getResourceTypeIcon(conflict.resourceType)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white truncate">
                {conflict.resourceType} #{conflict.resourceId.slice(-8)}
              </h4>
              
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(highestSeverity)}`}>
                {highestSeverity}
              </span>

              {conflict.autoResolvable && !isResolved && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                  Auto
                </span>
              )}

              {isResolved && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  Resolved
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(conflict.timestamp).toLocaleTimeString()}</span>
              </div>
              <span>{conflict.conflicts.length} conflicts</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpanded()
          }}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-600"
          >
            <div className="space-y-2">
              {conflict.conflicts.map((c, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getSeverityColor(c.severity)}`}>
                      {c.field}
                    </span>
                    <span className="text-gray-400 text-xs">{c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ConflictResolutionPanel({
  conflict,
  resolutionStrategy,
  selectedFields,
  onStrategyChange,
  onFieldToggle,
  onResolve,
  isResolving,
  formatValue
}: {
  conflict: ConflictData
  resolutionStrategy: ResolutionStrategy
  selectedFields: Set<string>
  onStrategyChange: (strategy: ResolutionStrategy) => void
  onFieldToggle: (field: string) => void
  onResolve: () => void
  isResolving: boolean
  formatValue: (value: any) => string
}) {
  const strategies = [
    {
      id: 'server_wins',
      label: 'Accept Server Version',
      description: 'Use the server data for all conflicts',
      icon: <ArrowRight className="w-4 h-4" />,
      recommended: conflict.autoResolvable
    },
    {
      id: 'local_wins',
      label: 'Keep Local Version',
      description: 'Use your local changes for all conflicts',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'merge',
      label: 'Smart Merge',
      description: 'Automatically merge non-conflicting fields',
      icon: <GitMerge className="w-4 h-4" />
    },
    {
      id: 'manual',
      label: 'Manual Selection',
      description: 'Choose which fields to keep from each version',
      icon: <Settings className="w-4 h-4" />
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">
          Resolve Conflict
        </h3>
        <p className="text-gray-400 text-sm">
          {conflict.resourceType} #{conflict.resourceId.slice(-8)} • {conflict.conflicts.length} conflicts
        </p>
      </div>

      {/* Strategy Selection */}
      <div>
        <h4 className="font-medium text-white mb-3">Resolution Strategy</h4>
        <div className="space-y-2">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => onStrategyChange({
                strategy: strategy.id as ResolutionStrategy['strategy'],
                reason: strategy.description
              })}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                resolutionStrategy.strategy === strategy.id
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded ${
                  resolutionStrategy.strategy === strategy.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {strategy.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{strategy.label}</span>
                    {strategy.recommended && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{strategy.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Field Selection */}
      {resolutionStrategy.strategy === 'manual' && (
        <div>
          <h4 className="font-medium text-white mb-3">Select Fields</h4>
          <div className="space-y-3">
            {conflict.conflicts.map((conflictDetail, index) => (
              <div key={index} className="border border-gray-600 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{conflictDetail.field}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      conflictDetail.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                      conflictDetail.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {conflictDetail.severity}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => onFieldToggle(conflictDetail.field)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      selectedFields.has(conflictDetail.field)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {selectedFields.has(conflictDetail.field) ? 'Use Local' : 'Use Server'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Local Value:</p>
                    <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                      {formatValue(conflictDetail.localValue)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Server Value:</p>
                    <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                      {formatValue(conflictDetail.serverValue)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Details */}
      <div>
        <h4 className="font-medium text-white mb-3">Conflict Details</h4>
        <div className="space-y-3">
          {conflict.conflicts.map((conflictDetail, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-white">{conflictDetail.field}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  conflictDetail.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                  conflictDetail.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {conflictDetail.severity}
                </span>
                <span className="text-xs text-gray-400">{conflictDetail.type}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Local:</p>
                  <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto max-h-20">
                    {formatValue(conflictDetail.localValue)}
                  </pre>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Server:</p>
                  <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto max-h-20">
                    {formatValue(conflictDetail.serverValue)}
                  </pre>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onResolve}
          disabled={isResolving || (resolutionStrategy.strategy === 'manual' && selectedFields.size === 0)}
          leftIcon={isResolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isResolving ? 'Resolving...' : 'Resolve Conflict'}
        </Button>
      </div>
    </div>
  )
}

export default ConflictResolutionModal