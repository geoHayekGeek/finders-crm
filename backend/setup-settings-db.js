// setup-settings-db.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function setupSettingsDatabase() {
  try {
    console.log('🚀 Setting up settings database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'system_settings.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    let braceCount = 0;
    
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || trimmedLine.includes('CREATE FUNCTION')) {
        inFunction = true;
        braceCount = 0;
      }
      
      if (inFunction) {
        currentStatement += line + '\n';
        
        // Count braces to know when function ends
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        // Function ends when we have balanced braces and see LANGUAGE
        if (braceCount === 0 && trimmedLine.includes('LANGUAGE')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
          inFunction = false;
        }
      } else {
        // Regular statements
        if (trimmedLine && !trimmedLine.startsWith('--')) {
          currentStatement += line + '\n';
        }
        
        if (trimmedLine.endsWith(';') && !inFunction) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Filter out empty statements and clean them up
    const cleanStatements = statements
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${cleanStatements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < cleanStatements.length; i++) {
      const statement = cleanStatements[i];
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed statement ${i + 1}`);
        } catch (error) {
          // Some statements might fail if they already exist (like indexes or triggers)
          if (error.code === '42P07') { // duplicate_object
            console.log(`⚠️ Statement ${i + 1} already exists (skipping)`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('🎉 Settings database setup completed!');
    
    // Test the table
    const result = await pool.query('SELECT COUNT(*) FROM system_settings');
    console.log(`📊 System settings table has ${result.rows[0].count} rows`);
    
  } catch (error) {
    console.error('💥 Error setting up settings database:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupSettingsDatabase();
