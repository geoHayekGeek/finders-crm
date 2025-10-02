// scheduler/reminderScheduler.js
const cron = require('node-cron');
const ReminderService = require('../services/reminderService');

class ReminderScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  // Start the reminder scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Reminder scheduler is already running');
      return;
    }

    console.log('🚀 Starting reminder scheduler...');

    // Run every 15 minutes to check for reminders
    const reminderJob = cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ Running reminder check...');
      await ReminderService.processReminders();
    }, {
      scheduled: false
    });

    // Run cleanup every day at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running reminder cleanup...');
      await ReminderService.cleanupOldReminders();
    }, {
      scheduled: false
    });

    // Start the jobs
    reminderJob.start();
    cleanupJob.start();

    this.jobs.push(reminderJob, cleanupJob);
    this.isRunning = true;

    console.log('✅ Reminder scheduler started successfully');
    console.log('📅 Reminder checks: Every 15 minutes');
    console.log('🧹 Cleanup: Daily at 2:00 AM');
  }

  // Stop the reminder scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Reminder scheduler is not running');
      return;
    }

    console.log('🛑 Stopping reminder scheduler...');

    this.jobs.forEach(job => {
      job.stop();
    });

    this.jobs = [];
    this.isRunning = false;

    console.log('✅ Reminder scheduler stopped');
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.length,
      nextRun: this.jobs.length > 0 ? 'Every 15 minutes' : 'Not scheduled'
    };
  }

  // Run reminders immediately (for testing)
  async runNow() {
    console.log('🔄 Running reminders immediately...');
    await ReminderService.processReminders();
  }

  // Test email configuration
  async testEmail() {
    console.log('🧪 Testing email configuration...');
    const isValid = await ReminderService.testEmailConfiguration();
    if (isValid) {
      console.log('✅ Email configuration is working');
    } else {
      console.log('❌ Email configuration has issues');
    }
    return isValid;
  }
}

module.exports = new ReminderScheduler();
