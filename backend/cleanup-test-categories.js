// Script to remove test categories and update properties that use them
const pool = require('./config/db');

// Real categories from categories.sql
const REAL_CATEGORIES = [
  'A', 'C', 'D', 'F', 'L', 'O', 'CK', 'PC', 'P', 'PB', 'R', 'RT', 'S', 'SR', 'ST', 'V', 'W', 'IB', 'PH', 'B', 'H', 'IW'
];

async function cleanupTestCategories() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Finding all categories...');
    const allCategories = await client.query(`
      SELECT id, code, name, is_active
      FROM categories
      ORDER BY id
    `);
    
    console.log(`\n📋 Found ${allCategories.rows.length} categories:`);
    allCategories.rows.forEach(cat => {
      const isReal = REAL_CATEGORIES.includes(cat.code);
      console.log(`  ${cat.id}: ${cat.code} - ${cat.name} ${isReal ? '✅' : '❌ TEST'}`);
    });
    
    // Identify test categories (not in REAL_CATEGORIES list or name contains "Test")
    const testCategories = allCategories.rows.filter(cat => 
      !REAL_CATEGORIES.includes(cat.code) || 
      cat.name.toLowerCase().includes('test')
    );
    
    if (testCategories.length === 0) {
      console.log('\n✅ No test categories found!');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`\n🗑️  Found ${testCategories.length} test category(ies) to remove:`);
    testCategories.forEach(cat => {
      console.log(`  - ${cat.code} (${cat.name})`);
    });
    
    // Get default category (Shop 'S') as fallback
    const defaultCategory = await client.query(`
      SELECT id, code, name FROM categories WHERE code = 'S' LIMIT 1
    `);
    
    if (defaultCategory.rows.length === 0) {
      throw new Error('Default category "S" (Shop) not found! Cannot proceed.');
    }
    
    const defaultCategoryId = defaultCategory.rows[0].id;
    console.log(`\n📌 Using default category: ${defaultCategory.rows[0].code} (${defaultCategory.rows[0].name}) for properties with test categories`);
    
    // Find properties using test categories
    const testCategoryIds = testCategories.map(cat => cat.id);
    const propertiesWithTestCategories = await client.query(`
      SELECT p.id, p.reference_number, p.category_id, c.code as category_code, c.name as category_name
      FROM properties p
      JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ANY($1)
      ORDER BY p.id
    `, [testCategoryIds]);
    
    console.log(`\n🏠 Found ${propertiesWithTestCategories.rows.length} property(ies) using test categories:`);
    propertiesWithTestCategories.rows.forEach(prop => {
      console.log(`  - Property ${prop.id} (${prop.reference_number}): ${prop.category_code} (${prop.category_name})`);
    });
    
    // Update properties to use default category
    if (propertiesWithTestCategories.rows.length > 0) {
      console.log(`\n🔄 Updating ${propertiesWithTestCategories.rows.length} property(ies) to use default category...`);
      
      for (const prop of propertiesWithTestCategories.rows) {
        // Get property details to regenerate reference number
        const propertyDetails = await client.query(`
          SELECT property_type, category_id
          FROM properties
          WHERE id = $1
        `, [prop.id]);
        
        if (propertyDetails.rows.length > 0) {
          const propertyType = propertyDetails.rows[0].property_type;
          
          // Update category
          await client.query(`
            UPDATE properties
            SET category_id = $1
            WHERE id = $2
          `, [defaultCategoryId, prop.id]);
          
          // Generate new reference number
          const newRefResult = await client.query(`
            SELECT generate_reference_number($1, $2) as new_ref
          `, [defaultCategory.rows[0].code, propertyType]);
          
          const newRef = newRefResult.rows[0].new_ref;
          
          // Update reference number
          await client.query(`
            UPDATE properties
            SET reference_number = $1
            WHERE id = $2
          `, [newRef, prop.id]);
          
          console.log(`  ✅ Property ${prop.id}: ${prop.reference_number} → ${newRef}`);
        }
      }
    }
    
    // Delete test categories
    console.log(`\n🗑️  Deleting ${testCategories.length} test category(ies)...`);
    for (const testCat of testCategories) {
      // Double-check no properties are using this category
      const propsCheck = await client.query(`
        SELECT COUNT(*) as count FROM properties WHERE category_id = $1
      `, [testCat.id]);
      
      if (parseInt(propsCheck.rows[0].count) > 0) {
        console.log(`  ⚠️  Skipping ${testCat.code} - still has ${propsCheck.rows[0].count} property(ies)`);
        continue;
      }
      
      await client.query(`DELETE FROM categories WHERE id = $1`, [testCat.id]);
      console.log(`  ✅ Deleted ${testCat.code} (${testCat.name})`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup
cleanupTestCategories()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

