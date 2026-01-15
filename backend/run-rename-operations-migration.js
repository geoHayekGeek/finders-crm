const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'rename_operations_to_added_by.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Reading migration file...');
    console.log('📄 Migration file path:', sqlPath);
    
    // Split SQL statements and execute them
    // PostgreSQL DO blocks need special handling - they end with END $$;
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let dollarQuote = '';
    
    const lines = sqlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check for DO $$ blocks
      if (line.match(/DO\s+\$\$/i)) {
        inDoBlock = true;
        dollarQuote = '$$';
      }
      
      // Check for end of DO block
      if (inDoBlock && line.match(/END\s+\$\$/i)) {
        inDoBlock = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }
      
      // Regular statement end
      if (!inDoBlock && line.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`\n🚀 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
          
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error('Full error:', error);
          // For migrations, we might want to stop on error
          throw error;
        }
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Column operations_id has been renamed to added_by_id');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
