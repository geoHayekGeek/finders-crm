// Script to reset and regenerate all property reference numbers
// This will update all existing properties to use the new reference number format
const pool = require('./config/db');

async function resetAllReferenceNumbers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting reference number reset process...');
    
    // Get all properties with their category codes and property types
    const propertiesResult = await client.query(`
      SELECT 
        p.id,
        p.property_type,
        c.code as category_code,
        p.reference_number as old_reference_number,
        EXTRACT(YEAR FROM p.created_at)::INTEGER as created_year
      FROM properties p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at ASC, p.id ASC
    `);
    
    const properties = propertiesResult.rows;
    console.log(`📊 Found ${properties.length} properties to update`);
    
    if (properties.length === 0) {
      console.log('✅ No properties to update');
      await client.query('COMMIT');
      return;
    }
    
    // Group properties by type + category + year to maintain sequential IDs
    const groupedProperties = {};
    
    for (const property of properties) {
      const year = property.created_year.toString().slice(-2);
      const key = `${property.property_type}_${property.category_code}_${year}`;
      
      if (!groupedProperties[key]) {
        groupedProperties[key] = [];
      }
      groupedProperties[key].push(property);
    }
    
    console.log(`📦 Grouped into ${Object.keys(groupedProperties).length} type/category/year combinations`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each group
    for (const [key, group] of Object.entries(groupedProperties)) {
      const [propertyType, categoryCode, year] = key.split('_');
      
      console.log(`\n🔄 Processing group: ${key} (${group.length} properties)`);
      
      // Generate new reference numbers sequentially for this group
      for (let i = 0; i < group.length; i++) {
        const property = group[i];
        const sequentialId = String(i + 1).padStart(3, '0');
        
        // Determine type code
        const typeCode = propertyType === 'sale' ? 'S' : 'R';
        
        // Construct new reference number: F + Type + Category + Year + ID
        const newReferenceNumber = `F${typeCode}${categoryCode}${year}${sequentialId}`;
        
        try {
          // Check if this reference number already exists (shouldn't, but safety check)
          const checkResult = await client.query(
            'SELECT id FROM properties WHERE reference_number = $1 AND id != $2',
            [newReferenceNumber, property.id]
          );
          
          if (checkResult.rows.length > 0) {
            console.error(`❌ Reference number ${newReferenceNumber} already exists for property ${property.id}`);
            errorCount++;
            continue;
          }
          
          // Update the property with new reference number
          await client.query(
            'UPDATE properties SET reference_number = $1 WHERE id = $2',
            [newReferenceNumber, property.id]
          );
          
          console.log(`  ✅ Updated property ${property.id}: ${property.old_reference_number} → ${newReferenceNumber}`);
          updatedCount++;
          
        } catch (error) {
          console.error(`❌ Error updating property ${property.id}:`, error.message);
          errorCount++;
        }
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully updated: ${updatedCount} properties`);
    console.log(`  ❌ Errors: ${errorCount} properties`);
    console.log(`  📦 Total processed: ${properties.length} properties`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All reference numbers have been successfully reset!');
    } else {
      console.log('\n⚠️ Some properties could not be updated. Please review the errors above.');
    }
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT reference_number) as unique_count
      FROM properties
    `);
    
    const { total, unique_count } = verifyResult.rows[0];
    
    if (parseInt(total) === parseInt(unique_count)) {
      console.log('✅ All reference numbers are unique!');
    } else {
      console.log(`⚠️ Warning: Found ${parseInt(total) - parseInt(unique_count)} duplicate reference numbers`);
    }
    
    // Show sample of new reference numbers
    const sampleResult = await client.query(`
      SELECT reference_number, property_type, 
             (SELECT code FROM categories WHERE id = properties.category_id) as category_code
      FROM properties
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample of new reference numbers:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.reference_number} (${row.property_type}, ${row.category_code})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error resetting reference numbers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the reset
if (require.main === module) {
  console.log('⚠️  WARNING: This will reset ALL property reference numbers!');
  console.log('⚠️  Make sure you have a database backup before proceeding.\n');
  
  // Allow running with --confirm flag
  if (process.argv.includes('--confirm')) {
    resetAllReferenceNumbers().catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
  } else {
    console.log('💡 To run this script, use: node reset-all-reference-numbers.js --confirm');
    console.log('💡 This will update all existing property reference numbers to the new format.');
  }
}

module.exports = { resetAllReferenceNumbers };

