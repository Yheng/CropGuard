import React from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Info,
  Settings,
  Database,
  Lock,
  Unlock,
  FileText,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { ActivityEvent, ActivityFilter } from '../hooks/useActivityTracking'

interface AuditLogViewerProps {
  activities: ActivityEvent[]
  loading?: boolean
  onRefresh?: () => void
  onExport?: (filter: ActivityFilter) => void
  onViewDetails?: (activity: ActivityEvent) => void
  className?: string
}

interface ActivityDetailsProps {
  activity: ActivityEvent
  onClose: () => void
}

function ActivityIcon({ category, severity }: { category: string; severity: string }) {
  const iconProps = { className: "w-4 h-4" }
  
  if (severity === 'critical' || severity === 'error') {
    return <AlertTriangle {...iconProps} className="w-4 h-4 text-red-400" />
  }
  
  switch (category) {
    case 'authentication':
      return severity === 'warning' ? 
        <Lock {...iconProps} className="w-4 h-4 text-[#F59E0B]" /> :
        <Unlock {...iconProps} className="w-4 h-4 text-[#10B981]" />
    case 'analysis':
      return <FileText {...iconProps} className="w-4 h-4 text-[#2DD4BF]" />
    case 'review':
      return <CheckCircle {...iconProps} className="w-4 h-4 text-[#10B981]" />
    case 'user_management':
      return <User {...iconProps} className="w-4 h-4 text-[#8B5CF6]" />
    case 'system':
      return <Settings {...iconProps} className="w-4 h-4 text-[#F59E0B]" />
    case 'data_access':
      return <Database {...iconProps} className="w-4 h-4 text-[#2DD4BF]" />
    default:
      return <Activity {...iconProps} className="w-4 h-4 text-gray-400" />
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/20'
    case 'error': return 'text-red-400 bg-red-500/20'
    case 'warning': return 'text-[#F59E0B] bg-[#F59E0B]/20'
    case 'info': return 'text-[#2DD4BF] bg-[#2DD4BF]/20'
    default: return 'text-gray-400 bg-gray-400/20'
  }
}

function getOutcomeColor(outcome: string) {
  switch (outcome) {
    case 'success': return 'text-[#10B981] bg-[#10B981]/20'
    case 'failure': return 'text-red-400 bg-red-500/20'
    case 'partial': return 'text-[#F59E0B] bg-[#F59E0B]/20'
    default: return 'text-gray-400 bg-gray-400/20'
  }
}

function ActivityDetails({ activity, onClose }: ActivityDetailsProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['overview'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Action:</span>
              <p className="text-white font-medium">{activity.action}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Category:</span>
              <p className="text-white capitalize">{activity.category}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Severity:</span>
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium capitalize',
                getSeverityColor(activity.severity)
              )}>
                {activity.severity}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Outcome:</span>
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium capitalize',
                getOutcomeColor(activity.outcome)
              )}>
                {activity.outcome}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-400">Description:</span>
            <p className="text-white">{activity.description}</p>
          </div>
          {activity.duration && (
            <div>
              <span className="text-sm text-gray-400">Duration:</span>
              <p className="text-white">{activity.duration}ms</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'user',
      title: 'User Information',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">User:</span>
              <p className="text-white font-medium">{activity.userName}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Role:</span>
              <p className="text-white capitalize">{activity.userRole}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">User ID:</span>
              <p className="text-white font-mono text-sm">{activity.userId}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Session ID:</span>
              <p className="text-white font-mono text-sm">{activity.sessionId}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'technical',
      title: 'Technical Details',
      content: (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-400">Timestamp:</span>
            <p className="text-white">{new Date(activity.timestamp).toLocaleString()}</p>
          </div>
          {activity.ipAddress && (
            <div>
              <span className="text-sm text-gray-400">IP Address:</span>
              <p className="text-white font-mono">{activity.ipAddress}</p>
            </div>
          )}
          {activity.userAgent && (
            <div>
              <span className="text-sm text-gray-400">User Agent:</span>
              <p className="text-white text-xs break-all">{activity.userAgent}</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'target',
      title: 'Target Resource',
      content: activity.targetResource ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Type:</span>
              <p className="text-white capitalize">{activity.targetResource.type}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">ID:</span>
              <p className="text-white font-mono text-sm">{activity.targetResource.id}</p>
            </div>
          </div>
          {activity.targetResource.name && (
            <div>
              <span className="text-sm text-gray-400">Name:</span>
              <p className="text-white">{activity.targetResource.name}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No target resource specified</p>
      )
    },
    {
      id: 'details',
      title: 'Event Details',
      content: (
        <div className="space-y-3">
          <pre className="bg-[#1F2A44] p-3 rounded-lg text-sm text-gray-300 overflow-x-auto">
            {JSON.stringify(activity.details, null, 2)}
          </pre>
        </div>
      )
    },
    {
      id: 'metadata',
      title: 'Metadata',
      content: activity.metadata ? (
        <div className="space-y-3">
          <pre className="bg-[#1F2A44] p-3 rounded-lg text-sm text-gray-300 overflow-x-auto">
            {JSON.stringify(activity.metadata, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No metadata available</p>
      )
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0F1A2E] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ActivityIcon category={activity.category} severity={activity.severity} />
              <h2 className="text-xl font-bold text-white">Activity Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1F2A44]/50 transition-colors"
                >
                  <h3 className="font-medium text-white">{section.title}</h3>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.includes(section.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-4 pb-4"
                  >
                    {section.content}
                  </motion.div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ActivityRow({ 
  activity, 
  onViewDetails 
}: { 
  activity: ActivityEvent; 
  onViewDetails: (activity: ActivityEvent) => void 
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gray-700 hover:bg-[#1F2A44]/50 transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <ActivityIcon category={activity.category} severity={activity.severity} />
          <div>
            <p className="text-white font-medium text-sm">{activity.action}</p>
            <p className="text-gray-400 text-xs">{activity.description}</p>
          </div>
        </div>
      </td>
      
      <td className="p-4">
        <div>
          <p className="text-white text-sm">{activity.userName}</p>
          <p className="text-gray-400 text-xs capitalize">{activity.userRole}</p>
        </div>
      </td>
      
      <td className="p-4">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium capitalize',
          getSeverityColor(activity.severity)
        )}>
          {activity.severity}
        </span>
      </td>
      
      <td className="p-4">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium capitalize',
          getOutcomeColor(activity.outcome)
        )}>
          {activity.outcome}
        </span>
      </td>
      
      <td className="p-4">
        <div className="text-sm text-gray-300">
          <p>{new Date(activity.timestamp).toLocaleDateString()}</p>
          <p className="text-xs text-gray-400">
            {new Date(activity.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </td>
      
      <td className="p-4">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(activity)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  )
}

export function AuditLogViewer({
  activities,
  loading = false,
  onRefresh,
  onExport,
  onViewDetails,
  className
}: AuditLogViewerProps) {
  const [filters, setFilters] = React.useState<ActivityFilter>({})
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityEvent | null>(null)
  const [expandedFilters, setExpandedFilters] = React.useState(false)

  const filteredActivities = React.useMemo(() => {
    return activities.filter(activity => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        if (!activity.action.toLowerCase().includes(query) &&
            !activity.description.toLowerCase().includes(query) &&
            !activity.userName.toLowerCase().includes(query)) {
          return false
        }
      }
      
      if (filters.category && activity.category !== filters.category) return false
      if (filters.severity && activity.severity !== filters.severity) return false
      if (filters.outcome && activity.outcome !== filters.outcome) return false
      if (filters.userRole && activity.userRole !== filters.userRole) return false
      if (filters.userId && activity.userId !== filters.userId) return false
      
      if (filters.dateRange) {
        const activityDate = new Date(activity.timestamp)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        if (activityDate < startDate || activityDate > endDate) return false
      }
      
      return true
    })
  }, [activities, filters])

  const categories = React.useMemo(() => 
    [...new Set(activities.map(a => a.category))], [activities]
  )
  
  const severities = React.useMemo(() => 
    [...new Set(activities.map(a => a.severity))], [activities]
  )

  const handleExport = () => {
    onExport?.(filters)
  }

  const handleViewDetails = (activity: ActivityEvent) => {
    setSelectedActivity(activity)
    onViewDetails?.(activity)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Audit Logs</h2>
          <p className="text-gray-300">
            {filteredActivities.length} of {activities.length} activities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader
          title="Filters"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedFilters(!expandedFilters)}
              leftIcon={expandedFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            >
              {expandedFilters ? 'Hide' : 'Show'} Filters
            </Button>
          }
        />
        
        {expandedFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={filters.searchQuery || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category} className="capitalize">
                      {category.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">All Severities</option>
                  {severities.map(severity => (
                    <option key={severity} value={severity} className="capitalize">
                      {severity}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">User Role</label>
                <select
                  value={filters.userRole || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, userRole: e.target.value as any || undefined }))}
                  className="w-full px-3 py-2 bg-[#1F2A44] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">All Roles</option>
                  <option value="farmer">Farmer</option>
                  <option value="agronomist">Agronomist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            {Object.keys(filters).length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-300 font-medium">Action</th>
                  <th className="text-left p-4 text-gray-300 font-medium">User</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Severity</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Outcome</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Timestamp</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="text-gray-400">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1">No activities found</p>
                        <p className="text-sm">Try adjusting your filters or refresh the data</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <ActivityDetails
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  )
}

export default AuditLogViewer