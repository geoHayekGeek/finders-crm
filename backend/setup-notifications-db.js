// setup-notifications-db.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function setupNotificationsDatabase() {
  try {
    console.log('🔔 Setting up notifications database...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'notifications.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement, but be careful with functions
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuoteLevel = 0;
    
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for function start
      if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || trimmedLine.includes('CREATE FUNCTION')) {
        inFunction = true;
        dollarQuoteLevel = 0;
      }
      
      // Check for dollar quotes
      const dollarMatches = trimmedLine.match(/\$/g);
      if (dollarMatches) {
        dollarQuoteLevel += dollarMatches.length;
      }
      
      currentStatement += line + '\n';
      
      // End of statement if we have a semicolon and we're not in a function or dollar quotes are balanced
      if (trimmedLine.endsWith(';') && (!inFunction || dollarQuoteLevel % 2 === 0)) {
        if (currentStatement.trim().length > 0) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
        inFunction = false;
        dollarQuoteLevel = 0;
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        await pool.query(statement);
      }
    }
    
    console.log('✅ Notifications database setup completed successfully!');
    
    // Test the setup by checking if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Notifications table created successfully');
    } else {
      console.log('❌ Notifications table not found');
    }
    
    // Test the functions
    const functionResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('create_notification_for_users', 'get_property_notification_users')
    `);
    
    console.log('✅ Database functions created:', functionResult.rows.map(r => r.routine_name));
    
  } catch (error) {
    console.error('❌ Error setting up notifications database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupNotificationsDatabase()
  .then(() => {
    console.log('🎉 Database setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });
