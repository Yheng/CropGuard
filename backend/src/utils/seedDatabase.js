const bcrypt = require('bcryptjs');
const { runQuery, getQuery, allQuery } = require('../config/database');

// Default accounts for testing
const DEFAULT_ACCOUNTS = [
  {
    email: 'admin@cropguard.com',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    phone: '+1-555-0100',
    location: 'San Francisco, CA',
    email_verified: 1,
    is_active: 1,
  },
  {
    email: 'agronomist@cropguard.com',
    password: 'agro123',
    name: 'Dr. Sarah Mitchell',
    role: 'agronomist',
    phone: '+1-555-0200',
    location: 'Davis, CA',
    email_verified: 1,
    is_active: 1,
  },
  {
    email: 'farmer@cropguard.com',
    password: 'farmer123',
    name: 'John Peterson',
    role: 'farmer',
    phone: '+1-555-0300',
    location: 'Bakersfield, CA',
    email_verified: 1,
    is_active: 1,
  },
  // Demo users for testing
  {
    email: 'maria.garcia@farmland.com',
    password: 'demo123',
    name: 'Maria Garcia',
    role: 'farmer',
    phone: '+1-555-0301',
    location: 'Fresno, CA',
    email_verified: 1,
    is_active: 1,
  },
  {
    email: 'david.kim@organicfarms.com',
    password: 'demo123',
    name: 'David Kim',
    role: 'farmer',
    phone: '+1-555-0302',
    location: 'Salinas, CA',
    email_verified: 1,
    is_active: 1,
  },
  {
    email: 'lisa.brown@soilexperts.com',
    password: 'demo123',
    name: 'Dr. Lisa Brown',
    role: 'agronomist',
    phone: '+1-555-0201',
    location: 'Modesto, CA',
    email_verified: 1,
    is_active: 1,
  },
];

// Demo analysis data
const DEMO_ANALYSES = [
  {
    crop_type: 'tomato',
    condition: 'disease',
    title: 'Early Blight Detection',
    description: 'Detected early blight symptoms on tomato plants. Dark lesions with concentric rings visible on lower leaves.',
    confidence: 0.92,
    severity: 'medium',
    recommendations: JSON.stringify([
      'Apply copper-based fungicide',
      'Remove affected leaves',
      'Improve air circulation',
      'Reduce overhead watering',
    ]),
    ai_model_version: 'v1.2.3',
    processing_time: 2.45,
    metadata: JSON.stringify({
      image_size: '1024x768',
      detected_objects: ['leaf_spots', 'discoloration'],
      weather_conditions: 'humid',
    }),
  },
  {
    crop_type: 'corn',
    condition: 'pest',
    title: 'Aphid Infestation',
    description: 'Large colony of aphids detected on corn stalks. Visible honeydew and ant activity.',
    confidence: 0.88,
    severity: 'high',
    recommendations: JSON.stringify([
      'Release beneficial insects',
      'Apply insecticidal soap',
      'Remove heavily infested plants',
      'Monitor weekly',
    ]),
    ai_model_version: 'v1.2.3',
    processing_time: 1.87,
    metadata: JSON.stringify({
      image_size: '1920x1080',
      detected_objects: ['aphids', 'honeydew'],
      pest_count: 'high_density',
    }),
  },
  {
    crop_type: 'lettuce',
    condition: 'healthy',
    title: 'Healthy Lettuce Growth',
    description: 'Plants showing excellent growth with vibrant green color and no visible issues.',
    confidence: 0.95,
    severity: 'low',
    recommendations: JSON.stringify([
      'Continue current care routine',
      'Monitor for seasonal pests',
      'Maintain consistent watering',
    ]),
    ai_model_version: 'v1.2.3',
    processing_time: 1.23,
    metadata: JSON.stringify({
      image_size: '1024x1024',
      detected_objects: ['healthy_leaves'],
      growth_stage: 'mature',
    }),
  },
];

// Demo analytics data
const DEMO_ANALYTICS = [
  {
    crop_type: 'tomato',
    health_score: 75,
    condition: 'warning',
    analysis_count: 5,
  },
  {
    crop_type: 'corn',
    health_score: 65,
    condition: 'critical',
    analysis_count: 3,
  },
  {
    crop_type: 'lettuce',
    health_score: 92,
    condition: 'healthy',
    analysis_count: 2,
  },
];

async function seedDefaultAccounts() {
  console.log('🌱 Seeding default accounts...');
  
  for (const account of DEFAULT_ACCOUNTS) {
    try {
      // Check if user already exists
      const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [account.email]);
      
      if (!existingUser) {
        // Hash password
        const passwordHash = await bcrypt.hash(account.password, 12);
        
        // Create user
        const _result = await runQuery(`
          INSERT INTO users (
            email, password_hash, name, role, phone, location, 
            email_verified, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          account.email,
          passwordHash,
          account.name,
          account.role,
          account.phone,
          account.location,
          account.email_verified,
          account.is_active,
        ]);
        
        console.log(`✅ Created ${account.role}: ${account.email} (password: ${account.password})`);
      } else {
        console.log(`⏭️  User already exists: ${account.email}`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${account.email}:`, error.message);
    }
  }
}

async function seedDemoAnalyses() {
  console.log('🔬 Seeding demo analyses...');
  
  // Get farmer users for demo data
  const farmers = await allQuery('SELECT id FROM users WHERE role = ? LIMIT 3', ['farmer']);
  
  if (farmers.length === 0) {
    console.log('⚠️  No farmers found, skipping analysis seeding');
    return;
  }
  
  for (let i = 0; i < DEMO_ANALYSES.length && i < farmers.length; i++) {
    const analysis = DEMO_ANALYSES[i];
    const farmer = farmers[i];
    
    try {
      await runQuery(`
        INSERT INTO analyses (
          user_id, image_path, crop_type, condition, title, description,
          confidence, severity, recommendations, ai_model_version,
          processing_time, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        farmer.id,
        `/uploads/demo_${analysis.crop_type}_${Date.now()}.jpg`,
        analysis.crop_type,
        analysis.condition,
        analysis.title,
        analysis.description,
        analysis.confidence,
        analysis.severity,
        analysis.recommendations,
        analysis.ai_model_version,
        analysis.processing_time,
        analysis.metadata,
      ]);
      
      console.log(`✅ Created analysis: ${analysis.title} for user ${farmer.id}`);
    } catch (error) {
      console.error(`❌ Error creating analysis ${analysis.title}:`, error.message);
    }
  }
}

async function seedDemoAnalytics() {
  console.log('📊 Seeding demo analytics...');
  
  // Get farmer users
  const farmers = await allQuery('SELECT id FROM users WHERE role = ? LIMIT 3', ['farmer']);
  
  if (farmers.length === 0) {
    console.log('⚠️  No farmers found, skipping analytics seeding');
    return;
  }
  
  // Create analytics data for the past 30 days
  const today = new Date();
  
  for (let i = 0; i < farmers.length && i < DEMO_ANALYTICS.length; i++) {
    const farmer = farmers[i];
    const baseData = DEMO_ANALYTICS[i];
    
    // Create data for past 30 days
    for (let day = 29; day >= 0; day--) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      
      try {
        // Add some randomness to make data more realistic
        const variance = (Math.random() - 0.5) * 20; // ±10 points
        const healthScore = Math.max(0, Math.min(100, baseData.health_score + variance));
        
        await runQuery(`
          INSERT INTO analytics_data (
            user_id, date, crop_type, health_score, condition, analysis_count, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          farmer.id,
          date.toISOString().split('T')[0], // YYYY-MM-DD format
          baseData.crop_type,
          Math.round(healthScore),
          healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
          Math.floor(Math.random() * 5) + 1, // 1-5 analyses per day
        ]);
      } catch (error) {
        // Skip if date already exists (unique constraint)
        if (!error.message.includes('UNIQUE constraint failed')) {
          console.error(`❌ Error creating analytics for ${date}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Created analytics data for farmer ${farmer.id} (${baseData.crop_type})`);
  }
}

async function seedDemoTreatmentPlans() {
  console.log('💊 Seeding demo treatment plans...');
  
  // Get analyses and treatments
  const analyses = await allQuery('SELECT id, user_id, condition, severity FROM analyses LIMIT 5');
  const treatments = await allQuery('SELECT id FROM treatments LIMIT 10');
  
  if (analyses.length === 0 || treatments.length === 0) {
    console.log('⚠️  No analyses or treatments found, skipping treatment plans');
    return;
  }
  
  for (const analysis of analyses) {
    try {
      // Select random treatments
      const primaryTreatments = treatments.slice(0, 2).map(t => t.id);
      const alternativeTreatments = treatments.slice(2, 4).map(t => t.id);
      const preventiveMeasures = treatments.slice(4, 6).map(t => t.id);
      
      await runQuery(`
        INSERT INTO treatment_plans (
          analysis_id, user_id, condition, severity, urgency,
          primary_treatments, alternative_treatments, preventive_measures,
          monitoring_schedule, estimated_recovery_time, total_cost,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        analysis.id,
        analysis.user_id,
        analysis.condition,
        analysis.severity,
        analysis.severity === 'high' ? 'immediate' : analysis.severity === 'medium' ? 'within_week' : 'monitor',
        JSON.stringify(primaryTreatments),
        JSON.stringify(alternativeTreatments),
        JSON.stringify(preventiveMeasures),
        JSON.stringify({
          frequency: 'daily',
          duration: '2_weeks',
          checkpoints: ['3_days', '1_week', '2_weeks'],
        }),
        analysis.severity === 'high' ? '2-3 weeks' : analysis.severity === 'medium' ? '1-2 weeks' : '1 week',
        analysis.severity === 'high' ? '$50-100' : analysis.severity === 'medium' ? '$25-50' : '$10-25',
      ]);
      
      console.log(`✅ Created treatment plan for analysis ${analysis.id}`);
    } catch (error) {
      console.error(`❌ Error creating treatment plan for analysis ${analysis.id}:`, error.message);
    }
  }
}

async function fullSeed() {
  try {
    console.log('🚀 Starting comprehensive database seeding...');
    
    await seedDefaultAccounts();
    await seedDemoAnalyses();
    await seedDemoAnalytics();
    await seedDemoTreatmentPlans();
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('👑 Admin: admin@cropguard.com / admin123');
    console.log('🔬 Agronomist: agronomist@cropguard.com / agro123');
    console.log('🌾 Farmer: farmer@cropguard.com / farmer123');
    console.log('\n🎭 Demo Accounts:');
    console.log('🌾 Maria Garcia: maria.garcia@farmland.com / demo123');
    console.log('🌾 David Kim: david.kim@organicfarms.com / demo123');
    console.log('🔬 Dr. Lisa Brown: lisa.brown@soilexperts.com / demo123');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

async function clearDemoData() {
  try {
    console.log('🧹 Clearing demo data...');
    
    // Clear in correct order due to foreign key constraints
    await runQuery('DELETE FROM treatment_plans');
    await runQuery('DELETE FROM analytics_data');
    await runQuery('DELETE FROM analyses');
    await runQuery('DELETE FROM users WHERE role != ?', ['admin']);
    
    console.log('✅ Demo data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    throw error;
  }
}

// Quick seed function for just accounts
async function seedAccountsOnly() {
  try {
    console.log('🚀 Seeding accounts only...');
    await seedDefaultAccounts();
    console.log('✅ Accounts seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding accounts:', error);
    throw error;
  }
}

module.exports = {
  fullSeed,
  seedDefaultAccounts,
  seedDemoAnalyses,
  seedDemoAnalytics,
  seedDemoTreatmentPlans,
  seedAccountsOnly,
  clearDemoData,
  DEFAULT_ACCOUNTS,
};