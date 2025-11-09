const pool = require('./config/db');

async function checkCalendarTable() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'calendar_events'
      );
    `);
    
    console.log('Calendar events table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Count records
      const countResult = await pool.query('SELECT COUNT(*) FROM calendar_events');
      console.log('Total calendar events:', countResult.rows[0].count);
      
      // Check recent events
      const recentEvents = await pool.query(`
        SELECT id, title, type, created_at 
        FROM calendar_events 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (recentEvents.rows.length > 0) {
        console.log('\nRecent calendar events:');
        recentEvents.rows.forEach(event => {
          console.log(`  - ID: ${event.id}, Title: ${event.title}, Type: ${event.type}`);
        });
      } else {
        console.log('\nNo calendar events found in database');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCalendarTable();

