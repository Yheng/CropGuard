# CropGuard Database Migration Plan: SQLite to PostgreSQL

## Overview
This document outlines the migration strategy from SQLite (development) to PostgreSQL (production) for the CropGuard application.

## Migration Strategy

### Phase 1: Preparation and Schema Analysis
- **Current State**: SQLite database with demo data and basic schema
- **Target State**: PostgreSQL database with optimized schema for production workloads
- **Timeline**: 2-3 days

#### 1.1 Schema Comparison and Optimization
```sql
-- Current SQLite Schema (simplified)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('farmer', 'agronomist', 'admin')) NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plant_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    disease_detected TEXT,
    confidence_score REAL,
    recommendations TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- PostgreSQL Optimized Schema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    status user_status_enum DEFAULT 'active',
    profile_data JSONB,
    location POINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_location ON users USING GIST(location);

CREATE TABLE plant_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    image_metadata JSONB,
    ai_analysis JSONB NOT NULL,
    disease_detected VARCHAR(255),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    severity analysis_severity_enum,
    recommendations TEXT[],
    treatment_plan JSONB,
    status analysis_status_enum DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    gps_location POINT,
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(disease_detected, '') || ' ' || 
            COALESCE(array_to_string(recommendations, ' '), '')
        )
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_analyses_user_id ON plant_analyses(user_id);
CREATE INDEX idx_analyses_created_at ON plant_analyses(created_at);
CREATE INDEX idx_analyses_status ON plant_analyses(status);
CREATE INDEX idx_analyses_disease ON plant_analyses(disease_detected);
CREATE INDEX idx_analyses_confidence ON plant_analyses(confidence_score);
CREATE INDEX idx_analyses_location ON plant_analyses USING GIST(gps_location);
CREATE INDEX idx_analyses_search ON plant_analyses USING GIN(search_vector);

-- Additional tables for production
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    metadata JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);
```

#### 1.2 Data Types and Enums
```sql
-- Create custom types for better data integrity
CREATE TYPE user_role_enum AS ENUM ('farmer', 'agronomist', 'admin');
CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE analysis_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
CREATE TYPE analysis_severity_enum AS ENUM ('low', 'medium', 'high');
```

### Phase 2: Environment Setup and Configuration

#### 2.1 Docker Compose Configuration
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cropguard_production
      POSTGRES_USER: cropguard_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    command: [
      "postgres",
      "-c", "shared_preload_libraries=pg_stat_statements",
      "-c", "pg_stat_statements.track=all",
      "-c", "max_connections=200",
      "-c", "shared_buffers=256MB",
      "-c", "effective_cache_size=1GB",
      "-c", "work_mem=4MB",
      "-c", "maintenance_work_mem=64MB"
    ]

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 2.2 Environment Variables
```bash
# .env.production
# Database Configuration
DATABASE_URL=postgresql://cropguard_user:${POSTGRES_PASSWORD}@localhost:5432/cropguard_production
REDIS_URL=redis://localhost:6379

# Connection Pool Settings
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Performance Settings
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000
```

### Phase 3: Migration Scripts and Tools

#### 3.1 Migration Script Structure
```
backend/migrations/
├── 001_initial_schema.sql
├── 002_create_enums.sql
├── 003_create_users_table.sql
├── 004_create_plant_analyses_table.sql
├── 005_create_audit_logs_table.sql
├── 006_create_system_metrics_table.sql
├── 007_create_indexes.sql
├── 008_insert_default_data.sql
└── 999_cleanup_and_optimize.sql
```

#### 3.2 Data Migration Tool
```javascript
// backend/scripts/migrate-data.js
const sqlite3 = require('sqlite3');
const { Client } = require('pg');
const fs = require('fs').promises;

class DatabaseMigrator {
  constructor(sqliteDb, pgConfig) {
    this.sqliteDb = sqliteDb;
    this.pgClient = new Client(pgConfig);
    this.migrationLog = [];
  }

  async migrate() {
    console.log('🚀 Starting database migration...');
    
    try {
      await this.pgClient.connect();
      
      // Step 1: Migrate users
      await this.migrateUsers();
      
      // Step 2: Migrate plant analyses
      await this.migratePlantAnalyses();
      
      // Step 3: Create admin user and initial data
      await this.createInitialData();
      
      // Step 4: Verify data integrity
      await this.verifyMigration();
      
      console.log('✅ Migration completed successfully!');
      await this.generateMigrationReport();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.rollback();
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  async migrateUsers() {
    console.log('📝 Migrating users...');
    
    const users = await this.querysqlite('SELECT * FROM users');
    let migratedCount = 0;
    
    for (const user of users) {
      try {
        await this.pgClient.query(`
          INSERT INTO users (name, email, password_hash, role, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          user.name,
          user.email,
          user.password_hash,
          user.role,
          user.status || 'active',
          user.created_at
        ]);
        migratedCount++;
      } catch (error) {
        this.migrationLog.push(`Failed to migrate user ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Migrated ${migratedCount}/${users.length} users`);
  }

  async migratePlantAnalyses() {
    console.log('🌱 Migrating plant analyses...');
    
    const analyses = await this.queryqlite('SELECT * FROM plant_analyses');
    let migratedCount = 0;
    
    for (const analysis of analyses) {
      try {
        // Get user UUID from email mapping
        const userResult = await this.pgClient.query(
          'SELECT id FROM users WHERE email = (SELECT email FROM users WHERE id = $1)',
          [analysis.user_id]
        );
        
        if (userResult.rows.length === 0) {
          this.migrationLog.push(`Skipping analysis ${analysis.id}: user not found`);
          continue;
        }
        
        await this.pgClient.query(`
          INSERT INTO plant_analyses (
            user_id, image_path, disease_detected, confidence_score,
            recommendations, status, created_at, reviewed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          userResult.rows[0].id,
          analysis.image_path,
          analysis.disease_detected,
          analysis.confidence_score,
          analysis.recommendations ? [analysis.recommendations] : [],
          analysis.status || 'completed',
          analysis.created_at,
          analysis.reviewed_at
        ]);
        migratedCount++;
      } catch (error) {
        this.migrationLog.push(`Failed to migrate analysis ${analysis.id}: ${error.message}`);
      }
    }
    
    console.log(`✅ Migrated ${migratedCount}/${analyses.length} plant analyses`);
  }

  async createInitialData() {
    console.log('🔧 Creating initial data...');
    
    // Create system admin user
    await this.pgClient.query(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, [
      'System Administrator',
      'admin@cropguard.com',
      '$2b$10$...',  // Pre-hashed password
      'admin',
      'active'
    ]);
    
    // Create initial system metrics
    const initialMetrics = [
      { name: 'total_users', value: 0 },
      { name: 'total_analyses', value: 0 },
      { name: 'system_uptime', value: 100 },
      { name: 'api_response_time', value: 0 }
    ];
    
    for (const metric of initialMetrics) {
      await this.pgClient.query(`
        INSERT INTO system_metrics (metric_name, metric_value)
        VALUES ($1, $2)
      `, [metric.name, metric.value]);
    }
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    const checks = [
      { name: 'Users count', query: 'SELECT COUNT(*) FROM users' },
      { name: 'Analyses count', query: 'SELECT COUNT(*) FROM plant_analyses' },
      { name: 'Admin user exists', query: "SELECT COUNT(*) FROM users WHERE role = 'admin'" }
    ];
    
    for (const check of checks) {
      const result = await this.pgClient.query(check.query);
      console.log(`✓ ${check.name}: ${result.rows[0].count}`);
    }
  }

  async rollback() {
    console.log('🔄 Rolling back migration...');
    // Implementation would depend on specific rollback strategy
  }

  queryqlite(sql) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = DatabaseMigrator;
```

### Phase 4: Application Code Updates

#### 4.1 Database Connection Configuration
```javascript
// backend/src/config/database.js
const { Pool } = require('pg');
const Redis = require('ioredis');

const isProduction = process.env.NODE_ENV === 'production';
const isTesting = process.env.NODE_ENV === 'test';

// PostgreSQL Configuration
const pgConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  min: parseInt(process.env.DB_POOL_MIN) || 5,
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  
  // Query settings
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 10000,
  
  // Performance optimization
  application_name: 'CropGuard API'
};

// Create connection pool
const pool = new Pool(pgConfig);

// Redis Configuration
const redisConfig = {
  url: process.env.REDIS_URL,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

const redis = new Redis(redisConfig);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('📦 PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

redis.on('connect', () => {
  console.log('🔴 Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

module.exports = {
  pool,
  redis,
  
  // Helper methods
  async query(text, params) {
    const start = Date.now();
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow query (${duration}ms):`, text);
      }
      
      return result;
    } finally {
      client.release();
    }
  },
  
  async transaction(callback) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
```

#### 4.2 Model Updates for PostgreSQL
```javascript
// backend/src/models/User.js
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { name, email, password, role = 'farmer' } = userData;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, status, created_at
    `, [name, email, passwordHash, role]);
    
    return result.rows[0];
  }
  
  static async findByEmail(email) {
    const result = await pool.query(`
      SELECT id, name, email, password_hash, role, status, created_at
      FROM users
      WHERE email = $1 AND status = 'active'
    `, [email]);
    
    return result.rows[0];
  }
  
  static async findById(id) {
    const result = await pool.query(`
      SELECT id, name, email, role, status, profile_data, created_at
      FROM users
      WHERE id = $1
    `, [id]);
    
    return result.rows[0];
  }
  
  static async updateProfile(id, profileData) {
    const result = await pool.query(`
      UPDATE users
      SET profile_data = COALESCE(profile_data, '{}'::jsonb) || $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, profile_data
    `, [id, JSON.stringify(profileData)]);
    
    return result.rows[0];
  }
  
  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE status = 'active') as active_users,
        COUNT(*) FILTER (WHERE role = 'farmer') as farmers,
        COUNT(*) FILTER (WHERE role = 'agronomist') as agronomists,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
      FROM users
    `);
    
    return result.rows[0];
  }
}

module.exports = User;
```

### Phase 5: Testing and Validation

#### 5.1 Migration Testing Checklist
- [ ] Schema migration completes without errors
- [ ] All data migrates correctly with referential integrity
- [ ] Performance benchmarks meet requirements
- [ ] Backup and restore procedures work
- [ ] Application functionality remains unchanged
- [ ] Connection pooling and caching work correctly

#### 5.2 Performance Testing
```javascript
// backend/tests/performance/database.test.js
const { pool } = require('../../src/config/database');

describe('Database Performance Tests', () => {
  test('Connection pool handles concurrent requests', async () => {
    const promises = Array(50).fill().map(() =>
      pool.query('SELECT 1 as test')
    );
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
  
  test('Complex queries execute within performance thresholds', async () => {
    const start = Date.now();
    
    await pool.query(`
      SELECT 
        u.name,
        COUNT(pa.id) as analysis_count,
        AVG(pa.confidence_score) as avg_confidence
      FROM users u
      LEFT JOIN plant_analyses pa ON u.id = pa.user_id
      WHERE u.status = 'active'
      GROUP BY u.id, u.name
      ORDER BY analysis_count DESC
      LIMIT 100
    `);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });
});
```

### Phase 6: Deployment and Monitoring

#### 6.1 Deployment Steps
1. **Pre-deployment**
   - Create PostgreSQL database
   - Run schema migrations
   - Test database connectivity

2. **Data Migration**
   - Export data from SQLite
   - Run migration scripts
   - Verify data integrity

3. **Application Deployment**
   - Update environment variables
   - Deploy application with PostgreSQL support
   - Monitor for errors

4. **Post-deployment**
   - Run performance tests
   - Set up monitoring and alerting
   - Create backup schedules

#### 6.2 Monitoring and Maintenance
```sql
-- Useful monitoring queries
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'plant_analyses';

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

## Migration Timeline

- **Week 1**: Schema design and migration script development
- **Week 2**: Testing and validation in staging environment
- **Week 3**: Production deployment and monitoring setup

## Rollback Plan

In case of migration failure:
1. Restore SQLite database from backup
2. Revert application to SQLite configuration
3. Analyze failure reasons and fix issues
4. Re-attempt migration after fixes

## Success Criteria

- ✅ All data migrated without loss
- ✅ Application performance meets requirements
- ✅ Database queries execute within 5 seconds
- ✅ System handles concurrent users efficiently
- ✅ Backup and monitoring systems operational