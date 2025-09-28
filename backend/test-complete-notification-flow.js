// test-complete-notification-flow.js
const pool = require('./config/db');
const Notification = require('./models/notificationModel');

async function testCompleteNotificationFlow() {
  try {
    console.log('🧪 Testing complete notification flow...');
    
    // Get an agent user
    const agentResult = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'agent' LIMIT 1");
    const agent = agentResult.rows[0];
    
    // Get an admin user
    const adminResult = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1");
    const admin = adminResult.rows[0];
    
    console.log('👤 Testing with agent:', agent.name);
    console.log('👤 Testing with admin:', admin.name);
    
    // Clear existing notifications for clean test
    await pool.query('DELETE FROM notifications WHERE user_id IN ($1, $2)', [agent.id, admin.id]);
    console.log('🧹 Cleared existing notifications');
    
    // Test 1: Property creation with agent assignment
    console.log('\n📝 Test 1: Property creation with agent assignment');
    const propertyNotificationCount = await Notification.createPropertyNotification(
      1,
      'created',
      {
        building_name: 'Luxury Apartment',
        location: 'Beirut Central District',
        reference_number: 'APT001'
      },
      admin.id // Exclude admin from general notifications
    );
    
    console.log(`✅ Created ${propertyNotificationCount} general property notifications`);
    
    // Create specific assignment notification for agent
    const assignmentNotification = await Notification.createNotification({
      user_id: agent.id,
      title: 'Property Assigned',
      message: 'You have been assigned to the property "Luxury Apartment".',
      type: 'info',
      entity_type: 'property',
      entity_id: 1
    });
    
    console.log('✅ Created specific assignment notification for agent');
    
    // Check notifications for admin
    const adminNotifications = await Notification.getNotificationsByUserId(admin.id, { limit: 10 });
    console.log(`\n📬 Admin (${admin.name}) notifications:`);
    adminNotifications.forEach(notification => {
      console.log(`  - ${notification.title}: ${notification.message}`);
    });
    
    // Check notifications for agent
    const agentNotifications = await Notification.getNotificationsByUserId(agent.id, { limit: 10 });
    console.log(`\n📬 Agent (${agent.name}) notifications:`);
    agentNotifications.forEach(notification => {
      console.log(`  - ${notification.title}: ${notification.message}`);
    });
    
    // Test 2: Property update with agent reassignment
    console.log('\n📝 Test 2: Property update with agent reassignment');
    
    // Simulate agent reassignment
    const reassignmentNotification = await Notification.createNotification({
      user_id: agent.id,
      title: 'Property Assigned',
      message: 'You have been assigned to the property "Luxury Apartment" (updated).',
      type: 'info',
      entity_type: 'property',
      entity_id: 1
    });
    
    console.log('✅ Created reassignment notification');
    
    // Test 3: Check notification counts
    const adminUnreadCount = await Notification.getUnreadCount(admin.id);
    const agentUnreadCount = await Notification.getUnreadCount(agent.id);
    
    console.log(`\n📊 Notification counts:`);
    console.log(`  - Admin unread: ${adminUnreadCount}`);
    console.log(`  - Agent unread: ${agentUnreadCount}`);
    
    // Test 4: Mark some notifications as read
    if (agentNotifications.length > 0) {
      await Notification.markAsRead(agentNotifications[0].id, agent.id);
      console.log('✅ Marked first agent notification as read');
    }
    
    const finalAgentUnreadCount = await Notification.getUnreadCount(agent.id);
    console.log(`  - Agent unread after marking one as read: ${finalAgentUnreadCount}`);
    
    console.log('\n🎉 Complete notification flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing notification flow:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testCompleteNotificationFlow()
  .then(() => {
    console.log('🎉 All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
