// __tests__/services/reminderService.test.js
// Mock all dependencies BEFORE requiring the service
jest.mock('../../config/db', () => ({
  query: jest.fn()
}));
jest.mock('../../models/notificationModel', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 })
}));
jest.mock('../../services/emailService', () => ({
  sendViewingUpdateReminderEmail: jest.fn().mockResolvedValue(),
  sendReminderEmail: jest.fn().mockResolvedValue(),
  testEmailConfiguration: jest.fn().mockResolvedValue()
}));
jest.mock('../../models/settingsModel', () => ({
  isEmailNotificationsEnabled: jest.fn().mockResolvedValue(true),
  isEmailNotificationTypeEnabled: jest.fn().mockResolvedValue(true),
  isReminderEnabled: jest.fn().mockResolvedValue(true)
}));

// Now require the service and dependencies
const ReminderService = require('../../services/reminderService');
const pool = require('../../config/db');
const Notification = require('../../models/notificationModel');
const EmailService = require('../../services/emailService');
const Settings = require('../../models/settingsModel');
jest.mock('../../models/notificationModel', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 })
}));
jest.mock('../../services/emailService', () => ({
  sendViewingUpdateReminderEmail: jest.fn().mockResolvedValue(),
  sendReminderEmail: jest.fn().mockResolvedValue(),
  testEmailConfiguration: jest.fn().mockResolvedValue()
}));
jest.mock('../../models/settingsModel', () => ({
  isEmailNotificationsEnabled: jest.fn().mockResolvedValue(true),
  isEmailNotificationTypeEnabled: jest.fn().mockResolvedValue(true),
  isReminderEnabled: jest.fn().mockResolvedValue(true)
}));

describe('ReminderService', () => {
  beforeEach(() => {
    // Clear all mocks - this clears call history but implementations set in mock factory persist
    jest.clearAllMocks();
    
    // Reset service state
    ReminderService.isRunning = false;
    ReminderService.viewingReminderTableEnsured = false;
  });
  
  afterEach(() => {
    // Restore any spies
    jest.restoreAllMocks();
  });

  describe('processReminders', () => {
    it('should process all reminders successfully', async () => {
      const mockEvents = [
        { event_id: 1, user_id: 1, reminder_type: '1_day' }
      ];
      const mockViewings = [
        { viewing_id: 1, agent_id: 1 }
      ];

      jest.spyOn(ReminderService, 'getEventsNeedingRemindersDirect').mockResolvedValue(mockEvents);
      jest.spyOn(ReminderService, 'processEventReminder').mockResolvedValue();
      jest.spyOn(ReminderService, 'getViewingsNeedingUpdateReminders').mockResolvedValue(mockViewings);
      jest.spyOn(ReminderService, 'sendViewingUpdateReminder').mockResolvedValue();

      await ReminderService.processReminders();

      expect(ReminderService.processEventReminder).toHaveBeenCalledWith(mockEvents[0]);
      expect(ReminderService.sendViewingUpdateReminder).toHaveBeenCalledWith(mockViewings[0]);
      expect(ReminderService.isRunning).toBe(false);
    });

    it('should skip processing if already running', async () => {
      ReminderService.isRunning = true;

      await ReminderService.processReminders();

      const getEventsSpy = jest.spyOn(ReminderService, 'getEventsNeedingRemindersDirect');
      expect(getEventsSpy).not.toHaveBeenCalled();
      getEventsSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(ReminderService, 'getEventsNeedingRemindersDirect').mockRejectedValue(new Error('Database error'));

      await expect(ReminderService.processReminders()).resolves.not.toThrow();
      expect(ReminderService.isRunning).toBe(false);
    });
  });

  describe('processCalendarEventReminders', () => {
    it('should process calendar event reminders', async () => {
      const mockEvents = [
        { event_id: 1, user_id: 1, reminder_type: '1_day' },
        { event_id: 2, user_id: 2, reminder_type: 'same_day' }
      ];

      jest.spyOn(ReminderService, 'getEventsNeedingRemindersDirect').mockResolvedValue(mockEvents);
      jest.spyOn(ReminderService, 'processEventReminder').mockResolvedValue();

      await ReminderService.processCalendarEventReminders();

      expect(ReminderService.processEventReminder).toHaveBeenCalledTimes(2);
    });

    it('should handle empty events list', async () => {
      jest.spyOn(ReminderService, 'getEventsNeedingRemindersDirect').mockResolvedValue([]);
      jest.spyOn(ReminderService, 'processEventReminder').mockResolvedValue();

      await ReminderService.processCalendarEventReminders();

      expect(ReminderService.processEventReminder).not.toHaveBeenCalled();
    });
  });

  describe('processViewingUpdateReminders', () => {
    it('should process viewing update reminders', async () => {
      const mockViewings = [
        { viewing_id: 1, agent_id: 1 },
        { viewing_id: 2, agent_id: 2 }
      ];

      jest.spyOn(ReminderService, 'getViewingsNeedingUpdateReminders').mockResolvedValue(mockViewings);
      jest.spyOn(ReminderService, 'sendViewingUpdateReminder').mockResolvedValue();

      await ReminderService.processViewingUpdateReminders();

      expect(ReminderService.sendViewingUpdateReminder).toHaveBeenCalledTimes(2);
    });

    it('should handle errors', async () => {
      jest.spyOn(ReminderService, 'getViewingsNeedingUpdateReminders').mockRejectedValue(new Error('Database error'));

      await expect(ReminderService.processViewingUpdateReminders()).rejects.toThrow('Database error');
    });
  });

  describe('processEventReminder', () => {
    it('should process event reminder successfully', async () => {
      const eventData = {
        event_id: 1,
        user_id: 1,
        user_name: 'John Doe',
        user_email: 'john@example.com',
        event_title: 'Meeting',
        event_start_time: new Date(),
        event_end_time: new Date(),
        event_location: 'Office',
        event_description: 'Test meeting',
        reminder_type: '1_day',
        scheduled_time: new Date()
      };

      // Mock pool.query to return tracking ID for createReminderTracking and updateReminderTracking
      pool.query
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] })) // createReminderTracking
        .mockImplementation(() => Promise.resolve({ rows: [{ id: 1 }] })); // updateReminderTracking
      
      Notification.createNotification.mockResolvedValue({ id: 1 });
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);
      Settings.isReminderEnabled.mockResolvedValue(true);
      EmailService.sendReminderEmail.mockResolvedValue();

      await ReminderService.processEventReminder(eventData);

      expect(pool.query).toHaveBeenCalled();
      expect(Notification.createNotification).toHaveBeenCalled();
      expect(EmailService.sendReminderEmail).toHaveBeenCalled();
    });

    it('should skip processing if user_id is invalid', async () => {
      const eventData = {
        event_id: 1,
        user_id: null,
        reminder_type: '1_day'
      };

      const createReminderTrackingSpy = jest.spyOn(ReminderService, 'createReminderTracking');

      await ReminderService.processEventReminder(eventData);

      expect(createReminderTrackingSpy).not.toHaveBeenCalled();
      
      createReminderTrackingSpy.mockRestore();
    });

    it('should handle errors and update tracking', async () => {
      const eventData = {
        event_id: 1,
        user_id: 1,
        user_name: 'John Doe',
        reminder_type: '1_day',
        scheduled_time: new Date()
      };

      // Mock the methods that will be called
      const sendInAppNotificationSpy = jest.spyOn(ReminderService, 'sendInAppNotification').mockRejectedValue(new Error('Database error'));
      const sendEmailReminderSpy = jest.spyOn(ReminderService, 'sendEmailReminder').mockResolvedValue(false);
      
      // Mock createReminderTracking to succeed in catch block
      const createReminderTrackingSpy = jest.spyOn(ReminderService, 'createReminderTracking')
        .mockResolvedValue(1);
      
      const updateReminderTrackingSpy = jest.spyOn(ReminderService, 'updateReminderTracking')
        .mockResolvedValue();

      await ReminderService.processEventReminder(eventData);

      // Should attempt to create tracking record for failure in catch block
      expect(createReminderTrackingSpy).toHaveBeenCalled();
      expect(updateReminderTrackingSpy).toHaveBeenCalled();
      
      sendInAppNotificationSpy.mockRestore();
      sendEmailReminderSpy.mockRestore();
      createReminderTrackingSpy.mockRestore();
      updateReminderTrackingSpy.mockRestore();
    });
  });

  describe('createReminderTracking', () => {
    it('should create reminder tracking record', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rows: [{ id: 1 }] }));

      const result = await ReminderService.createReminderTracking(1, 1, '1_day', new Date());

      expect(pool.query).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should handle conflicts and update existing record', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rows: [{ id: 1 }] }));

      await ReminderService.createReminderTracking(1, 1, '1_day', new Date());

      expect(pool.query).toHaveBeenCalled();
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).toContain('ON CONFLICT');
      expect(Array.isArray(callArgs[1])).toBe(true);
    });

    it('should handle errors', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(ReminderService.createReminderTracking(1, 1, '1_day', new Date())).rejects.toThrow('Database error');
    });
  });

  describe('updateReminderTracking', () => {
    it('should update reminder tracking record', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));

      await ReminderService.updateReminderTracking(1, true, false);

      expect(pool.query).toHaveBeenCalled();
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).toContain('UPDATE reminder_tracking');
      expect(callArgs[1]).toEqual([true, false, 1]);
    });

    it('should handle errors', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(ReminderService.updateReminderTracking(1, true, false)).rejects.toThrow('Database error');
    });
  });

  describe('sendInAppNotification', () => {
    it('should send in-app notification successfully', async () => {
      Notification.createNotification.mockResolvedValue({ id: 1 });

      const result = await ReminderService.sendInAppNotification(1, 1, 'Meeting', new Date(), 'Office', '1_day');

      expect(Notification.createNotification).toHaveBeenCalledWith({
        user_id: 1,
        title: 'Calendar Reminder',
        message: expect.stringContaining('Reminder: Meeting'),
        type: 'info',
        entity_type: 'calendar_event',
        entity_id: 1
      });
      expect(result).toBe(true);
    });

    it('should handle different reminder types', async () => {
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await ReminderService.sendInAppNotification(1, 1, 'Meeting', new Date(), 'Office', 'same_day');
      expect(Notification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('is today')
        })
      );

      await ReminderService.sendInAppNotification(1, 1, 'Meeting', new Date(), 'Office', '1_hour');
      expect(Notification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('is in 1 hour')
        })
      );
    });

    it('should handle errors and return false', async () => {
      Notification.createNotification.mockRejectedValue(new Error('Database error'));

      const result = await ReminderService.sendInAppNotification(1, 1, 'Meeting', new Date(), 'Office', '1_day');

      expect(result).toBe(false);
    });
  });

  describe('sendEmailReminder', () => {
    it('should send email reminder when enabled', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);
      Settings.isReminderEnabled.mockResolvedValue(true);
      EmailService.sendReminderEmail.mockResolvedValue();

      const result = await ReminderService.sendEmailReminder(
        'john@example.com',
        'John Doe',
        'Meeting',
        new Date(),
        new Date(),
        'Office',
        'Description',
        '1_day'
      );

      expect(Settings.isEmailNotificationsEnabled).toHaveBeenCalled();
      expect(Settings.isEmailNotificationTypeEnabled).toHaveBeenCalledWith('calendar_events');
      expect(Settings.isReminderEnabled).toHaveBeenCalledWith('1_day');
      expect(EmailService.sendReminderEmail).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should skip email if notifications disabled globally', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(false);

      const result = await ReminderService.sendEmailReminder(
        'john@example.com',
        'John Doe',
        'Meeting',
        new Date(),
        new Date(),
        'Office',
        'Description',
        '1_day'
      );

      expect(result).toBe(false);
      expect(EmailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip email if calendar notifications disabled', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(false);

      const result = await ReminderService.sendEmailReminder(
        'john@example.com',
        'John Doe',
        'Meeting',
        new Date(),
        new Date(),
        'Office',
        'Description',
        '1_day'
      );

      expect(result).toBe(false);
      expect(EmailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip email if reminder type disabled', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);
      Settings.isReminderEnabled.mockResolvedValue(false);

      const result = await ReminderService.sendEmailReminder(
        'john@example.com',
        'John Doe',
        'Meeting',
        new Date(),
        new Date(),
        'Office',
        'Description',
        '1_day'
      );

      expect(result).toBe(false);
      expect(EmailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle errors and return false', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);
      Settings.isReminderEnabled.mockResolvedValue(true);
      EmailService.sendReminderEmail = jest.fn().mockRejectedValue(new Error('Email error'));

      const result = await ReminderService.sendEmailReminder(
        'john@example.com',
        'John Doe',
        'Meeting',
        new Date(),
        new Date(),
        'Office',
        'Description',
        '1_day'
      );

      expect(result).toBe(false);
    });
  });

  describe('scheduleEventReminders', () => {
    it('should schedule reminders for event', async () => {
      const mockEvent = {
        id: 1,
        start_time: new Date('2024-12-25T10:00:00'),
        created_by: 1
      };
      const mockUsers = [
        { id: 1, name: 'John', email: 'john@example.com' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [mockEvent] })
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValue({ rowCount: 1 });

      await ReminderService.scheduleEventReminders(1);

      // Should schedule reminders (1_day, same_day if applicable, 1_hour)
      expect(pool.query).toHaveBeenCalled();
    });

    it('should return early if event not found', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rows: [] }));

      const getEventUsersSpy = jest.spyOn(ReminderService, 'getEventUsers');

      await ReminderService.scheduleEventReminders(999);

      expect(getEventUsersSpy).not.toHaveBeenCalled();
      
      getEventUsersSpy.mockRestore();
    });

    it('should handle errors', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(ReminderService.scheduleEventReminders(1)).rejects.toThrow('Database error');
    });
  });

  describe('getEventUsers', () => {
    it('should get event users', async () => {
      const mockUsers = [
        { id: 1, name: 'John', email: 'john@example.com' }
      ];

      pool.query.mockImplementation(() => Promise.resolve({ rows: mockUsers }));

      const result = await ReminderService.getEventUsers(1);

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array on error', async () => {
      pool.query.mockImplementationOnce(() => Promise.reject(new Error('Database error')));

      const result = await ReminderService.getEventUsers(1);

      expect(result).toEqual([]);
    });
  });

  describe('scheduleReminder', () => {
    it('should schedule a reminder', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));

      await ReminderService.scheduleReminder(1, 1, '1_day', new Date());

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reminder_tracking'),
        expect.any(Array)
      );
    });

    it('should handle errors', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      try {
        await ReminderService.scheduleReminder(1, 1, '1_day', new Date());
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });
  });

  describe('cleanupOldReminders', () => {
    it('should cleanup old reminders', async () => {
      pool.query
        .mockResolvedValueOnce({ rowCount: 5 })
        .mockResolvedValueOnce({ rowCount: 3 });

      jest.spyOn(ReminderService, 'ensureViewingReminderTable').mockResolvedValue();

      await ReminderService.cleanupOldReminders();

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(ReminderService.ensureViewingReminderTable).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(ReminderService.cleanupOldReminders()).resolves.not.toThrow();
    });
  });

  describe('resetReminderTrackingForType', () => {
    it('should reset reminder tracking for type', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 10 }));

      const result = await ReminderService.resetReminderTrackingForType('1_day');

      expect(pool.query).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it('should handle errors', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(ReminderService.resetReminderTrackingForType('1_day')).rejects.toThrow('Database error');
    });
  });

  describe('sendViewingUpdateReminder', () => {
    it('should send viewing update reminder', async () => {
      const viewing = {
        viewing_id: 1,
        agent_id: 1,
        agent_name: 'John Doe',
        agent_email: 'john@example.com',
        property_reference: 'PROP001',
        property_location: 'Beirut',
        lead_name: 'Jane Smith',
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        last_activity_date: '2023-12-15',
        reminder_count: 0
      };

      Notification.createNotification.mockResolvedValue({ id: 1 });
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));
      
      // Mock ensureViewingReminderTable to avoid database calls
      jest.spyOn(ReminderService, 'ensureViewingReminderTable').mockResolvedValue();
      
      // Don't spy on the internal methods - let them run normally so we can verify their effects
      await ReminderService.sendViewingUpdateReminder(viewing);

      // Verify the methods were called by checking their effects
      // createViewingUpdateNotification calls Notification.createNotification
      expect(Notification.createNotification).toHaveBeenCalled();
      // recordViewingReminder calls pool.query (only if email or notification was sent)
      // Since we're mocking both to succeed, recordViewingReminder should be called
      expect(pool.query).toHaveBeenCalled();
    });

    it('should skip if no agent_id', async () => {
      const viewing = {
        viewing_id: 1,
        agent_id: null
      };

      const createViewingUpdateNotificationSpy = jest.spyOn(ReminderService, 'createViewingUpdateNotification');

      await ReminderService.sendViewingUpdateReminder(viewing);

      expect(createViewingUpdateNotificationSpy).not.toHaveBeenCalled();
      
      createViewingUpdateNotificationSpy.mockRestore();
    });
  });

  describe('createViewingUpdateNotification', () => {
    it('should create viewing update notification', async () => {
      Notification.createNotification = jest.fn().mockResolvedValue({ id: 1 });

      const result = await ReminderService.createViewingUpdateNotification({
        viewingId: 1,
        agentId: 1,
        propertyReference: 'PROP001',
        propertyLocation: 'Beirut',
        leadName: 'Jane Smith',
        lastActivityDate: '2023-12-15'
      });

      expect(Notification.createNotification).toHaveBeenCalledWith({
        user_id: 1,
        title: 'Viewing Update Required',
        message: expect.stringContaining('PROP001'),
        type: 'warning',
        entity_type: 'viewing',
        entity_id: 1
      });
      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      Notification.createNotification.mockRejectedValue(new Error('Database error'));

      const result = await ReminderService.createViewingUpdateNotification({
        viewingId: 1,
        agentId: 1
      });

      expect(result).toBe(false);
    });
  });

  describe('trySendViewingUpdateEmail', () => {
    it('should send email when enabled', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(true);
      Settings.isEmailNotificationTypeEnabled.mockResolvedValue(true);

      const result = await ReminderService.trySendViewingUpdateEmail(
        'john@example.com',
        'John Doe',
        { propertyReference: 'PROP001' }
      );

      expect(result).toBe(true);
      expect(EmailService.sendViewingUpdateReminderEmail).toHaveBeenCalled();
    });

    it('should return false if no email', async () => {
      const result = await ReminderService.trySendViewingUpdateEmail(
        null,
        'John Doe',
        {}
      );

      expect(result).toBe(false);
    });

    it('should return false if notifications disabled', async () => {
      Settings.isEmailNotificationsEnabled.mockResolvedValue(false);

      const result = await ReminderService.trySendViewingUpdateEmail(
        'john@example.com',
        'John Doe',
        {}
      );

      expect(result).toBe(false);
    });
  });

  describe('clearViewingReminder', () => {
    it('should clear viewing reminder for specific agent', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));
      jest.spyOn(ReminderService, 'ensureViewingReminderTable').mockResolvedValue();

      await ReminderService.clearViewingReminder(1, 1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM viewing_update_reminders'),
        [1, 1]
      );
    });

    it('should clear viewing reminder for all agents', async () => {
      pool.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));
      jest.spyOn(ReminderService, 'ensureViewingReminderTable').mockResolvedValue();

      await ReminderService.clearViewingReminder(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM viewing_update_reminders'),
        [1]
      );
    });

    it('should handle errors gracefully', async () => {
      pool.query.mockImplementation(() => Promise.reject(new Error('Database error')));
      jest.spyOn(ReminderService, 'ensureViewingReminderTable').mockResolvedValue();

      await expect(ReminderService.clearViewingReminder(1)).resolves.not.toThrow();
    });
  });

  describe('testEmailConfiguration', () => {
    it('should test email configuration', async () => {
      EmailService.testEmailConfiguration.mockResolvedValue(true);

      const result = await ReminderService.testEmailConfiguration();

      expect(EmailService.testEmailConfiguration).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});

