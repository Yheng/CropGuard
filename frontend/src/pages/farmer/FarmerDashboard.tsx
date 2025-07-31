import React from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Upload,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Leaf,
  TrendingUp,
  MapPin,
  Calendar,
  Bell,
  Plus,
  ArrowRight,
  Sun,
  CloudRain,
  Thermometer
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MetricCard } from '../../components/ui/Chart'
import { cn } from '../../utils/cn'

interface FarmerData {
  farmInfo: {
    name: string
    location: string
    totalArea: number
    activeFields: number
  }
  recentAnalyses: Array<{
    id: string
    date: string
    cropType: string
    imageUrl: string
    status: 'analyzing' | 'completed' | 'needs_review'
    healthScore: number
    issues: string[]
    treatmentRecommended: boolean
  }>
  cropHealth: {
    overallScore: number
    trend: 'improving' | 'declining' | 'stable'
    activeIssues: number
    healthyFields: number
  }
  weatherData: {
    temperature: number
    humidity: number
    rainfall: number
    forecast: string
  }
  upcomingTasks: Array<{
    id: string
    type: 'treatment' | 'inspection' | 'irrigation' | 'harvest'
    description: string
    dueDate: string
    priority: 'high' | 'medium' | 'low'
    fieldName: string
  }>
  notifications: Array<{
    id: string
    type: 'alert' | 'info' | 'success' | 'warning'
    message: string
    timestamp: string
    read: boolean
  }>
}

interface FarmerDashboardProps {
  data: FarmerData
  onImageUpload?: () => void
  onAnalysisClick?: (analysisId: string) => void
  onTaskComplete?: (taskId: string) => void
  onNotificationRead?: (notificationId: string) => void
  className?: string
}

export function FarmerDashboard({
  data,
  onImageUpload,
  onAnalysisClick,
  onTaskComplete,
  onNotificationRead,
  className
}: FarmerDashboardProps) {
  const [_selectedTimeRange, _setSelectedTimeRange] = React.useState<'week' | 'month' | 'season'>('week')

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: 'Excellent', color: '#10B981', icon: CheckCircle }
    if (score >= 60) return { status: 'Good', color: '#F59E0B', icon: Activity }
    if (score >= 40) return { status: 'Attention Needed', color: '#EF4444', icon: AlertTriangle }
    return { status: 'Critical', color: '#DC2626', icon: AlertTriangle }
  }

  const _getTrendIcon = (_trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-[#10B981]" />
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
      default: return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-500/5'
      case 'medium': return 'border-l-[#F59E0B] bg-[#F59E0B]/5'
      default: return 'border-l-[#10B981] bg-[#10B981]/5'
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'treatment': return <Leaf className="w-4 h-4" />
      case 'inspection': return <Activity className="w-4 h-4" />
      case 'irrigation': return <CloudRain className="w-4 h-4" />
      case 'harvest': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const healthStatus = getHealthStatus(data.cropHealth.overallScore)
  const HealthIcon = healthStatus.icon

  const unreadNotifications = data.notifications.filter(n => !n.read).length

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <div className="flex items-center gap-2 text-gray-300 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{data.farmInfo.name} • {data.farmInfo.location}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                </div>
              )}
            </Button>
          </div>

          {/* Upload Photo Button */}
          <Button
            onClick={onImageUpload}
            leftIcon={<Camera className="w-4 h-4" />}
            className="bg-[#10B981] hover:bg-[#10B981]/80"
          >
            Upload Photo
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard
            title="Crop Health"
            value={`${data.cropHealth.overallScore}%`}
            change={{
              value: 5.2,
              type: data.cropHealth.trend === 'improving' ? 'increase' : 'decrease',
              period: 'vs last week'
            }}
            icon={<HealthIcon className="w-6 h-6" />}
            color={healthStatus.color}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard
            title="Active Issues"
            value={data.cropHealth.activeIssues}
            icon={<AlertTriangle className="w-6 h-6" />}
            color={data.cropHealth.activeIssues > 0 ? '#EF4444' : '#10B981'}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard
            title="Healthy Fields"
            value={`${data.cropHealth.healthyFields}/${data.farmInfo.activeFields}`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="#10B981"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard
            title="Farm Area"
            value={`${data.farmInfo.totalArea} ha`}
            icon={<Leaf className="w-6 h-6" />}
            color="#2DD4BF"
          />
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader
              title="Recent Analyses"
              description="Your latest crop health assessments"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onImageUpload}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  New Analysis
                </Button>
              }
            />
            <CardContent>
              <div className="space-y-4">
                {data.recentAnalyses.length > 0 ? (
                  data.recentAnalyses.map((analysis, index) => (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-[#1F2A44] rounded-lg border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                      onClick={() => onAnalysisClick?.(analysis.id)}
                    >
                      <div className="flex items-center gap-4">
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
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white">{analysis.cropType}</h4>
                            <div className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              analysis.status === 'completed' ? 'bg-[#10B981]/20 text-[#10B981]' :
                              analysis.status === 'needs_review' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                              'bg-gray-600/20 text-gray-400'
                            )}>
                              {analysis.status === 'completed' ? 'Complete' :
                               analysis.status === 'needs_review' ? 'Review' : 'Analyzing'}
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-300">
                            Health Score: {analysis.healthScore}%
                          </div>
                          
                          {analysis.issues.length > 0 && (
                            <div className="text-xs text-red-400 mt-1">
                              {analysis.issues.join(', ')}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(analysis.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {analysis.treatmentRecommended && (
                          <div className="w-2 h-2 bg-[#F59E0B] rounded-full" title="Treatment recommended" />
                        )}
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-white font-medium mb-2">No analyses yet</p>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload your first crop photo to get started
                    </p>
                    <Button onClick={onImageUpload} leftIcon={<Camera className="w-4 h-4" />}>
                      Upload Photo
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weather & Tasks Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-6"
        >
          {/* Weather Card */}
          <Card>
            <CardHeader
              title="Weather Today"
              description="Current conditions"
              action={<Sun className="w-5 h-5 text-[#F59E0B]" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Temperature</span>
                  </div>
                  <span className="text-white font-medium">{data.weatherData.temperature}°C</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Humidity</span>
                  </div>
                  <span className="text-white font-medium">{data.weatherData.humidity}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Rainfall</span>
                  </div>
                  <span className="text-white font-medium">{data.weatherData.rainfall}mm</span>
                </div>
                
                <div className="pt-2 border-t border-gray-600">
                  <p className="text-sm text-gray-300">{data.weatherData.forecast}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader
              title="Upcoming Tasks"
              description={`${data.upcomingTasks.length} tasks this week`}
            />
            <CardContent>
              <div className="space-y-3">
                {data.upcomingTasks.slice(0, 5).map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className={cn(
                      'p-3 rounded-lg border-l-4 transition-colors',
                      getTaskPriorityColor(task.priority)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-0.5 text-gray-400">
                          {getTaskIcon(task.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{task.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{task.fieldName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTaskComplete?.(task.id)}
                        className="ml-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                
                {data.upcomingTasks.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#10B981]" />
                    <p className="text-sm text-gray-400">All caught up!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="bg-gradient-to-r from-[#10B981]/10 to-[#2DD4BF]/10 border-[#10B981]/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Monitor Your Crops Daily
                </h3>
                <p className="text-gray-300 text-sm">
                  Upload photos of your crops to track health trends and catch issues early. 
                  Early detection can prevent up to 80% of crop losses.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={onImageUpload}
                  leftIcon={<Camera className="w-4 h-4" />}
                  className="bg-[#10B981] hover:bg-[#10B981]/80"
                >
                  Upload Photo
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Activity className="w-4 h-4" />}
                >
                  View Trends
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications Panel (if any unread) */}
      {unreadNotifications > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card>
            <CardHeader
              title="Notifications"
              description={`${unreadNotifications} unread notifications`}
            />
            <CardContent>
              <div className="space-y-3">
                {data.notifications
                  .filter(n => !n.read)
                  .slice(0, 3)
                  .map((notification, _index) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 bg-[#1F2A44] rounded-lg cursor-pointer hover:bg-[#1F2A44]/80 transition-colors"
                      onClick={() => onNotificationRead?.(notification.id)}
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                        notification.type === 'alert' ? 'bg-red-500' :
                        notification.type === 'warning' ? 'bg-[#F59E0B]' :
                        notification.type === 'success' ? 'bg-[#10B981]' :
                        'bg-[#2DD4BF]'
                      )} />
                      
                      <div className="flex-1">
                        <p className="text-sm text-white">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}