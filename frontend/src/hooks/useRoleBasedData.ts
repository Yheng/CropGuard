import React from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: 'farmer' | 'agronomist' | 'admin'
  permissions?: string[]
  farmId?: string
  assignedRegions?: string[]
  specializations?: string[]
  subscriptionPlan?: string
}

export interface Analysis {
  id: string
  farmerId: string
  farmerName: string
  farmerLocation: string
  cropType: string
  imageUrl: string
  status: 'pending' | 'in_review' | 'completed' | 'rejected'
  assignedAgronomistId?: string
  createdAt: string
  updatedAt: string
  region: string
  isPublic: boolean
  confidential: boolean
  aiPrediction: {
    issueName: string
    severity: number
    confidence: number
  }
}

export interface FilterOptions {
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  status?: string[]
  cropTypes?: string[]
  regions?: string[]
  severityRange?: [number, number]
  confidenceRange?: [number, number]
  assignedOnly?: boolean
  publicOnly?: boolean
}

export interface DataAccessRules {
  canViewAll: boolean
  canViewOwn: boolean
  canViewAssigned: boolean
  canViewRegional: boolean
  canViewPublic: boolean
  canModify: boolean
  canDelete: boolean
  canAssign: boolean
  canExport: boolean
  restrictedFields: string[]
  allowedRegions: string[]
  allowedCropTypes: string[]
}

// Role-based data access rules
const getAccessRules = (user: User): DataAccessRules => {
  switch (user.role) {
    case 'farmer':
      return {
        canViewAll: false,
        canViewOwn: true,
        canViewAssigned: false,
        canViewRegional: false,
        canViewPublic: true,
        canModify: true, // Own data only
        canDelete: true, // Own data only
        canAssign: false,
        canExport: true, // Own data only
        restrictedFields: ['farmerEmail', 'internalNotes', 'systemMetrics'],
        allowedRegions: user.assignedRegions || [],
        allowedCropTypes: []
      }

    case 'agronomist':
      return {
        canViewAll: false,
        canViewOwn: false,
        canViewAssigned: true,
        canViewRegional: true,
        canViewPublic: true,
        canModify: true, // Assigned analyses only
        canDelete: false,
        canAssign: false,
        canExport: true, // Assigned data only
        restrictedFields: ['farmerPersonalInfo', 'systemMetrics'],
        allowedRegions: user.assignedRegions || [],
        allowedCropTypes: user.specializations || []
      }

    case 'admin':
      return {
        canViewAll: true,
        canViewOwn: true,
        canViewAssigned: true,
        canViewRegional: true,
        canViewPublic: true,
        canModify: true,
        canDelete: true,
        canAssign: true,
        canExport: true,
        restrictedFields: [],
        allowedRegions: [],
        allowedCropTypes: []
      }

    default:
      return {
        canViewAll: false,
        canViewOwn: false,
        canViewAssigned: false,
        canViewRegional: false,
        canViewPublic: false,
        canModify: false,
        canDelete: false,
        canAssign: false,
        canExport: false,
        restrictedFields: [],
        allowedRegions: [],
        allowedCropTypes: []
      }
  }
}

// Filter data based on user role and permissions
export const filterDataByRole = (
  data: Analysis[],
  user: User,
  filters: FilterOptions = {}
): Analysis[] => {
  let filteredData = data.filter(item => {
    // Role-based access control
    switch (user.role) {
      case 'farmer':
        // Farmers can only see their own data and public data
        if (item.farmerId !== user.id && !item.isPublic) {
          return false
        }
        break

      case 'agronomist': {
        // Agronomists can see assigned analyses, regional data, and public data
        const canViewItem = 
          item.assignedAgronomistId === user.id ||
          (user.assignedRegions && user.assignedRegions.includes(item.region)) ||
          item.isPublic

        if (!canViewItem) {
          return false
        }

        // Filter by specializations if specified
        if (user.specializations && user.specializations.length > 0) {
          if (!user.specializations.includes(item.cropType)) {
            return false
          }
        }
        break
      }

      case 'admin':
        // Admins can see all data
        break

      default:
        return false
    }

    // Apply additional filters
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(item.status)) {
        return false
      }
    }

    if (filters.cropTypes && filters.cropTypes.length > 0) {
      if (!filters.cropTypes.includes(item.cropType)) {
        return false
      }
    }

    if (filters.regions && filters.regions.length > 0) {
      if (!filters.regions.includes(item.region)) {
        return false
      }
    }

    if (filters.severityRange) {
      const [min, max] = filters.severityRange
      if (item.aiPrediction.severity < min || item.aiPrediction.severity > max) {
        return false
      }
    }

    if (filters.confidenceRange) {
      const [min, max] = filters.confidenceRange
      if (item.aiPrediction.confidence < min || item.aiPrediction.confidence > max) {
        return false
      }
    }

    if (filters.assignedOnly && user.role === 'agronomist') {
      if (item.assignedAgronomistId !== user.id) {
        return false
      }
    }

    if (filters.publicOnly) {
      if (!item.isPublic) {
        return false
      }
    }

    if (filters.dateRange) {
      const now = new Date()
      const itemDate = new Date(item.createdAt)
      let cutoffDate: Date

      switch (filters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case 'quarter':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        case 'year':
          cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          break
        default:
          cutoffDate = new Date(0)
      }

      if (itemDate < cutoffDate) {
        return false
      }
    }

    return true
  })

  // Sort by relevance for the user
  if (user.role === 'agronomist') {
    filteredData = filteredData.sort((a, b) => {
      // Prioritize assigned analyses
      if (a.assignedAgronomistId === user.id && b.assignedAgronomistId !== user.id) return -1
      if (b.assignedAgronomistId === user.id && a.assignedAgronomistId !== user.id) return 1
      
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  } else {
    // Default sort by creation date
    filteredData = filteredData.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  return filteredData
}

// Sanitize data by removing restricted fields
export const sanitizeDataForRole = <T>(
  data: T,
  user: User
): T => {
  const accessRules = getAccessRules(user)
  
  if (accessRules.restrictedFields.length === 0) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForRole(item, user))
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data }
    
    accessRules.restrictedFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field]
      }
    })

    return sanitized
  }

  return data
}

// Check if user can perform specific actions
export const canPerformAction = (
  action: 'view' | 'modify' | 'delete' | 'assign' | 'export',
  targetData: Analysis,
  user: User
): boolean => {
  const accessRules = getAccessRules(user)

  switch (action) {
    case 'view':
      return filterDataByRole([targetData], user).length > 0

    case 'modify':
      if (!accessRules.canModify) return false
      
      switch (user.role) {
        case 'farmer':
          return targetData.farmerId === user.id
        case 'agronomist':
          return targetData.assignedAgronomistId === user.id ||
                 (user.assignedRegions?.includes(targetData.region) ?? false)
        case 'admin':
          return true
        default:
          return false
      }

    case 'delete':
      if (!accessRules.canDelete) return false
      
      switch (user.role) {
        case 'farmer':
          return targetData.farmerId === user.id
        case 'admin':
          return true
        default:
          return false
      }

    case 'assign':
      return accessRules.canAssign

    case 'export':
      if (!accessRules.canExport) return false
      return canPerformAction('view', targetData, user)

    default:
      return false
  }
}

// Hook for role-based data management
export function useRoleBasedData(user: User | null) {
  const [filters, setFilters] = React.useState<FilterOptions>({})

  const filterData = React.useCallback((data: Analysis[]) => {
    if (!user) return []
    return filterDataByRole(data, user, filters)
  }, [user, filters])

  const sanitizeData = React.useCallback(<T>(data: T): T | null => {
    if (!user) return null
    return sanitizeDataForRole(data, user)
  }, [user])

  const checkPermission = React.useCallback((
    action: 'view' | 'modify' | 'delete' | 'assign' | 'export',
    targetData: Analysis
  ) => {
    if (!user) return false
    return canPerformAction(action, targetData, user)
  }, [user])

  const getAccessRulesForUser = React.useCallback(() => {
    if (!user) return null
    return getAccessRules(user)
  }, [user])

  const updateFilters = React.useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = React.useCallback(() => {
    setFilters({})
  }, [])

  const getAvailableFilters = React.useCallback(() => {
    if (!user) return {}

    const accessRules = getAccessRules(user)
    
    return {
      canFilterByRegion: accessRules.allowedRegions.length === 0 || user.role === 'admin',
      canFilterByCropType: accessRules.allowedCropTypes.length === 0 || user.role === 'admin',
      canFilterByAssignment: user.role === 'agronomist',
      canFilterByPublic: user.role !== 'admin',
      allowedRegions: accessRules.allowedRegions,
      allowedCropTypes: accessRules.allowedCropTypes
    }
  }, [user])

  return {
    filters,
    updateFilters,
    clearFilters,
    filterData,
    sanitizeData,
    checkPermission,
    getAccessRules: getAccessRulesForUser,
    getAvailableFilters,
    isAuthenticated: !!user,
    userRole: user?.role,
    userId: user?.id
  }
}

export default useRoleBasedData