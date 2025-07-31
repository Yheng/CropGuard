import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api/admin'

// Interfaces
export interface User {
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

export interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  totalAnalyses: number
  systemUptime: number
  apiUsage: number
  storageUsed: number
  errorRate: number
  averageResponseTime: number
}

export interface AuditLog {
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

export interface AIConfiguration {
  openaiApiKey?: string
  model: string
  confidenceThreshold: number
  maxTokens: number
  temperature: number
  backupModel: string
  rateLimitPerHour: number
  costLimitPerDay: number
  enableAutoFallback?: boolean
  enableRetryLogic?: boolean
  enableDetailedLogging?: boolean
}

export interface AIUsageStats {
  requestsThisHour: number
  costToday: number
  rateLimitPerHour: number
  costLimitPerDay: number
  averageResponseTime: number
  errorRate: number
  successRate: number
  totalRequestsToday: number
  averageConfidence: number
}

export interface UserFilters {
  role?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface BulkOperation {
  userIds: string[]
  updates?: Partial<User>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

class AdminService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  constructor() {
    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if ((error as { response?: { status?: number } }).response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // System metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<SystemMetrics>>('/metrics')
      return response.data.data || {
        totalUsers: 0,
        activeUsers: 0,
        totalAnalyses: 0,
        systemUptime: 0,
        apiUsage: 0,
        storageUsed: 0,
        errorRate: 0,
        averageResponseTime: 0
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error)
      throw error
    }
  }

  // User management
  async getUsers(filters: UserFilters = {}): Promise<{ users: User[]; pagination?: { page: number; limit: number; total: number; pages: number } }> {
    try {
      const params = new URLSearchParams()
      if (filters.role) params.append('role', filters.role)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await this.axiosInstance.get<ApiResponse<User[]>>(`/users?${params}`)
      return {
        users: response.data.data || [],
        pagination: response.data.pagination
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<User>>(`/users/${id}`)
      return response.data.data!
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<User>>('/users', userData)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create user')
      }
      return response.data.data!
    } catch (error: unknown) {
      console.error('Error creating user:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create user')
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<User>>(`/users/${id}`, updates)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update user')
      }
      return response.data.data!
    } catch (error: unknown) {
      console.error('Error updating user:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update user')
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<void>>(`/users/${id}`)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete user')
      }
    } catch (error: unknown) {
      console.error('Error deleting user:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete user')
    }
  }

  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<User>>(`/users/${id}/status`, { status })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update user status')
      }
      return response.data.data!
    } catch (error: unknown) {
      console.error('Error updating user status:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update user status')
    }
  }

  // Bulk operations
  async bulkUpdateUsers(operation: BulkOperation): Promise<User[]> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<User[]>>('/users/bulk-update', operation)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to bulk update users')
      }
      return response.data.data || []
    } catch (error: unknown) {
      console.error('Error bulk updating users:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to bulk update users')
    }
  }

  async bulkDeleteUsers(userIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ deleted: string[]; failed: string[] }>>('/users/bulk-delete', { userIds })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to bulk delete users')
      }
      return response.data.data || { deleted: [], failed: [] }
    } catch (error: unknown) {
      console.error('Error bulk deleting users:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to bulk delete users')
    }
  }

  // User statistics
  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; newUsers: number; usersByRole: Record<string, number> }> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{ totalUsers: number; activeUsers: number; newUsers: number; usersByRole: Record<string, number> }>>('/users/stats')
      return response.data.data || {}
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  }

  // Audit logs
  async getAuditLogs(limit = 50, offset = 0): Promise<AuditLog[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<AuditLog[]>>(`/audit-logs?limit=${limit}&offset=${offset}`)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      throw error
    }
  }

  // Data export
  async exportUsers(format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const response = await this.axiosInstance.get(`/export/users?format=${format}`, {
        responseType: 'blob'
      })
      
      // Create blob and download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cropguard_users_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting users:', error)
      throw error
    }
  }

  async exportAuditLogs(format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const response = await this.axiosInstance.get(`/export/audit-logs?format=${format}`, {
        responseType: 'blob'
      })
      
      // Create blob and download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cropguard_audit_logs_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      throw error
    }
  }

  // AI Configuration
  async getAIConfig(): Promise<AIConfiguration> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<AIConfiguration>>('/ai/config')
      return response.data.data || {
        model: 'gpt-4o',
        confidenceThreshold: 0.8,
        maxTokens: 1500,
        temperature: 0.3,
        backupModel: 'gpt-4o-mini',
        rateLimitPerHour: 100,
        costLimitPerDay: 50
      }
    } catch (error) {
      console.error('Error fetching AI config:', error)
      throw error
    }
  }

  async updateAIConfig(config: AIConfiguration): Promise<void> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<void>>('/ai/config', config)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update AI configuration')
      }
    } catch (error: unknown) {
      console.error('Error updating AI config:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update AI configuration')
    }
  }

  async testAIConnection(apiKey: string): Promise<{ connected: boolean; latency?: number; message: string }> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ connected: boolean; latency?: number; message: string }>>('/ai/test-connection', { apiKey })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Connection test failed')
      }
      return response.data.data!
    } catch (error: unknown) {
      console.error('Error testing AI connection:', error)
      throw new Error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Connection test failed')
    }
  }

  async getAIUsageStats(): Promise<AIUsageStats> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<AIUsageStats>>('/ai/usage')
      return response.data.data || {
        requestsThisHour: 0,
        costToday: 0,
        rateLimitPerHour: 100,
        costLimitPerDay: 50,
        averageResponseTime: 0,
        errorRate: 0,
        successRate: 100,
        totalRequestsToday: 0,
        averageConfidence: 0
      }
    } catch (error) {
      console.error('Error fetching AI usage stats:', error)
      throw error
    }
  }

  // Helper methods
  async performUserAction(action: 'activate' | 'suspend' | 'delete', userId: string): Promise<User | void> {
    try {
      switch (action) {
        case 'activate':
          return await this.updateUserStatus(userId, 'active')
        case 'suspend':
          return await this.updateUserStatus(userId, 'suspended')
        case 'delete':
          return await this.deleteUser(userId)
        default:
          throw new Error(`Unknown action: ${action}`)
      }
    } catch (error) {
      console.error(`Error performing user action ${action}:`, error)
      throw error
    }
  }

  async performBulkUserAction(action: 'activate' | 'suspend' | 'delete', userIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    try {
      switch (action) {
        case 'activate':
        case 'suspend': {
          const result = await this.bulkUpdateUsers({ userIds, updates: { status: action === 'activate' ? 'active' : 'suspended' } })
          return { success: result.map(u => u.id), failed: [] }
        }
        case 'delete':
          return await this.bulkDeleteUsers(userIds)
        default:
          throw new Error(`Unknown bulk action: ${action}`)
      }
    } catch (error) {
      console.error(`Error performing bulk user action ${action}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const adminService = new AdminService()

// Helper functions for common operations
export const adminActions = {
  // Quick user actions
  activateUser: (userId: string) => adminService.performUserAction('activate', userId),
  suspendUser: (userId: string) => adminService.performUserAction('suspend', userId),
  deleteUser: (userId: string) => adminService.performUserAction('delete', userId),

  // Quick bulk actions
  activateUsers: (userIds: string[]) => adminService.performBulkUserAction('activate', userIds),
  suspendUsers: (userIds: string[]) => adminService.performBulkUserAction('suspend', userIds),
  deleteUsers: (userIds: string[]) => adminService.performBulkUserAction('delete', userIds),

  // Data export shortcuts
  exportUsersCSV: () => adminService.exportUsers('csv'),
  exportUsersJSON: () => adminService.exportUsers('json'),
  exportAuditLogsCSV: () => adminService.exportAuditLogs('csv'),
  exportAuditLogsJSON: () => adminService.exportAuditLogs('json')
}

export default adminService