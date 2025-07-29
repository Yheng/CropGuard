const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/cropguard.db');

let db = null;

// Initialize SQLite database
async function initializeDatabase() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    // Create database connection
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        throw err;
      }
      console.log('📦 Connected to SQLite database');
    });

    // Enable foreign keys
    await runQuery('PRAGMA foreign_keys = ON');

    // Create tables
    await createTables();
    
    // Insert seed data if needed
    await seedDatabase();

    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get all rows
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Create database tables
async function createTables() {
  // Users table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('farmer', 'agronomist', 'admin')) DEFAULT 'farmer',
      avatar_url TEXT,
      phone TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1,
      email_verified BOOLEAN DEFAULT 0
    )
  `);

  // Analysis table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      image_url TEXT,
      crop_type TEXT,
      condition TEXT CHECK(condition IN ('healthy', 'pest', 'disease', 'unknown')),
      title TEXT NOT NULL,
      description TEXT,
      confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
      severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
      recommendations TEXT, -- JSON array
      ai_model_version TEXT,
      processing_time REAL,
      metadata TEXT, -- JSON object
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_by INTEGER,
      review_status TEXT CHECK(review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      review_notes TEXT,
      reviewed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Treatments table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('organic', 'biological', 'cultural', 'preventive')) NOT NULL,
      description TEXT NOT NULL,
      ingredients TEXT, -- JSON array
      instructions TEXT, -- JSON array
      effectiveness REAL CHECK(effectiveness >= 0 AND effectiveness <= 1),
      application_method TEXT,
      frequency TEXT,
      safety_period TEXT,
      cost TEXT CHECK(cost IN ('low', 'medium', 'high')),
      difficulty TEXT CHECK(difficulty IN ('easy', 'moderate', 'advanced')),
      seasonal_notes TEXT,
      warnings TEXT, -- JSON array
      target_conditions TEXT, -- JSON array of conditions this treats
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Treatment plans table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      condition TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
      urgency TEXT CHECK(urgency IN ('immediate', 'within_week', 'monitor')),
      primary_treatments TEXT, -- JSON array of treatment IDs
      alternative_treatments TEXT, -- JSON array of treatment IDs
      preventive_measures TEXT, -- JSON array of treatment IDs
      monitoring_schedule TEXT, -- JSON object
      estimated_recovery_time TEXT,
      total_cost TEXT,
      status TEXT CHECK(status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analyses (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // User treatments (saved treatments)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS user_treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      treatment_id INTEGER NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (treatment_id) REFERENCES treatments (id) ON DELETE CASCADE,
      UNIQUE(user_id, treatment_id)
    )
  `);

  // Analytics data table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS analytics_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      crop_type TEXT,
      health_score REAL CHECK(health_score >= 0 AND health_score <= 100),
      condition TEXT CHECK(condition IN ('healthy', 'warning', 'critical')),
      analysis_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // API usage tracking
  await runQuery(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time REAL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  console.log('📋 Database tables created successfully');
}

// Seed database with initial data
async function seedDatabase() {
  try {
    // Check if admin user exists
    const adminExists = await getQuery('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await runQuery(`
        INSERT INTO users (email, password_hash, name, role, email_verified, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin@cropguard.com', adminPassword, 'System Admin', 'admin', 1, 1]);
      
      console.log('👤 Admin user created: admin@cropguard.com / admin123');
    }

    // Check if treatments exist
    const treatmentCount = await getQuery('SELECT COUNT(*) as count FROM treatments');
    
    if (treatmentCount.count === 0) {
      await seedTreatments();
    }

    console.log('🌱 Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Seed treatment data
async function seedTreatments() {
  const treatments = [
    {
      name: 'Copper-Based Fungicide Spray',
      type: 'organic',
      description: 'Organic copper fungicide effective against early blight. Prevents spore germination and spread.',
      ingredients: JSON.stringify(['Copper sulfate', 'Lime', 'Water']),
      instructions: JSON.stringify([
        'Mix 2 tablespoons copper sulfate with 1 gallon water',
        'Add 1 tablespoon lime to reduce plant burn risk',
        'Spray thoroughly on affected and surrounding plants',
        'Apply in early morning or evening to avoid leaf burn',
        'Ensure complete coverage of leaf surfaces'
      ]),
      effectiveness: 0.85,
      application_method: 'Foliar spray',
      frequency: 'Every 7-10 days',
      safety_period: '1 day',
      cost: 'low',
      difficulty: 'easy',
      seasonal_notes: 'Most effective in warm, humid conditions',
      warnings: JSON.stringify(['Avoid application during full sun', 'Wear protective equipment']),
      target_conditions: JSON.stringify(['early_blight', 'fungal_diseases'])
    },
    {
      name: 'Insecticidal Soap Spray',
      type: 'organic',
      description: 'Kills aphids on contact by disrupting cell membranes. Safe for beneficial insects when dry.',
      ingredients: JSON.stringify(['Liquid castile soap', 'Water']),
      instructions: JSON.stringify([
        'Mix 2 tablespoons liquid soap per quart of water',
        'Spray directly on aphid colonies',
        'Target undersides of leaves where aphids congregate',
        'Apply every 3-4 days until infestation clears',
        'Rinse plants with water 2-3 hours after application'
      ]),
      effectiveness: 0.80,
      application_method: 'Direct spray',
      frequency: 'Every 3-4 days',
      safety_period: '0 days',
      cost: 'low',
      difficulty: 'easy',
      warnings: JSON.stringify([]),
      target_conditions: JSON.stringify(['aphids', 'soft_body_insects'])
    },
    {
      name: 'Beneficial Insect Release',
      type: 'biological',
      description: 'Introduce natural predators like ladybugs and lacewings to control aphid populations.',
      ingredients: JSON.stringify(['Ladybugs', 'Lacewing larvae', 'Parasitic wasps']),
      instructions: JSON.stringify([
        'Release beneficial insects in early evening',
        'Ensure adequate moisture and shelter',
        'Release near aphid colonies for immediate impact',
        'Provide alternative food sources (pollen plants)',
        'Avoid pesticides for 2 weeks before and after release'
      ]),
      effectiveness: 0.90,
      application_method: 'Biological release',
      frequency: 'One-time release, monitor results',
      safety_period: '0 days',
      cost: 'medium',
      difficulty: 'moderate',
      seasonal_notes: 'Most effective in temperatures 65-80°F',
      warnings: JSON.stringify([]),
      target_conditions: JSON.stringify(['aphids', 'pest_insects'])
    }
  ];

  for (const treatment of treatments) {
    await runQuery(`
      INSERT INTO treatments (
        name, type, description, ingredients, instructions, effectiveness,
        application_method, frequency, safety_period, cost, difficulty,
        seasonal_notes, warnings, target_conditions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      treatment.name, treatment.type, treatment.description, treatment.ingredients,
      treatment.instructions, treatment.effectiveness, treatment.application_method,
      treatment.frequency, treatment.safety_period, treatment.cost, treatment.difficulty,
      treatment.seasonal_notes, treatment.warnings, treatment.target_conditions
    ]);
  }

  console.log('💊 Treatment data seeded successfully');
}

// Get database instance
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📦 Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery
};