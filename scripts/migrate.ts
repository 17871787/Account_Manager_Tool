import { pool } from '../src/models/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully');
    
    // Insert sample data (optional)
    if (process.argv.includes('--seed')) {
      await seedDatabase();
    }
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');
  
  try {
    // Insert sample client
    await pool.query(`
      INSERT INTO clients (name, harvest_id, is_active)
      VALUES 
        ('Arla', 'harvest_arla_001', true),
        ('Sainsburys', 'harvest_sains_001', true),
        ('ADM', 'harvest_adm_001', true)
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Insert sample tasks
    await pool.query(`
      INSERT INTO tasks (name, default_billable, category, is_active)
      VALUES 
        ('Account Management', true, 'billable', true),
        ('Project Management', true, 'billable', true),
        ('Consultancy', true, 'billable', true),
        ('Data Ingestion', false, 'exclusion', true),
        ('Vet Visit', false, 'exclusion', true),
        ('Internal Meeting', false, 'non-billable', true),
        ('Business Development', false, 'non-billable', true)
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('✅ Sample data inserted');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run migration
runMigration();