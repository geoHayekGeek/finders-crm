const pool = require('../config/db');
const { normalizeRole } = require('../utils/roleUtils');

function fmt(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function main() {
  const client = await pool.connect();

  try {
    console.log('== Latest DCSR report ==');
    const latestReport = await client.query(`
      SELECT id, month, year, start_date, end_date,
             listings_count, leads_count, sales_count, rent_count, viewings_count,
             created_at, updated_at
      FROM dcsr_monthly_reports
      ORDER BY COALESCE(end_date, start_date) DESC, id DESC
      LIMIT 5
    `);

    latestReport.rows.forEach((row) => {
      console.log([
        `id=${row.id}`,
        `range=${fmt(row.start_date)} -> ${fmt(row.end_date)}`,
        `month=${fmt(row.month)}`,
        `year=${fmt(row.year)}`,
        `listings=${fmt(row.listings_count)}`,
        `leads=${fmt(row.leads_count)}`,
        `sales=${fmt(row.sales_count)}`,
        `rent=${fmt(row.rent_count)}`,
        `viewings=${fmt(row.viewings_count)}`
      ].join(' | '));
    });

    const report = latestReport.rows[0];
    if (!report) {
      console.log('No DCSR reports found.');
      return;
    }

    const startDate = report.start_date instanceof Date
      ? report.start_date.toISOString().split('T')[0]
      : String(report.start_date).slice(0, 10);
    const endDate = report.end_date instanceof Date
      ? report.end_date.toISOString().split('T')[0]
      : String(report.end_date).slice(0, 10);

    console.log('');
    console.log(`== Normalized range for analysis: ${startDate} -> ${endDate} ==`);

    console.log('');
    console.log('== User role distribution (normalized) ==');
    const roleDistribution = await client.query(`
      SELECT LOWER(REPLACE(role, '_', ' ')) AS normalized_role,
             COUNT(*)::int AS users,
             COUNT(*) FILTER (WHERE COALESCE(is_active, TRUE))::int AS active_users
      FROM users
      GROUP BY 1
      ORDER BY active_users DESC, normalized_role ASC
    `);
    roleDistribution.rows.forEach((row) => {
      console.log(`${row.normalized_role} | users=${row.users} | active=${row.active_users}`);
    });

    console.log('');
    console.log('== Sales-side users included by current DCSR breakdown ==');
    const includedUsers = await client.query(`
      SELECT id, name, user_code, role, assigned_to
      FROM users
      WHERE COALESCE(is_active, TRUE) = TRUE
        AND LOWER(REPLACE(role, '_', ' ')) IN ('agent', 'consultant', 'team leader')
      ORDER BY LOWER(REPLACE(role, '_', ' ')) ASC, name ASC
    `);
    includedUsers.rows.forEach((row) => {
      console.log(`${row.id} | ${row.name} | ${row.user_code || ''} | ${normalizeRole(row.role)} | assigned_to=${row.assigned_to}`);
    });
    console.log(`Included user count: ${includedUsers.rows.length}`);

    const includedIds = includedUsers.rows.map((row) => row.id);
    if (includedIds.length === 0) {
      console.log('No included users found; stopping.');
      return;
    }

    const activityQueries = {
      listings: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM properties p
        JOIN users u ON u.id = p.agent_id
        WHERE p.created_at >= $1::timestamp
          AND p.created_at <= $2::timestamp
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `,
      leadsByAgent: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM leads l
        JOIN users u ON u.id = l.agent_id
        WHERE DATE(l.date) >= $1::date
          AND DATE(l.date) <= $2::date
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `,
      leadsByAddedBy: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM leads l
        JOIN users u ON u.id = l.added_by_id
        WHERE DATE(l.date) >= $1::date
          AND DATE(l.date) <= $2::date
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `,
      viewings: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM viewings v
        JOIN users u ON u.id = v.agent_id
        WHERE v.viewing_date >= $1::date
          AND v.viewing_date <= $2::date
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `,
      salesClosures: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM properties p
        JOIN users u ON u.id = p.agent_id
        JOIN statuses s ON s.id = p.status_id
        WHERE p.closed_date IS NOT NULL
          AND p.closed_date >= $1::date
          AND p.closed_date <= $2::date
          AND p.property_type = 'sale'
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `,
      rentClosures: `
        SELECT u.id, u.name, u.role, COUNT(*)::int AS count
        FROM properties p
        JOIN users u ON u.id = p.agent_id
        JOIN statuses s ON s.id = p.status_id
        WHERE p.closed_date IS NOT NULL
          AND p.closed_date >= $1::date
          AND p.closed_date <= $2::date
          AND p.property_type = 'rent'
        GROUP BY u.id, u.name, u.role
        ORDER BY count DESC, u.name ASC
      `
    };

    for (const [label, sql] of Object.entries(activityQueries)) {
      console.log('');
      console.log(`== ${label} ==`);
      const result = await client.query(sql, [startDate, endDate]);

      const totalsByRole = new Map();
      let grandTotal = 0;
      for (const row of result.rows) {
        grandTotal += row.count;
        const role = normalizeRole(row.role);
        totalsByRole.set(role, (totalsByRole.get(role) || 0) + row.count);
        console.log(`${row.id} | ${row.name} | ${role} | ${row.count}`);
      }

      console.log(`Total rows: ${grandTotal}`);
      console.log('By role:');
      for (const [role, count] of totalsByRole.entries()) {
        console.log(`  ${role}: ${count}`);
      }
    }

    console.log('');
    console.log('== Null/foreign key checks ==');
    const nullChecks = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM properties WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp AND agent_id IS NULL)::int AS listings_null_agent,
        (SELECT COUNT(*) FROM leads WHERE DATE(date) >= $1::date AND DATE(date) <= $2::date AND agent_id IS NULL)::int AS leads_null_agent,
        (SELECT COUNT(*) FROM leads WHERE DATE(date) >= $1::date AND DATE(date) <= $2::date AND added_by_id IS NULL)::int AS leads_null_added_by,
        (SELECT COUNT(*) FROM viewings WHERE viewing_date >= $1::date AND viewing_date <= $2::date AND agent_id IS NULL)::int AS viewings_null_agent
    `, [startDate, endDate]);
    console.log(JSON.stringify(nullChecks.rows[0], null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
