// Script to run the single team assignment migration
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  const migrationFile = path.join(__dirname, 'database', 'migrations', 'enforce_single_team_assignment.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('🔄 Running single team assignment enforcement migration...');
  console.log('📄 File:', migrationFile);
  
  try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const duplicateCheck = await pool.query(`
      SELECT agent_id, COUNT(*) as active_count
      FROM team_agents
      WHERE is_active = TRUE
      GROUP BY agent_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️  Warning: Found agents with multiple active assignments:');
      duplicateCheck.rows.forEach(row => {
        console.log(`  Agent ${row.agent_id}: ${row.active_count} active assignments`);
      });
    } else {
      console.log('✅ No agents with multiple active assignments found!');
    }
    
    // Check consistency between users.assigned_to and team_agents
    const consistencyCheck = await pool.query(`
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
    
    const inconsistentCount = parseInt(consistencyCheck.rows[0].inconsistent_count);
    if (inconsistentCount > 0) {
      console.log(`⚠️  Warning: Found ${inconsistentCount} agents with inconsistent assignments`);
    } else {
      console.log('✅ All agent assignments are consistent!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

