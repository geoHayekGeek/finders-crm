// Script to verify team assignments are correct
const pool = require('./config/db');

async function verifyTeamAssignments() {
  try {
    console.log('🔍 Verifying team assignments...\n');
    
    // Check for agents with multiple active assignments
    const multipleAssignments = await pool.query(`
      SELECT agent_id, COUNT(*) as active_count
      FROM team_agents
      WHERE is_active = TRUE
      GROUP BY agent_id
      HAVING COUNT(*) > 1
    `);
    
    if (multipleAssignments.rows.length > 0) {
      console.log('❌ Found agents with multiple active assignments:');
      multipleAssignments.rows.forEach(row => {
        console.log(`  Agent ${row.agent_id}: ${row.active_count} active assignments`);
      });
    } else {
      console.log('✅ No agents with multiple active assignments');
    }
    
    // Check consistency between users.assigned_to and team_agents
    const inconsistent = await pool.query(`
      SELECT u.id, u.name, u.assigned_to, 
             (SELECT team_leader_id FROM team_agents WHERE agent_id = u.id AND is_active = TRUE LIMIT 1) as actual_team_leader
      FROM users u
      WHERE u.role = 'agent'
        AND u.is_assigned = TRUE
        AND u.assigned_to IS NOT NULL
        AND (
          NOT EXISTS (
            SELECT 1
            FROM team_agents ta
            WHERE ta.agent_id = u.id
              AND ta.team_leader_id = u.assigned_to
              AND ta.is_active = TRUE
          )
        )
      LIMIT 10
    `);
    
    if (inconsistent.rows.length > 0) {
      console.log('\n❌ Found inconsistent assignments:');
      inconsistent.rows.forEach(agent => {
        console.log(`  Agent ${agent.id} (${agent.name}): assigned_to=${agent.assigned_to}, actual=${agent.actual_team_leader}`);
      });
    } else {
      console.log('✅ All assignments are consistent');
    }
    
    // Sample agents with their team assignments
    console.log('\n📋 Sample agents with team assignments:');
    const sample = await pool.query(`
      SELECT u.id, u.name, u.assigned_to, 
             (SELECT tl.user_code FROM users tl WHERE tl.id = u.assigned_to) as team_leader_code,
             (SELECT tl.name FROM users tl WHERE tl.id = u.assigned_to) as team_leader_name,
             (SELECT COUNT(*) FROM team_agents ta WHERE ta.agent_id = u.id AND ta.is_active = TRUE) as active_assignments
      FROM users u
      WHERE u.role = 'agent' AND u.is_assigned = TRUE
      LIMIT 5
    `);
    
    sample.rows.forEach(agent => {
      console.log(`  ${agent.id}: ${agent.name}`);
      console.log(`    assigned_to: ${agent.assigned_to}`);
      console.log(`    team_leader_code: ${agent.team_leader_code}`);
      console.log(`    team_leader_name: ${agent.team_leader_name}`);
      console.log(`    active_assignments: ${agent.active_assignments}`);
      console.log('');
    });
    
    console.log('✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying assignments:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyTeamAssignments()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

