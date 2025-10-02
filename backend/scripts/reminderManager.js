#!/usr/bin/env node
// scripts/reminderManager.js

const ReminderScheduler = require('../scheduler/reminderScheduler');
const ReminderService = require('../services/reminderService');
const pool = require('../config/db');

async function main() {
  const command = process.argv[2];
  const options = process.argv.slice(3);

  try {
    switch (command) {
      case 'start':
        await startScheduler();
        break;
      case 'stop':
        await stopScheduler();
        break;
      case 'status':
        await showStatus();
        break;
      case 'run':
        await runReminders();
        break;
      case 'test-email':
        await testEmail();
        break;
      case 'schedule-event':
        const eventId = options[0];
        if (!eventId) {
          console.log('❌ Please provide event ID: node reminderManager.js schedule-event <event_id>');
          process.exit(1);
        }
        await scheduleEventReminders(eventId);
        break;
      case 'cleanup':
        await cleanupReminders();
        break;
      case 'stats':
        await showStats();
        break;
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function startScheduler() {
  console.log('🚀 Starting reminder scheduler...');
  ReminderScheduler.start();
  console.log('✅ Reminder scheduler started');
  console.log('💡 Use Ctrl+C to stop the scheduler');
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping reminder scheduler...');
    ReminderScheduler.stop();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {}, 1000);
}

async function stopScheduler() {
  console.log('🛑 Stopping reminder scheduler...');
  ReminderScheduler.stop();
  console.log('✅ Reminder scheduler stopped');
}

async function showStatus() {
  const status = ReminderScheduler.getStatus();
  console.log('📊 Reminder Scheduler Status:');
  console.log(`   Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);
  console.log(`   Jobs: ${status.jobsCount}`);
  console.log(`   Next Run: ${status.nextRun}`);
}

async function runReminders() {
  console.log('🔄 Running reminders immediately...');
  await ReminderScheduler.runNow();
  console.log('✅ Reminders processed');
}

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  const isValid = await ReminderScheduler.testEmail();
  if (isValid) {
    console.log('✅ Email configuration is working');
  } else {
    console.log('❌ Email configuration has issues');
    console.log('💡 Check your .env file for EMAIL_* variables');
  }
}

async function scheduleEventReminders(eventId) {
  console.log(`📅 Scheduling reminders for event ${eventId}...`);
  await ReminderService.scheduleEventReminders(eventId);
  console.log('✅ Event reminders scheduled');
}

async function cleanupReminders() {
  console.log('🧹 Cleaning up old reminders...');
  await ReminderService.cleanupOldReminders();
  console.log('✅ Cleanup completed');
}

async function showStats() {
  console.log('📊 Reminder Statistics:');
  
  try {
    // Total reminders scheduled
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM reminder_tracking');
    console.log(`   Total Reminders: ${totalResult.rows[0].total}`);

    // Reminders by type
    const typeResult = await pool.query(`
      SELECT reminder_type, COUNT(*) as count 
      FROM reminder_tracking 
      GROUP BY reminder_type 
      ORDER BY reminder_type
    `);
    console.log('   By Type:');
    typeResult.rows.forEach(row => {
      console.log(`     ${row.reminder_type}: ${row.count}`);
    });

    // Sent vs Pending
    const sentResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
        COUNT(CASE WHEN notification_sent = true THEN 1 END) as notifications_sent,
        COUNT(CASE WHEN email_sent = false AND notification_sent = false THEN 1 END) as pending
      FROM reminder_tracking
    `);
    const stats = sentResult.rows[0];
    console.log('   Status:');
    console.log(`     Emails Sent: ${stats.emails_sent}`);
    console.log(`     Notifications Sent: ${stats.notifications_sent}`);
    console.log(`     Pending: ${stats.pending}`);

    // Recent activity
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent 
      FROM reminder_tracking 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    console.log(`   Last 24h: ${recentResult.rows[0].recent} reminders`);

  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
  }
}

function showHelp() {
  console.log(`
📅 Finders CRM Reminder Manager

Usage: node reminderManager.js <command> [options]

Commands:
  start                 Start the reminder scheduler
  stop                  Stop the reminder scheduler
  status                Show scheduler status
  run                   Run reminders immediately
  test-email            Test email configuration
  schedule-event <id>   Schedule reminders for specific event
  cleanup               Clean up old reminder records
  stats                 Show reminder statistics
  help                  Show this help message

Examples:
  node reminderManager.js start
  node reminderManager.js schedule-event 123
  node reminderManager.js stats
  node reminderManager.js test-email

Environment Variables Required:
  EMAIL_HOST            SMTP host (e.g., smtp.gmail.com)
  EMAIL_PORT            SMTP port (e.g., 587)
  EMAIL_USER            Your email address
  EMAIL_PASS            Your email password or app password
  EMAIL_FROM            From address (e.g., Finders CRM <noreply@finderscrm.com>)
  `);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  startScheduler,
  stopScheduler,
  showStatus,
  runReminders,
  testEmail,
  scheduleEventReminders,
  cleanupReminders,
  showStats
};
