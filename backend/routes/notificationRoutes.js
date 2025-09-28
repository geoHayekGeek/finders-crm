// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/permissions');

// All notification routes require authentication
router.use(authenticateToken);

// Get notifications for the authenticated user
router.get('/', NotificationController.getNotifications);

// Get notification statistics
router.get('/stats', NotificationController.getNotificationStats);

// Get unread notification count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark a specific notification as read
router.patch('/:notificationId/read', NotificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', NotificationController.markAllAsRead);

// Delete a specific notification
router.delete('/:notificationId', NotificationController.deleteNotification);

// Create test notification (for development)
router.post('/test', NotificationController.createTestNotification);

// Clean up old notifications (admin only - add admin check if needed)
router.delete('/cleanup', NotificationController.cleanupOldNotifications);

module.exports = router;
