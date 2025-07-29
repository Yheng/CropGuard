// CropGuard Conflict Resolution System
// Handles data conflicts when syncing offline changes

export type ConflictType = 'update' | 'delete' | 'create' | 'field'

export interface DataConflict {
  id: string
  resourceType: 'analysis' | 'user' | 'review' | 'setting'
  resourceId: string
  conflictType: ConflictType
  localVersion: any
  serverVersion: any
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  autoResolvable: boolean
  resolutions: ConflictResolution[]
}

export interface ConflictResolution {
  id: string
  type: 'keep_local' | 'keep_server' | 'merge' | 'manual'
  description: string
  impact: string
  recommended: boolean
  mergeStrategy?: MergeStrategy
  mergedData?: any
}

export interface MergeStrategy {
  strategy: 'field_priority' | 'timestamp_latest' | 'user_preference' | 'custom'
  rules: MergeRule[]
  customHandler?: (local: any, server: any) => any
}

export interface MergeRule {
  field: string
  priority: 'local' | 'server' | 'latest' | 'combine'
  weight?: number
  validator?: (value: any) => boolean
}

export interface ConflictResolutionResult {
  resolved: boolean
  resolution: ConflictResolution | null
  resolvedData: any
  conflicts: DataConflict[]
  warnings: string[]
}

interface ConflictResolutionConfig {
  autoResolveConflicts: boolean
  maxAutoResolutionAge: number // Max age in minutes for auto-resolution
  prioritizeUserData: boolean
  enableFieldLevelMerging: boolean
  customMergeHandlers: Map<string, (local: any, server: any) => any>
}

class ConflictResolver {
  private config: ConflictResolutionConfig
  private resolvedConflicts: Map<string, ConflictResolutionResult> = new Map()
  
  constructor(config: Partial<ConflictResolutionConfig> = {}) {
    this.config = {
      autoResolveConflicts: true,
      maxAutoResolutionAge: 60, // 1 hour
      prioritizeUserData: true,
      enableFieldLevelMerging: true,
      customMergeHandlers: new Map(),
      ...config
    }
  }

  // Main conflict detection and resolution
  async resolveConflicts(
    localData: any,
    serverData: any,
    resourceType: DataConflict['resourceType'],
    resourceId: string
  ): Promise<ConflictResolutionResult> {
    try {
      // Detect conflicts
      const conflicts = this.detectConflicts(localData, serverData, resourceType, resourceId)
      
      if (conflicts.length === 0) {
        return {
          resolved: true,
          resolution: null,
          resolvedData: serverData, // No conflicts, use server data
          conflicts: [],
          warnings: []
        }
      }

      // Attempt auto-resolution
      if (this.config.autoResolveConflicts) {
        const autoResolved = await this.attemptAutoResolution(conflicts, localData, serverData)
        
        if (autoResolved.resolved) {
          return autoResolved
        }
      }

      // Generate resolution options for manual resolution
      const resolutionOptions = this.generateResolutionOptions(conflicts, localData, serverData)
      
      return {
        resolved: false,
        resolution: null,
        resolvedData: null,
        conflicts: conflicts.map(conflict => ({
          ...conflict,
          resolutions: resolutionOptions[conflict.id] || []
        })),
        warnings: this.generateWarnings(conflicts)
      }
      
    } catch (error) {
      console.error('[ConflictResolver] Resolution failed:', error)
      return {
        resolved: false,
        resolution: null,
        resolvedData: null,
        conflicts: [],
        warnings: [`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  // Detect conflicts between local and server data
  private detectConflicts(
    localData: any,
    serverData: any,
    resourceType: DataConflict['resourceType'],
    resourceId: string
  ): DataConflict[] {
    const conflicts: DataConflict[] = []

    // Check if both versions exist
    if (!localData && !serverData) {
      return conflicts
    }

    // Deletion conflicts
    if (localData && !serverData) {
      conflicts.push({
        id: this.generateConflictId(resourceType, resourceId, 'delete'),
        resourceType,
        resourceId,
        conflictType: 'delete',
        localVersion: localData,
        serverVersion: null,
        timestamp: new Date().toISOString(),
        severity: 'high',
        description: 'Resource was deleted on server but modified locally',
        autoResolvable: false,
        resolutions: []
      })
    }

    if (!localData && serverData) {
      conflicts.push({
        id: this.generateConflictId(resourceType, resourceId, 'create'),
        resourceType,
        resourceId,
        conflictType: 'create',
        localVersion: null,
        serverVersion: serverData,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        description: 'Resource was created on server but not locally',
        autoResolvable: true,
        resolutions: []
      })
    }

    // Update conflicts - compare field by field
    if (localData && serverData) {
      const fieldConflicts = this.detectFieldConflicts(localData, serverData, resourceType, resourceId)
      conflicts.push(...fieldConflicts)
    }

    return conflicts
  }

  private detectFieldConflicts(
    localData: any,
    serverData: any,
    resourceType: DataConflict['resourceType'],
    resourceId: string
  ): DataConflict[] {
    const conflicts: DataConflict[] = []
    const allFields = new Set([...Object.keys(localData), ...Object.keys(serverData)])

    for (const field of allFields) {
      const localValue = localData[field]
      const serverValue = serverData[field]

      // Skip timestamps and system fields for basic comparison
      if (this.isSystemField(field)) {
        continue
      }

      // Check for value differences
      if (!this.valuesEqual(localValue, serverValue)) {
        const severity = this.calculateConflictSeverity(field, resourceType)
        const autoResolvable = this.canAutoResolveField(field, localValue, serverValue, resourceType)

        conflicts.push({
          id: this.generateConflictId(resourceType, resourceId, 'field', field),
          resourceType,
          resourceId,
          conflictType: 'field',
          localVersion: { [field]: localValue },
          serverVersion: { [field]: serverValue },
          timestamp: new Date().toISOString(),
          severity,
          description: `Field '${field}' has different values`,
          autoResolvable,
          resolutions: []
        })
      }
    }

    return conflicts
  }

  // Auto-resolution strategies
  private async attemptAutoResolution(
    conflicts: DataConflict[],
    localData: any,
    serverData: any
  ): Promise<ConflictResolutionResult> {
    const resolvedData = { ...serverData }
    const unresolvedConflicts: DataConflict[] = []
    const warnings: string[] = []

    for (const conflict of conflicts) {
      const resolution = await this.getAutoResolution(conflict, localData, serverData)
      
      if (resolution) {
        // Apply the resolution
        if (resolution.type === 'keep_local') {
          Object.assign(resolvedData, conflict.localVersion)
        } else if (resolution.type === 'merge' && resolution.mergedData) {
          Object.assign(resolvedData, resolution.mergedData)
        }
        // For 'keep_server', we don't need to do anything as resolvedData starts with server data
        
        this.resolvedConflicts.set(conflict.id, {
          resolved: true,
          resolution,
          resolvedData: conflict.localVersion || conflict.serverVersion,
          conflicts: [conflict],
          warnings: []
        })
      } else {
        unresolvedConflicts.push(conflict)
      }
    }

    const allResolved = unresolvedConflicts.length === 0

    return {
      resolved: allResolved,
      resolution: null,
      resolvedData: allResolved ? resolvedData : null,
      conflicts: unresolvedConflicts,
      warnings
    }
  }

  private async getAutoResolution(
    conflict: DataConflict,
    localData: any,
    serverData: any
  ): Promise<ConflictResolution | null> {
    if (!conflict.autoResolvable) {
      return null
    }

    // Check if conflict is within auto-resolution time window
    const conflictAge = Date.now() - new Date(conflict.timestamp).getTime()
    const maxAge = this.config.maxAutoResolutionAge * 60 * 1000
    
    if (conflictAge > maxAge) {
      return null
    }

    // Resource-specific auto-resolution strategies
    switch (conflict.resourceType) {
      case 'analysis':
        return this.resolveAnalysisConflict(conflict, localData, serverData)
      
      case 'user':
        return this.resolveUserConflict(conflict, localData, serverData)
      
      case 'review':
        return this.resolveReviewConflict(conflict, localData, serverData)
      
      case 'setting':
        return this.resolveSettingConflict(conflict, localData, serverData)
      
      default:
        return this.resolveGenericConflict(conflict, localData, serverData)
    }
  }

  // Resource-specific conflict resolution
  private resolveAnalysisConflict(
    conflict: DataConflict,
    _localData: any,
    _serverData: any
  ): ConflictResolution | null {
    // For analysis data, prioritize server data for AI results but keep local metadata
    if (conflict.conflictType === 'field') {
      const field = Object.keys(conflict.localVersion)[0]
      
      // AI results should come from server
      if (['aiPrediction', 'confidence', 'treatmentSuggestions'].includes(field)) {
        return {
          id: `resolution_${conflict.id}`,
          type: 'keep_server',
          description: 'AI results updated on server',
          impact: 'Uses latest AI analysis results',
          recommended: true
        }
      }
      
      // User metadata should prioritize local changes
      if (['notes', 'userRating', 'tags'].includes(field)) {
        return {
          id: `resolution_${conflict.id}`,
          type: 'keep_local',
          description: 'Preserve local user input',
          impact: 'Keeps your local changes',
          recommended: true
        }
      }
    }

    return null
  }

  private resolveUserConflict(
    conflict: DataConflict,
    localData: any,
    serverData: any
  ): ConflictResolution | null {
    if (conflict.conflictType === 'field') {
      const field = Object.keys(conflict.localVersion)[0]
      
      // Profile data should prioritize local changes
      if (['name', 'email', 'preferences', 'settings'].includes(field)) {
        return {
          id: `resolution_${conflict.id}`,
          type: 'keep_local',
          description: 'Preserve local profile changes',
          impact: 'Keeps your profile updates',
          recommended: true
        }
      }

      // System data should prioritize server
      if (['role', 'permissions', 'subscription'].includes(field)) {
        return {
          id: `resolution_${conflict.id}`,
          type: 'keep_server',
          description: 'Use server system data',
          impact: 'Uses latest system settings',
          recommended: true
        }
      }
    }

    return null
  }

  private resolveReviewConflict(
    conflict: DataConflict,
    localData: any,
    serverData: any
  ): ConflictResolution | null {
    // Reviews are typically created once and not modified, so server version wins
    return {
      id: `resolution_${conflict.id}`,
      type: 'keep_server',
      description: 'Use server review data',
      impact: 'Uses official review data',
      recommended: true
    }
  }

  private resolveSettingConflict(
    conflict: DataConflict,
    localData: any,
    serverData: any
  ): ConflictResolution | null {
    if (conflict.conflictType === 'field') {
      // Settings usually prioritize local changes
      return {
        id: `resolution_${conflict.id}`,
        type: 'keep_local',
        description: 'Preserve local settings',
        impact: 'Keeps your preference changes',
        recommended: true
      }
    }

    return null
  }

  private resolveGenericConflict(
    conflict: DataConflict,
    localData: any,
    serverData: any
  ): ConflictResolution | null {
    // Generic strategy: use timestamp-based resolution
    const localTimestamp = this.extractTimestamp(localData)
    const serverTimestamp = this.extractTimestamp(serverData)

    if (localTimestamp && serverTimestamp) {
      const useLocal = localTimestamp > serverTimestamp

      return {
        id: `resolution_${conflict.id}`,
        type: useLocal ? 'keep_local' : 'keep_server',
        description: useLocal ? 'Local version is newer' : 'Server version is newer',
        impact: 'Uses the most recent version',
        recommended: true
      }
    }

    // Fallback: prioritize local if configured
    if (this.config.prioritizeUserData) {
      return {
        id: `resolution_${conflict.id}`,
        type: 'keep_local',
        description: 'Preserve local changes',
        impact: 'Keeps your local data',
        recommended: true
      }
    }

    return null
  }

  // Manual resolution support
  private generateResolutionOptions(
    conflicts: DataConflict[],
    localData: any,
    serverData: any
  ): Record<string, ConflictResolution[]> {
    const options: Record<string, ConflictResolution[]> = {}

    for (const conflict of conflicts) {
      options[conflict.id] = [
        {
          id: `keep_local_${conflict.id}`,
          type: 'keep_local',
          description: 'Keep your local changes',
          impact: 'Your offline changes will be preserved',
          recommended: conflict.severity === 'low'
        },
        {
          id: `keep_server_${conflict.id}`,
          type: 'keep_server',
          description: 'Use server version',
          impact: 'Server data will overwrite local changes',
          recommended: conflict.conflictType === 'create'
        }
      ]

      // Add merge option if applicable
      if (this.config.enableFieldLevelMerging && this.canMerge(conflict)) {
        const mergedData = this.attemptMerge(conflict, localData, serverData)
        
        if (mergedData) {
          options[conflict.id].push({
            id: `merge_${conflict.id}`,
            type: 'merge',
            description: 'Merge both versions',
            impact: 'Combines data from both versions',
            recommended: true,
            mergedData
          })
        }
      }
    }

    return options
  }

  // Apply manual resolution
  async applyResolution(
    conflictId: string,
    resolutionId: string,
    conflicts: DataConflict[],
    localData: any,
    serverData: any
  ): Promise<ConflictResolutionResult> {
    const conflict = conflicts.find(c => c.id === conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }

    const resolution = conflict.resolutions.find(r => r.id === resolutionId)
    if (!resolution) {
      throw new Error(`Resolution not found: ${resolutionId}`)
    }

    let resolvedData = { ...serverData }

    switch (resolution.type) {
      case 'keep_local':
        Object.assign(resolvedData, conflict.localVersion)
        break
        
      case 'keep_server':
        // Already using server data
        break
        
      case 'merge':
        if (resolution.mergedData) {
          Object.assign(resolvedData, resolution.mergedData)
        }
        break
        
      case 'manual':
        // Manual resolution requires custom handling
        resolvedData = await this.handleManualResolution(conflict, resolution, localData, serverData)
        break
    }

    // Store resolution for future reference
    this.resolvedConflicts.set(conflictId, {
      resolved: true,
      resolution,
      resolvedData,
      conflicts: [conflict],
      warnings: []
    })

    return {
      resolved: true,
      resolution,
      resolvedData,
      conflicts: [],
      warnings: []
    }
  }

  // Utility methods
  private generateConflictId(
    resourceType: string,
    resourceId: string,
    conflictType: string,
    field?: string
  ): string {
    const parts = [resourceType, resourceId, conflictType]
    if (field) parts.push(field)
    return parts.join('_')
  }

  private isSystemField(field: string): boolean {
    return ['id', 'createdAt', 'updatedAt', 'version', '_id', '__v'].includes(field)
  }

  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b)
    }
    
    return false
  }

  private calculateConflictSeverity(
    field: string,
    _resourceType: string
  ): DataConflict['severity'] {
    // Critical fields that should never be auto-resolved
    const criticalFields = ['id', 'userId', 'farmerId', 'analysisId']
    if (criticalFields.includes(field)) return 'critical'

    // High-impact fields
    const highImpactFields = ['status', 'result', 'conclusion', 'aiPrediction']
    if (highImpactFields.includes(field)) return 'high'

    // Medium-impact fields
    const mediumImpactFields = ['notes', 'tags', 'rating', 'priority']
    if (mediumImpactFields.includes(field)) return 'medium'

    // Everything else is low impact
    return 'low'
  }

  private canAutoResolveField(
    field: string,
    localValue: any,
    serverValue: any,
    resourceType: string
  ): boolean {
    // Never auto-resolve critical fields
    if (this.calculateConflictSeverity(field, resourceType) === 'critical') {
      return false
    }

    // Don't auto-resolve if values are completely different types
    if (typeof localValue !== typeof serverValue) {
      return false
    }

    return true
  }

  private canMerge(conflict: DataConflict): boolean {
    return conflict.conflictType === 'field' && 
           conflict.severity !== 'critical' &&
           this.config.enableFieldLevelMerging
  }

  private attemptMerge(
    conflict: DataConflict,
    _localData: any,
    _serverData: any
  ): any | null {
    if (conflict.conflictType !== 'field') return null

    const field = Object.keys(conflict.localVersion)[0]
    const localValue = conflict.localVersion[field]
    const serverValue = conflict.serverVersion[field]

    // String concatenation for text fields
    if (typeof localValue === 'string' && typeof serverValue === 'string') {
      return { [field]: `${localValue}\n---\n${serverValue}` }
    }

    // Array merging
    if (Array.isArray(localValue) && Array.isArray(serverValue)) {
      const merged = [...new Set([...localValue, ...serverValue])]
      return { [field]: merged }
    }

    // Object merging
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      return { [field]: { ...serverValue, ...localValue } }
    }

    return null
  }

  private extractTimestamp(data: any): Date | null {
    const timestampFields = ['updatedAt', 'lastModified', 'timestamp', 'modifiedAt']
    
    for (const field of timestampFields) {
      if (data[field]) {
        const date = new Date(data[field])
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    return null
  }

  private generateWarnings(conflicts: DataConflict[]): string[] {
    const warnings: string[] = []

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical')
    if (criticalConflicts.length > 0) {
      warnings.push(`${criticalConflicts.length} critical conflicts require manual resolution`)
    }

    const highConflicts = conflicts.filter(c => c.severity === 'high')
    if (highConflicts.length > 0) {
      warnings.push(`${highConflicts.length} high-impact conflicts detected`)
    }

    return warnings
  }

  private async handleManualResolution(
    _conflict: DataConflict,
    _resolution: ConflictResolution,
    _localData: any,
    serverData: any
  ): Promise<any> {
    // Custom manual resolution handler would be implemented here
    // For now, default to server data
    return serverData
  }

  // Public API for getting resolution history
  getResolutionHistory(): Map<string, ConflictResolutionResult> {
    return new Map(this.resolvedConflicts)
  }

  clearResolutionHistory(): void {
    this.resolvedConflicts.clear()
  }
}

// Factory function
export function createConflictResolver(config?: Partial<ConflictResolutionConfig>): ConflictResolver {
  return new ConflictResolver(config)
}

// Default resolver instance
export const conflictResolver = createConflictResolver({
  autoResolveConflicts: true,
  maxAutoResolutionAge: 60,
  prioritizeUserData: true,
  enableFieldLevelMerging: true
})

export default conflictResolver