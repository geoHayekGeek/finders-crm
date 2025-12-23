const Notification = require('../../models/notificationModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Notification Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notificationData = {
        user_id: 1,
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        entity_type: 'property',
        entity_id: 1
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...notificationData }]
      });

      const result = await Notification.createNotification(notificationData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          notificationData.user_id,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          notificationData.entity_type,
          notificationData.entity_id
        ]
      );
      expect(result).toEqual({ id: 1, ...notificationData });
    });

    it('should use default type if not provided', async () => {
      const notificationData = {
        user_id: 1,
        title: 'Test',
        message: 'Test message',
        entity_type: 'property'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...notificationData, type: 'info' }]
      });

      await Notification.createNotification(notificationData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['info'])
      );
    });
  });

  describe('createNotificationForUsers', () => {
    it('should create notifications for multiple users', async () => {
      const userIds = [1, 2, 3];
      const notificationData = {
        title: 'Test',
        message: 'Test message',
        type: 'info',
        entity_type: 'property',
        entity_id: 1
      };

      mockQuery.mockResolvedValue({
        rows: [{ notification_count: 3 }]
      });

      const result = await Notification.createNotificationForUsers(userIds, notificationData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('create_notification_for_users'),
        [
          userIds,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          notificationData.entity_type,
          notificationData.entity_id
        ]
      );
      expect(result).toBe(3);
    });
  });

  describe('getNotificationsByUserId', () => {
    it('should get notifications for a user', async () => {
      const userId = 1;
      const mockNotifications = [{ id: 1, user_id: userId }];

      mockQuery.mockResolvedValue({ rows: mockNotifications });

      const result = await Notification.getNotificationsByUserId(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.user_id = $1'),
        expect.any(Array)
      );
      expect(result).toEqual(mockNotifications);
    });

    it('should filter unread notifications', async () => {
      const userId = 1;
      const options = { unreadOnly: true };

      mockQuery.mockResolvedValue({ rows: [] });

      await Notification.getNotificationsByUserId(userId, options);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND n.is_read = $2'),
        expect.arrayContaining([userId, false])
      );
    });

    it('should filter by entity type', async () => {
      const userId = 1;
      const options = { entityType: 'property' };

      mockQuery.mockResolvedValue({ rows: [] });

      await Notification.getNotificationsByUserId(userId, options);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND n.entity_type = $2'),
        expect.arrayContaining([userId, 'property'])
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      const userId = 1;

      mockQuery.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      const result = await Notification.getUnreadCount(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [userId]
      );
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 1;
      const userId = 1;
      const mockNotification = { id: notificationId, is_read: true };

      mockQuery.mockResolvedValue({ rows: [mockNotification] });

      const result = await Notification.markAsRead(notificationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [notificationId, userId]
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const userId = 1;

      mockQuery.mockResolvedValue({ rowCount: 5 });

      const result = await Notification.markAllAsRead(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [userId]
      );
      expect(result).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notificationId = 1;
      const userId = 1;
      const mockNotification = { id: notificationId };

      mockQuery.mockResolvedValue({ rows: [mockNotification] });

      const result = await Notification.deleteNotification(notificationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        [notificationId, userId]
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getPropertyNotificationUsers', () => {
    it('should get users who should be notified for property changes', async () => {
      const propertyId = 1;
      const mockUsers = [{ user_id: 1 }, { user_id: 2 }];

      mockQuery.mockResolvedValue({ rows: mockUsers });

      const result = await Notification.getPropertyNotificationUsers(propertyId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('get_property_notification_users'),
        [propertyId, null]
      );
      expect(result).toEqual(mockUsers);
    });

    it('should exclude a user if provided', async () => {
      const propertyId = 1;
      const excludeUserId = 1;

      mockQuery.mockResolvedValue({ rows: [] });

      await Notification.getPropertyNotificationUsers(propertyId, excludeUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('get_property_notification_users'),
        [propertyId, excludeUserId]
      );
    });
  });

  describe('createPropertyNotification', () => {
    it('should create property notification for created action', async () => {
      const propertyId = 1;
      const action = 'created';
      const propertyData = { building_name: 'Test Building', location: 'Test Location' };
      const actorUserId = 1;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 2 }, { user_id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ notification_count: 2 }] });

      const result = await Notification.createPropertyNotification(
        propertyId,
        action,
        propertyData,
        actorUserId
      );

      expect(result).toBe(2);
    });

    it('should return 0 if no users to notify', async () => {
      const propertyId = 1;
      const action = 'created';
      const propertyData = { building_name: 'Test Building' };
      const actorUserId = 1;

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Notification.createPropertyNotification(
        propertyId,
        action,
        propertyData,
        actorUserId
      );

      expect(result).toBe(0);
    });
  });

  describe('createReferralNotification', () => {
    it('should create referral notification for a user', async () => {
      const propertyId = 1;
      const userId = 1;
      const propertyData = { building_name: 'Test Building' };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, user_id: userId, title: 'Property Referral' }]
      });

      const result = await Notification.createReferralNotification(propertyId, userId, propertyData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([userId, 'Property Referral'])
      );
      expect(result).toBeDefined();
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics', async () => {
      const userId = 1;
      const mockStats = {
        total: 10,
        unread: 5,
        urgent_unread: 2,
        today: 3
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await Notification.getNotificationStats(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [userId]
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('createLeadNotification', () => {
    it('should create lead notification for created action', async () => {
      const leadId = 1;
      const action = 'created';
      const leadData = { customer_name: 'Test Customer' };
      const actorUserId = 1;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ notification_count: 1 }] });

      const result = await Notification.createLeadNotification(
        leadId,
        action,
        leadData,
        actorUserId
      );

      expect(result).toBe(1);
    });
  });

  describe('createLeadAssignmentNotification', () => {
    it('should create lead assignment notification', async () => {
      const leadId = 1;
      const userId = 1;
      const leadData = { customer_name: 'Test Customer' };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, user_id: userId, title: 'Lead Assignment' }]
      });

      const result = await Notification.createLeadAssignmentNotification(leadId, userId, leadData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([userId, 'Lead Assignment'])
      );
      expect(result).toBeDefined();
    });
  });

  describe('createCalendarEventNotification', () => {
    it('should create calendar event notification', async () => {
      const eventId = 1;
      const action = 'created';
      const eventData = { title: 'Test Event' };
      const actorUserId = 1;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ notification_count: 1 }] });

      const result = await Notification.createCalendarEventNotification(
        eventId,
        action,
        eventData,
        actorUserId
      );

      expect(result).toBe(1);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete notifications older than 30 days', async () => {
      mockQuery.mockResolvedValue({ rowCount: 10 });

      const result = await Notification.cleanupOldNotifications();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        []
      );
      expect(result).toBe(10);
    });
  });
});




















