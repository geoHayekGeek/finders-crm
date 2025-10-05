// Check users table structure
const pool = require('./config/db');

async function checkUsersTable() {
  console.log('🔍 Checking users table structure...\n');
  
  try {
    // Get all columns from users table
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Current users table structure:');
    console.log('━'.repeat(80));
    console.table(result.rows);
    
    // Check for required fields
    const requiredFields = [
      'id',
      'name',
      'email', 
      'password',
      'role',
      'location',
      'phone',
      'dob',
      'work_location',
      'user_code',
      'is_assigned',
      'assigned_to',
      'is_active',
      'created_at',
      'updated_at'
    ];
    
    const existingColumns = result.rows.map(row => row.column_name);
    const missingFields = requiredFields.filter(field => !existingColumns.includes(field));
    
    console.log('\n✅ Required fields check:');
    console.log('━'.repeat(80));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present!');
    } else {
      console.log('❌ Missing fields:', missingFields.join(', '));
    }
    
    // Check for extra fields that might not be needed
    const extraFields = existingColumns.filter(col => !requiredFields.includes(col));
    if (extraFields.length > 0) {
      console.log('\nℹ️  Additional fields found:', extraFields.join(', '));
    }
    
    // Get sample data
    const sampleData = await pool.query('SELECT * FROM users LIMIT 1');
    if (sampleData.rows.length > 0) {
      console.log('\n📝 Sample user data:');
      console.log('━'.repeat(80));
      console.log(JSON.stringify(sampleData.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUsersTable();
