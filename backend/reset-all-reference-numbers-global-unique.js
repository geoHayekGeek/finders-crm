// Script to reset and regenerate all property reference numbers with globally unique IDs
// Format: F + PropertyType + Category + Year + GlobalUniqueID (no leading zeros)
// Example: FRIW251 (ID=1 is globally unique)
const pool = require('./config/db');

async function resetAllReferenceNumbers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting reference number reset with globally unique IDs...');
    
    // Get all properties with their category codes and property types, ordered by creation date
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
    
    let globalIdCounter = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each property sequentially to ensure global uniqueness
    for (const property of properties) {
      globalIdCounter++;
      
      const year = property.created_year.toString().slice(-2);
      const typeCode = property.property_type === 'sale' ? 'S' : 'R';
      
      // Construct new reference number: F + Type + Category + Year + GlobalUniqueID
      const newReferenceNumber = `F${typeCode}${property.category_code}${year}${globalIdCounter}`;
      
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
        
        if (updatedCount < 10 || updatedCount % 100 === 0) {
          console.log(`  ✅ Updated property ${property.id}: ${property.old_reference_number} → ${newReferenceNumber}`);
        }
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating property ${property.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully updated: ${updatedCount} properties`);
    console.log(`  ❌ Errors: ${errorCount} properties`);
    console.log(`  📦 Total processed: ${properties.length} properties`);
    console.log(`  🔢 Global ID range: 1 to ${globalIdCounter}`);
    
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
    
    // Verify global uniqueness of IDs
    console.log('\n🔍 Verifying global ID uniqueness...');
    try {
      const idCheckResult = await client.query(`
        SELECT 
          reference_number,
          CASE 
            WHEN reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
              AND LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) <= 6 THEN
              CAST(SUBSTRING(SUBSTRING(reference_number FROM '([0-9]+)$') FROM 3) AS INTEGER)
            ELSE NULL
          END as extracted_id
        FROM properties
        WHERE reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
          AND LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) <= 6
        ORDER BY extracted_id
      `);
      
      const ids = idCheckResult.rows.filter(r => r.extracted_id !== null).map(r => r.extracted_id);
      const uniqueIds = [...new Set(ids)];
      
      if (ids.length === uniqueIds.length) {
        console.log(`✅ All ${ids.length} IDs are globally unique!`);
      } else {
        console.log(`⚠️ Found ${ids.length - uniqueIds.length} duplicate IDs`);
      }
    } catch (error) {
      console.log('⚠️ Could not verify ID uniqueness:', error.message);
    }
    
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
    console.log('💡 To run this script, use: node reset-all-reference-numbers-global-unique.js --confirm');
    console.log('💡 This will update all existing property reference numbers to use globally unique IDs.');
  }
}

module.exports = { resetAllReferenceNumbers };

