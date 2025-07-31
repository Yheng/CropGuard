import React from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Lock, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'

export interface User {
  id: string
  name: string
  email: string
  role: 'farmer' | 'agronomist' | 'admin'
  permissions?: string[]
  subscriptionPlan?: string
  isActive?: boolean
  assignedRegions?: string[]
}

interface ProtectedRouteProps {
  children: React.ReactNode
  user?: User | null
  requiredRoles?: ('farmer' | 'agronomist' | 'admin')[]
  requiredPermissions?: string[]
  requiresActiveSubscription?: boolean
  fallbackComponent?: React.ComponentType
  onUnauthorized?: () => void
  onRedirect?: (path: string) => void
  className?: string
}

interface AccessDeniedProps {
  reason: 'unauthenticated' | 'unauthorized' | 'inactive_subscription' | 'insufficient_permissions'
  user?: User | null
  requiredRoles?: string[]
  requiredPermissions?: string[]
  onLogin?: () => void
  onUpgrade?: () => void
  onGoBack?: () => void
  onContactSupport?: () => void
}

function AccessDenied({
  reason,
  user,
  requiredRoles = [],
  requiredPermissions = [],
  onLogin,
  onUpgrade,
  onGoBack,
  onContactSupport
}: AccessDeniedProps) {
  const getReasonConfig = () => {
    switch (reason) {
      case 'unauthenticated':
        return {
          icon: Lock,
          title: 'Authentication Required',
          description: 'You need to sign in to access this page.',
          color: '#F59E0B',
          primaryAction: { label: 'Sign In', onClick: onLogin },
          secondaryAction: { label: 'Go Back', onClick: onGoBack }
        }
      case 'unauthorized':
        return {
          icon: Shield,
          title: 'Access Denied',
          description: `This page is restricted to ${requiredRoles.join(', ')} users only.`,
          color: '#EF4444',
          primaryAction: { label: 'Contact Support', onClick: onContactSupport },
          secondaryAction: { label: 'Go Back', onClick: onGoBack }
        }
      case 'inactive_subscription':
        return {
          icon: AlertTriangle,
          title: 'Subscription Required',
          description: 'This feature requires an active subscription plan.',
          color: '#F59E0B',
          primaryAction: { label: 'Upgrade Plan', onClick: onUpgrade },
          secondaryAction: { label: 'Go Back', onClick: onGoBack }
        }
      case 'insufficient_permissions':
        return {
          icon: Shield,
          title: 'Insufficient Permissions',
          description: `You need the following permissions: ${requiredPermissions.join(', ')}.`,
          color: '#EF4444',
          primaryAction: { label: 'Contact Admin', onClick: onContactSupport },
          secondaryAction: { label: 'Go Back', onClick: onGoBack }
        }
      default:
        return {
          icon: Shield,
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          color: '#EF4444',
          primaryAction: { label: 'Go Back', onClick: onGoBack },
          secondaryAction: null
        }
    }
  }

  const config = getReasonConfig()
  const IconComponent = config.icon

  return (
    <div className="min-h-screen bg-[#0F1A2E] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <IconComponent className="w-10 h-10" style={{ color: config.color }} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-4"
            >
              {config.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-300 mb-6 leading-relaxed"
            >
              {config.description}
            </motion.p>

            {user && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#1F2A44] rounded-lg p-4 mb-6"
              >
                <div className="text-sm text-gray-400 mb-1">Signed in as:</div>
                <div className="text-white font-medium">{user.name}</div>
                <div className="text-sm text-gray-400">{user.email}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Role: <span className="capitalize text-white">{user.role}</span>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {config.primaryAction && (
                <Button
                  onClick={config.primaryAction.onClick}
                  className="w-full"
                  style={{ backgroundColor: config.color }}
                >
                  {config.primaryAction.label}
                </Button>
              )}

              {config.secondaryAction && (
                <Button
                  variant="outline"
                  onClick={config.secondaryAction.onClick}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  className="w-full"
                >
                  {config.secondaryAction.label}
                </Button>
              )}
            </motion.div>

            {reason === 'unauthorized' && requiredRoles.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <div className="text-sm text-red-400">
                  <div className="font-medium mb-1">Required Access Level:</div>
                  <div className="flex flex-wrap gap-2">
                    {requiredRoles.map(role => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-red-500/20 rounded text-xs capitalize"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {reason === 'insufficient_permissions' && requiredPermissions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <div className="text-sm text-red-400">
                  <div className="font-medium mb-2">Required Permissions:</div>
                  <div className="grid grid-cols-1 gap-1">
                    {requiredPermissions.map(permission => (
                      <div key={permission} className="text-xs">
                        • {permission}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export function ProtectedRoute({
  children,
  user,
  requiredRoles = [],
  requiredPermissions = [],
  requiresActiveSubscription = false,
  fallbackComponent: FallbackComponent,
  onUnauthorized,
  onRedirect,
  className
}: ProtectedRouteProps) {
  // Check if user is authenticated
  if (!user) {
    onUnauthorized?.()
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <AccessDenied
        reason="unauthenticated"
        onLogin={() => onRedirect?.('/login')}
        onGoBack={() => window.history.back()}
      />
    )
  }

  // Check if user account is active
  if (user.isActive === false) {
    return (
      <AccessDenied
        reason="unauthorized"
        user={user}
        onContactSupport={() => onRedirect?.('/support')}
        onGoBack={() => window.history.back()}
      />
    )
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    onUnauthorized?.()
    return FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <AccessDenied
        reason="unauthorized"
        user={user}
        requiredRoles={requiredRoles}
        onContactSupport={() => onRedirect?.('/support')}
        onGoBack={() => window.history.back()}
      />
    )
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    const userPermissions = user.permissions || []
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    )

    if (!hasAllPermissions) {
      onUnauthorized?.()
      return FallbackComponent ? (
        <FallbackComponent />
      ) : (
        <AccessDenied
          reason="insufficient_permissions"
          user={user}
          requiredPermissions={requiredPermissions}
          onContactSupport={() => onRedirect?.('/support')}
          onGoBack={() => window.history.back()}
        />
      )
    }
  }

  // Check subscription requirements
  if (requiresActiveSubscription) {
    const hasActiveSubscription = user.subscriptionPlan && 
      user.subscriptionPlan !== 'free' && 
      user.subscriptionPlan !== 'expired'

    if (!hasActiveSubscription) {
      return (
        <AccessDenied
          reason="inactive_subscription"
          user={user}
          onUpgrade={() => onRedirect?.('/pricing')}
          onGoBack={() => window.history.back()}
        />
      )
    }
  }

  // All checks passed, render the protected content
  return <div className={className}>{children}</div>
}

// Hook for checking permissions in components
// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions(user?: User | null) {
  const hasRole = React.useCallback((role: string) => {
    return user?.role === role
  }, [user])

  const hasPermission = React.useCallback((permission: string) => {
    return user?.permissions?.includes(permission) ?? false
  }, [user])

  const hasAnyRole = React.useCallback((roles: string[]) => {
    return user ? roles.includes(user.role) : false
  }, [user])

  const hasAllPermissions = React.useCallback((permissions: string[]) => {
    if (!user?.permissions) return false
    return permissions.every(permission => user.permissions!.includes(permission))
  }, [user])

  const canAccess = React.useCallback((
    requiredRoles: string[] = [],
    requiredPermissions: string[] = []
  ) => {
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
      return false
    }
    if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
      return false
    }
    return true
  }, [hasAnyRole, hasAllPermissions])

  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    canAccess,
    isAuthenticated: !!user,
    userRole: user?.role,
    userPermissions: user?.permissions || []
  }
}

// HOC for protecting components
// eslint-disable-next-line react-refresh/only-export-components
export function withRoleProtection<T extends object>(
  Component: React.ComponentType<T>,
  requiredRoles: string[],
  requiredPermissions: string[] = []
) {
  return function ProtectedComponent(props: T & { user?: User }) {
    const { user, ...restProps } = props
    
    return (
      <ProtectedRoute
        user={user}
        requiredRoles={requiredRoles as ('farmer' | 'agronomist' | 'admin')[]}
        requiredPermissions={requiredPermissions}
      >
        <Component {...restProps as T} />
      </ProtectedRoute>
    )
  }
}

export default ProtectedRoute