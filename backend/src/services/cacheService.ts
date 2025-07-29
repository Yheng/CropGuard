// CropGuard Redis Caching Service
// Optimized for rural connectivity and API rate limiting

import Redis from 'ioredis'
import { promisify } from 'util'
import crypto from 'crypto'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  compression?: boolean
  tags?: string[]
  priority?: 'low' | 'normal' | 'high'
  invalidatePattern?: boolean
}

export interface CacheStats {
  hitRate: number
  missRate: number
  totalRequests: number
  memoryUsage: number
  keyCount: number
  evictionCount: number
}

export interface CacheConfig {
  host: string
  port: number
  password?: string
  db: number
  keyPrefix: string
  maxMemory: string
  evictionPolicy: string
  cluster?: {
    enabled: boolean
    nodes: Array<{ host: string; port: number }>
  }
  sentinel?: {
    enabled: boolean
    sentinels: Array<{ host: string; port: number }>
    name: string
  }
}

class RedisCacheService {
  private redis: Redis
  private config: CacheConfig
  private isConnected: boolean = false
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  }

  // Cache key prefixes for different data types
  private readonly KEY_PREFIXES = {
    ANALYSIS: 'analysis',
    USER: 'user',
    CROP_DATA: 'crop',
    WEATHER: 'weather',
    AI_RESPONSE: 'ai',
    SESSION: 'session',
    API_RATE_LIMIT: 'rate_limit',
    FARMER_DATA: 'farmer',
    AGRONOMIST_DATA: 'agronomist',
    SYSTEM_CONFIG: 'config'
  }

  // Default TTL values (in seconds)
  private readonly DEFAULT_TTL = {
    ANALYSIS: 3600, // 1 hour
    USER_PROFILE: 1800, // 30 minutes
    CROP_DATA: 86400, // 24 hours
    WEATHER: 1800, // 30 minutes
    AI_RESPONSE: 7200, // 2 hours
    SESSION: 1800, // 30 minutes
    API_RATE_LIMIT: 3600, // 1 hour
    SYSTEM_CONFIG: 86400, // 24 hours
    TEMPORARY: 300 // 5 minutes
  }

  constructor(config: CacheConfig) {
    this.config = config
    this.initializeRedis()
  }

  private initializeRedis(): void {
    try {
      if (this.config.cluster?.enabled) {
        // Redis Cluster configuration
        this.redis = new Redis.Cluster(this.config.cluster.nodes, {
          redisOptions: {
            password: this.config.password,
            keyPrefix: this.config.keyPrefix
          },
          enableOfflineQueue: false,
          retryDelayOnFailover: 1000,
          maxRetriesPerRequest: 3
        })
      } else if (this.config.sentinel?.enabled) {
        // Redis Sentinel configuration
        this.redis = new Redis({
          sentinels: this.config.sentinel.sentinels,
          name: this.config.sentinel.name,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          retryDelayOnFailover: 1000,
          maxRetriesPerRequest: 3
        })
      } else {
        // Single Redis instance
        this.redis = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          retryDelayOnClusterDown: 300,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
          commandTimeout: 3000
        })
      }

      this.setupEventListeners()
      this.setupMemoryOptimization()
    } catch (error) {
      console.error('[CacheService] Redis initialization failed:', error)
      throw error
    }
  }

  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      console.log('[CacheService] Connected to Redis')
      this.isConnected = true
    })

    this.redis.on('error', (error) => {
      console.error('[CacheService] Redis error:', error)
      this.isConnected = false
    })

    this.redis.on('close', () => {
      console.log('[CacheService] Redis connection closed')
      this.isConnected = false
    })

    this.redis.on('reconnecting', () => {
      console.log('[CacheService] Reconnecting to Redis...')
    })

    // Monitor memory usage
    setInterval(async () => {
      try {
        await this.monitorMemoryUsage()
      } catch (error) {
        console.error('[CacheService] Memory monitoring failed:', error)
      }
    }, 60000) // Check every minute
  }

  private setupMemoryOptimization(): void {
    // Configure Redis for optimal memory usage
    this.redis.config('SET', 'maxmemory', this.config.maxMemory)
    this.redis.config('SET', 'maxmemory-policy', this.config.evictionPolicy)
    
    // Enable key expiration notifications
    this.redis.config('SET', 'notify-keyspace-events', 'Ex')
  }

  // Core cache operations
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      console.warn('[CacheService] Redis not connected, skipping cache get')
      return null
    }

    try {
      const value = await this.redis.get(key)
      
      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      
      // Handle compressed data
      const parsed = JSON.parse(value)
      if (parsed._compressed) {
        return this.decompress(parsed.data)
      }
      
      return parsed
    } catch (error) {
      console.error(`[CacheService] Get failed for key ${key}:`, error)
      this.stats.misses++
      return null
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('[CacheService] Redis not connected, skipping cache set')
      return false
    }

    try {
      let serialized = JSON.stringify(value)
      
      // Compress large values
      if (options.compression || serialized.length > 1024) {
        const compressed = await this.compress(serialized)
        serialized = JSON.stringify({
          _compressed: true,
          data: compressed
        })
      }

      const ttl = options.ttl || this.DEFAULT_TTL.TEMPORARY
      const result = await this.redis.setex(key, ttl, serialized)
      
      // Add tags for pattern-based invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addCacheTags(key, options.tags, ttl)
      }

      this.stats.sets++
      return result === 'OK'
    } catch (error) {
      console.error(`[CacheService] Set failed for key ${key}:`, error)
      return false
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (!this.isConnected) {
      return 0
    }

    try {
      const keys = Array.isArray(key) ? key : [key]
      const result = await this.redis.del(...keys)
      this.stats.deletes += result
      return result
    } catch (error) {
      console.error(`[CacheService] Delete failed for key(s) ${key}:`, error)
      return 0
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`[CacheService] Exists check failed for key ${key}:`, error)
      return false
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      const result = await this.redis.expire(key, ttl)
      return result === 1
    } catch (error) {
      console.error(`[CacheService] Expire failed for key ${key}:`, error)
      return false
    }
  }

  // Pattern-based operations
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0
    }

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length === 0) {
        return 0
      }

      return await this.del(keys)
    } catch (error) {
      console.error(`[CacheService] Pattern invalidation failed for ${pattern}:`, error)
      return 0
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected || tags.length === 0) {
      return 0
    }

    try {
      let totalDeleted = 0
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`
        const keys = await this.redis.smembers(tagKey)
        
        if (keys.length > 0) {
          const deleted = await this.del(keys)
          totalDeleted += deleted
          
          // Clean up the tag set
          await this.redis.del(tagKey)
        }
      }
      
      return totalDeleted
    } catch (error) {
      console.error(`[CacheService] Tag invalidation failed for tags ${tags}:`, error)
      return 0
    }
  }

  // Specialized cache methods for CropGuard
  async cacheAnalysisResult(
    analysisId: string, 
    result: any, 
    farmerId: string
  ): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.ANALYSIS, analysisId)
    return await this.set(key, result, {
      ttl: this.DEFAULT_TTL.ANALYSIS,
      tags: [`farmer:${farmerId}`, 'analysis'],
      compression: true
    })
  }

  async getCachedAnalysis(analysisId: string): Promise<any | null> {
    const key = this.buildKey(this.KEY_PREFIXES.ANALYSIS, analysisId)
    return await this.get(key)
  }

  async cacheUserProfile(userId: string, profile: any): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.USER, userId)
    return await this.set(key, profile, {
      ttl: this.DEFAULT_TTL.USER_PROFILE,
      tags: [`user:${userId}`]
    })
  }

  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = this.buildKey(this.KEY_PREFIXES.USER, userId)
    return await this.get(key)
  }

  async cacheWeatherData(location: string, data: any): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.WEATHER, location)
    return await this.set(key, data, {
      ttl: this.DEFAULT_TTL.WEATHER,
      tags: ['weather']
    })
  }

  async getCachedWeatherData(location: string): Promise<any | null> {
    const key = this.buildKey(this.KEY_PREFIXES.WEATHER, location)
    return await this.get(key)
  }

  async cacheAIResponse(
    inputHash: string, 
    response: any, 
    modelVersion: string
  ): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.AI_RESPONSE, `${inputHash}:${modelVersion}`)
    return await this.set(key, response, {
      ttl: this.DEFAULT_TTL.AI_RESPONSE,
      tags: ['ai_response', `model:${modelVersion}`],
      compression: true
    })
  }

  async getCachedAIResponse(
    inputHash: string, 
    modelVersion: string
  ): Promise<any | null> {
    const key = this.buildKey(this.KEY_PREFIXES.AI_RESPONSE, `${inputHash}:${modelVersion}`)
    return await this.get(key)
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.isConnected) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
    }

    const key = this.buildKey(this.KEY_PREFIXES.API_RATE_LIMIT, identifier)
    
    try {
      const multi = this.redis.multi()
      multi.incr(key)
      multi.expire(key, windowSeconds)
      
      const results = await multi.exec()
      const count = results?.[0]?.[1] as number
      
      const allowed = count <= limit
      const remaining = Math.max(0, limit - count)
      const resetTime = Date.now() + windowSeconds * 1000
      
      return { allowed, remaining, resetTime }
    } catch (error) {
      console.error(`[CacheService] Rate limit check failed for ${identifier}:`, error)
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
    }
  }

  // Session management
  async setSession(sessionId: string, data: any): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.SESSION, sessionId)
    return await this.set(key, data, {
      ttl: this.DEFAULT_TTL.SESSION
    })
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = this.buildKey(this.KEY_PREFIXES.SESSION, sessionId)
    return await this.get(key)
  }

  async extendSession(sessionId: string, ttl?: number): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.SESSION, sessionId)
    return await this.expire(key, ttl || this.DEFAULT_TTL.SESSION)
  }

  async destroySession(sessionId: string): Promise<boolean> {
    const key = this.buildKey(this.KEY_PREFIXES.SESSION, sessionId)
    return (await this.del(key)) > 0
  }

  // Bulk operations for sync optimization
  async mget(keys: string[]): Promise<(any | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return new Array(keys.length).fill(null)
    }

    try {
      const values = await this.redis.mget(...keys)
      return values.map(value => {
        if (value === null) {
          this.stats.misses++
          return null
        }
        
        this.stats.hits++
        const parsed = JSON.parse(value)
        
        if (parsed._compressed) {
          return this.decompress(parsed.data)
        }
        
        return parsed
      })
    } catch (error) {
      console.error('[CacheService] Bulk get failed:', error)
      this.stats.misses += keys.length
      return new Array(keys.length).fill(null)
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.isConnected || keyValuePairs.length === 0) {
      return false
    }

    try {
      const pipeline = this.redis.pipeline()
      
      for (const { key, value, ttl } of keyValuePairs) {
        let serialized = JSON.stringify(value)
        
        if (serialized.length > 1024) {
          const compressed = await this.compress(serialized)
          serialized = JSON.stringify({
            _compressed: true,
            data: compressed
          })
        }
        
        pipeline.setex(key, ttl || this.DEFAULT_TTL.TEMPORARY, serialized)
      }
      
      const results = await pipeline.exec()
      const success = results?.every(result => result[1] === 'OK') || false
      
      if (success) {
        this.stats.sets += keyValuePairs.length
      }
      
      return success
    } catch (error) {
      console.error('[CacheService] Bulk set failed:', error)
      return false
    }
  }

  // Utility methods
  private buildKey(...parts: string[]): string {
    return parts.join(':')
  }

  private async addCacheTags(key: string, tags: string[], ttl: number): Promise<void> {
    const pipeline = this.redis.pipeline()
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`
      pipeline.sadd(tagKey, key)
      pipeline.expire(tagKey, ttl)
    }
    
    await pipeline.exec()
  }

  private async compress(data: string): Promise<string> {
    // Simple base64 compression - in production, use actual compression library
    return Buffer.from(data).toString('base64')
  }

  private decompress(data: string): any {
    try {
      const decompressed = Buffer.from(data, 'base64').toString('utf-8')
      return JSON.parse(decompressed)
    } catch (error) {
      console.error('[CacheService] Decompression failed:', error)
      return null
    }
  }

  private async monitorMemoryUsage(): Promise<void> {
    try {
      const info = await this.redis.info('memory')
      const lines = info.split('\r\n')
      
      for (const line of lines) {
        if (line.startsWith('used_memory:')) {
          const usedMemory = parseInt(line.split(':')[1])
          const maxMemory = parseInt(this.config.maxMemory.replace(/\D/g, ''))
          
          if (usedMemory > maxMemory * 0.9) {
            console.warn('[CacheService] Memory usage is high, consider increasing cache size or TTL values')
          }
          break
        }
      }
    } catch (error) {
      console.error('[CacheService] Memory monitoring failed:', error)
    }
  }

  // Statistics and monitoring
  async getStats(): Promise<CacheStats> {
    if (!this.isConnected) {
      return {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0,
        memoryUsage: 0,
        keyCount: 0,
        evictionCount: 0
      }
    }

    try {
      const info = await this.redis.info()
      const lines = info.split('\r\n')
      
      let memoryUsage = 0
      let keyCount = 0
      let evictionCount = 0
      
      for (const line of lines) {
        if (line.startsWith('used_memory:')) {
          memoryUsage = parseInt(line.split(':')[1])
        } else if (line.startsWith('db0:keys=')) {
          keyCount = parseInt(line.split('=')[1].split(',')[0])
        } else if (line.startsWith('evicted_keys:')) {
          evictionCount = parseInt(line.split(':')[1])
        }
      }
      
      const totalRequests = this.stats.hits + this.stats.misses
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
      const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0
      
      return {
        hitRate,
        missRate,
        totalRequests,
        memoryUsage,
        keyCount,
        evictionCount
      }
    } catch (error) {
      console.error('[CacheService] Stats retrieval failed:', error)
      return {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0,
        memoryUsage: 0,
        keyCount: 0,
        evictionCount: 0
      }
    }
  }

  async flushAll(): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      await this.redis.flushdb()
      this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
      return true
    } catch (error) {
      console.error('[CacheService] Flush failed:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      console.log('[CacheService] Disconnected from Redis')
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('[CacheService] Health check failed:', error)
      return false
    }
  }
}

// Factory function for creating cache service
export function createCacheService(config: CacheConfig): RedisCacheService {
  return new RedisCacheService(config)
}

// Default configuration for different environments
export const cacheConfigs = {
  development: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'cropguard:dev:',
    maxMemory: '256mb',
    evictionPolicy: 'allkeys-lru'
  },
  production: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'cropguard:prod:',
    maxMemory: '2gb',
    evictionPolicy: 'allkeys-lru',
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: JSON.parse(process.env.REDIS_CLUSTER_NODES || '[]')
    }
  }
}

export type { CacheOptions, CacheStats, CacheConfig }
export default RedisCacheService