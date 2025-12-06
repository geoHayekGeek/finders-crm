// Test ID extraction logic
const pool = require('./config/db');

async function testExtraction() {
  try {
    const result = await pool.query(`
      SELECT reference_number,
             LENGTH(reference_number) as len,
             SUBSTRING(reference_number FROM '([0-9]+)$') as trailing_digits
      FROM properties
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('Sample reference numbers:');
    result.rows.forEach(row => {
      const trailing = row.trailing_digits;
      // ID should be: trailing digits minus the last 2 (year)
      // But that's complex, so let's see the pattern
      console.log(`  ${row.reference_number} (len=${row.len}, trailing=${trailing})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testExtraction();

