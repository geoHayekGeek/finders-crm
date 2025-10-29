// Script to test email notification system
const pool = require('../config/db');
const emailService = require('../services/emailService');
const Settings = require('../models/settingsModel');

async function testEmailNotifications() {
  try {
    console.log('🧪 EMAIL NOTIFICATION SYSTEM TEST\n');
    console.log('='.repeat(50));
    
    // Step 1: Check current settings
    console.log('\n📋 STEP 1: Checking Current Settings\n');
    
    const emailKeys = [
      'email_notifications_enabled',
      'email_notifications_calendar_events',
      'email_notifications_viewings',
      'email_notifications_properties',
      'email_notifications_leads',
      'email_notifications_users',
      'reminder_1_day_before',
      'reminder_same_day',
      'reminder_1_hour_before',
      'smtp_host',
      'smtp_port',
      'smtp_user',
      'email_from_name',
      'email_from_address'
    ];
    
    const settings = await Settings.getByKeys(emailKeys);
    console.log('Current Email Settings:');
    settings.forEach(setting => {
      const value = setting.setting_key.includes('pass') 
        ? '••••••••••••••••' 
        : setting.setting_value;
      console.log(`  ${setting.setting_key}: ${value}`);
    });
    
    // Step 2: Test SMTP Configuration
    console.log('\n📋 STEP 2: Testing SMTP Configuration\n');
    
    try {
      const isValid = await emailService.testEmailConfiguration();
      if (isValid) {
        console.log('✅ SMTP configuration is VALID');
      } else {
        console.log('❌ SMTP configuration is INVALID');
      }
    } catch (error) {
      console.log('❌ SMTP test failed:', error.message);
    }
    
    // Step 3: Test Settings Checks
    console.log('\n📋 STEP 3: Testing Settings Checks\n');
    
    const globalEnabled = await Settings.isEmailNotificationsEnabled();
    console.log(`Global Email Notifications: ${globalEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    
    const calendarEnabled = await Settings.isEmailNotificationTypeEnabled('calendar_events');
    console.log(`Calendar Event Notifications: ${calendarEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    
    const viewingsEnabled = await Settings.isEmailNotificationTypeEnabled('viewings');
    console.log(`Viewings Notifications: ${viewingsEnabled ? '✅ Enabled' : '❌ Disabled'} [NOT IMPLEMENTED]`);
    
    const propertiesEnabled = await Settings.isEmailNotificationTypeEnabled('properties');
    console.log(`Properties Notifications: ${propertiesEnabled ? '✅ Enabled' : '❌ Disabled'} [NOT IMPLEMENTED]`);
    
    const leadsEnabled = await Settings.isEmailNotificationTypeEnabled('leads');
    console.log(`Leads Notifications: ${leadsEnabled ? '✅ Enabled' : '❌ Disabled'} [NOT IMPLEMENTED]`);
    
    const usersEnabled = await Settings.isEmailNotificationTypeEnabled('users');
    console.log(`Users Notifications: ${usersEnabled ? '✅ Enabled' : '❌ Disabled'} [NOT IMPLEMENTED]`);
    
    // Step 4: Test Reminder Type Settings
    console.log('\n📋 STEP 4: Testing Reminder Type Settings\n');
    
    const reminder1Day = await Settings.isReminderEnabled('1_day');
    console.log(`1 Day Before Reminder: ${reminder1Day ? '✅ Enabled' : '❌ Disabled'}`);
    
    const reminderSameDay = await Settings.isReminderEnabled('same_day');
    console.log(`Same Day Reminder: ${reminderSameDay ? '✅ Enabled' : '❌ Disabled'}`);
    
    const reminder1Hour = await Settings.isReminderEnabled('1_hour');
    console.log(`1 Hour Before Reminder: ${reminder1Hour ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Step 5: Check for test users
    console.log('\n📋 STEP 5: Checking for Test User\n');
    
    const userResult = await pool.query(`
      SELECT id, name, email, role 
      FROM users 
      WHERE is_active = true 
      ORDER BY id 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No active users found. Cannot create test event.');
      return;
    }
    
    const testUser = userResult.rows[0];
    console.log(`Test User: ${testUser.name} (${testUser.email})`);
    
    // Step 6: Send a test email directly
    console.log('\n📋 STEP 6: Sending Test Email\n');
    
    if (!globalEnabled) {
      console.log('⚠️  Global email notifications are disabled. Skipping test email.');
    } else if (!calendarEnabled) {
      console.log('⚠️  Calendar event notifications are disabled. Skipping test email.');
    } else {
      try {
        console.log(`Sending test email to: ${testUser.email}`);
        await emailService.sendTestEmail(testUser.email);
        console.log('✅ Test email sent successfully!');
        console.log('   Check your inbox for the test message.');
      } catch (error) {
        console.log('❌ Failed to send test email:', error.message);
      }
    }
    
    // Step 7: Test Calendar Event Email (if settings allow)
    console.log('\n📋 STEP 7: Testing Calendar Event Email\n');
    
    if (!globalEnabled || !calendarEnabled) {
      console.log('⚠️  Email notifications are disabled. Cannot test calendar event email.');
      console.log('   Enable settings and run test again.');
    } else {
      const testEventData = {
        title: 'Test Calendar Event',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        location: 'Test Location',
        description: 'This is a test event for email notifications'
      };
      
      try {
        console.log('Sending 1-hour reminder email...');
        await emailService.sendReminderEmail(
          testUser.email,
          testUser.name,
          testEventData,
          '1_hour'
        );
        console.log('✅ Calendar event email sent successfully!');
        console.log('   Check your inbox for the reminder email.');
      } catch (error) {
        console.log('❌ Failed to send calendar event email:', error.message);
      }
    }
    
    // Step 8: Check recent calendar events
    console.log('\n📋 STEP 8: Checking Recent Calendar Events\n');
    
    const eventsResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        ce.created_at,
        u.name as creator_name
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      ORDER BY ce.created_at DESC
      LIMIT 5
    `);
    
    if (eventsResult.rows.length > 0) {
      console.log('Recent Calendar Events:');
      console.table(eventsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        start_time: row.start_time.toLocaleString(),
        creator: row.creator_name
      })));
    } else {
      console.log('No calendar events found.');
    }
    
    // Step 9: Check reminder tracking
    console.log('\n📋 STEP 9: Checking Reminder Tracking\n');
    
    const trackingResult = await pool.query(`
      SELECT 
        rt.id,
        rt.event_id,
        rt.reminder_type,
        rt.email_sent,
        rt.notification_sent,
        rt.created_at,
        ce.title as event_title
      FROM reminder_tracking rt
      JOIN calendar_events ce ON ce.id = rt.event_id
      ORDER BY rt.created_at DESC
      LIMIT 5
    `);
    
    if (trackingResult.rows.length > 0) {
      console.log('Recent Reminder Tracking:');
      console.table(trackingResult.rows.map(row => ({
        id: row.id,
        event: row.event_title,
        type: row.reminder_type,
        email_sent: row.email_sent ? '✅' : '❌',
        notif_sent: row.notification_sent ? '✅' : '❌',
        created: row.created_at.toLocaleString()
      })));
    } else {
      console.log('No reminder tracking records found.');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY\n');
    
    console.log('✅ Implemented Email Notifications:');
    console.log('   - Calendar Event Reminders (1 day, same day, 1 hour)');
    console.log('   - Password Reset Emails');
    console.log('   - Test Emails');
    
    console.log('\n❌ NOT Implemented (In-App Only):');
    console.log('   - Viewings notifications');
    console.log('   - Properties notifications');
    console.log('   - Leads notifications');
    console.log('   - Users notifications');
    
    console.log('\n💡 Recommendations:');
    if (!globalEnabled) {
      console.log('   ⚠️  Enable "Email Notifications" in Settings → Email Automation');
    }
    if (!calendarEnabled) {
      console.log('   ⚠️  Enable "Calendar Events" in Settings → Email Automation');
    }
    if (!reminder1Day && !reminderSameDay && !reminder1Hour) {
      console.log('   ⚠️  Enable at least one reminder type in Settings → Email Automation');
    }
    if (globalEnabled && calendarEnabled && (reminder1Day || reminderSameDay || reminder1Hour)) {
      console.log('   ✅ Email notification system is properly configured!');
      console.log('   ✅ Create calendar events to test reminders');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Check your email inbox for test messages');
    console.log('   2. Create a calendar event to test reminders');
    console.log('   3. Run "node scripts/check-reminders.js" to see pending reminders');
    console.log('   4. Monitor backend logs for email sending activity');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('\n✅ Test completed');
  }
}

testEmailNotifications();

