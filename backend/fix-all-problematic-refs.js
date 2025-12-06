// Fix all problematic reference numbers
const pool = require('./config/db');

async function fixAll() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find all problematic reference numbers (with trailing digits > 6 characters, indicating corrupted data)
    const result = await client.query(`
      SELECT id, reference_number, property_type,
             (SELECT code FROM categories WHERE id = properties.category_id) as category_code,
             EXTRACT(YEAR FROM created_at)::INTEGER as created_year
      FROM properties
      WHERE LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) > 6
      ORDER BY id
    `);
    
    console.log(`Found ${result.rows.length} problematic reference numbers`);
    
    if (result.rows.length === 0) {
      console.log('No problematic reference numbers found');
      await client.query('COMMIT');
      return;
    }
    
    // Get the max valid ID from all properties
    const maxResult = await client.query(`
      SELECT COALESCE(MAX(
        CASE 
          WHEN reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
            AND LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) <= 6 THEN
            CAST(SUBSTRING(SUBSTRING(reference_number FROM '([0-9]+)$') FROM 3) AS INTEGER)
          ELSE 0
        END
      ), 0) as max_id
      FROM properties
      WHERE LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) <= 6
    `);
    
    let globalIdCounter = maxResult.rows[0].max_id || 0;
    
    for (const prop of result.rows) {
      globalIdCounter++;
      const year = prop.created_year.toString().slice(-2);
      const typeCode = prop.property_type === 'sale' ? 'S' : 'R';
      const newRef = `F${typeCode}${prop.category_code}${year}${globalIdCounter}`;
      
      console.log(`Fixing: ${prop.reference_number} => ${newRef}`);
      
      await client.query(
        'UPDATE properties SET reference_number = $1 WHERE id = $2',
        [newRef, prop.id]
      );
    }
    
    await client.query('COMMIT');
    console.log(`✅ Fixed ${result.rows.length} problematic reference numbers!`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAll();

