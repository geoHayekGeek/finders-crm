const pool = require('./config/db');

async function checkTableStructure() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking properties table structure...');
    
    // Check the actual table structure
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Properties table structure:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''} - ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });
    
    // Check if there are any properties in the table
    const countResult = await client.query('SELECT COUNT(*) FROM properties');
    console.log(`\n📊 Total properties: ${countResult.rows[0].count}`);
    
    // Try to get one property to see what happens
    console.log('\n🧪 Testing property retrieval...');
    try {
      const testResult = await client.query('SELECT id, reference_number, location FROM properties LIMIT 1');
      console.log('✅ Basic query works:', testResult.rows[0] || 'No properties found');
    } catch (error) {
      console.log('❌ Basic query failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure().catch(console.error);
