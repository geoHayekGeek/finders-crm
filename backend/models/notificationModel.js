// models/notificationModel.js
const pool = require('../config/db');

class Notification {
  /**
   * Create a single notification
   */
  static async createNotification(notificationData) {
    const {
      user_id,
      title,
      message,
      type = 'info',
      entity_type,
      entity_id = null
    } = notificationData;

    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, title, message, type, entity_type, entity_id]
    );

    return result.rows[0];
  }

  /**
   * Create notifications for multiple users
   */
  static async createNotificationForUsers(userIds, notificationData) {
    const {
      title,
      message,
      type = 'info',
      entity_type,
      entity_id = null
    } = notificationData;

    const result = await pool.query(
      `SELECT create_notification_for_users($1, $2, $3, $4, $5, $6) as notification_count`,
      [userIds, title, message, type, entity_type, entity_id]
    );

    return result.rows[0].notification_count;
  }

  /**
   * Get notifications for a specific user
   */
  static async getNotificationsByUserId(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      entityType = null
    } = options;

    let query = `
      SELECT n.*, 
             u.name as user_name,
             u.role as user_role
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;

    if (unreadOnly) {
      paramCount++;
      query += ` AND n.is_read = $${paramCount}`;
      params.push(false);
    }

    if (entityType) {
      paramCount++;
      query += ` AND n.entity_type = $${paramCount}`;
      params.push(entityType);
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return result.rowCount;
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId, userId) {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get users who should be notified for property changes
   */
  static async getPropertyNotificationUsers(propertyId, excludeUserId = null) {
    const result = await pool.query(
      `SELECT * FROM get_property_notification_users($1, $2)`,
      [propertyId, excludeUserId]
    );

    return result.rows;
  }

  /**
   * Create property-related notifications
   */
  static async createPropertyNotification(propertyId, action, propertyData, actorUserId) {
    try {
      // Get users who should be notified
      const notificationUsers = await this.getPropertyNotificationUsers(propertyId, actorUserId);
      
      if (notificationUsers.length === 0) {
        return 0;
      }

      const userIds = notificationUsers.map(user => user.user_id);
      
      let title, message, type;

      switch (action) {
        case 'created':
          title = 'New Property Added';
          message = `A new property "${propertyData.building_name || propertyData.location}" has been added to the system.`;
          type = 'info';
          break;
        case 'updated':
          title = 'Property Updated';
          message = `The property "${propertyData.building_name || propertyData.location}" has been updated.`;
          type = 'success';
          break;
        case 'deleted':
          title = 'Property Deleted';
          message = `The property "${propertyData.building_name || propertyData.location}" has been deleted.`;
          type = 'warning';
          break;
        case 'assigned':
          title = 'Property Assigned';
          message = `You have been assigned to the property "${propertyData.building_name || propertyData.location}".`;
          type = 'info';
          break;
        default:
          title = 'Property Notification';
          message = `There has been an update to the property "${propertyData.building_name || propertyData.location}".`;
          type = 'info';
      }

      // Create notifications for all relevant users
      const notificationCount = await this.createNotificationForUsers(userIds, {
        title,
        message,
        type,
        entity_type: 'property',
        entity_id: propertyId
      });

      return notificationCount;
    } catch (error) {
      console.error('Error creating property notification:', error);
      throw error;
    }
  }

  /**
   * Create referral notification for specific user
   */
  static async createReferralNotification(propertyId, userId, propertyData) {
    const title = 'Property Referral';
    const message = `You have been added as a referral for the property "${propertyData.building_name || propertyData.location}".`;
    
    return await this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'info',
      entity_type: 'property',
      entity_id: propertyId
    });
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
         COUNT(CASE WHEN type = 'urgent' AND is_read = false THEN 1 END) as urgent_unread,
         COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today
       FROM notifications 
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE created_at < CURRENT_DATE - INTERVAL '30 days'`,
      []
    );

    return result.rowCount;
  }
}

module.exports = Notification;
