import React from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Settings,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Key,
  Server,
  Monitor,
  BarChart3,
  UserPlus,
  MapPin,
  Clock,
  TrendingUp,
  Zap,
  MoreHorizontal,
  X,
  LogOut
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MetricCard, ProgressChart, LineChart, BarChart } from '../../components/ui/Chart'
import { cn } from '../../utils/cn'
import { aiService } from '../../services/aiService'
import { PerformanceDashboard } from '../../components/admin/PerformanceDashboard'
import { adminService, adminActions, type User, type SystemMetrics, type AuditLog, type AIConfiguration } from '../../services/adminService'

// Interfaces are now imported from adminService

interface AdminDashboardProps {
  users: User[]
  systemMetrics: SystemMetrics
  auditLogs: AuditLog[]
  aiConfig: AIConfiguration
  onUserAction?: (action: 'activate' | 'suspend' | 'delete', userId: string) => void
  onCreateUser?: (userData: Partial<User>) => void
  onUpdateAIConfig?: (config: AIConfiguration) => void
  onExportData?: (dataType: 'users' | 'analytics' | 'audit') => void
  className?: string
}

export function AdminDashboard({
  users: initialUsers = [],
  systemMetrics: initialMetrics,
  auditLogs: initialAuditLogs = [],
  aiConfig: initialAIConfig,
  onUserAction,
  onCreateUser,
  onUpdateAIConfig,
  onExportData,
  className
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'users' | 'system' | 'audit' | 'ai' | 'performance'>('overview')
  const [userFilters, setUserFilters] = React.useState({
    role: '',
    status: '',
    search: ''
  })
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])
  const [showCreateUser, setShowCreateUser] = React.useState(false)
  const [showAIConfig, setShowAIConfig] = React.useState(false)
  const [newUser, setNewUser] = React.useState<Partial<User>>({
    role: 'farmer',
    status: 'active'
  })
  const [tempAIConfig, setTempAIConfig] = React.useState(aiService.getConfiguration() || initialAIConfig)
  
  // Real data state
  const [users, setUsers] = React.useState<User[]>(initialUsers)
  const [systemMetrics, setSystemMetrics] = React.useState<SystemMetrics>(initialMetrics || {
    totalUsers: 0,
    activeUsers: 0,
    totalAnalyses: 0,
    systemUptime: 0,
    apiUsage: 0,
    storageUsed: 0,
    errorRate: 0,
    averageResponseTime: 0
  })
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>(initialAuditLogs)
  const [aiConfig, setAIConfig] = React.useState<AIConfiguration>(initialAIConfig || {
    model: 'gpt-4o',
    confidenceThreshold: 0.8,
    maxTokens: 1500,
    temperature: 0.3,
    backupModel: 'gpt-4o-mini',
    rateLimitPerHour: 100,
    costLimitPerDay: 50
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load data on component mount
  React.useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [usersData, metrics, logs, aiConfiguration] = await Promise.all([
        adminService.getUsers(userFilters),
        adminService.getSystemMetrics(),
        adminService.getAuditLogs(20),
        adminService.getAIConfig()
      ])
      
      setUsers(usersData.users)
      setSystemMetrics(metrics)
      setAuditLogs(logs)
      setAIConfig(aiConfiguration)
      setTempAIConfig(aiConfiguration)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      if (userFilters.role && user.role !== userFilters.role) return false
      if (userFilters.status && user.status !== userFilters.status) return false
      if (userFilters.search && !user.name.toLowerCase().includes(userFilters.search.toLowerCase()) &&
          !user.email.toLowerCase().includes(userFilters.search.toLowerCase())) return false
      return true
    })
  }, [users, userFilters])

  const usersByRole = React.useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [users])

  const recentActivity = React.useMemo(() => {
    return auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  }, [auditLogs])

  const systemHealth = React.useMemo(() => {
    const uptime = systemMetrics.systemUptime
    const errorRate = systemMetrics.errorRate
    const responseTime = systemMetrics.averageResponseTime
    
    let health = 'excellent'
    let color = '#10B981'
    
    if (uptime < 99 || errorRate > 5 || responseTime > 2000) {
      health = 'poor'
      color = '#EF4444'
    } else if (uptime < 99.5 || errorRate > 2 || responseTime > 1000) {
      health = 'warning'
      color = '#F59E0B'
    }
    
    return { health, color }
  }, [systemMetrics])

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateUser = async () => {
    if (newUser.name && newUser.email && newUser.role) {
      try {
        setLoading(true)
        const createdUser = await adminService.createUser({
          ...newUser,
          password: 'defaultPassword123' // In production, generate a secure password
        })
        setUsers(prev => [...prev, createdUser])
        setNewUser({ role: 'farmer', status: 'active' })
        setShowCreateUser(false)
        // Refresh metrics to reflect new user
        const metrics = await adminService.getSystemMetrics()
        setSystemMetrics(metrics)
        onCreateUser?.(newUser) // Call callback if provided
      } catch (error) {
        console.error('Error creating user:', error)
        setError('Failed to create user')
      } finally {
        setLoading(false)
      }
    }
  }

  const _handleSaveAIConfig = async () => {
    try {
      setLoading(true)
      await adminService.updateAIConfig(tempAIConfig)
      setAIConfig(tempAIConfig)
      aiService.setConfiguration(tempAIConfig) // Update global AI service
      setShowAIConfig(false)
      onUpdateAIConfig?.(tempAIConfig) // Call callback if provided
    } catch (error) {
      console.error('Error saving AI config:', error)
      setError('Failed to save AI configuration')
    } finally {
      setLoading(false)
    }
  }

  // Handle user actions
  const handleUserAction = async (action: 'activate' | 'suspend' | 'delete', userId: string) => {
    try {
      setLoading(true)
      await adminService.performUserAction(action, userId)
      
      if (action === 'delete') {
        setUsers(prev => prev.filter(u => u.id !== userId))
      } else {
        const updatedUser = await adminService.getUserById(userId)
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u))
      }
      
      // Refresh metrics
      const metrics = await adminService.getSystemMetrics()
      setSystemMetrics(metrics)
      
      onUserAction?.(action, userId) // Call callback if provided
    } catch (error) {
      console.error(`Error performing ${action} on user:`, error)
      setError(`Failed to ${action} user`)
    } finally {
      setLoading(false)
    }
  }

  // Handle bulk user actions
  const handleBulkAction = async (action: 'activate' | 'suspend' | 'delete') => {
    if (selectedUsers.length === 0) return
    
    try {
      setLoading(true)
      await adminService.performBulkUserAction(action, selectedUsers)
      
      if (action === 'delete') {
        setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)))
      } else {
        // Refresh all users to get updated statuses
        const usersData = await adminService.getUsers(userFilters)
        setUsers(usersData.users)
      }
      
      setSelectedUsers([])
      
      // Refresh metrics
      const metrics = await adminService.getSystemMetrics()
      setSystemMetrics(metrics)
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error)
      setError(`Failed to ${action} selected users`)
    } finally {
      setLoading(false)
    }
  }

  // Handle data export
  const handleExportData = async (dataType: 'users' | 'analytics' | 'audit') => {
    try {
      setLoading(true)
      if (dataType === 'users') {
        await adminActions.exportUsersCSV()
      } else if (dataType === 'audit') {
        await adminActions.exportAuditLogsCSV()
      }
      onExportData?.(dataType) // Call callback if provided
    } catch (error) {
      console.error(`Error exporting ${dataType}:`, error)
      setError(`Failed to export ${dataType}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[#10B981] bg-[#10B981]/20'
      case 'inactive': return 'text-gray-400 bg-gray-400/20'
      case 'suspended': return 'text-red-400 bg-red-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-400/20'
      case 'medium': return 'text-[#F59E0B] bg-[#F59E0B]/20'
      default: return 'text-[#10B981] bg-[#10B981]/20'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'system', label: 'System', icon: Server },
    { id: 'audit', label: 'Audit', icon: Shield },
    { id: 'ai', label: 'AI Config', icon: Settings },
    { id: 'performance', label: 'Performance', icon: Zap }
  ]

  // Show loading state
  if (loading && users.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10B981] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <header className="bg-slate-900/95 backdrop-blur-xl border-b border-emerald-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CropGuard Admin</h1>
                <p className="text-xs text-emerald-300">Administrative Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="text-slate-300 hover:text-emerald-400 transition-colors font-medium flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/login'
                }}
                className="text-slate-300 hover:text-red-400 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={cn('space-y-6', className)}>
          {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-medium text-red-400">Error</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null)
              loadDashboardData()
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-300">System administration and management</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            systemHealth.health === 'excellent' ? 'bg-[#10B981]/20 text-[#10B981]' :
            systemHealth.health === 'warning' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
            'bg-red-500/20 text-red-400'
          )}>
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">System {systemHealth.health}</span>
          </div>
          
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-600">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'users' | 'system' | 'audit' | 'ai' | 'performance')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-[#10B981] border-[#10B981]'
                  : 'text-gray-400 border-transparent hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MetricCard
                title="Total Users"
                value={systemMetrics.totalUsers.toLocaleString()}
                change={{
                  value: 12,
                  type: 'increase',
                  period: 'this month'
                }}
                icon={<Users className="w-6 h-6" />}
                color="#10B981"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MetricCard
                title="Active Users"
                value={systemMetrics.activeUsers.toLocaleString()}
                change={{
                  value: 8,
                  type: 'increase',
                  period: 'this week'
                }}
                icon={<Activity className="w-6 h-6" />}
                color="#2DD4BF"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MetricCard
                title="Total Analyses"
                value={systemMetrics.totalAnalyses.toLocaleString()}
                change={{
                  value: 156,
                  type: 'increase',
                  period: 'this week'
                }}
                icon={<BarChart3 className="w-6 h-6" />}
                color="#8B5CF6"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <MetricCard
                title="System Uptime"
                value={`${systemMetrics.systemUptime}%`}
                icon={<Server className="w-6 h-6" />}
                color={systemHealth.color}
              />
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader title="User Growth" description="New user registrations over time" />
                <CardContent>
                  <LineChart
                    data={[
                      { label: 'Jan', value: 120 },
                      { label: 'Feb', value: 150 },
                      { label: 'Mar', value: 180 },
                      { label: 'Apr', value: 220 },
                      { label: 'May', value: 280 },
                      { label: 'Jun', value: 320 }
                    ]}
                    color="#10B981"
                    height={250}
                    showDots={true}
                    showGrid={true}
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader title="User Distribution" description="Users by role" />
                <CardContent>
                  <BarChart
                    data={[
                      { label: 'Farmers', value: usersByRole.farmer || 0, color: '#10B981' },
                      { label: 'Agronomists', value: usersByRole.agronomist || 0, color: '#F59E0B' },
                      { label: 'Admins', value: usersByRole.admin || 0, color: '#8B5CF6' }
                    ]}
                    height={250}
                    showValues={true}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader title="System Status" description="Real-time system performance metrics" />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <ProgressChart
                      label="API Usage"
                      value={systemMetrics.apiUsage}
                      max={100}
                      color="#2DD4BF"
                      variant="circular"
                      size="lg"
                    />
                  </div>
                  <div>
                    <ProgressChart
                      label="Storage Used"
                      value={systemMetrics.storageUsed}
                      max={100}
                      color="#F59E0B"
                      variant="circular"
                      size="lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-400">Error Rate</span>
                      <p className="text-2xl font-bold text-white">{systemMetrics.errorRate}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Avg Response Time</span>
                      <p className="text-2xl font-bold text-white">{systemMetrics.averageResponseTime}ms</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Database</span>
                      <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">API Gateway</span>
                      <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">File Storage</span>
                      <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Email Service</span>
                      <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Management Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userFilters.search}
                  onChange={(e) => setUserFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
                />
              </div>
              
              <select
                value={userFilters.role}
                onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
              >
                <option value="">All Roles</option>
                <option value="farmer">Farmers</option>
                <option value="agronomist">Agronomists</option>
                <option value="admin">Admins</option>
              </select>
              
              <select
                value={userFilters.status}
                onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => handleExportData('users')}
                disabled={loading}
              >
                Export
              </Button>
              <Button
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setShowCreateUser(true)}
                className="bg-[#10B981] hover:bg-[#10B981]/80"
              >
                Add User
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card className="bg-[#10B981]/10 border-[#10B981]/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#10B981] font-medium">
                    {selectedUsers.length} users selected
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate')}
                      disabled={loading}
                    >
                      Activate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('suspend')}
                      disabled={loading}
                    >
                      Suspend
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleBulkAction('delete')}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader title="Users" description={`${filteredUsers.length} users found`} />
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={() => {
                            if (selectedUsers.length === filteredUsers.length) {
                              setSelectedUsers([])
                            } else {
                              setSelectedUsers(filteredUsers.map(u => u.id))
                            }
                          }}
                          className="w-4 h-4 text-[#10B981] rounded focus:ring-[#10B981] focus:ring-2"
                        />
                      </th>
                      <th className="text-left p-3 text-gray-300 font-medium">User</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Role</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Joined</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Last Login</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-700 hover:bg-[#1F2A44]/50"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleUserSelect(user.id)}
                            className="w-4 h-4 text-[#10B981] rounded focus:ring-[#10B981] focus:ring-2"
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="text-white font-medium">{user.name}</div>
                            <div className="text-gray-400 text-xs">{user.email}</div>
                            {user.location && (
                              <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                <MapPin className="w-3 h-3" />
                                <span>{user.location}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-white capitalize">{user.role}</span>
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            getStatusColor(user.status)
                          )}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">
                          {new Date(user.registrationDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-gray-300">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              title="Edit User"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <div className="relative">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                title="More Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Create dropdown menu for actions
                                  const dropdown = document.createElement('div')
                                  dropdown.className = 'absolute right-0 top-8 bg-[#0F1A2E] border border-gray-600 rounded-lg shadow-lg z-50 min-w-32'
                                  dropdown.innerHTML = `
                                    <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#1F2A44] flex items-center gap-2" data-action="activate">
                                      <svg class="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                      Activate
                                    </button>
                                    <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#1F2A44] flex items-center gap-2" data-action="suspend">
                                      <svg class="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                      Suspend
                                    </button>
                                    <hr class="border-gray-600 my-1">
                                    <button class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#1F2A44] flex items-center gap-2" data-action="delete">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                      Delete
                                    </button>
                                  `
                                  
                                  // Position dropdown
                                  const button = e.currentTarget
                                  button.parentElement.appendChild(dropdown)
                                  
                                  // Add click handlers
                                  dropdown.querySelectorAll('[data-action]').forEach(actionBtn => {
                                    actionBtn.addEventListener('click', (actionEvent) => {
                                      const action = actionEvent.currentTarget.getAttribute('data-action')
                                      handleUserAction(action, user.id)
                                      dropdown.remove()
                                    })
                                  })
                                  
                                  // Remove dropdown when clicking outside
                                  const handleClickOutside = (event) => {
                                    if (!dropdown.contains(event.target)) {
                                      dropdown.remove()
                                      document.removeEventListener('click', handleClickOutside)
                                    }
                                  }
                                  setTimeout(() => document.addEventListener('click', handleClickOutside), 100)
                                }}
                                disabled={loading}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Audit Logs"
              description="System activity and security events"
              action={
                <Button
                  variant="outline"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => handleExportData('audit')}
                  disabled={loading}
                >
                  Export Logs
                </Button>
              }
            />
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-[#1F2A44] rounded-lg border border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{log.userName}</span>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            getSeverityColor(log.severity)
                          )}>
                            {log.severity}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{log.action}</p>
                        <p className="text-gray-400 text-xs">{log.details}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          <span>{log.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Configuration Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">AI Configuration</h2>
              <p className="text-gray-300">Manage OpenAI API settings and AI model parameters</p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  // Test AI connection
                }}
              >
                Test Connection
              </Button>
              <Button
                leftIcon={<Settings className="w-4 h-4" />}
                onClick={() => setShowAIConfig(true)}
                className="bg-[#10B981] hover:bg-[#10B981]/80"
              >
                Configure AI
              </Button>
            </div>
          </div>

          {/* Current AI Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MetricCard
                title="API Status"
                value={aiService.isConfigured() ? "Connected" : "Not Configured"}
                icon={<Key className="w-6 h-6" />}
                color={aiService.isConfigured() ? "#10B981" : "#EF4444"}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MetricCard
                title="Current Model"
                value={aiService.getConfiguration()?.model || "Not Set"}
                icon={<Zap className="w-6 h-6" />}
                color="#8B5CF6"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MetricCard
                title="Rate Limit"
                value={`${aiService.getUsageStats().requestsThisHour}/${aiService.getUsageStats().rateLimitPerHour}/hour`}
                icon={<Clock className="w-6 h-6" />}
                color="#F59E0B"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <MetricCard
                title="Daily Cost Limit"
                value={`$${aiService.getUsageStats().costToday.toFixed(2)}/$${aiService.getUsageStats().costLimitPerDay}`}
                icon={<TrendingUp className="w-6 h-6" />}
                color="#2DD4BF"
              />
            </motion.div>
          </div>

          {/* AI Configuration Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader title="API Configuration" description="OpenAI API settings and authentication" />
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        OpenAI API Key
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={aiService.getConfiguration()?.openaiApiKey ? '••••••••••••••••' : ''}
                          readOnly
                          className="flex-1 px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white"
                          placeholder="API key not configured"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Edit3 className="w-4 h-4" />}
                          onClick={() => setShowAIConfig(true)}
                        >
                          Edit
                        </Button>
                      </div>
                      {!aiService.getConfiguration()?.openaiApiKey && (
                        <p className="text-red-400 text-xs mt-1">
                          ⚠️ API key required for AI functionality
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Primary Model
                      </label>
                      <input
                        type="text"
                        value={aiService.getConfiguration()?.model || 'Not Set'}
                        readOnly
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Backup Model
                      </label>
                      <input
                        type="text"
                        value={aiService.getConfiguration()?.backupModel || 'Not Set'}
                        readOnly
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader title="Model Parameters" description="AI behavior and performance settings" />
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confidence Threshold: {Math.round((aiConfig.confidenceThreshold || 0.7) * 100)}%
                      </label>
                      <div className="w-full bg-gray-700 rounded-lg h-2">
                        <div 
                          className="bg-[#10B981] h-2 rounded-lg"
                          style={{ width: `${(aiConfig.confidenceThreshold || 0.7) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Temperature: {aiConfig.temperature || 0.1}
                      </label>
                      <div className="w-full bg-gray-700 rounded-lg h-2">
                        <div 
                          className="bg-[#F59E0B] h-2 rounded-lg"
                          style={{ width: `${(aiConfig.temperature || 0.1) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={aiConfig.maxTokens || 4000}
                        readOnly
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white"
                      />
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button
                        variant="outline"
                        leftIcon={<Settings className="w-4 h-4" />}
                        onClick={() => setShowAIConfig(true)}
                        className="w-full"
                      >
                        Adjust Parameters
                      </Button>
                      
                      <Button
                        variant="outline"
                        leftIcon={<Eye className="w-4 h-4" />}
                        onClick={async () => {
                          setLoading(true)
                          try {
                            const result = await aiService.testVisionAPI()
                            if (result.success) {
                              alert(`✅ Vision API Test Successful!\n\n${result.message}`)
                            } else {
                              alert(`❌ Vision API Test Failed!\n\n${result.message}`)
                            }
                          } catch (error) {
                            alert(`❌ Vision API Test Error!\n\n${error instanceof Error ? error.message : 'Unknown error'}`)
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="w-full"
                        disabled={!aiService.isConfigured() || loading}
                      >
                        Test Vision API
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Usage Limits and Monitoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader title="Usage & Limits" description="Monitor AI API usage and set spending limits" />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-white font-medium mb-3">Rate Limiting</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Requests per hour</span>
                        <span className="text-white">{aiConfig.rateLimitPerHour || 100}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-lg h-2">
                        <div className="bg-[#2DD4BF] h-2 rounded-lg" style={{ width: '65%' }} />
                      </div>
                      <p className="text-xs text-gray-400">65 requests used this hour</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3">Daily Costs</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Spent today</span>
                        <span className="text-white">$12.34</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-lg h-2">
                        <div className="bg-[#10B981] h-2 rounded-lg" style={{ width: '25%' }} />
                      </div>
                      <p className="text-xs text-gray-400">25% of ${aiConfig.costLimitPerDay || 50} limit</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3">Response Quality</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Average confidence</span>
                        <span className="text-white">87%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-lg h-2">
                        <div className="bg-[#8B5CF6] h-2 rounded-lg" style={{ width: '87%' }} />
                      </div>
                      <p className="text-xs text-gray-400">Based on last 100 requests</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Emergency Settings</h4>
                      <p className="text-gray-400 text-sm">Automatic fallbacks and safety measures</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<AlertTriangle className="w-4 h-4" />}
                      >
                        Reset Limits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<XCircle className="w-4 h-4" />}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        Disable AI
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <PerformanceDashboard />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreateUser(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F1A2E] rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={newUser.name || ''}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'farmer' | 'agronomist' | 'admin' }))}
                    className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="farmer">Farmer</option>
                    <option value="agronomist">Agronomist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80"
                >
                  Create User
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* AI Configuration Modal */}
      {showAIConfig && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAIConfig(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F1A2E] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">AI Configuration</h2>
                  <p className="text-gray-400 text-sm">Configure OpenAI API settings and model parameters</p>
                </div>
                <button
                  onClick={() => setShowAIConfig(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* API Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#10B981]" />
                    API Configuration
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      OpenAI API Key *
                    </label>
                    <input
                      type="password"
                      value={tempAIConfig.openaiApiKey || ''}
                      onChange={(e) => setTempAIConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      placeholder="sk-..."
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Your OpenAI API key. Keep this secure and never share it.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Primary Model
                      </label>
                      <select
                        value={tempAIConfig.model || 'gpt-4o'}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      >
                        <option value="gpt-4o">GPT-4o (Recommended)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Backup Model
                      </label>
                      <select
                        value={tempAIConfig.backupModel || 'gpt-4o-mini'}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, backupModel: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      >
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Model Parameters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#8B5CF6]" />
                    Model Parameters
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confidence Threshold
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={tempAIConfig.confidenceThreshold || 0.8}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0.1</span>
                        <span className="text-[#10B981]">{tempAIConfig.confidenceThreshold || 0.8}</span>
                        <span>1.0</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Temperature
                      </label>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.1"
                        value={tempAIConfig.temperature || 0.3}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0.0</span>
                        <span className="text-[#8B5CF6]">{tempAIConfig.temperature || 0.3}</span>
                        <span>1.0</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Tokens per Request
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      value={tempAIConfig.maxTokens || 1500}
                      onChange={(e) => setTempAIConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                {/* Rate Limiting & Costs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
                    Rate Limiting & Cost Controls
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Requests per Hour
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={tempAIConfig.rateLimitPerHour || 100}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, rateLimitPerHour: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Daily Cost Limit ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={tempAIConfig.costLimitPerDay || 50}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, costLimitPerDay: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  </div>

                  <div className="bg-[#1F2A44] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-400">Cost Estimation</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Based on current settings: ~$0.02 per analysis with GPT-4o
                    </p>
                    <p className="text-xs text-gray-400">
                      Daily usage: ~{tempAIConfig.rateLimitPerHour ? Math.round(tempAIConfig.rateLimitPerHour * 24 * 0.02) : 48} requests, ~${tempAIConfig.rateLimitPerHour ? (tempAIConfig.rateLimitPerHour * 24 * 0.02).toFixed(2) : '0.96'} cost
                    </p>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#2DD4BF]" />
                    Advanced Options
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempAIConfig.enableAutoFallback || true}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, enableAutoFallback: e.target.checked }))}
                        className="w-4 h-4 text-[#10B981] bg-[#1F2A44] border-gray-600 rounded focus:ring-[#10B981] focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">Enable automatic fallback to backup model</span>
                    </label>
                    
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempAIConfig.enableRetryLogic || true}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, enableRetryLogic: e.target.checked }))}
                        className="w-4 h-4 text-[#10B981] bg-[#1F2A44] border-gray-600 rounded focus:ring-[#10B981] focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">Enable automatic retry on failures</span>
                    </label>
                    
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempAIConfig.enableDetailedLogging || false}
                        onChange={(e) => setTempAIConfig(prev => ({ ...prev, enableDetailedLogging: e.target.checked }))}
                        className="w-4 h-4 text-[#10B981] bg-[#1F2A44] border-gray-600 rounded focus:ring-[#10B981] focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">Enable detailed API logging (for debugging)</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8 pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTempAIConfig(aiConfig)
                    setShowAIConfig(false)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  variant="outline"
                  onClick={async () => {
                    // Test API connection
                    if (tempAIConfig.openaiApiKey) {
                      // Temporarily set the config for testing
                      const currentConfig = aiService.getConfiguration()
                      aiService.setConfiguration(tempAIConfig)
                      
                      try {
                        const result = await aiService.testConnection()
                        if (result.success) {
                          alert(`✅ Connection successful!\nLatency: ${result.latency}ms`)
                        } else {
                          alert(`❌ Connection failed:\n${result.message}`)
                        }
                      } catch (error) {
                        alert(`❌ Test failed:\n${error instanceof Error ? error.message : 'Unknown error'}`)
                      } finally {
                        // Restore previous config if test was just temporary
                        if (currentConfig) {
                          aiService.setConfiguration(currentConfig)
                        }
                      }
                    } else {
                      alert('Please enter an API key first')
                    }
                  }}
                >
                  Test Connection
                </Button>
                <Button
                  onClick={() => {
                    // Save configuration using the AI service
                    aiService.setConfiguration(tempAIConfig)
                    // Also call the callback prop if provided
                    onUpdateAIConfig?.(tempAIConfig)
                    setShowAIConfig(false)
                    // Show success message
                    alert('AI configuration saved successfully!')
                  }}
                  className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80"
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
        </div>
      </main>
    </div>
  )
}