// backend/__tests__/scheduler/reminderScheduler.test.js
// Unit tests for Reminder Scheduler

const reminderScheduler = require('../../scheduler/reminderScheduler');
const ReminderService = require('../../services/reminderService');

// Mock dependencies
jest.mock('../../services/reminderService');
jest.mock('node-cron');

describe('ReminderScheduler', () => {
  let mockCronJob;
  let mockReminderJob;
  let mockCleanupJob;

  beforeEach(() => {
    // Create separate mock jobs for reminder and cleanup
    mockReminderJob = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn()
    };

    mockCleanupJob = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn()
    };

    // Mock node-cron to return different jobs based on schedule
    const cron = require('node-cron');
    cron.schedule = jest.fn().mockImplementation((schedule) => {
      if (schedule === '* * * * *') {
        return mockReminderJob;
      } else if (schedule === '0 2 * * *') {
        return mockCleanupJob;
      }
      return mockReminderJob;
    });

    // Reset scheduler state
    reminderScheduler.jobs = [];
    reminderScheduler.isRunning = false;

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up - stop scheduler if running
    if (reminderScheduler.isRunning) {
      reminderScheduler.stop();
    }
  });

  describe('start', () => {
    it('should start the reminder scheduler successfully', () => {
      const cron = require('node-cron');
      
      reminderScheduler.start();

      expect(cron.schedule).toHaveBeenCalledTimes(2); // Reminder check + cleanup
      expect(mockReminderJob.start).toHaveBeenCalled();
      expect(mockCleanupJob.start).toHaveBeenCalled();
      expect(reminderScheduler.isRunning).toBe(true);
      expect(reminderScheduler.jobs.length).toBe(2);
    });

    it('should not start if already running', () => {
      const cron = require('node-cron');
      const initialCallCount = cron.schedule.mock.calls.length;

      reminderScheduler.start();
      reminderScheduler.start(); // Second call

      // Should only schedule jobs once
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(reminderScheduler.jobs.length).toBe(2);
    });

    it('should schedule reminder check job to run every minute', () => {
      const cron = require('node-cron');
      
      reminderScheduler.start();

      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
        { scheduled: false }
      );
    });

    it('should schedule cleanup job to run daily at 2 AM', () => {
      const cron = require('node-cron');
      
      reminderScheduler.start();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        { scheduled: false }
      );
    });

    it('should execute processReminders when reminder job runs', async () => {
      const cron = require('node-cron');
      let reminderCallback;

      cron.schedule.mockImplementation((schedule, callback) => {
        if (schedule === '* * * * *') {
          reminderCallback = callback;
          return mockReminderJob;
        }
        return mockCleanupJob;
      });

      reminderScheduler.start();
      
      // Execute the callback
      await reminderCallback();

      expect(ReminderService.processReminders).toHaveBeenCalled();
    });

    it('should execute cleanupOldReminders when cleanup job runs', async () => {
      const cron = require('node-cron');
      let cleanupCallback;

      cron.schedule.mockImplementation((schedule, callback) => {
        if (schedule === '0 2 * * *') {
          cleanupCallback = callback;
          return mockCleanupJob;
        }
        return mockReminderJob;
      });

      reminderScheduler.start();
      
      // Execute the callback
      await cleanupCallback();

      expect(ReminderService.cleanupOldReminders).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the reminder scheduler successfully', () => {
      reminderScheduler.start();
      expect(reminderScheduler.isRunning).toBe(true);

      reminderScheduler.stop();

      expect(mockReminderJob.stop).toHaveBeenCalled();
      expect(mockCleanupJob.stop).toHaveBeenCalled();
      expect(reminderScheduler.isRunning).toBe(false);
      expect(reminderScheduler.jobs.length).toBe(0);
    });

    it('should not stop if not running', () => {
      expect(reminderScheduler.isRunning).toBe(false);

      reminderScheduler.stop();

      expect(mockReminderJob.stop).not.toHaveBeenCalled();
      expect(mockCleanupJob.stop).not.toHaveBeenCalled();
    });

    it('should clear jobs array when stopped', () => {
      reminderScheduler.start();
      expect(reminderScheduler.jobs.length).toBe(2);

      reminderScheduler.stop();

      expect(reminderScheduler.jobs.length).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not running', () => {
      const status = reminderScheduler.getStatus();

      expect(status).toEqual({
        isRunning: false,
        jobsCount: 0,
        nextRun: 'Not scheduled'
      });
    });

    it('should return correct status when running', () => {
      reminderScheduler.start();
      const status = reminderScheduler.getStatus();

      expect(status).toEqual({
        isRunning: true,
        jobsCount: 2,
        nextRun: 'Every 1 minute'
      });
    });
  });

  describe('runNow', () => {
    it('should execute processReminders immediately', async () => {
      await reminderScheduler.runNow();

      expect(ReminderService.processReminders).toHaveBeenCalled();
    });

    it('should handle errors when processing reminders', async () => {
      const error = new Error('Processing failed');
      ReminderService.processReminders.mockRejectedValue(error);

      await expect(reminderScheduler.runNow()).rejects.toThrow('Processing failed');
    });
  });

  describe('testEmail', () => {
    it('should test email configuration successfully', async () => {
      ReminderService.testEmailConfiguration.mockResolvedValue(true);

      const result = await reminderScheduler.testEmail();

      expect(ReminderService.testEmailConfiguration).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when email configuration is invalid', async () => {
      ReminderService.testEmailConfiguration.mockResolvedValue(false);

      const result = await reminderScheduler.testEmail();

      expect(ReminderService.testEmailConfiguration).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle errors when testing email configuration', async () => {
      const error = new Error('Email test failed');
      ReminderService.testEmailConfiguration.mockRejectedValue(error);

      await expect(reminderScheduler.testEmail()).rejects.toThrow('Email test failed');
    });
  });

  describe('idempotency', () => {
    it('should handle multiple start calls gracefully', () => {
      reminderScheduler.start();
      reminderScheduler.start();
      reminderScheduler.start();

      expect(reminderScheduler.isRunning).toBe(true);
      expect(reminderScheduler.jobs.length).toBe(2); // Should not accumulate jobs
    });

    it('should handle multiple stop calls gracefully', () => {
      reminderScheduler.start();
      reminderScheduler.stop();
      reminderScheduler.stop();
      reminderScheduler.stop();

      expect(reminderScheduler.isRunning).toBe(false);
      expect(reminderScheduler.jobs.length).toBe(0);
    });

    it('should allow restart after stop', () => {
      reminderScheduler.start();
      expect(reminderScheduler.isRunning).toBe(true);

      reminderScheduler.stop();
      expect(reminderScheduler.isRunning).toBe(false);

      reminderScheduler.start();
      expect(reminderScheduler.isRunning).toBe(true);
    });
  });
});

