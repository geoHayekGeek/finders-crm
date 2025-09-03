const pool = require('./config/db');

async function testReferralsDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Test 1: Check if referrals table exists
    console.log('\n📋 Test 1: Checking if referrals table exists...');
    try {
      const tableResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'referrals'
      `);
      
      if (tableResult.rows.length > 0) {
        console.log('✅ Referrals table exists');
      } else {
        console.log('❌ Referrals table does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking referrals table:', error.message);
    }
    
    // Test 2: Check referrals table structure
    console.log('\n📋 Test 2: Checking referrals table structure...');
    try {
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referrals'
        ORDER BY ordinal_position
      `);
      
      if (structureResult.rows.length > 0) {
        console.log('✅ Referrals table structure:');
        structureResult.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      } else {
        console.log('❌ Could not retrieve table structure');
      }
    } catch (error) {
      console.log('❌ Error checking table structure:', error.message);
    }
    
    // Test 3: Check if referrals_count column exists in properties table
    console.log('\n📋 Test 3: Checking if referrals_count column exists in properties table...');
    try {
      const columnResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'referrals_count'
      `);
      
      if (columnResult.rows.length > 0) {
        console.log('✅ referrals_count column exists in properties table');
        console.log(`  - Type: ${columnResult.rows[0].data_type}`);
        console.log(`  - Default: ${columnResult.rows[0].column_default}`);
      } else {
        console.log('❌ referrals_count column does not exist in properties table');
      }
    } catch (error) {
      console.log('❌ Error checking referrals_count column:', error.message);
    }
    
    // Test 4: Check if properties_with_referrals view exists
    console.log('\n📋 Test 4: Checking if properties_with_referrals view exists...');
    try {
      const viewResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'properties_with_referrals'
      `);
      
      if (viewResult.rows.length > 0) {
        console.log('✅ properties_with_referrals view exists');
      } else {
        console.log('❌ properties_with_referrals view does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking view:', error.message);
    }
    
    // Test 5: Try to insert a test referral (if table exists)
    console.log('\n📋 Test 5: Testing referral insertion...');
    try {
      // First check if we have any properties to reference
      const propertiesResult = await pool.query('SELECT id FROM properties LIMIT 1');
      
      if (propertiesResult.rows.length > 0) {
        const propertyId = propertiesResult.rows[0].id;
        
        const insertResult = await pool.query(`
          INSERT INTO referrals (property_id, name, type, date) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [propertyId, 'Test Referral', 'custom', new Date()]);
        
        console.log('✅ Test referral inserted successfully with ID:', insertResult.rows[0].id);
        
        // Clean up test data
        await pool.query('DELETE FROM referrals WHERE id = $1', [insertResult.rows[0].id]);
        console.log('✅ Test referral cleaned up');
      } else {
        console.log('⚠️  No properties found to test referral insertion');
      }
    } catch (error) {
      console.log('❌ Error testing referral insertion:', error.message);
    }
    
    console.log('\n🎉 Database testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing database:', error);
  } finally {
    await pool.end();
  }
}

testReferralsDatabase();
