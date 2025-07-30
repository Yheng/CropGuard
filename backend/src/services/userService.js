const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

// Demo user database (in production this would be a real database)
let users = [
  {
    id: '1',
    name: 'Demo Farmer',
    email: 'farmer@demo.com',
    password_hash: '$2b$10$8K9wE2lTZ1Y0pG3r5S7vJ.TlGtFsKNHQ6mR8cP4qE9wF2dA5bI3xG',
    role: 'farmer',
    status: 'active',
    registrationDate: '2024-01-15T08:00:00Z',
    lastLogin: '2024-01-29T14:30:00Z',
    location: 'California, USA',
    phone: '+1-555-0123',
    totalAnalyses: 24,
    accuracyRate: 89.5,
    subscriptionPlan: 'Basic'
  },
  {
    id: '2',
    name: 'Dr. Sarah Johnson',
    email: 'agronomist@demo.com',
    password_hash: '$2b$10$8K9wE2lTZ1Y0pG3r5S7vJ.TlGtFsKNHQ6mR8cP4qE9wF2dA5bI3xG',
    role: 'agronomist',
    status: 'active',
    registrationDate: '2024-01-10T10:15:00Z',
    lastLogin: '2024-01-29T09:45:00Z',
    location: 'Iowa, USA',
    phone: '+1-555-0456',
    totalAnalyses: 156,
    totalReviews: 89,
    accuracyRate: 94.2,
    subscriptionPlan: 'Professional'
  },
  {
    id: '3',
    name: 'System Administrator',
    email: 'admin@cropguard.com',
    password_hash: '$2b$10$8K9wE2lTZ1Y0pG3r5S7vJ.TlGtFsKNHQ6mR8cP4qE9wF2dA5bI3xG',
    role: 'admin',
    status: 'active',
    registrationDate: '2024-01-01T00:00:00Z',
    lastLogin: '2024-01-29T16:20:00Z',
    location: 'California, USA',
    phone: '+1-555-0789',
    totalAnalyses: 0,
    accuracyRate: 100,
    subscriptionPlan: 'Enterprise'
  },
  {
    id: '4',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@farm.com',
    password_hash: '$2b$10$8K9wE2lTZ1Y0pG3r5S7vJ.TlGtFsKNHQ6mR8cP4qE9wF2dA5bI3xG',
    role: 'farmer',
    status: 'active',
    registrationDate: '2024-01-20T12:30:00Z',
    lastLogin: '2024-01-28T11:15:00Z',
    location: 'Texas, USA',
    phone: '+1-555-0234',
    totalAnalyses: 18,
    accuracyRate: 87.3,
    subscriptionPlan: 'Basic'
  },
  {
    id: '5',
    name: 'John Smith',
    email: 'john.smith@agri.com',
    password_hash: '$2b$10$8K9wE2lTZ1Y0pG3r5S7vJ.TlGtFsKNHQ6mR8cP4qE9wF2dA5bI3xG',
    role: 'farmer',
    status: 'inactive',
    registrationDate: '2024-01-05T16:45:00Z',
    lastLogin: '2024-01-15T08:30:00Z',
    location: 'Nebraska, USA',
    phone: '+1-555-0567',
    totalAnalyses: 7,
    accuracyRate: 82.1,
    subscriptionPlan: 'Basic'
  }
]

// Audit log storage
let auditLogs = [
  {
    id: '1',
    timestamp: '2024-01-29T16:20:00Z',
    userId: '3',
    userName: 'System Administrator',
    action: 'User Login',
    details: 'Admin user logged in to system',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    severity: 'low'
  },
  {
    id: '2',
    timestamp: '2024-01-29T15:45:00Z',
    userId: '2',
    userName: 'Dr. Sarah Johnson',
    action: 'Plant Analysis Review',
    details: 'Reviewed and approved 3 plant disease analyses',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    severity: 'low'
  },
  {
    id: '3',
    timestamp: '2024-01-29T14:30:00Z',
    userId: '1',
    userName: 'Demo Farmer',
    action: 'Plant Analysis Submission',
    details: 'Submitted new plant image for disease analysis',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    severity: 'low'
  },
  {
    id: '4',
    timestamp: '2024-01-29T13:15:00Z',
    userId: '3',
    userName: 'System Administrator',
    action: 'User Status Change',
    details: 'Changed user john.smith@agri.com status to inactive',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    severity: 'medium'
  },
  {
    id: '5',
    timestamp: '2024-01-29T12:00:00Z',
    userId: '3',
    userName: 'System Administrator',
    action: 'AI Configuration Update',
    details: 'Updated OpenAI API settings and model parameters',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    severity: 'high'
  }
]

class UserService {
  // Get all users with optional filtering
  static async getAllUsers(filters = {}) {
    let filteredUsers = [...users]
    
    if (filters.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filters.role)
    }
    
    if (filters.status) {
      filteredUsers = filteredUsers.filter(user => user.status === filters.status)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
    }
    
    return filteredUsers.map(user => ({
      ...user,
      password_hash: undefined // Don't return password hash
    }))
  }
  
  // Get user by ID
  static async getUserById(id) {
    const user = users.find(u => u.id === id)
    if (!user) return null
    
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  // Create new user
  static async createUser(userData) {
    const { name, email, password, role = 'farmer', status = 'active', location, phone } = userData
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
      throw new Error('Email already exists')
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password || 'defaultPassword123', 10)
    
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password_hash,
      role,
      status,
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      location: location || '',
      phone: phone || '',
      totalAnalyses: 0,
      totalReviews: role === 'agronomist' ? 0 : undefined,
      accuracyRate: 0,
      subscriptionPlan: role === 'admin' ? 'Enterprise' : 'Basic'
    }
    
    users.push(newUser)
    
    // Log the creation
    await this.logAuditEvent('admin', 'User Creation', `Created new user: ${email}`, 'medium')
    
    const { password_hash: _, ...userWithoutPassword } = newUser
    return userWithoutPassword
  }
  
  // Update user
  static async updateUser(id, updates) {
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }
    
    const user = users[userIndex]
    const oldData = { ...user }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'email', 'role', 'status', 'location', 'phone']
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field]
      }
    })
    
    // Hash new password if provided
    if (updates.password) {
      user.password_hash = await bcrypt.hash(updates.password, 10)
    }
    
    users[userIndex] = user
    
    // Log the update
    await this.logAuditEvent('admin', 'User Update', `Updated user: ${user.email}`, 'medium')
    
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  // Delete user
  static async deleteUser(id) {
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }
    
    const user = users[userIndex]
    users.splice(userIndex, 1)
    
    // Log the deletion
    await this.logAuditEvent('admin', 'User Deletion', `Deleted user: ${user.email}`, 'high')
    
    return { message: 'User deleted successfully' }
  }
  
  // Activate user
  static async activateUser(id) {
    return this.updateUserStatus(id, 'active')
  }
  
  // Suspend user
  static async suspendUser(id) {
    return this.updateUserStatus(id, 'suspended')
  }
  
  // Deactivate user
  static async deactivateUser(id) {
    return this.updateUserStatus(id, 'inactive')
  }
  
  // Update user status
  static async updateUserStatus(id, status) {
    const user = users.find(u => u.id === id)
    if (!user) {
      throw new Error('User not found')
    }
    
    const oldStatus = user.status
    user.status = status
    
    // Log the status change
    await this.logAuditEvent('admin', 'User Status Change', 
      `Changed user ${user.email} status from ${oldStatus} to ${status}`, 'medium')
    
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  // Bulk operations
  static async bulkUpdateUsers(userIds, updates) {
    const results = []
    
    for (const id of userIds) {
      try {
        const user = await this.updateUser(id, updates)
        results.push({ id, success: true, user })
      } catch (error) {
        results.push({ id, success: false, error: error.message })
      }
    }
    
    return results
  }
  
  static async bulkDeleteUsers(userIds) {
    const results = []
    
    for (const id of userIds) {
      try {
        await this.deleteUser(id)
        results.push({ id, success: true })
      } catch (error) {
        results.push({ id, success: false, error: error.message })
      }
    }
    
    return results
  }
  
  // User statistics
  static async getUserStats() {
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.status === 'active').length
    const usersByRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    const totalAnalyses = users.reduce((sum, user) => sum + (user.totalAnalyses || 0), 0)
    const avgAccuracy = users.reduce((sum, user) => sum + (user.accuracyRate || 0), 0) / users.length
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers: users.filter(u => u.status === 'inactive').length,
      suspendedUsers: users.filter(u => u.status === 'suspended').length,
      usersByRole,
      totalAnalyses,
      averageAccuracy: Math.round(avgAccuracy * 10) / 10,
      recentRegistrations: users.filter(u => 
        new Date(u.registrationDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }
  }
  
  // Audit logging
  static async logAuditEvent(userId, action, details, severity = 'low', additionalData = {}) {
    const newLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: typeof userId === 'string' ? userId : userId.toString(),
      userName: userId === 'admin' ? 'System Administrator' : 
                users.find(u => u.id === userId)?.name || 'Unknown User',
      action,
      details,
      ipAddress: additionalData.ip || '127.0.0.1',
      userAgent: additionalData.userAgent || 'CropGuard Admin Dashboard',
      severity
    }
    
    auditLogs.unshift(newLog) // Add to beginning for newest first
    
    // Keep only last 1000 logs
    if (auditLogs.length > 1000) {
      auditLogs = auditLogs.slice(0, 1000)
    }
    
    return newLog
  }
  
  // Get audit logs
  static async getAuditLogs(limit = 50, offset = 0) {
    return auditLogs.slice(offset, offset + limit)
  }
  
  // Export data
  static async exportUsers(format = 'json') {
    const exportData = users.map(user => {
      const { password_hash, ...userData } = user
      return userData
    })
    
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(user => 
          headers.map(header => `"${user[header] || ''}"`).join(',')
        )
      ].join('\n')
      
      return {
        data: csvContent,
        filename: `cropguard_users_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      }
    }
    
    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `cropguard_users_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
  }
  
  static async exportAuditLogs(format = 'json') {
    if (format === 'csv') {
      const headers = Object.keys(auditLogs[0] || {})
      const csvContent = [
        headers.join(','),
        ...auditLogs.map(log => 
          headers.map(header => `"${log[header] || ''}"`).join(',')
        )
      ].join('\n')
      
      return {
        data: csvContent,
        filename: `cropguard_audit_logs_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      }
    }
    
    return {
      data: JSON.stringify(auditLogs, null, 2),
      filename: `cropguard_audit_logs_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
  }
}

module.exports = UserService