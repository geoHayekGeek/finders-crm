// services/reminderService.js
const pool = require('../config/db');
const Notification = require('../models/notificationModel');
const EmailService = require('./emailService');

class ReminderService {
  constructor() {
    this.isRunning = false;
  }

  // Main method to process all pending reminders
  async processReminders() {
    if (this.isRunning) {
      console.log('⏳ Reminder service already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting reminder processing...');

    try {
      // Get events that need reminders
      const eventsNeedingReminders = await this.getEventsNeedingReminders();
      console.log(`📋 Found ${eventsNeedingReminders.length} events needing reminders`);

      for (const event of eventsNeedingReminders) {
        await this.processEventReminder(event);
      }

      console.log('✅ Reminder processing completed');
    } catch (error) {
      console.error('❌ Error processing reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Get events that need reminders from database
  async getEventsNeedingReminders() {
    try {
      const result = await pool.query('SELECT * FROM get_events_needing_reminders()');
      return result.rows;
    } catch (error) {
      console.error('Error getting events needing reminders:', error);
      return [];
    }
  }

  // Process reminder for a specific event
  async processEventReminder(eventData) {
    const { event_id, user_id, user_name, user_email, event_title, event_start_time, event_end_time, event_location, event_description, reminder_type, scheduled_time } = eventData;

    try {
      console.log(`📧 Processing ${reminder_type} reminder for ${user_name} - ${event_title}`);

      // Create reminder tracking record
      const trackingId = await this.createReminderTracking(event_id, user_id, reminder_type, scheduled_time);

      // Send email reminder
      let emailSent = false;
      if (user_email) {
        try {
          await EmailService.sendReminderEmail(
            user_email,
            user_name,
            {
              title: event_title,
              start_time: event_start_time,
              end_time: event_end_time,
              location: event_location,
              description: event_description
            },
            reminder_type
          );
          emailSent = true;
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${user_email}:`, emailError.message);
        }
      }

      // Send notification reminder
      let notificationSent = false;
      try {
        await Notification.createCalendarEventReminderNotification(
          event_id,
          user_id,
          {
            title: event_title,
            start_time: event_start_time
          }
        );
        notificationSent = true;
      } catch (notificationError) {
        console.error(`❌ Failed to send notification to ${user_id}:`, notificationError.message);
      }

      // Update tracking record
      await this.updateReminderTracking(trackingId, emailSent, notificationSent);

      console.log(`✅ Reminder processed for ${user_name} - Email: ${emailSent ? '✅' : '❌'}, Notification: ${notificationSent ? '✅' : '❌'}`);

    } catch (error) {
      console.error(`❌ Error processing reminder for ${user_name}:`, error);
    }
  }

  // Create reminder tracking record
  async createReminderTracking(eventId, userId, reminderType, scheduledTime) {
    try {
      const result = await pool.query(
        `INSERT INTO reminder_tracking (event_id, user_id, reminder_type, scheduled_time)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [eventId, userId, reminderType, scheduledTime]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating reminder tracking:', error);
      throw error;
    }
  }

  // Update reminder tracking record
  async updateReminderTracking(trackingId, emailSent, notificationSent) {
    try {
      await pool.query(
        `UPDATE reminder_tracking 
         SET email_sent = $1, notification_sent = $2, sent_at = NOW()
         WHERE id = $3`,
        [emailSent, notificationSent, trackingId]
      );
    } catch (error) {
      console.error('Error updating reminder tracking:', error);
    }
  }

  // Schedule reminders for a specific event (called when event is created/updated)
  async scheduleEventReminders(eventId) {
    try {
      console.log(`📅 Scheduling reminders for event ${eventId}`);

      // Get event details
      const eventResult = await pool.query(
        `SELECT ce.*, u.name as created_by_name, u.email as created_by_email
         FROM calendar_events ce
         LEFT JOIN users u ON u.id = ce.created_by
         WHERE ce.id = $1`,
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        console.log(`⚠️ Event ${eventId} not found`);
        return;
      }

      const event = eventResult.rows[0];
      const eventStartTime = new Date(event.start_time);
      const now = new Date();

      // Only schedule reminders for future events
      if (eventStartTime <= now) {
        console.log(`⚠️ Event ${eventId} is in the past, skipping reminder scheduling`);
        return;
      }

      // Get all users associated with this event
      const users = await this.getEventUsers(eventId);

      for (const user of users) {
        // Schedule 1-day reminder
        const oneDayBefore = new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000);
        if (oneDayBefore > now) {
          await this.scheduleReminder(eventId, user.id, '1_day', oneDayBefore);
        }

        // Schedule same-day reminder
        const sameDay = new Date(eventStartTime);
        sameDay.setHours(9, 0, 0, 0); // 9 AM on the day of the event
        if (sameDay > now && sameDay < eventStartTime) {
          await this.scheduleReminder(eventId, user.id, 'same_day', sameDay);
        }

        // Schedule 1-hour reminder
        const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
        if (oneHourBefore > now) {
          await this.scheduleReminder(eventId, user.id, '1_hour', oneHourBefore);
        }
      }

      console.log(`✅ Scheduled reminders for event ${eventId}`);
    } catch (error) {
      console.error(`❌ Error scheduling reminders for event ${eventId}:`, error);
    }
  }

  // Get all users associated with an event
  async getEventUsers(eventId) {
    try {
      const result = await pool.query(
        `WITH event_info AS (
          SELECT ce.created_by, ce.assigned_to, ce.attendees
          FROM calendar_events ce
          WHERE ce.id = $1
        )
        SELECT DISTINCT u.id, u.name, u.email
        FROM event_info ei
        JOIN users u ON (
          u.id = ei.created_by OR 
          u.id = ei.assigned_to OR 
          u.name = ANY(ei.attendees)
        )
        WHERE u.email IS NOT NULL`,
        [eventId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting event users:', error);
      return [];
    }
  }

  // Schedule a specific reminder
  async scheduleReminder(eventId, userId, reminderType, scheduledTime) {
    try {
      // Check if reminder already exists
      const existing = await pool.query(
        `SELECT id FROM reminder_tracking 
         WHERE event_id = $1 AND user_id = $2 AND reminder_type = $3`,
        [eventId, userId, reminderType]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO reminder_tracking (event_id, user_id, reminder_type, scheduled_time)
           VALUES ($1, $2, $3, $4)`,
          [eventId, userId, reminderType, scheduledTime]
        );
        console.log(`📅 Scheduled ${reminderType} reminder for user ${userId} at ${scheduledTime}`);
      }
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }

  // Clean up old reminder tracking records
  async cleanupOldReminders() {
    try {
      const result = await pool.query(
        `DELETE FROM reminder_tracking 
         WHERE created_at < NOW() - INTERVAL '7 days'`,
        []
      );
      console.log(`🧹 Cleaned up ${result.rowCount} old reminder records`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    return await EmailService.testEmailConfiguration();
  }
}

module.exports = new ReminderService();
