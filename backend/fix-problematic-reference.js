// Fix the problematic reference number
const pool = require('./config/db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find the problematic reference number
    const result = await client.query(`
      SELECT id, reference_number, property_type,
             (SELECT code FROM categories WHERE id = properties.category_id) as category_code
      FROM properties
      WHERE reference_number = 'FRS456338252581'
    `);
    
    if (result.rows.length > 0) {
      const prop = result.rows[0];
      const year = '25';
      const typeCode = prop.property_type === 'sale' ? 'S' : 'R';
      
      // Get the max ID from all properties
      const maxResult = await client.query(`
        SELECT COALESCE(MAX(
          CASE 
            WHEN reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
              AND LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) >= 3 THEN
              CAST(SUBSTRING(SUBSTRING(reference_number FROM '([0-9]+)$') FROM 3) AS INTEGER)
            ELSE 0
          END
        ), 0) as max_id
        FROM properties
        WHERE reference_number != 'FRS456338252581'
          AND CAST(SUBSTRING(SUBSTRING(reference_number FROM '([0-9]+)$') FROM 3) AS INTEGER) < 100000
      `);
      
      const maxId = maxResult.rows[0].max_id || 0;
      const newId = maxId + 1;
      const newRef = `F${typeCode}${prop.category_code}${year}${newId}`;
      
      console.log(`Fixing: ${prop.reference_number} => ${newRef}`);
      
      await client.query(
        'UPDATE properties SET reference_number = $1 WHERE id = $2',
        [newRef, prop.id]
      );
      
      await client.query('COMMIT');
      console.log('✅ Fixed!');
    } else {
      console.log('No problematic reference number found');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

