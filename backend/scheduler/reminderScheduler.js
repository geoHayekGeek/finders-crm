// scheduler/reminderScheduler.js
const cron = require('node-cron');
const ReminderService = require('../services/reminderService');
const logger = require('../utils/logger');

class ReminderScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  // Start the reminder scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Reminder scheduler is already running');
      return;
    }

    logger.info('Starting reminder scheduler...');

    // Get cron schedule from environment variable (default: every 5 minutes in production, every 1 minute in development)
    const reminderCronSchedule = process.env.REMINDER_CRON_SCHEDULE || 
      (process.env.NODE_ENV === 'production' ? '*/5 * * * *' : '* * * * *');
    
    // Run reminder check job
    const reminderJob = cron.schedule(reminderCronSchedule, async () => {
      logger.debug('Running reminder check...');
      try {
        await ReminderService.processReminders();
      } catch (error) {
        logger.error('Error in reminder job execution', error);
        // Audit log: Job execution failure
        logger.security('Reminder job execution failed', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }, {
      scheduled: false
    });

    // Run cleanup every day at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      logger.debug('Running reminder cleanup...');
      try {
        await ReminderService.cleanupOldReminders();
      } catch (error) {
        logger.error('Error in cleanup job execution', error);
        // Audit log: Cleanup job failure
        logger.security('Cleanup job execution failed', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }, {
      scheduled: false
    });

    // Start the jobs
    reminderJob.start();
    cleanupJob.start();

    this.jobs.push(reminderJob, cleanupJob);
    this.isRunning = true;

    // Audit log: Scheduler started
    logger.security('Reminder scheduler started', {
      reminderSchedule: reminderCronSchedule,
      cleanupSchedule: '0 2 * * *',
      timestamp: new Date().toISOString()
    });

    logger.info('Reminder scheduler started successfully');
    logger.info(`Reminder checks: ${reminderCronSchedule}`);
    logger.info('Cleanup: Daily at 2:00 AM');
  }

  // Stop the reminder scheduler
  stop() {
    if (!this.isRunning) {
      logger.warn('Reminder scheduler is not running');
      return;
    }

    logger.info('Stopping reminder scheduler...');

    this.jobs.forEach(job => {
      job.stop();
    });

    this.jobs = [];
    this.isRunning = false;

    // Audit log: Scheduler stopped
    logger.security('Reminder scheduler stopped', {
      timestamp: new Date().toISOString()
    });

    logger.info('Reminder scheduler stopped');
  }

  // Get scheduler status
  getStatus() {
    const reminderSchedule = process.env.REMINDER_CRON_SCHEDULE || 
      (process.env.NODE_ENV === 'production' ? '*/5 * * * *' : '* * * * *');
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.length,
      reminderSchedule,
      cleanupSchedule: '0 2 * * *'
    };
  }

  // Run reminders immediately (for testing)
  async runNow() {
    logger.debug('Running reminders immediately...');
    await ReminderService.processReminders();
  }

  // Test email configuration
  async testEmail() {
    logger.debug('Testing email configuration...');
    const isValid = await ReminderService.testEmailConfiguration();
    if (isValid) {
      logger.info('Email configuration is working');
    } else {
      logger.warn('Email configuration has issues');
    }
    return isValid;
  }
}

module.exports = new ReminderScheduler();
