/**
 * Remove all users from the database except those with role = 'admin'.
 * Reassigns foreign keys that reference non-admin users (e.g. leads.added_by_id,
 * operations_daily_reports.operations_id) to the first admin user before deleting.
 *
 * Usage:
 *   node scripts/remove-non-admin-users.js
 *
 * Ensure DB env vars are set (see backend/env.example).
 */

const pool = require('../config/db');

async function removeNonAdminUsers() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get admin user(s)
    const adminResult = await client.query(
      `SELECT id, name, email, role FROM users WHERE LOWER(TRIM(role)) = 'admin' ORDER BY id ASC`
    );

    if (!adminResult.rows.length) {
      await client.query('ROLLBACK');
      console.error('❌ No admin users found. Aborting to avoid locking yourself out.');
      process.exitCode = 1;
      return;
    }

    const adminId = adminResult.rows[0].id;
    console.log(`✅ Using admin fallback: id=${adminId} (${adminResult.rows[0].name})`);

    // 2. Reassign leads.added_by_id (RESTRICT) to admin
    const leadsUpdated = await client.query(
      `UPDATE leads SET added_by_id = $1
       WHERE added_by_id IN (SELECT id FROM users WHERE LOWER(TRIM(role)) != 'admin')`,
      [adminId]
    );
    console.log(`   • Reassigned ${leadsUpdated.rowCount} lead(s) added_by_id to admin`);

    // 3. Delete operations_daily_reports rows for non-admin users (unique on operations_id+report_date prevents reassign)
    try {
      const odrDeleted = await client.query(
        `DELETE FROM operations_daily_reports
         WHERE operations_id IN (SELECT id FROM users WHERE LOWER(TRIM(role)) != 'admin')`
      );
      console.log(`   • Deleted ${odrDeleted.rowCount} operations_daily_reports row(s) for non-admins`);
    } catch (e) {
      if (e.code === '42P01') {
        console.log('   • operations_daily_reports table not found, skipping');
      } else throw e;
    }

    // 4. Remove team_agents rows where either side is a non-admin (so user delete can proceed)
    const teamAgentsDeleted = await client.query(
      `DELETE FROM team_agents
       WHERE team_leader_id IN (SELECT id FROM users WHERE LOWER(TRIM(role)) != 'admin')
          OR agent_id IN (SELECT id FROM users WHERE LOWER(TRIM(role)) != 'admin')`
    );
    console.log(`   • Deleted ${teamAgentsDeleted.rowCount} team_agents row(s)`);

    // 5. Null/reassign user FKs so delete won't fail (some DBs may not have ON DELETE SET NULL)
    const nonAdminSub = `(SELECT id FROM users WHERE LOWER(TRIM(role)) != 'admin')`;
    try {
      const ceAssigned = await client.query(
        `UPDATE calendar_events SET assigned_to = NULL WHERE assigned_to IN ${nonAdminSub}`
      );
      if (ceAssigned.rowCount > 0) console.log(`   • Set calendar_events.assigned_to = NULL for ${ceAssigned.rowCount} row(s)`);
      const ceCreated = await client.query(
        `UPDATE calendar_events SET created_by = $1 WHERE created_by IN ${nonAdminSub}`,
        [adminId]
      );
      if (ceCreated.rowCount > 0) console.log(`   • Reassigned calendar_events.created_by to admin for ${ceCreated.rowCount} row(s)`);
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }

    // 6. Delete all non-admin users (CASCADE/SET NULL will handle other tables)
    const deleteResult = await client.query(
      `DELETE FROM users WHERE LOWER(TRIM(role)) != 'admin' RETURNING id, name, email, role`
    );

    await client.query('COMMIT');
    console.log(`\n✅ Removed ${deleteResult.rowCount} non-admin user(s).`);
    console.log('\nRemaining users (admins only):');
    console.table(adminResult.rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role })));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed. Transaction rolled back.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  removeNonAdminUsers().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { removeNonAdminUsers };
