const pool = require('./config/db');

async function check() {
  // Find reference numbers that might be causing issues
  const result = await pool.query(`
    SELECT reference_number,
           SUBSTRING(reference_number FROM '([0-9]+)$') as trailing,
           LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) as trailing_len
    FROM properties
    WHERE reference_number ~ '^F[RS][A-Z]+[0-9]+$'
    ORDER BY LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) DESC
    LIMIT 10
  `);
  
  console.log('Reference numbers with longest trailing digits:');
  result.rows.forEach(row => {
    console.log(`  ${row.reference_number} => trailing: ${row.trailing} (len=${row.trailing_len})`);
  });
  
  await pool.end();
}

check();

