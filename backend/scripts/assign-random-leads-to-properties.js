const pool = require('../config/db');
require('dotenv').config();

async function assignRandomLeadsToProperties() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Finding properties with NULL owner_id...');
    
    // Get all properties with NULL owner_id
    const propertiesResult = await client.query(`
      SELECT id, reference_number, owner_name 
      FROM properties 
      WHERE owner_id IS NULL
      ORDER BY id
    `);
    
    const properties = propertiesResult.rows;
    console.log(`📋 Found ${properties.length} properties without owner_id`);
    
    if (properties.length === 0) {
      console.log('✅ No properties need updating. All properties already have owner_id assigned.');
      await client.query('COMMIT');
      return;
    }
    
    // Get all available leads
    console.log('🔍 Fetching all available leads...');
    const leadsResult = await client.query(`
      SELECT id, customer_name, phone_number 
      FROM leads 
      ORDER BY id
    `);
    
    const leads = leadsResult.rows;
    console.log(`👥 Found ${leads.length} available leads`);
    
    if (leads.length === 0) {
      console.log('❌ No leads found in database. Cannot assign owners.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Assign random leads to properties
    let updatedCount = 0;
    
    for (const property of properties) {
      // Randomly select a lead
      const randomIndex = Math.floor(Math.random() * leads.length);
      const selectedLead = leads[randomIndex];
      
      console.log(`🔄 Assigning property ${property.reference_number} (ID: ${property.id}) to lead "${selectedLead.customer_name}" (ID: ${selectedLead.id})`);
      
      // Update property with lead information
      await client.query(`
        UPDATE properties 
        SET 
          owner_id = $1,
          owner_name = $2,
          phone_number = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        selectedLead.id,
        selectedLead.customer_name,
        selectedLead.phone_number || '',
        property.id
      ]);
      
      updatedCount++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully assigned random leads to ${updatedCount} properties!`);
    console.log(`📊 Summary:`);
    console.log(`   - Properties updated: ${updatedCount}`);
    console.log(`   - Total leads available: ${leads.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error assigning leads to properties:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
assignRandomLeadsToProperties()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

