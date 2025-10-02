const pool = require('./config/db');
const Notification = require('./models/notificationModel');

async function debugNotificationCreation() {
  try {
    console.log('🔍 Debugging notification creation...');
    
    // First, let's check if the functions exist
    console.log('\n1. Checking if notification functions exist...');
    const functionCheck = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname IN ('create_notification_for_users', 'get_property_notification_users')
    `);
    
    console.log('Functions found:', functionCheck.rows.map(row => row.proname));
    
    // Test the get_property_notification_users function
    console.log('\n2. Testing get_property_notification_users function...');
    const testPropertyId = 1; // Use a property that exists
    const testExcludeUserId = null;
    
    try {
      const users = await pool.query(
        'SELECT * FROM get_property_notification_users($1, $2)',
        [testPropertyId, testExcludeUserId]
      );
      console.log('✅ get_property_notification_users result:', users.rows);
    } catch (error) {
      console.error('❌ Error testing get_property_notification_users:', error.message);
    }
    
    // Test creating a notification manually
    console.log('\n3. Testing manual notification creation...');
    try {
      const testNotification = await Notification.createNotification({
        user_id: 1, // Assuming user 1 is admin
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works',
        type: 'info',
        entity_type: 'property',
        entity_id: testPropertyId
      });
      console.log('✅ Manual notification created:', testNotification);
    } catch (error) {
      console.error('❌ Error creating manual notification:', error.message);
    }
    
    // Test the createPropertyNotification function
    console.log('\n4. Testing createPropertyNotification function...');
    try {
      const notificationCount = await Notification.createPropertyNotification(
        testPropertyId,
        'created',
        {
          building_name: 'Test Building',
          location: 'Test Location'
        },
        1 // actorUserId
      );
      console.log('✅ createPropertyNotification result:', notificationCount);
    } catch (error) {
      console.error('❌ Error testing createPropertyNotification:', error.message);
    }
    
    // Check what users exist and their roles
    console.log('\n5. Checking users and their roles...');
    const users = await pool.query('SELECT id, name, role FROM users ORDER BY id');
    console.log('Users in database:', users.rows);
    
    // Check if there are any notifications in the database
    console.log('\n6. Checking existing notifications...');
    const notifications = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    console.log('Recent notifications:', notifications.rows);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugNotificationCreation();