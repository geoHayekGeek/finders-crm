// setup-properties-db.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function setupPropertiesDatabase() {
  try {
    console.log('🚀 Setting up properties database...');
    
    // Read and execute SQL files in order
    const sqlFiles = [
      'categories.sql',
      'statuses.sql',
      'properties.sql'
    ];
    
    for (const sqlFile of sqlFiles) {
      console.log(`📝 Processing ${sqlFile}...`);
      const sqlPath = path.join(__dirname, 'database', sqlFile);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute the entire SQL file as one statement
      try {
        await pool.query(sqlContent);
        console.log(`✅ Successfully executed ${sqlFile}`);
      } catch (error) {
        if (error.code === '42P07') { // duplicate_object
          console.log(`⚠️ ${sqlFile} already exists (skipping)`);
        } else if (error.code === '42710') { // duplicate_column
          console.log(`⚠️ Columns already exist in ${sqlFile} (skipping)`);
        } else {
          console.error(`❌ Error executing ${sqlFile}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Properties database setup completed!');
    
    // Test the tables
    console.log('\n📊 Testing database tables...');
    
    // Test categories table
    try {
      const categoriesResult = await pool.query('SELECT COUNT(*) FROM categories');
      console.log(`✅ Categories table has ${categoriesResult.rows[0].count} rows`);
    } catch (error) {
      console.log('❌ Categories table test failed:', error.message);
    }
    
    // Test statuses table
    try {
      const statusesResult = await pool.query('SELECT COUNT(*) FROM statuses');
      console.log(`✅ Statuses table has ${statusesResult.rows[0].count} rows`);
    } catch (error) {
      console.log('❌ Statuses table test failed:', error.message);
    }
    
    // Test properties table
    try {
      const propertiesResult = await pool.query('SELECT COUNT(*) FROM properties');
      console.log(`✅ Properties table has ${propertiesResult.rows[0].count} rows`);
    } catch (error) {
      console.log('❌ Properties table test failed:', error.message);
    }
    
    // Test the reference number function
    try {
      const refNumberResult = await pool.query("SELECT generate_reference_number('A', 'F')");
      console.log(`✅ Reference number function works: ${refNumberResult.rows[0].generate_reference_number}`);
    } catch (error) {
      console.log('❌ Reference number function test failed:', error.message);
    }
    
    // Test the properties with details function
    try {
      const detailsResult = await pool.query('SELECT * FROM get_properties_with_details() LIMIT 1');
      console.log(`✅ Properties with details function works: ${detailsResult.rows.length} rows returned`);
    } catch (error) {
      console.log('❌ Properties with details function test failed:', error.message);
    }
    
    console.log('\n🎯 Database setup verification completed!');
    
  } catch (error) {
    console.error('💥 Error during properties database setup:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupPropertiesDatabase();
