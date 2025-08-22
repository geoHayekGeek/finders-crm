// test-db-connection.js
const pool = require('./config/db');

async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing Database Connection...\n');
    
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`   ✅ Database connected! Current time: ${result.rows[0].current_time}`);
    
    // Test 2: Categories count
    console.log('\n2️⃣ Testing categories table...');
    const categoriesCount = await pool.query('SELECT COUNT(*) FROM categories WHERE is_active = true');
    console.log(`   ✅ Active categories: ${categoriesCount.rows[0].count}`);
    
    // Test 3: Statuses count
    console.log('\n3️⃣ Testing statuses table...');
    const statusesCount = await pool.query('SELECT COUNT(*) FROM statuses WHERE is_active = true');
    console.log(`   ✅ Active statuses: ${statusesCount.rows[0].count}`);
    
    // Test 4: Properties count
    console.log('\n4️⃣ Testing properties table...');
    const propertiesCount = await pool.query('SELECT COUNT(*) FROM properties');
    console.log(`   ✅ Total properties: ${propertiesCount.rows[0].count}`);
    
    // Test 5: Reference number generation
    console.log('\n5️⃣ Testing reference number function...');
    const refNumber = await pool.query("SELECT generate_reference_number('A', 'F')");
    console.log(`   ✅ Generated reference: ${refNumber.rows[0].generate_reference_number}`);
    
    // Test 6: Properties with details function
    console.log('\n6️⃣ Testing properties with details function...');
    const propertiesDetails = await pool.query('SELECT * FROM get_properties_with_details() LIMIT 3');
    console.log(`   ✅ Retrieved ${propertiesDetails.rows.length} properties with full details`);
    
    if (propertiesDetails.rows.length > 0) {
      const sample = propertiesDetails.rows[0];
      console.log(`   📋 Sample: ${sample.reference_number} - ${sample.category_name} in ${sample.location}`);
    }
    
    console.log('\n🎯 Database Connection Test Completed Successfully!');
    
  } catch (error) {
    console.error('💥 Database connection test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
