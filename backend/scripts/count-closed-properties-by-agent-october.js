// Script: Count closed properties per agent for October 2025
// This is a one-off diagnostic to see how many closed properties each agent has.

const pool = require('../config/db');

async function countClosedPropertiesByAgentForOctober2025() {
  const client = await pool.connect();

  try {
    console.log('📊 Counting closed properties per agent for October 2025...\n');

    const result = await client.query(
      `
        SELECT 
          u.id AS agent_id,
          u.name AS agent_name,
          COUNT(p.id) AS closed_properties_count
        FROM properties p
        LEFT JOIN users u
          ON p.agent_id = u.id
        WHERE 
          p.closed_date >= DATE '2025-10-01'
          AND p.closed_date < DATE '2025-11-01'
          AND p.status_id IN (
            SELECT id
            FROM statuses
            WHERE LOWER(code) IN ('sold', 'rented', 'closed')
               OR LOWER(name) IN ('sold', 'rented', 'closed')
          )
        GROUP BY u.id, u.name
        ORDER BY closed_properties_count DESC, u.name ASC
      `
    );

    if (result.rows.length === 0) {
      console.log('No closed properties found for October 2025.');
    } else {
      console.log('Agent closed property counts for October 2025:\n');
      result.rows.forEach((row) => {
        console.log(
          `- Agent ID ${row.agent_id ?? 'NULL'} | ` +
          `${row.agent_name || 'Unknown Agent'}: ` +
          `${row.closed_properties_count} closed properties`
        );
      });
    }

    console.log('\n✅ Script completed.\n');
  } catch (err) {
    console.error('❌ Error counting closed properties by agent:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  countClosedPropertiesByAgentForOctober2025()
    .then(() => {
      console.log('✅ Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { countClosedPropertiesByAgentForOctober2025 };



