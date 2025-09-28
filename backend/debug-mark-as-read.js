// debug-mark-as-read.js
const pool = require('./config/db');
const Notification = require('./models/notificationModel');

async function debugMarkAsRead() {
  try {
    console.log('🔍 Debugging mark as read functionality...');
    
    // First, let's see what notifications exist
    const notificationsResult = await pool.query(`
      SELECT id, user_id, title, is_read 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📬 Recent notifications:');
    notificationsResult.rows.forEach(notification => {
      console.log(`  ID: ${notification.id}, User: ${notification.user_id}, Title: ${notification.title}, Read: ${notification.is_read}`);
    });
    
    if (notificationsResult.rows.length === 0) {
      console.log('❌ No notifications found');
      return;
    }
    
    const testNotification = notificationsResult.rows[0];
    console.log(`\n🧪 Testing with notification ID ${testNotification.id} for user ${testNotification.user_id}`);
    
    // Test the SQL query directly
    console.log('🔍 Testing direct SQL query...');
    const directResult = await pool.query(`
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [testNotification.id, testNotification.user_id]);
    
    console.log('📊 Direct SQL result:', directResult.rows);
    
    // Test the model method
    console.log('🔍 Testing model method...');
    const modelResult = await Notification.markAsRead(testNotification.id, testNotification.user_id);
    console.log('📊 Model result:', modelResult);
    
    // Check if the notification was actually updated
    const checkResult = await pool.query(`
      SELECT id, user_id, title, is_read 
      FROM notifications 
      WHERE id = $1
    `, [testNotification.id]);
    
    console.log('✅ Final notification state:', checkResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error debugging mark as read:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugMarkAsRead()
  .then(() => {
    console.log('🎉 Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });
