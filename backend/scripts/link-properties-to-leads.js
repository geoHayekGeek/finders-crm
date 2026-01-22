// Script to link properties to leads by matching owner_name (name only)
// This fills in the owner_id field for properties that don't have it set.
// If multiple leads share the same name, one is chosen at random.

const pool = require('../config/db');

async function linkPropertiesToLeads() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Starting to link properties to leads...\n');
    
    // Get all properties without owner_id
    const propertiesResult = await client.query(`
      SELECT 
        id,
        reference_number,
        owner_name,
        phone_number,
        agent_id
      FROM properties
      WHERE owner_id IS NULL
        AND owner_name IS NOT NULL
        AND owner_name != ''
      ORDER BY created_at DESC
    `);
    
    const properties = propertiesResult.rows;
    console.log(`📊 Found ${properties.length} properties without owner_id\n`);
    
    if (properties.length === 0) {
      console.log('✅ All properties are already linked to leads!');
      return;
    }
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    let updatedCount = 0;
    const unmatched = [];
    
    // For each property, try to find a matching lead
    for (const property of properties) {
      console.log(`\n🔍 Processing property ${property.reference_number}:`);
      console.log(`   Owner: "${property.owner_name}"`);
      console.log(`   Phone: "${property.phone_number}"`);
      console.log(`   Agent ID: ${property.agent_id}`);
      
      // Try to find matching lead by NAME + PHONE (more accurate)
      // If phone matches, use that; otherwise fall back to name-only
      let leadResult;
      
      if (property.phone_number) {
        // First try: exact match by name AND phone
        leadResult = await client.query(`
          SELECT 
            id,
            customer_name,
            phone_number,
            agent_id
          FROM leads
          WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM($1))
            AND LOWER(TRIM(phone_number)) = LOWER(TRIM($2))
          ORDER BY 
            CASE WHEN agent_id = $3 THEN 0 ELSE 1 END,  -- Prefer same agent
            id  -- Deterministic ordering
          LIMIT 1
        `, [property.owner_name, property.phone_number, property.agent_id]);
      }
      
      // Second try: name-only match (if phone didn't match or wasn't provided)
      if (!leadResult || leadResult.rows.length === 0) {
        leadResult = await client.query(`
          SELECT 
            id,
            customer_name,
            phone_number,
            agent_id
          FROM leads
          WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM($1))
          ORDER BY 
            CASE WHEN agent_id = $2 THEN 0 ELSE 1 END,  -- Prefer same agent
            id  -- Deterministic ordering (instead of RANDOM for consistency)
          LIMIT 1
        `, [property.owner_name, property.agent_id]);
      }
      
      if (leadResult.rows.length > 0) {
        const lead = leadResult.rows[0];
        matchedCount++;
        
        console.log(`   ✅ MATCH FOUND: Lead #${lead.id} "${lead.customer_name}" (${lead.phone_number})`);
        
        if (lead.agent_id === property.agent_id) {
          console.log(`      (Same agent ✓)`);
        } else {
          console.log(`      ⚠️  Different agent: Property agent=${property.agent_id}, Lead agent=${lead.agent_id}`);
        }
        
        // Update the property with the lead's owner_id
        await client.query(`
          UPDATE properties
          SET owner_id = $1
          WHERE id = $2
        `, [lead.id, property.id]);
        
        updatedCount++;
        console.log(`   ✅ Updated property ${property.reference_number} with owner_id=${lead.id}`);
        
      } else {
        unmatchedCount++;
        console.log(`   ❌ NO MATCH: No lead found with matching NAME`);
        
        unmatched.push({
          property_id: property.id,
          reference_number: property.reference_number,
          owner_name: property.owner_name,
          phone_number: property.phone_number,
          agent_id: property.agent_id
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total properties processed: ${properties.length}`);
    console.log(`✅ Matched and updated: ${updatedCount}`);
    console.log(`❌ Unmatched: ${unmatchedCount}`);
    console.log('='.repeat(80));
    
    if (unmatched.length > 0) {
      console.log('\n⚠️  UNMATCHED PROPERTIES:');
      console.log('These properties could not be linked to any lead:');
      console.log('You may need to create leads for these owners first.\n');
      
      unmatched.forEach(p => {
        console.log(`   ${p.reference_number}: "${p.owner_name}" (${p.phone_number}) [Agent: ${p.agent_id}]`);
      });
      
      console.log('\n💡 To fix these, you can:');
      console.log('   1. Create leads with matching names and phone numbers');
      console.log('   2. Run this script again');
      console.log('   3. Or manually edit the properties to link them to leads\n');
    }
    
    console.log('\n✅ Script completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error linking properties to leads:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
if (require.main === module) {
  linkPropertiesToLeads()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { linkPropertiesToLeads };

