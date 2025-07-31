#!/usr/bin/env node

const { initializeDatabase, closeDatabase } = require('../config/database');
const { 
  fullSeed, 
  seedAccountsOnly, 
  clearDemoData, 
} = require('../utils/seedDatabase');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  try {
    console.log('🌱 CropGuard Database Seeder');
    console.log('================================');
    
    // Initialize database
    await initializeDatabase();
    
    switch (command) {
    case 'full':
      console.log('Running full seed (accounts + demo data)...\n');
      await fullSeed();
      break;
        
    case 'accounts':
      console.log('Running accounts-only seed...\n');
      await seedAccountsOnly();
      break;
        
    case 'clear':
      console.log('Clearing demo data...\n');
      await clearDemoData();
      break;
        
    case 'reset':
      console.log('Resetting database (clear + full seed)...\n');
      await clearDemoData();
      await fullSeed();
      break;
        
    default:
      console.log('❌ Unknown command:', command);
      console.log('Available commands:');
      console.log('  full     - Seed accounts and demo data (default)');
      console.log('  accounts - Seed accounts only');
      console.log('  clear    - Clear all demo data');
      console.log('  reset    - Clear and re-seed everything');
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
    
    console.log('\n🎉 Seeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Seeding interrupted');
  await closeDatabase();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
});

main();