// controllers/notificationController.js
const Notification = require('../models/notificationModel');

class NotificationController {
  /**
   * Get notifications for the authenticated user
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        entityType = null
      } = req.query;

      const notifications = await Notification.getNotificationsByUserId(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        unreadOnly: unreadOnly === 'true',
        entityType: entityType || null
      });

      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: notifications,
        unreadCount,
        total: notifications.length
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message
      });
    }
  }

  /**
   * Get notification statistics for the authenticated user
   */
  static async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await Notification.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification statistics',
        error: error.message
      });
    }
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await Notification.markAsRead(notificationId, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const updatedCount = await Notification.markAllAsRead(userId);

      res.json({
        success: true,
        message: `Marked ${updatedCount} notifications as read`,
        updatedCount
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  }

  /**
   * Delete a specific notification
   */
  static async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await Notification.deleteNotification(notificationId, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: notification
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        unreadCount
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  }

  /**
   * Create a test notification (for development/testing)
   */
  static async createTestNotification(req, res) {
    try {
      const userId = req.user.id;
      const { title, message, type = 'info' } = req.body;

      const notification = await Notification.createNotification({
        user_id: userId,
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        type,
        entity_type: 'system',
        entity_id: null
      });

      res.status(201).json({
        success: true,
        message: 'Test notification created',
        data: notification
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification',
        error: error.message
      });
    }
  }

  /**
   * Clean up old notifications (admin only)
   */
  static async cleanupOldNotifications(req, res) {
    try {
      const deletedCount = await Notification.cleanupOldNotifications();

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old notifications`,
        deletedCount
      });
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean up old notifications',
        error: error.message
      });
    }
  }
}

module.exports = NotificationController;
