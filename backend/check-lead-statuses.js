const pool = require('./config/db');

async function checkLeadStatuses() {
  try {
    console.log('🔍 Checking lead statuses and their can_be_referred values...\n');
    
    // Check all lead statuses
    const statusesResult = await pool.query('SELECT id, status_name, can_be_referred FROM lead_statuses ORDER BY id');
    console.log('📊 Lead Statuses in database:');
    statusesResult.rows.forEach(s => {
      console.log(`   ${s.id}. "${s.status_name}": can_be_referred = ${s.can_be_referred}`);
    });
    
    // Check sample leads and their status matching
    const leadsResult = await pool.query(`
      SELECT 
        l.id, 
        l.status,
        ls.status_name as matched_status_name,
        ls.can_be_referred
      FROM leads l
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      ORDER BY l.id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample Leads and their status matching:');
    leadsResult.rows.forEach(l => {
      const matchStatus = l.matched_status_name ? '✅' : '❌';
      console.log(`   Lead ${l.id}: status="${l.status}" ${matchStatus} matches "${l.matched_status_name || 'NONE'}" -> can_be_referred=${l.can_be_referred}`);
    });
    
    // Count leads by status
    const countResult = await pool.query(`
      SELECT 
        l.status,
        COUNT(*) as count,
        ls.can_be_referred
      FROM leads l
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      GROUP BY l.status, ls.can_be_referred
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Leads count by status:');
    countResult.rows.forEach(r => {
      console.log(`   "${r.status}": ${r.count} leads, can_be_referred=${r.can_be_referred}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkLeadStatuses();

