// test-properties-db.js
const pool = require('./config/db');
const Property = require('./models/propertyModel');
const Category = require('./models/categoryModel');
const Status = require('./models/statusModel');

async function testPropertiesDatabase() {
  try {
    console.log('🧪 Testing Properties Database...\n');

    // Test 1: Check if tables exist
    console.log('1️⃣ Testing table existence...');
    const tables = ['categories', 'statuses', 'properties'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✅ ${table} table exists with ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`   ❌ ${table} table test failed: ${error.message}`);
      }
    }

    // Test 2: Test categories
    console.log('\n2️⃣ Testing categories...');
    try {
      const categories = await Category.getAllCategories();
      console.log(`   ✅ Found ${categories.length} categories`);
      console.log(`   📋 Sample categories: ${categories.slice(0, 3).map(c => c.name).join(', ')}`);
    } catch (error) {
      console.log(`   ❌ Categories test failed: ${error.message}`);
    }

    // Test 3: Test statuses
    console.log('\n3️⃣ Testing statuses...');
    try {
      const statuses = await Status.getAllStatuses();
      console.log(`   ✅ Found ${statuses.length} statuses`);
      console.log(`   📋 Sample statuses: ${statuses.slice(0, 3).map(s => s.name).join(', ')}`);
    } catch (error) {
      console.log(`   ❌ Statuses test failed: ${error.message}`);
    }

    // Test 4: Test reference number generation
    console.log('\n4️⃣ Testing reference number generation...');
    try {
      const refNumberResult = await pool.query("SELECT generate_reference_number('A', 'F')");
      const refNumber = refNumberResult.rows[0].generate_reference_number;
      console.log(`   ✅ Generated reference number: ${refNumber}`);
      
      // Verify format: F + Category + Year + 3 digits
      const pattern = /^FA\d{4}\d{3}$/;
      if (pattern.test(refNumber)) {
        console.log(`   ✅ Reference number format is correct`);
      } else {
        console.log(`   ⚠️ Reference number format may be incorrect: ${refNumber}`);
      }
    } catch (error) {
      console.log(`   ❌ Reference number generation failed: ${error.message}`);
    }

    // Test 5: Test properties with details function
    console.log('\n5️⃣ Testing properties with details function...');
    try {
      const detailsResult = await pool.query('SELECT * FROM get_properties_with_details() LIMIT 1');
      console.log(`   ✅ Properties with details function works: ${detailsResult.rows.length} rows returned`);
      
      if (detailsResult.rows.length > 0) {
        const sample = detailsResult.rows[0];
        console.log(`   📋 Sample property: ${sample.reference_number} - ${sample.location}`);
      }
    } catch (error) {
      console.log(`   ❌ Properties with details function failed: ${error.message}`);
    }

    // Test 6: Test creating a sample property
    console.log('\n6️⃣ Testing property creation...');
    try {
      // Get first category and status
      const category = await Category.getAllCategories();
      const status = await Status.getAllStatuses();
      
      if (category.length > 0 && status.length > 0) {
        const sampleProperty = {
          status_id: status[0].id,
          location: "Test Location, Beirut",
          category_id: category[0].id,
          building_name: "Test Building",
          owner_name: "Test Owner",
          phone_number: "+961 70 000 000",
          surface: 100.0,
          details: { floor: 1, balcony: true, parking: 1, cave: false },
          interior_details: "Test interior",
          built_year: 2020,
          view_type: "open view",
          concierge: false,
          agent_id: null,
          price: 150000,
          notes: "Test property for testing purposes",
          referral_source: "Test referral",
          referral_dates: ["2025-01-20"]
        };

        const newProperty = await Property.createProperty(sampleProperty);
        console.log(`   ✅ Created test property: ${newProperty.reference_number}`);
        
        // Clean up - delete the test property
        await Property.deleteProperty(newProperty.id);
        console.log(`   🧹 Cleaned up test property`);
      } else {
        console.log(`   ⚠️ Cannot test property creation: missing categories or statuses`);
      }
    } catch (error) {
      console.log(`   ❌ Property creation test failed: ${error.message}`);
    }

    // Test 7: Test analytics functions
    console.log('\n7️⃣ Testing analytics functions...');
    try {
      const stats = await Property.getPropertyStats();
      console.log(`   ✅ Property stats: ${JSON.stringify(stats)}`);
      
      const locationStats = await Property.getPropertiesByLocation();
      console.log(`   ✅ Location stats: ${locationStats.length} locations`);
      
      const categoryStats = await Property.getPropertiesByCategory();
      console.log(`   ✅ Category stats: ${categoryStats.length} categories`);
      
      const statusStats = await Property.getPropertiesByStatus();
      console.log(`   ✅ Status stats: ${statusStats.length} statuses`);
    } catch (error) {
      console.log(`   ❌ Analytics test failed: ${error.message}`);
    }

    console.log('\n🎯 Properties Database Test Completed!');
    
  } catch (error) {
    console.error('💥 Error during testing:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testPropertiesDatabase();
