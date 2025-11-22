// __tests__/notifications/notificationController.test.js
const NotificationController = require('../../controllers/notificationController');
const Notification = require('../../models/notificationModel');

// Mock the Notification model
jest.mock('../../models/notificationModel');

describe('Notification Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Test User', role: 'admin' },
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should get notifications successfully with default parameters', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
          is_read: false
        }
      ];

      Notification.getNotificationsByUserId.mockResolvedValue(mockNotifications);
      Notification.getUnreadCount.mockResolvedValue(1);

      await NotificationController.getNotifications(req, res);

      expect(Notification.getNotificationsByUserId).toHaveBeenCalledWith(1, {
        limit: 50,
        offset: 0,
        unreadOnly: false,
        entityType: null
      });
      expect(Notification.getUnreadCount).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
        unreadCount: 1,
        total: 1
      });
    });

    it('should get notifications with custom limit and offset', async () => {
      req.query = { limit: '10', offset: '5' };
      const mockNotifications = [];

      Notification.getNotificationsByUserId.mockResolvedValue(mockNotifications);
      Notification.getUnreadCount.mockResolvedValue(0);

      await NotificationController.getNotifications(req, res);

      expect(Notification.getNotificationsByUserId).toHaveBeenCalledWith(1, {
        limit: 10,
        offset: 5,
        unreadOnly: false,
        entityType: null
      });
    });

    it('should get only unread notifications when unreadOnly is true', async () => {
      req.query = { unreadOnly: 'true' };
      const mockNotifications = [];

      Notification.getNotificationsByUserId.mockResolvedValue(mockNotifications);
      Notification.getUnreadCount.mockResolvedValue(0);

      await NotificationController.getNotifications(req, res);

      expect(Notification.getNotificationsByUserId).toHaveBeenCalledWith(1, {
        limit: 50,
        offset: 0,
        unreadOnly: true,
        entityType: null
      });
    });

    it('should filter by entity type when provided', async () => {
      req.query = { entityType: 'property' };
      const mockNotifications = [];

      Notification.getNotificationsByUserId.mockResolvedValue(mockNotifications);
      Notification.getUnreadCount.mockResolvedValue(0);

      await NotificationController.getNotifications(req, res);

      expect(Notification.getNotificationsByUserId).toHaveBeenCalledWith(1, {
        limit: 50,
        offset: 0,
        unreadOnly: false,
        entityType: 'property'
      });
    });

    it('should handle errors', async () => {
      Notification.getNotificationsByUserId.mockRejectedValue(new Error('Database error'));

      await NotificationController.getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch notifications',
        error: 'Database error'
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics successfully', async () => {
      const mockStats = {
        total: 10,
        unread: 3,
        urgent_unread: 1,
        today: 2
      };

      Notification.getNotificationStats.mockResolvedValue(mockStats);

      await NotificationController.getNotificationStats(req, res);

      expect(Notification.getNotificationStats).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors', async () => {
      Notification.getNotificationStats.mockRejectedValue(new Error('Database error'));

      await NotificationController.getNotificationStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch notification statistics',
        error: 'Database error'
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      req.params.notificationId = '1';
      const mockNotification = {
        id: 1,
        user_id: 1,
        title: 'Test Notification',
        is_read: true
      };

      Notification.markAsRead.mockResolvedValue(mockNotification);

      await NotificationController.markAsRead(req, res);

      expect(Notification.markAsRead).toHaveBeenCalledWith('1', 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification marked as read',
        data: mockNotification
      });
    });

    it('should return 404 if notification not found', async () => {
      req.params.notificationId = '999';

      Notification.markAsRead.mockResolvedValue(null);

      await NotificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification not found or access denied'
      });
    });

    it('should handle errors', async () => {
      req.params.notificationId = '1';
      Notification.markAsRead.mockRejectedValue(new Error('Database error'));

      await NotificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to mark notification as read',
        error: 'Database error'
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      Notification.markAllAsRead.mockResolvedValue(5);

      await NotificationController.markAllAsRead(req, res);

      expect(Notification.markAllAsRead).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Marked 5 notifications as read',
        updatedCount: 5
      });
    });

    it('should handle zero notifications updated', async () => {
      Notification.markAllAsRead.mockResolvedValue(0);

      await NotificationController.markAllAsRead(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Marked 0 notifications as read',
        updatedCount: 0
      });
    });

    it('should handle errors', async () => {
      Notification.markAllAsRead.mockRejectedValue(new Error('Database error'));

      await NotificationController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: 'Database error'
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      req.params.notificationId = '1';
      const mockNotification = {
        id: 1,
        user_id: 1,
        title: 'Test Notification'
      };

      Notification.deleteNotification.mockResolvedValue(mockNotification);

      await NotificationController.deleteNotification(req, res);

      expect(Notification.deleteNotification).toHaveBeenCalledWith('1', 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification deleted successfully',
        data: mockNotification
      });
    });

    it('should return 404 if notification not found', async () => {
      req.params.notificationId = '999';

      Notification.deleteNotification.mockResolvedValue(null);

      await NotificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification not found or access denied'
      });
    });

    it('should handle errors', async () => {
      req.params.notificationId = '1';
      Notification.deleteNotification.mockRejectedValue(new Error('Database error'));

      await NotificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete notification',
        error: 'Database error'
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      Notification.getUnreadCount.mockResolvedValue(5);

      await NotificationController.getUnreadCount(req, res);

      expect(Notification.getUnreadCount).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        unreadCount: 5
      });
    });

    it('should return zero when no unread notifications', async () => {
      Notification.getUnreadCount.mockResolvedValue(0);

      await NotificationController.getUnreadCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        unreadCount: 0
      });
    });

    it('should handle errors', async () => {
      Notification.getUnreadCount.mockRejectedValue(new Error('Database error'));

      await NotificationController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get unread count',
        error: 'Database error'
      });
    });
  });

  describe('createTestNotification', () => {
    it('should create test notification successfully with default values', async () => {
      req.body = {};
      const mockNotification = {
        id: 1,
        user_id: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info'
      };

      Notification.createNotification.mockResolvedValue(mockNotification);

      await NotificationController.createTestNotification(req, res);

      expect(Notification.createNotification).toHaveBeenCalledWith({
        user_id: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        entity_type: 'system',
        entity_id: null
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test notification created',
        data: mockNotification
      });
    });

    it('should create test notification with custom values', async () => {
      req.body = {
        title: 'Custom Title',
        message: 'Custom message',
        type: 'urgent'
      };
      const mockNotification = {
        id: 1,
        user_id: 1,
        title: 'Custom Title',
        message: 'Custom message',
        type: 'urgent'
      };

      Notification.createNotification.mockResolvedValue(mockNotification);

      await NotificationController.createTestNotification(req, res);

      expect(Notification.createNotification).toHaveBeenCalledWith({
        user_id: 1,
        title: 'Custom Title',
        message: 'Custom message',
        type: 'urgent',
        entity_type: 'system',
        entity_id: null
      });
    });

    it('should handle errors', async () => {
      req.body = {};
      Notification.createNotification.mockRejectedValue(new Error('Database error'));

      await NotificationController.createTestNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create test notification',
        error: 'Database error'
      });
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications successfully', async () => {
      Notification.cleanupOldNotifications.mockResolvedValue(10);

      await NotificationController.cleanupOldNotifications(req, res);

      expect(Notification.cleanupOldNotifications).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cleaned up 10 old notifications',
        deletedCount: 10
      });
    });

    it('should handle zero notifications cleaned up', async () => {
      Notification.cleanupOldNotifications.mockResolvedValue(0);

      await NotificationController.cleanupOldNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cleaned up 0 old notifications',
        deletedCount: 0
      });
    });

    it('should handle errors', async () => {
      Notification.cleanupOldNotifications.mockRejectedValue(new Error('Database error'));

      await NotificationController.cleanupOldNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to clean up old notifications',
        error: 'Database error'
      });
    });
  });
});

