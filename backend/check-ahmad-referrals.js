const pool = require('./config/db');

async function checkReferrals() {
  try {
    // Find Ahmad Al-Masri
    const agentResult = await pool.query(
      "SELECT id, name FROM users WHERE name ILIKE '%ahmad%' OR name ILIKE '%masri%' OR name ILIKE '%masery%' LIMIT 1"
    );
    
    if (agentResult.rows.length === 0) {
      console.log('❌ Ahmad not found');
      await pool.end();
      return;
    }
    
    const agent = agentResult.rows[0];
    console.log('\n👤 Agent:', agent.name, '(ID:', agent.id + ')');
    
    // Get October date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    console.log('📅 Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Check property referrals
    console.log('\n📊 PROPERTY REFERRALS (all):');
    const propRefs = await pool.query(
      `SELECT r.id, r.property_id, r.employee_id, r.external, p.reference_number, p.price, p.closed_date, s.name as status 
       FROM referrals r 
       JOIN properties p ON r.property_id = p.id 
       LEFT JOIN statuses s ON p.status_id = s.id 
       WHERE r.employee_id = $1 
       ORDER BY p.closed_date DESC NULLS LAST 
       LIMIT 10`,
      [agent.id]
    );
    console.log('Total property referrals:', propRefs.rows.length);
    propRefs.rows.forEach(r => {
      console.log('  - Property', r.reference_number, '| Price:', r.price, '| Status:', r.status, '| Closed:', r.closed_date, '| External:', r.external);
    });
    
    // Check closed property referrals in October
    console.log('\n📊 PROPERTY REFERRALS (closed in October, internal):');
    const closedPropRefs = await pool.query(
      `SELECT r.id, r.property_id, r.employee_id, r.external, p.reference_number, p.price, p.closed_date, s.name as status, s.code
       FROM referrals r 
       JOIN properties p ON r.property_id = p.id 
       LEFT JOIN statuses s ON p.status_id = s.id 
       WHERE r.employee_id = $1 
       AND (r.external = FALSE OR r.external IS NULL)
       AND p.closed_date >= $2::date 
       AND p.closed_date <= $3::date
       AND p.status_id IN (
         SELECT id FROM statuses 
         WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
         OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
         OR LOWER(name) IN ('sold', 'rented', 'closed')
       )`,
      [agent.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    console.log('Closed property referrals in October (internal):', closedPropRefs.rows.length);
    closedPropRefs.rows.forEach(r => {
      console.log('  - Property', r.reference_number, '| Price:', r.price, '| Status:', r.status, '(', r.code, ') | Closed:', r.closed_date, '| External:', r.external);
    });
    
    // Check lead referrals
    console.log('\n📊 LEAD REFERRALS (all):');
    const leadRefs = await pool.query(
      `SELECT lr.id, lr.lead_id, lr.agent_id, lr.external, l.customer_name 
       FROM lead_referrals lr 
       JOIN leads l ON lr.lead_id = l.id 
       WHERE lr.agent_id = $1 
       LIMIT 10`,
      [agent.id]
    );
    console.log('Total lead referrals:', leadRefs.rows.length);
    leadRefs.rows.forEach(r => {
      console.log('  - Lead:', r.customer_name, '| External:', r.external);
    });
    
    // Check properties owned by leads Ahmad referred
    console.log('\n🏠 PROPERTIES FROM LEAD REFERRALS (all):');
    const propsFromLeads = await pool.query(
      `SELECT p.id, p.reference_number, p.price, p.closed_date, s.name as status, l.customer_name as owner 
       FROM properties p 
       JOIN leads l ON p.owner_id = l.id 
       JOIN lead_referrals lr ON l.id = lr.lead_id 
       LEFT JOIN statuses s ON p.status_id = s.id 
       WHERE lr.agent_id = $1 
       ORDER BY p.closed_date DESC NULLS LAST 
       LIMIT 10`,
      [agent.id]
    );
    console.log('Total properties from lead referrals:', propsFromLeads.rows.length);
    propsFromLeads.rows.forEach(r => {
      console.log('  - Property', r.reference_number, '| Owner:', r.owner, '| Price:', r.price, '| Status:', r.status, '| Closed:', r.closed_date);
    });
    
    // Check closed properties from lead referrals in October
    console.log('\n🏠 PROPERTIES FROM LEAD REFERRALS (closed in October, internal):');
    const closedPropsFromLeads = await pool.query(
      `SELECT p.id, p.reference_number, p.price, p.closed_date, s.name as status, s.code, l.customer_name as owner, lr.external
       FROM properties p 
       JOIN leads l ON p.owner_id = l.id 
       JOIN lead_referrals lr ON l.id = lr.lead_id 
       LEFT JOIN statuses s ON p.status_id = s.id 
       WHERE lr.agent_id = $1 
       AND (lr.external = FALSE OR lr.external IS NULL)
       AND p.closed_date >= $2::date 
       AND p.closed_date <= $3::date
       AND p.status_id IN (
         SELECT id FROM statuses 
         WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
         OR UPPER(code) IN ('SOLD', 'RENTED', 'CLOSED')
         OR LOWER(name) IN ('sold', 'rented', 'closed')
       )
       ORDER BY p.closed_date DESC NULLS LAST 
       LIMIT 10`,
      [agent.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    console.log('Closed properties from lead referrals in October (internal):', closedPropsFromLeads.rows.length);
    closedPropsFromLeads.rows.forEach(r => {
      console.log('  - Property', r.reference_number, '| Owner:', r.owner, '| Price:', r.price, '| Status:', r.status, '(', r.code, ') | Closed:', r.closed_date, '| External:', r.external);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkReferrals();

