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
   * Get users who should be notified for lead changes
   */
  static async getLeadNotificationUsers(leadId, excludeUserId = null) {
    const result = await pool.query(
      `SELECT * FROM get_lead_notification_users($1, $2)`,
      [leadId, excludeUserId]
    );

    return result.rows;
  }

  /**
   * Create lead-related notifications
   */
  static async createLeadNotification(leadId, action, leadData, actorUserId) {
    try {
      // Get users who should be notified
      const notificationUsers = await this.getLeadNotificationUsers(leadId, actorUserId);
      
      if (notificationUsers.length === 0) {
        return 0;
      }

      const userIds = notificationUsers.map(user => user.user_id);
      
      let title, message, type;

      switch (action) {
        case 'created':
          title = 'New Lead Added';
          message = `A new lead "${leadData.customer_name}" has been added to the system.`;
          type = 'info';
          break;
        case 'updated':
          title = 'Lead Updated';
          message = `The lead "${leadData.customer_name}" has been updated.`;
          type = 'success';
          break;
        case 'deleted':
          title = 'Lead Deleted';
          message = `The lead "${leadData.customer_name}" has been deleted.`;
          type = 'warning';
          break;
        case 'assigned':
          title = 'Lead Assigned';
          message = `You have been assigned to the lead "${leadData.customer_name}".`;
          type = 'info';
          break;
        case 'status_changed':
          title = 'Lead Status Changed';
          message = `The lead "${leadData.customer_name}" status has been changed to "${leadData.status}".`;
          type = 'success';
          break;
        default:
          title = 'Lead Notification';
          message = `There has been an update to the lead "${leadData.customer_name}".`;
          type = 'info';
      }

      // Create notifications for all relevant users
      const notificationCount = await this.createNotificationForUsers(userIds, {
        title,
        message,
        type,
        entity_type: 'lead',
        entity_id: leadId
      });

      return notificationCount;
    } catch (error) {
      console.error('Error creating lead notification:', error);
      throw error;
    }
  }

  /**
   * Create lead assignment notification for specific user
   */
  static async createLeadAssignmentNotification(leadId, userId, leadData) {
    const title = 'Lead Assignment';
    const message = `You have been assigned to the lead "${leadData.customer_name}".`;
    
    return await this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'info',
      entity_type: 'lead',
      entity_id: leadId
    });
  }

  /**
   * Get users who should be notified for calendar event changes
   */
  static async getCalendarEventNotificationUsers(eventId, excludeUserId = null) {
    const result = await pool.query(
      `SELECT * FROM get_calendar_event_notification_users($1, $2)`,
      [eventId, excludeUserId]
    );

    return result.rows;
  }

  /**
   * Create calendar event-related notifications
   */
  static async createCalendarEventNotification(eventId, action, eventData, actorUserId) {
    try {
      // Get users who should be notified
      const notificationUsers = await this.getCalendarEventNotificationUsers(eventId, actorUserId);
      
      if (notificationUsers.length === 0) {
        return 0;
      }

      const userIds = notificationUsers.map(user => user.user_id);
      
      let title, message, type;

      switch (action) {
        case 'created':
          title = 'New Calendar Event Created';
          message = `A new calendar event "${eventData.title}" has been created.`;
          type = 'info';
          break;
        case 'updated':
          title = 'Calendar Event Updated';
          message = `The calendar event "${eventData.title}" has been updated.`;
          type = 'success';
          break;
        case 'deleted':
          title = 'Calendar Event Deleted';
          message = `The calendar event "${eventData.title}" has been deleted.`;
          type = 'warning';
          break;
        case 'assigned':
          title = 'Calendar Event Assigned';
          message = `You have been assigned to the calendar event "${eventData.title}".`;
          type = 'info';
          break;
        case 'reminder':
          title = 'Calendar Event Reminder';
          message = `Reminder: "${eventData.title}" is starting soon.`;
          type = 'urgent';
          break;
        default:
          title = 'Calendar Event Notification';
          message = `There has been an update to the calendar event "${eventData.title}".`;
          type = 'info';
      }

      // Create notifications for all relevant users
      const notificationCount = await this.createNotificationForUsers(userIds, {
        title,
        message,
        type,
        entity_type: 'calendar_event',
        entity_id: eventId
      });

      return notificationCount;
    } catch (error) {
      console.error('Error creating calendar event notification:', error);
      throw error;
    }
  }

  /**
   * Create calendar event assignment notification for specific user
   */
  static async createCalendarEventAssignmentNotification(eventId, userId, eventData) {
    const title = 'Calendar Event Assignment';
    const message = `You have been assigned to the calendar event "${eventData.title}".`;
    
    return await this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'info',
      entity_type: 'calendar_event',
      entity_id: eventId
    });
  }

  /**
   * Create calendar event reminder notification
   */
  static async createCalendarEventReminderNotification(eventId, userId, eventData) {
    const title = 'Calendar Event Reminder';
    const message = `Reminder: "${eventData.title}" is starting soon at ${eventData.start_time}.`;
    
    return await this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'urgent',
      entity_type: 'calendar_event',
      entity_id: eventId
    });
  }

  /**
   * Create calendar event attendee notification for specific user
   */
  static async createCalendarEventAttendeeNotification(eventId, userId, eventData) {
    const title = 'Calendar Event Invitation';
    const message = `You have been invited to the calendar event "${eventData.title}" at ${eventData.start_time}.`;
    
    return await this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'info',
      entity_type: 'calendar_event',
      entity_id: eventId
    });
  }

  /**
   * Create calendar event attendee notifications for multiple users
   */
  static async createCalendarEventAttendeeNotifications(eventId, attendeeUserIds, eventData) {
    const notifications = [];
    
    for (const userId of attendeeUserIds) {
      try {
        const notification = await this.createCalendarEventAttendeeNotification(eventId, userId, eventData);
        notifications.push(notification);
      } catch (error) {
        console.error(`Error creating attendee notification for user ${userId}:`, error);
      }
    }
    
    return notifications;
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
