const pool = require('./config/db');

async function test() {
  const result = await pool.query(`
    SELECT reference_number, 
           SUBSTRING(SUBSTRING(reference_number FROM '([0-9]+)$') FROM 3) as extracted_id
    FROM properties 
    WHERE reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$' 
    ORDER BY id 
    LIMIT 5
  `);
  
  result.rows.forEach(row => {
    console.log(`${row.reference_number} => ID: ${row.extracted_id}`);
  });
  
  await pool.end();
}

test();

