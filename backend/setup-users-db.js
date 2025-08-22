// setup-users-db.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function setupUsersDatabase() {
  try {
    console.log('🚀 Setting up users database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'users.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed statement ${i + 1}`);
        } catch (error) {
          // Some statements might fail if they already exist
          if (error.code === '42P07') { // duplicate_object
            console.log(`⚠️ Statement ${i + 1} already exists (skipping)`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('🎉 Users database setup completed!');
    
    // Test the table
    const result = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`📊 Users table has ${result.rows[0].count} rows`);
    
    // Check if the new columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('💥 Error setting up users database:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupUsersDatabase();
