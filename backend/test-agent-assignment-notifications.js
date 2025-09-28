// test-agent-assignment-notifications.js
const pool = require('./config/db');
const Notification = require('./models/notificationModel');

async function testAgentAssignmentNotifications() {
  try {
    console.log('🧪 Testing agent assignment notifications...');
    
    // Get an agent user
    const agentResult = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'agent' LIMIT 1");
    
    if (agentResult.rows.length === 0) {
      console.log('❌ No agents found in database');
      return;
    }
    
    const agent = agentResult.rows[0];
    console.log('👤 Testing with agent:', agent);
    
    // Test property assignment notification
    console.log('🔔 Creating property assignment notification...');
    const assignmentNotification = await Notification.createNotification({
      user_id: agent.id,
      title: 'Property Assigned',
      message: 'You have been assigned to the property "Test Building - Agent Assignment".',
      type: 'info',
      entity_type: 'property',
      entity_id: 1
    });
    
    console.log('✅ Assignment notification created:', assignmentNotification);
    
    // Test property creation with agent assignment
    console.log('🏠 Testing property creation with agent assignment...');
    const propertyNotificationCount = await Notification.createPropertyNotification(
      1,
      'created',
      {
        building_name: 'Test Building with Agent',
        location: 'Test Location',
        reference_number: 'TEST123'
      },
      4 // Exclude user ID 4 (admin)
    );
    
    console.log(`✅ Created ${propertyNotificationCount} property notifications`);
    
    // Create specific assignment notification for agent
    const specificAssignment = await Notification.createNotification({
      user_id: agent.id,
      title: 'Property Assigned',
      message: 'You have been assigned to the property "Test Building with Agent".',
      type: 'info',
      entity_type: 'property',
      entity_id: 1
    });
    
    console.log('✅ Specific assignment notification created:', specificAssignment);
    
    // Check all notifications for the agent
    const agentNotifications = await Notification.getNotificationsByUserId(agent.id, { limit: 10 });
    console.log(`📬 Agent ${agent.name} has ${agentNotifications.length} notifications:`);
    
    agentNotifications.forEach(notification => {
      console.log(`  - ${notification.title}: ${notification.message}`);
    });
    
    // Check unread count for agent
    const unreadCount = await Notification.getUnreadCount(agent.id);
    console.log(`🔴 Agent has ${unreadCount} unread notifications`);
    
  } catch (error) {
    console.error('❌ Error testing agent assignment notifications:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testAgentAssignmentNotifications()
  .then(() => {
    console.log('🎉 Agent assignment notification test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
