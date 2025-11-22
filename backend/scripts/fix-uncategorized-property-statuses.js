// Script to fix properties that appear with "Uncategorized Status"
// Any property whose status does not map to an active status row and has a closed_date
// will be updated to use the "Closed" status.

const pool = require('../config/db');

async function ensureClosedStatus() {
  // Try to find an existing "Closed" status by code or name
  const existing = await pool.query(
    `
      SELECT id, name, code
      FROM statuses
      WHERE LOWER(code) = 'closed' OR LOWER(name) = 'closed'
      LIMIT 1
    `
  );

  if (existing.rows[0]) {
    console.log('✅ Existing Closed status found:', existing.rows[0]);
    return existing.rows[0].id;
  }

  // Create a new Closed status if it doesn't exist
  const inserted = await pool.query(
    `
      INSERT INTO statuses (name, code, description, color, is_active)
      VALUES ('Closed', 'closed', 'Property is closed (sold or rented)', '#6B7280', TRUE)
      RETURNING id, name, code
    `
  );

  console.log('✅ Created new Closed status:', inserted.rows[0]);
  return inserted.rows[0].id;
}

async function fixUncategorizedPropertyStatuses() {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting fix for uncategorized property statuses...\n');

    const closedStatusId = await ensureClosedStatus();

    // Find properties whose status_id does not map to an active status row
    // and that have a closed_date set (meaning they should be considered closed).
    const preview = await client.query(
      `
        SELECT p.id, p.reference_number, p.status_id, p.closed_date
        FROM properties p
        LEFT JOIN statuses s
          ON p.status_id = s.id
          AND s.is_active = TRUE
        WHERE (p.status_id IS NULL OR s.id IS NULL)
          AND p.closed_date IS NOT NULL
        ORDER BY p.id
        LIMIT 50
      `
    );

    console.log('🔍 Example affected properties (up to 50):');
    console.log(preview.rows);

    // Perform the update
    const result = await client.query(
      `
        UPDATE properties p
        SET status_id = $1,
            updated_at = NOW()
        FROM statuses s_old
        WHERE
          -- Either no status_id, or it points to a non-active / non-existing status
          (p.status_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM statuses s
             WHERE s.id = p.status_id
               AND s.is_active = TRUE
           ))
          AND p.closed_date IS NOT NULL
          AND p.id = p.id
        RETURNING p.id, p.reference_number, p.status_id
      `,
      [closedStatusId]
    );

    console.log(`\n✅ Updated ${result.rows.length} properties to Closed status (id=${closedStatusId}).`);

    console.log('\n🔁 Verifying remaining uncategorized properties...');
    const remaining = await client.query(
      `
        SELECT COUNT(*) AS cnt
        FROM properties p
        LEFT JOIN statuses s
          ON p.status_id = s.id
          AND s.is_active = TRUE
        WHERE (p.status_id IS NULL OR s.id IS NULL)
      `
    );

    console.log('Remaining properties with invalid / uncategorized status:', remaining.rows[0].cnt);
    console.log('\n✅ Script completed.\n');
  } catch (error) {
    console.error('❌ Error fixing uncategorized property statuses:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  fixUncategorizedPropertyStatuses()
    .then(() => {
      console.log('✅ Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { fixUncategorizedPropertyStatuses };







