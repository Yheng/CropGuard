import React from 'react'
import { motion } from 'framer-motion'
import { Lock, AlertTriangle, EyeOff } from 'lucide-react'
import type { User } from '../routing/ProtectedRoute'
import { usePermissions } from '../routing/ProtectedRoute'
import { cn } from '../../utils/cn'

interface PermissionGateProps {
  children: React.ReactNode
  user?: User | null
  requiredRoles?: ('farmer' | 'agronomist' | 'admin')[]
  requiredPermissions?: string[]
  requiresActiveSubscription?: boolean
  fallback?: React.ReactNode
  showFallback?: boolean
  hideWhenRestricted?: boolean
  className?: string
  
  // Advanced access control
  allowOwnerAccess?: boolean
  ownerId?: string
  allowRegionalAccess?: boolean
  userRegions?: string[]
  itemRegion?: string
  
  // Custom validation function
  customValidation?: (user: User) => boolean
  
  // Visual indicators
  showPermissionHint?: boolean
  permissionHintText?: string
}

interface RestrictedContentProps {
  reason: 'role' | 'permission' | 'subscription' | 'owner' | 'region' | 'custom'
  requiredRoles?: string[]
  requiredPermissions?: string[]
  showHint?: boolean
  hintText?: string
  className?: string
}

function RestrictedContent({
  reason,
  requiredRoles = [],
  requiredPermissions = [],
  showHint = true,
  hintText,
  className
}: RestrictedContentProps) {
  if (!showHint) {
    return null
  }

  const getReasonConfig = () => {
    switch (reason) {
      case 'role':
        return {
          icon: Lock,
          message: hintText || `Requires ${requiredRoles.join(' or ')} access`,
          color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20'
        }
      case 'permission':
        return {
          icon: AlertTriangle,
          message: hintText || (requiredPermissions.length > 0 ? `Requires permissions: ${requiredPermissions.join(', ')}` : 'Insufficient permissions'),
          color: 'text-red-400 bg-red-400/10 border-red-400/20'
        }
      case 'subscription':
        return {
          icon: Lock,
          message: hintText || 'Premium subscription required',
          color: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20'
        }
      case 'owner':
        return {
          icon: EyeOff,
          message: hintText || 'Owner access only',
          color: 'text-gray-400 bg-gray-400/10 border-gray-400/20'
        }
      case 'region':
        return {
          icon: EyeOff,
          message: hintText || 'Regional access restricted',
          color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20'
        }
      default:
        return {
          icon: Lock,
          message: hintText || 'Access restricted',
          color: 'text-gray-400 bg-gray-400/10 border-gray-400/20'
        }
    }
  }

  const config = getReasonConfig()
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center justify-center p-4 rounded-lg border border-dashed',
        config.color,
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        <span>{config.message}</span>
      </div>
    </motion.div>
  )
}

export function PermissionGate({
  children,
  user,
  requiredRoles = [],
  requiredPermissions = [],
  requiresActiveSubscription = false,
  fallback,
  showFallback = true,
  hideWhenRestricted = false,
  className,
  
  // Advanced access control
  allowOwnerAccess = false,
  ownerId,
  allowRegionalAccess = false,
  userRegions = [],
  itemRegion,
  
  // Custom validation
  customValidation,
  
  // Visual indicators
  showPermissionHint = true,
  permissionHintText
}: PermissionGateProps) {
  const permissions = usePermissions(user)

  // Check authentication
  if (!permissions.isAuthenticated) {
    if (hideWhenRestricted) return null
    
    return fallback || (showFallback ? (
      <RestrictedContent
        reason="role"
        showHint={showPermissionHint}
        hintText={permissionHintText || 'Sign in required'}
        className={className}
      />
    ) : null)
  }

  // Check custom validation first
  if (customValidation && !customValidation(user!)) {
    if (hideWhenRestricted) return null
    
    return fallback || (showFallback ? (
      <RestrictedContent
        reason="custom"
        showHint={showPermissionHint}
        hintText={permissionHintText}
        className={className}
      />
    ) : null)
  }

  // Check subscription requirements
  if (requiresActiveSubscription) {
    const hasActiveSubscription = user?.subscriptionPlan && 
      user.subscriptionPlan !== 'free' && 
      user.subscriptionPlan !== 'expired'

    if (!hasActiveSubscription) {
      if (hideWhenRestricted) return null
      
      return fallback || (showFallback ? (
        <RestrictedContent
          reason="subscription"
          showHint={showPermissionHint}
          hintText={permissionHintText}
          className={className}
        />
      ) : null)
    }
  }

  // Check owner access
  if (allowOwnerAccess && ownerId) {
    if (user?.id === ownerId) {
      return <div className={className}>{children}</div>
    }
    
    // If owner access is required but user is not owner, continue to other checks
    // unless it's the only access method
    if (requiredRoles.length === 0 && requiredPermissions.length === 0 && !allowRegionalAccess) {
      if (hideWhenRestricted) return null
      
      return fallback || (showFallback ? (
        <RestrictedContent
          reason="owner"
          showHint={showPermissionHint}
          hintText={permissionHintText}
          className={className}
        />
      ) : null)
    }
  }

  // Check regional access
  if (allowRegionalAccess && itemRegion) {
    const hasRegionalAccess = userRegions.includes(itemRegion) || 
      user?.assignedRegions?.includes(itemRegion) ||
      user?.role === 'admin'

    if (!hasRegionalAccess && requiredRoles.length === 0 && requiredPermissions.length === 0) {
      if (hideWhenRestricted) return null
      
      return fallback || (showFallback ? (
        <RestrictedContent
          reason="region"
          showHint={showPermissionHint}
          hintText={permissionHintText}
          className={className}
        />
      ) : null)
    }
  }

  // Check role-based access
  if (requiredRoles.length > 0) {
    if (!permissions.hasAnyRole(requiredRoles)) {
      if (hideWhenRestricted) return null
      
      return fallback || (showFallback ? (
        <RestrictedContent
          reason="role"
          requiredRoles={requiredRoles}
          showHint={showPermissionHint}
          hintText={permissionHintText}
          className={className}
        />
      ) : null)
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    if (!permissions.hasAllPermissions(requiredPermissions)) {
      if (hideWhenRestricted) return null
      
      return fallback || (showFallback ? (
        <RestrictedContent
          reason="permission"
          requiredPermissions={requiredPermissions}
          showHint={showPermissionHint}
          hintText={permissionHintText}
          className={className}
        />
      ) : null)
    }
  }

  // All checks passed, render the protected content
  return <div className={className}>{children}</div>
}

// Specialized components for common use cases
export function AdminOnly({ children, user, ...props }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      requiredRoles={['admin']}
      permissionHintText="Administrator access required"
    >
      {children}
    </PermissionGate>
  )
}

export function AgronomistOnly({ children, user, ...props }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      requiredRoles={['agronomist']}
      permissionHintText="Agronomist access required"
    >
      {children}
    </PermissionGate>
  )
}

export function FarmerOnly({ children, user, ...props }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      requiredRoles={['farmer']}
      permissionHintText="Farmer access required"
    >
      {children}
    </PermissionGate>
  )
}

export function ProfessionalOnly({ children, user, ...props }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      requiredRoles={['agronomist', 'admin']}
      permissionHintText="Professional access required"
    >
      {children}
    </PermissionGate>
  )
}

export function OwnerOnly({ 
  children, 
  user, 
  ownerId, 
  ...props 
}: Omit<PermissionGateProps, 'allowOwnerAccess'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      allowOwnerAccess={true}
      ownerId={ownerId}
      permissionHintText="Owner access only"
    >
      {children}
    </PermissionGate>
  )
}

export function PremiumOnly({ children, user, ...props }: Omit<PermissionGateProps, 'requiresActiveSubscription'>) {
  return (
    <PermissionGate
      {...props}
      user={user}
      requiresActiveSubscription={true}
      permissionHintText="Premium subscription required"
    >
      {children}
    </PermissionGate>
  )
}

// Hook for conditional rendering based on permissions
// eslint-disable-next-line react-refresh/only-export-components
export function usePermissionGate(user?: User | null) {
  const permissions = usePermissions(user)

  const canRender = React.useCallback((config: {
    requiredRoles?: string[]
    requiredPermissions?: string[]
    requiresActiveSubscription?: boolean
    allowOwnerAccess?: boolean
    ownerId?: string
    allowRegionalAccess?: boolean
    userRegions?: string[]
    itemRegion?: string
    customValidation?: (user: User) => boolean
  }) => {
    if (!permissions.isAuthenticated) return false

    const {
      requiredRoles = [],
      requiredPermissions = [],
      requiresActiveSubscription = false,
      allowOwnerAccess = false,
      ownerId,
      allowRegionalAccess = false,
      userRegions = [],
      itemRegion,
      customValidation
    } = config

    // Custom validation
    if (customValidation && !customValidation(user!)) {
      return false
    }

    // Subscription check
    if (requiresActiveSubscription) {
      const hasActiveSubscription = user?.subscriptionPlan && 
        user.subscriptionPlan !== 'free' && 
        user.subscriptionPlan !== 'expired'
      if (!hasActiveSubscription) return false
    }

    // Owner access
    if (allowOwnerAccess && ownerId && user?.id === ownerId) {
      return true
    }

    // Regional access
    if (allowRegionalAccess && itemRegion) {
      const hasRegionalAccess = userRegions.includes(itemRegion) || 
        user?.assignedRegions?.includes(itemRegion) ||
        user?.role === 'admin'
      if (hasRegionalAccess) return true
    }

    // Role and permission checks
    if (requiredRoles.length > 0 && !permissions.hasAnyRole(requiredRoles)) {
      return false
    }

    if (requiredPermissions.length > 0 && !permissions.hasAllPermissions(requiredPermissions)) {
      return false
    }

    return true
  }, [permissions, user])

  return {
    canRender,
    ...permissions
  }
}

export default PermissionGate