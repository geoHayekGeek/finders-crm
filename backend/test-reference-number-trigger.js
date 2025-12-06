// Test script to verify the reference number update trigger works
const pool = require('./config/db');

async function testTrigger() {
  try {
    console.log('🧪 Testing reference number update trigger...\n');
    
    // Get a test property
    const testProp = await pool.query(`
      SELECT p.id, p.reference_number, p.category_id, p.property_type, c.code as category_code
      FROM properties p
      JOIN categories c ON p.category_id = c.id
      LIMIT 1
    `);
    
    if (testProp.rows.length === 0) {
      console.log('❌ No properties found to test');
      return;
    }
    
    const prop = testProp.rows[0];
    console.log(`📋 Test property:`);
    console.log(`   ID: ${prop.id}`);
    console.log(`   Current reference: ${prop.reference_number}`);
    console.log(`   Current category: ${prop.category_code} (${prop.category_id})`);
    console.log(`   Current type: ${prop.property_type}`);
    
    // Get a different category to test with
    const otherCategory = await pool.query(`
      SELECT id, code FROM categories 
      WHERE id != $1 AND is_active = true
      LIMIT 1
    `, [prop.category_id]);
    
    if (otherCategory.rows.length === 0) {
      console.log('❌ No other category found to test with');
      return;
    }
    
    const newCategory = otherCategory.rows[0];
    console.log(`\n🔄 Updating property to use category: ${newCategory.code} (${newCategory.id})`);
    
    // Update the category
    const updateResult = await pool.query(`
      UPDATE properties
      SET category_id = $1
      WHERE id = $2
      RETURNING reference_number
    `, [newCategory.id, prop.id]);
    
    const newRef = updateResult.rows[0].reference_number;
    console.log(`\n✅ Property updated!`);
    console.log(`   Old reference: ${prop.reference_number}`);
    console.log(`   New reference: ${newRef}`);
    
    if (newRef !== prop.reference_number) {
      console.log(`\n✅ SUCCESS: Reference number was automatically updated by trigger!`);
      
      // Verify the new reference number format
      const expectedPrefix = `F${prop.property_type === 'sale' ? 'S' : 'R'}${newCategory.code}25`;
      if (newRef.startsWith(expectedPrefix)) {
        console.log(`✅ Reference number format is correct (starts with ${expectedPrefix})`);
      } else {
        console.log(`⚠️  Reference number format may be incorrect (expected prefix: ${expectedPrefix})`);
      }
    } else {
      console.log(`\n❌ FAILED: Reference number was NOT updated`);
    }
    
    // Restore original category
    console.log(`\n🔄 Restoring original category...`);
    await pool.query(`
      UPDATE properties
      SET category_id = $1
      WHERE id = $2
    `, [prop.category_id, prop.id]);
    
    console.log(`✅ Property restored to original category`);
    
  } catch (error) {
    console.error('❌ Error testing trigger:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testTrigger()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

