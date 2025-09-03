const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testDatabaseData() {
  try {
    console.log('🔍 Testing database data...');
    
    // Test statuses
    console.log('\n📊 Checking statuses:');
    const statusesResult = await pool.query('SELECT id, name FROM statuses ORDER BY id');
    console.log('Statuses found:', statusesResult.rows);
    
    // Test categories
    console.log('\n🏷️ Checking categories:');
    const categoriesResult = await pool.query('SELECT id, name, code FROM categories ORDER BY id');
    console.log('Categories found:', categoriesResult.rows);
    
    // Test properties table structure
    console.log('\n🏠 Checking properties table structure:');
    const propertiesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position
    `);
    console.log('Properties table columns:');
    propertiesStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabaseData();
