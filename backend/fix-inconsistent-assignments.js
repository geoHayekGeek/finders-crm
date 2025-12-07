// Script to fix inconsistent agent assignments
const pool = require('./config/db');

async function fixInconsistentAssignments() {
  try {
    console.log('🔍 Finding agents with inconsistent assignments...');
    
    // Find agents where users.assigned_to doesn't match active team_agents
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
          OR u.assigned_to != (
            SELECT team_leader_id
            FROM team_agents
            WHERE agent_id = u.id
              AND is_active = TRUE
            LIMIT 1
          )
        )
    `);
    
    console.log(`\n📋 Found ${inconsistent.rows.length} agents with inconsistent assignments:`);
    inconsistent.rows.forEach(agent => {
      console.log(`  Agent ${agent.id} (${agent.name}): assigned_to=${agent.assigned_to}, actual=${agent.actual_team_leader}`);
    });
    
    if (inconsistent.rows.length === 0) {
      console.log('\n✅ No inconsistent assignments found!');
      return;
    }
    
    console.log('\n🔧 Fixing inconsistencies...');
    
    for (const agent of inconsistent.rows) {
      if (agent.actual_team_leader) {
        // Update users.assigned_to to match the active team_agents entry
        await pool.query(
          `UPDATE users 
           SET assigned_to = $1, updated_at = NOW()
           WHERE id = $2`,
          [agent.actual_team_leader, agent.id]
        );
        console.log(`  ✅ Fixed agent ${agent.id}: Updated assigned_to to ${agent.actual_team_leader}`);
      } else {
        // No active assignment, clear the assigned_to
        await pool.query(
          `UPDATE users 
           SET assigned_to = NULL, is_assigned = FALSE, updated_at = NOW()
           WHERE id = $1`,
          [agent.id]
        );
        console.log(`  ✅ Fixed agent ${agent.id}: Cleared assignment (no active team_agents entry)`);
      }
    }
    
    console.log('\n✅ All inconsistencies fixed!');
    
    // Verify again
    const verify = await pool.query(`
      SELECT COUNT(*) as inconsistent_count
      FROM users u
      WHERE u.role = 'agent'
        AND u.is_assigned = TRUE
        AND u.assigned_to IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM team_agents ta
          WHERE ta.agent_id = u.id
            AND ta.team_leader_id = u.assigned_to
            AND ta.is_active = TRUE
        )
    `);
    
    const remaining = parseInt(verify.rows[0].inconsistent_count);
    if (remaining > 0) {
      console.log(`⚠️  Warning: Still ${remaining} inconsistent assignments remaining`);
    } else {
      console.log('✅ All assignments are now consistent!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing inconsistencies:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixInconsistentAssignments()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

