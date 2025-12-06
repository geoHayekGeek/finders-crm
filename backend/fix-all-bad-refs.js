// Fix ALL problematic reference numbers by re-running the reset
const pool = require('./config/db');

async function fixAll() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Fixing all problematic reference numbers...');
    
    // Find ALL properties with problematic reference numbers (trailing > 6 chars or invalid format)
    const problematic = await client.query(`
      SELECT id, reference_number, property_type,
             (SELECT code FROM categories WHERE id = properties.category_id) as category_code,
             EXTRACT(YEAR FROM created_at)::INTEGER as created_year
      FROM properties
      WHERE LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) > 6
         OR reference_number !~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
      ORDER BY created_at ASC, id ASC
    `);
    
    console.log(`Found ${problematic.rows.length} problematic reference numbers`);
    
    if (problematic.rows.length === 0) {
      console.log('✅ No problematic reference numbers found');
      await client.query('COMMIT');
      return;
    }
    
    // Get max valid ID
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
      WHERE reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$'
        AND LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) <= 6
    `);
    
    let globalIdCounter = maxResult.rows[0].max_id || 0;
    
    for (const prop of problematic.rows) {
      globalIdCounter++;
      const year = prop.created_year.toString().slice(-2);
      const typeCode = prop.property_type === 'sale' ? 'S' : 'R';
      
      // Validate category code - if it's invalid, use a default
      let categoryCode = prop.category_code;
      if (!categoryCode || categoryCode.length > 10 || !/^[A-Z]+$/.test(categoryCode)) {
        console.log(`⚠️ Invalid category code for property ${prop.id}: ${categoryCode}, using 'A' as default`);
        categoryCode = 'A';
      }
      
      const newRef = `F${typeCode}${categoryCode}${year}${globalIdCounter}`;
      
      console.log(`Fixing: ${prop.reference_number} => ${newRef}`);
      
      await client.query(
        'UPDATE properties SET reference_number = $1 WHERE id = $2',
        [newRef, prop.id]
      );
    }
    
    await client.query('COMMIT');
    console.log(`✅ Fixed ${problematic.rows.length} problematic reference numbers!`);
    
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

