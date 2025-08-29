const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function setupLeadStatuses() {
  try {
    console.log('🚀 Setting up lead statuses database...');
    
    // Step 1: Create lead_statuses table
    console.log('📄 Step 1: Creating lead_statuses table...');
    const statusTablePath = path.join(__dirname, 'database', 'lead_statuses.sql');
    const statusTableSQL = fs.readFileSync(statusTablePath, 'utf8');
    await pool.query(statusTableSQL);
    console.log('✅ Lead statuses table created successfully');
    
    // Step 2: Update leads table to add status_id reference
    console.log('📄 Step 2: Adding status_id to leads table...');
    const updateLeadsPath = path.join(__dirname, 'database', 'update_leads_status.sql');
    const updateLeadsSQL = fs.readFileSync(updateLeadsPath, 'utf8');
    await pool.query(updateLeadsSQL);
    console.log('✅ Leads table updated with status_id reference');
    
    // Step 3: Verify the setup
    console.log('📊 Step 3: Verifying setup...');
    
    // Check lead_statuses table
    const statusesResult = await pool.query('SELECT * FROM lead_statuses ORDER BY id');
    console.log(`✅ Lead statuses table has ${statusesResult.rows.length} statuses:`);
    statusesResult.rows.forEach(status => {
      console.log(`   - ${status.status_name} (ID: ${status.id})`);
    });
    
    // Check leads table structure
    const leadsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name IN ('status', 'status_id')
      ORDER BY ordinal_position
    `);
    console.log('✅ Leads table status columns:');
    leadsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check sample data
    const sampleLeads = await pool.query(`
      SELECT l.id, l.customer_name, l.status, l.status_id, ls.status_name 
      FROM leads l 
      LEFT JOIN lead_statuses ls ON l.status_id = ls.id 
      LIMIT 5
    `);
    console.log('✅ Sample leads with status mapping:');
    sampleLeads.rows.forEach(lead => {
      console.log(`   - ${lead.customer_name}: old="${lead.status}" -> new="${lead.status_name}" (ID: ${lead.status_id})`);
    });
    
    console.log('\n🎉 Lead statuses setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up lead statuses:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
setupLeadStatuses();
