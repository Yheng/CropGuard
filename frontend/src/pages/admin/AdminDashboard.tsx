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
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Key,
  Database,
  Server,
  Monitor,
  BarChart3,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Lock,
  FileText,
  Send,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MetricCard, ProgressChart, LineChart, BarChart } from '../../components/ui/Chart'
import { cn } from '../../utils/cn'

interface User {
  id: string
  name: string
  email: string
  role: 'farmer' | 'agronomist' | 'admin'
  status: 'active' | 'inactive' | 'suspended'
  registrationDate: string
  lastLogin: string
  location: string
  phone?: string
  totalAnalyses?: number
  totalReviews?: number
  accuracyRate?: number
  subscriptionPlan?: string
}

interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  totalAnalyses: number
  systemUptime: number
  apiUsage: number
  storageUsed: number
  errorRate: number
  averageResponseTime: number
}

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: string
  details: string
  ipAddress: string
  userAgent: string
  severity: 'low' | 'medium' | 'high'
}

interface AIConfiguration {
  openaiApiKey: string
  model: string
  confidenceThreshold: number
  maxTokens: number
  temperature: number
  backupModel: string
  rateLimitPerHour: number
  costLimitPerDay: number
}

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
  users,
  systemMetrics,
  auditLogs,
  aiConfig,
  onUserAction,
  onCreateUser,
  onUpdateAIConfig,
  onExportData,
  className
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'users' | 'system' | 'audit' | 'ai'>('overview')
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
  const [tempAIConfig, setTempAIConfig] = React.useState(aiConfig)

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

  const handleCreateUser = () => {
    if (newUser.name && newUser.email && newUser.role) {
      onCreateUser?.(newUser)
      setNewUser({ role: 'farmer', status: 'active' })
      setShowCreateUser(false)
    }
  }

  const handleSaveAIConfig = () => {
    onUpdateAIConfig?.(tempAIConfig)
    setShowAIConfig(false)
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
    { id: 'ai', label: 'AI Config', icon: Settings }
  ]

  return (
    <div className={cn('space-y-6', className)}>
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
              onClick={() => setActiveTab(tab.id as any)}
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
                onClick={() => onExportData?.('users')}
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
                    <Button size="sm" variant="outline">
                      Activate
                    </Button>
                    <Button size="sm" variant="outline">
                      Suspend
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<Trash2 className="w-4 h-4" />}>
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
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
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
                  onClick={() => onExportData?.('audit')}
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
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
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
    </div>
  )
}