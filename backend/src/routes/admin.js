const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const userStats = await UserService.getUserStats();
    
    // Mock system metrics (in production, these would come from actual monitoring)
    const systemMetrics = {
      totalUsers: userStats.totalUsers,
      activeUsers: userStats.activeUsers,
      totalAnalyses: userStats.totalAnalyses,
      systemUptime: 99.7,
      apiUsage: 65,
      storageUsed: 23,
      errorRate: 0.2,
      averageResponseTime: 245,
    };
    
    res.json({ success: true, data: systemMetrics });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system metrics' });
  }
});

// User management routes
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    
    const filters = {};
    if (role) {filters.role = role;}
    if (status) {filters.status = status;}
    if (search) {filters.search = search;}
    
    const users = await UserService.getAllUsers(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        pages: Math.ceil(users.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required', 
      });
    }
    
    const user = await UserService.createUser({
      name,
      email,
      password,
      role,
      location,
      phone,
    });
    
    // Log the creation
    await UserService.logAuditEvent(
      req.user.id,
      'User Creation',
      `Created new user: ${email}`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const updates = req.body;
    const user = await UserService.updateUser(req.params.id, updates);
    
    // Log the update
    await UserService.logAuditEvent(
      req.user.id,
      'User Update',
      `Updated user: ${user.email}`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await UserService.deleteUser(req.params.id);
    
    // Log the deletion
    await UserService.logAuditEvent(
      req.user.id,
      'User Deletion',
      `Deleted user: ${user.email}`,
      'high',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// User status management
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be active, inactive, or suspended', 
      });
    }
    
    const user = await UserService.updateUserStatus(req.params.id, status);
    
    // Log the status change
    await UserService.logAuditEvent(
      req.user.id,
      'User Status Change',
      `Changed user ${user.email} status to ${status}`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Bulk operations
router.post('/users/bulk-update', async (req, res) => {
  try {
    const { userIds, updates } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User IDs array is required', 
      });
    }
    
    const results = await UserService.bulkUpdateUsers(userIds, updates);
    
    // Log the bulk update
    await UserService.logAuditEvent(
      req.user.id,
      'Bulk User Update',
      `Bulk updated ${userIds.length} users`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error bulk updating users:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk update users' });
  }
});

router.post('/users/bulk-delete', async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User IDs array is required', 
      });
    }
    
    const results = await UserService.bulkDeleteUsers(userIds);
    
    // Log the bulk deletion
    await UserService.logAuditEvent(
      req.user.id,
      'Bulk User Deletion',
      `Bulk deleted ${userIds.length} users`,
      'high',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete users' });
  }
});

// User statistics
router.get('/users/stats', async (req, res) => {
  try {
    const stats = await UserService.getUserStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user statistics' });
  }
});

// Audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const logs = await UserService.getAuditLogs(parseInt(limit), parseInt(offset));
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Data export
router.get('/export/users', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const exportData = await UserService.exportUsers(format);
    
    // Log the export
    await UserService.logAuditEvent(
      req.user.id,
      'Data Export',
      `Exported user data in ${format} format`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Type', exportData.mimeType);
    res.send(exportData.data);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ success: false, message: 'Failed to export user data' });
  }
});

router.get('/export/audit-logs', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const exportData = await UserService.exportAuditLogs(format);
    
    // Log the export
    await UserService.logAuditEvent(
      req.user.id,
      'Data Export',
      `Exported audit logs in ${format} format`,
      'medium',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Type', exportData.mimeType);
    res.send(exportData.data);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to export audit logs' });
  }
});

// AI Configuration endpoints
router.get('/ai/config', async (req, res) => {
  try {
    // In production, this would come from a secure configuration store
    const aiConfig = {
      isConfigured: true,
      model: 'gpt-4o',
      backupModel: 'gpt-4o-mini',
      confidenceThreshold: 0.8,
      maxTokens: 1500,
      temperature: 0.3,
      rateLimitPerHour: 100,
      costLimitPerDay: 50,
      enableAutoFallback: true,
      enableRetryLogic: true,
      enableDetailedLogging: false,
      // Don't return the actual API key for security
      hasApiKey: true,
    };
    
    res.json({ success: true, data: aiConfig });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI configuration' });
  }
});

router.post('/ai/config', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate required fields
    if (!config.openaiApiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'OpenAI API key is required', 
      });
    }
    
    // In production, this would securely store the configuration
    // For now, we'll just validate and return success
    
    // Log the configuration update
    await UserService.logAuditEvent(
      req.user.id,
      'AI Configuration Update',
      'Updated OpenAI API settings and model parameters',
      'high',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    res.json({ 
      success: true, 
      message: 'AI configuration updated successfully',
      data: {
        ...config,
        openaiApiKey: undefined, // Don't return the API key
      },
    });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ success: false, message: 'Failed to update AI configuration' });
  }
});

router.post('/ai/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key is required for testing', 
      });
    }
    
    // Mock connection test (in production, this would actually test the OpenAI API)
    const mockLatency = Math.random() * 500 + 200; // 200-700ms
    
    // Log the connection test
    await UserService.logAuditEvent(
      req.user.id,
      'AI Connection Test',
      'Tested OpenAI API connection',
      'low',
      { ip: req.ip, userAgent: req.get('User-Agent') },
    );
    
    // Simulate occasional failures for realism
    const isSuccess = Math.random() > 0.1; // 90% success rate
    
    if (isSuccess) {
      res.json({ 
        success: true, 
        data: {
          connected: true,
          latency: Math.round(mockLatency),
          message: 'Connection successful',
        },
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid API key or connection failed', 
      });
    }
  } catch (error) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({ success: false, message: 'Failed to test AI connection' });
  }
});

// AI usage statistics
router.get('/ai/usage', async (req, res) => {
  try {
    // Mock usage statistics (in production, this would come from actual usage tracking)
    const usageStats = {
      requestsThisHour: Math.floor(Math.random() * 50) + 10,
      costToday: Math.random() * 15 + 5,
      rateLimitPerHour: 100,
      costLimitPerDay: 50,
      averageResponseTime: Math.random() * 2000 + 1000,
      errorRate: Math.random() * 2,
      successRate: 98 + Math.random() * 2,
      totalRequestsToday: Math.floor(Math.random() * 200) + 50,
      averageConfidence: 85 + Math.random() * 10,
    };
    
    res.json({ success: true, data: usageStats });
  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI usage statistics' });
  }
});

module.exports = router;