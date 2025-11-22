// Test script to check Ahmad Al Masri's closures
const pool = require('./config/db');

async function testAhmadClosures() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding Ahmad Al Masri...\n');
    
    // Find Ahmad Al Masri
    const agentResult = await client.query(
      `SELECT id, name, email FROM users 
       WHERE (LOWER(name) LIKE '%ahmad%' OR LOWER(name) LIKE '%masri%' OR LOWER(name) LIKE '%masery%')
       AND role IN ('agent', 'team_leader')
       ORDER BY name`
    );
    
    if (agentResult.rows.length === 0) {
      console.log('❌ No agent found matching Ahmad Al Masri');
      return;
    }
    
    const ahmad = agentResult.rows[0];
    console.log(`✅ Found agent: ${ahmad.name} (ID: ${ahmad.id})\n`);
    
    // Get all closed properties for Ahmad
    console.log('📊 Checking all closed properties...\n');
    
    const allClosuresResult = await client.query(
      `SELECT 
        p.id,
        p.reference_number,
        p.property_type,
        p.closed_date,
        p.price,
        s.name as status_name,
        s.code as status_code
       FROM properties p
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = $1
         AND p.closed_date IS NOT NULL
         AND (
           LOWER(s.code) IN ('sold', 'rented', 'closed')
           OR LOWER(s.name) IN ('sold', 'rented', 'closed')
         )
       ORDER BY p.closed_date DESC`,
      [ahmad.id]
    );
    
    console.log(`📈 Total closures: ${allClosuresResult.rows.length}\n`);
    
    // Group by property type
    const sales = allClosuresResult.rows.filter(p => p.property_type === 'sale');
    const rents = allClosuresResult.rows.filter(p => p.property_type === 'rent');
    
    console.log(`   - Sales: ${sales.length}`);
    console.log(`   - Rents: ${rents.length}\n`);
    
    // Check October 2025 closures specifically
    console.log('📅 Checking October 2025 closures...\n');
    
    const octoberClosuresResult = await client.query(
      `SELECT 
        p.id,
        p.reference_number,
        p.property_type,
        p.closed_date,
        p.price,
        s.name as status_name,
        s.code as status_code
       FROM properties p
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = $1
         AND p.closed_date >= '2025-10-01'::date
         AND p.closed_date <= '2025-10-31'::date
         AND (
           LOWER(s.code) IN ('sold', 'rented', 'closed')
           OR LOWER(s.name) IN ('sold', 'rented', 'closed')
         )
       ORDER BY p.closed_date DESC, p.property_type`,
      [ahmad.id]
    );
    
    console.log(`📈 October 2025 closures: ${octoberClosuresResult.rows.length}\n`);
    
    // Group October closures by type
    const octoberSales = octoberClosuresResult.rows.filter(p => p.property_type === 'sale');
    const octoberRents = octoberClosuresResult.rows.filter(p => p.property_type === 'rent');
    
    console.log(`   - Sales: ${octoberSales.length}`);
    console.log(`   - Rents: ${octoberRents.length}\n`);
    
    // Show details of October closures
    if (octoberClosuresResult.rows.length > 0) {
      console.log('📋 October 2025 Closure Details:\n');
      console.log('─'.repeat(100));
      console.log(
        'Type'.padEnd(8) + 
        'Date'.padEnd(12) + 
        'Price'.padEnd(15) + 
        'Status'.padEnd(15) + 
        'Ref #'
      );
      console.log('─'.repeat(100));
      
      octoberClosuresResult.rows.forEach(property => {
        const type = (property.property_type || 'N/A').toUpperCase().padEnd(8);
        const date = (property.closed_date || 'N/A').toString().substring(0, 10).padEnd(12);
        const price = property.price ? `$${parseFloat(property.price).toLocaleString()}`.padEnd(15) : 'N/A'.padEnd(15);
        const status = (property.status_name || property.status_code || 'N/A').padEnd(15);
        const ref = property.reference_number || 'N/A';
        
        console.log(`${type}${date}${price}${status}${ref}`);
      });
      
      console.log('─'.repeat(100));
      
      // Calculate totals
      const totalSalesAmount = octoberSales.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
      const totalRentsAmount = octoberRents.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
      
      console.log(`\n💰 October 2025 Totals:`);
      console.log(`   - Sales amount: $${totalSalesAmount.toLocaleString()}`);
      console.log(`   - Rents amount: $${totalRentsAmount.toLocaleString()}`);
      console.log(`   - Total amount: $${(totalSalesAmount + totalRentsAmount).toLocaleString()}\n`);
    } else {
      console.log('⚠️  No closures found for October 2025\n');
    }
    
    // Check for properties with closed_date but wrong status
    console.log('🔍 Checking for properties with closed_date but non-closed status...\n');
    
    const wrongStatusResult = await client.query(
      `SELECT 
        p.id,
        p.reference_number,
        p.property_type,
        p.closed_date,
        s.name as status_name,
        s.code as status_code
       FROM properties p
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = $1
         AND p.closed_date IS NOT NULL
         AND NOT (
           LOWER(s.code) IN ('sold', 'rented', 'closed')
           OR LOWER(s.name) IN ('sold', 'rented', 'closed')
         )
       ORDER BY p.closed_date DESC`,
      [ahmad.id]
    );
    
    if (wrongStatusResult.rows.length > 0) {
      console.log(`⚠️  Found ${wrongStatusResult.rows.length} properties with closed_date but non-closed status:\n`);
      wrongStatusResult.rows.forEach(p => {
        console.log(`   - ${p.reference_number}: ${p.property_type}, closed_date: ${p.closed_date}, status: ${p.status_name || p.status_code}`);
      });
      console.log('');
    } else {
      console.log('✅ All properties with closed_date have correct closed status\n');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log('─'.repeat(50));
    console.log(`Agent: ${ahmad.name} (ID: ${ahmad.id})`);
    console.log(`Total closures: ${allClosuresResult.rows.length}`);
    console.log(`  - Sales: ${sales.length}`);
    console.log(`  - Rents: ${rents.length}`);
    console.log(`October 2025 closures: ${octoberClosuresResult.rows.length}`);
    console.log(`  - Sales: ${octoberSales.length}`);
    console.log(`  - Rents: ${octoberRents.length}`);
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testAhmadClosures()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

