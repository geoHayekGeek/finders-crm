// services/reminderService.js
const pool = require('../config/db');
const Notification = require('../models/notificationModel');
const EmailService = require('./emailService');
const Settings = require('../models/settingsModel');

class ReminderService {
  constructor() {
    this.isRunning = false;
    this.viewingReminderTableEnsured = false;
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
      await this.processCalendarEventReminders();
      await this.processViewingUpdateReminders();
      console.log('✅ Reminder processing completed');
    } catch (error) {
      console.error('❌ Error processing reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async processCalendarEventReminders() {
    // Get events that need reminders using direct SQL instead of function
    const eventsNeedingReminders = await this.getEventsNeedingRemindersDirect();
    console.log(`📋 Found ${eventsNeedingReminders.length} events needing reminders`);

    for (const event of eventsNeedingReminders) {
      await this.processEventReminder(event);
    }
  }

  async processViewingUpdateReminders() {
    try {
      const viewingsNeedingReminders = await this.getViewingsNeedingUpdateReminders();
      console.log(`👀 Found ${viewingsNeedingReminders.length} viewings needing update reminders`);

      for (const viewing of viewingsNeedingReminders) {
        await this.sendViewingUpdateReminder(viewing);
      }
    } catch (error) {
      console.error('❌ Error processing viewing update reminders:', error);
      throw error;
    }
  }

  async ensureViewingReminderTable() {
    if (this.viewingReminderTableEnsured) {
      return;
    }

    const sql = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS viewing_update_reminders (
        id SERIAL PRIMARY KEY,
        viewing_id INTEGER NOT NULL REFERENCES viewings(id) ON DELETE CASCADE,
        agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
        last_email_sent_at TIMESTAMP WITH TIME ZONE,
        last_notification_sent_at TIMESTAMP WITH TIME ZONE,
        reminder_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(viewing_id, agent_id)
      );

      CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_viewing_id
        ON viewing_update_reminders(viewing_id);
      CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_agent_id
        ON viewing_update_reminders(agent_id);
      CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_last_sent
        ON viewing_update_reminders(last_reminder_sent_at);

      DROP TRIGGER IF EXISTS update_viewing_update_reminders_timestamp ON viewing_update_reminders;
      CREATE TRIGGER update_viewing_update_reminders_timestamp
        BEFORE UPDATE ON viewing_update_reminders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await pool.query(sql);
      this.viewingReminderTableEnsured = true;
    } catch (error) {
      console.error('Error ensuring viewing update reminder table:', error);
      throw error;
    }
  }

  // Direct SQL query instead of using the problematic function
  async getEventsNeedingRemindersDirect() {
    try {
      const query = `
        WITH upcoming_events AS (
          SELECT 
            ce.id as event_id,
            ce.title as event_title,
            ce.start_time as event_start_time,
            ce.end_time as event_end_time,
            ce.location as event_location,
            ce.description as event_description,
            ce.created_by,
            ce.assigned_to,
            ce.attendees
          FROM calendar_events ce
          WHERE ce.start_time > NOW()
            AND ce.start_time <= NOW() + INTERVAL '2 days'
        ),
        event_users AS (
          -- Event creators
          SELECT DISTINCT 
            ue.event_id,
            ue.event_title,
            ue.event_start_time,
            ue.event_end_time,
            ue.event_location,
            ue.event_description,
            u.id as user_id,
            u.name as user_name,
            u.email as user_email
          FROM upcoming_events ue
          JOIN users u ON u.id = ue.created_by
          
          UNION
          
          -- Event assignees
          SELECT DISTINCT 
            ue.event_id,
            ue.event_title,
            ue.event_start_time,
            ue.event_end_time,
            ue.event_location,
            ue.event_description,
            u.id as user_id,
            u.name as user_name,
            u.email as user_email
          FROM upcoming_events ue
          JOIN users u ON u.id = ue.assigned_to
          WHERE ue.assigned_to IS NOT NULL
          
          UNION
          
          -- Event attendees
          SELECT DISTINCT 
            ue.event_id,
            ue.event_title,
            ue.event_start_time,
            ue.event_end_time,
            ue.event_location,
            ue.event_description,
            u.id as user_id,
            u.name as user_name,
            u.email as user_email
          FROM upcoming_events ue
          JOIN users u ON u.name = ANY(ue.attendees)
          WHERE ue.attendees IS NOT NULL 
            AND array_length(ue.attendees, 1) > 0
        ),
        reminder_schedules AS (
          SELECT 
            eu.*,
            '1_day' as reminder_type,
            eu.event_start_time - INTERVAL '1 day' as scheduled_time
          FROM event_users eu
          WHERE eu.event_start_time > NOW() + INTERVAL '23 hours'
            AND eu.event_start_time <= NOW() + INTERVAL '25 hours'
          
          UNION
          
          SELECT 
            eu.*,
            'same_day' as reminder_type,
            CASE 
              WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
              THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
              ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
            END as scheduled_time
          FROM event_users eu
          WHERE (
            CASE 
              WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
              THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
              ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
            END
          ) >= NOW() - INTERVAL '30 minutes'
            AND (
            CASE 
              WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
              THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
              ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
            END
          ) <= NOW() + INTERVAL '30 minutes'
            AND eu.event_start_time > NOW()
          
          UNION
          
          SELECT 
            eu.*,
            '1_hour' as reminder_type,
            eu.event_start_time - INTERVAL '1 hour' as scheduled_time
          FROM event_users eu
          WHERE eu.event_start_time > NOW() + INTERVAL '50 minutes'
            AND eu.event_start_time <= NOW() + INTERVAL '70 minutes'
        )
        SELECT 
          rs.event_id,
          rs.user_id,
          rs.user_name,
          rs.user_email,
          rs.event_title,
          rs.event_start_time,
          rs.event_end_time,
          rs.event_location,
          rs.event_description,
          rs.reminder_type,
          rs.scheduled_time
        FROM reminder_schedules rs
        WHERE NOT EXISTS (
          SELECT 1 FROM reminder_tracking rt 
          WHERE rt.event_id = rs.event_id 
            AND rt.user_id = rs.user_id 
            AND rt.reminder_type = rs.reminder_type
            AND (rt.email_sent = true OR rt.notification_sent = true)
        )
        ORDER BY rs.scheduled_time ASC
      `;
      
      const result = await pool.query(query);
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
      console.log(`📧 Processing ${reminder_type} reminder for ${user_name} (ID: ${user_id}) - ${event_title}`);

      // Validate user_id
      if (!user_id) {
        console.error(`❌ Invalid user_id for reminder: ${user_id}`);
        return;
      }

      // Create reminder tracking record
      const trackingId = await this.createReminderTracking(event_id, user_id, reminder_type, scheduled_time);

      // Send in-app notification and capture result
      const notificationSent = await this.sendInAppNotification(event_id, user_id, event_title, event_start_time, event_location, reminder_type);

      // Send email reminder and capture result
      const emailSent = await this.sendEmailReminder(user_email, user_name, event_title, event_start_time, event_end_time, event_location, event_description, reminder_type);

      // Update tracking record with actual send status
      await this.updateReminderTracking(trackingId, emailSent, notificationSent);

      if (emailSent || notificationSent) {
        console.log(`✅ ${reminder_type} reminder sent to ${user_name} (Email: ${emailSent}, Notification: ${notificationSent})`);
      } else {
        console.log(`⚠️ ${reminder_type} reminder skipped for ${user_name} (reminders disabled or failed)`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${reminder_type} reminder for ${user_name}:`, error);
      
      // Update tracking record to mark as failed
      try {
        const trackingId = await this.createReminderTracking(event_id, user_id, reminder_type, scheduled_time);
        await this.updateReminderTracking(trackingId, false, false);
      } catch (trackingError) {
        console.error('Error updating tracking record:', trackingError);
      }
    }
  }

  // Create reminder tracking record
  async createReminderTracking(eventId, userId, reminderType, scheduledTime) {
    try {
      const result = await pool.query(
        `INSERT INTO reminder_tracking (event_id, user_id, reminder_type, scheduled_time)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, user_id, reminder_type) 
         DO UPDATE SET 
           scheduled_time = EXCLUDED.scheduled_time,
           email_sent = false,
           notification_sent = false,
           sent_at = NULL
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
      throw error;
    }
  }

  // Send in-app notification
  async sendInAppNotification(eventId, userId, eventTitle, eventStartTime, eventLocation, reminderType) {
    try {
      console.log(`📱 Sending in-app notification to user ${userId} for event ${eventId}`);
      
      const reminderMessages = {
        '1_day': `Reminder: ${eventTitle} is tomorrow`,
        'same_day': `Reminder: ${eventTitle} is today`,
        '1_hour': `Reminder: ${eventTitle} is in 1 hour`
      };

      const message = reminderMessages[reminderType] || `Reminder: ${eventTitle}`;
      const locationText = eventLocation ? ` at ${eventLocation}` : '';
      const timeText = eventStartTime ? ` at ${new Date(eventStartTime).toLocaleTimeString()}` : '';

      // Fix: Use 'info' type instead of 'calendar_reminder'
      await Notification.createNotification({
        user_id: userId,
        title: 'Calendar Reminder',
        message: `${message}${locationText}${timeText}`,
        type: 'info', // Changed from 'calendar_reminder' to 'info'
        entity_type: 'calendar_event',
        entity_id: eventId
      });

      console.log(`📱 In-app notification sent to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      return false;
    }
  }

  // Send email reminder
  async sendEmailReminder(userEmail, userName, eventTitle, eventStartTime, eventEndTime, eventLocation, eventDescription, reminderType) {
    try {
      // Check if email notifications are enabled
      const emailEnabled = await Settings.isEmailNotificationsEnabled();
      if (!emailEnabled) {
        console.log('📧 Email notifications are disabled globally, skipping email');
        return false;
      }

      // Check if calendar event notifications are enabled
      const calendarNotificationsEnabled = await Settings.isEmailNotificationTypeEnabled('calendar_events');
      if (!calendarNotificationsEnabled) {
        console.log('📧 Calendar event email notifications are disabled, skipping email');
        return false;
      }

      // Check if this specific reminder type is enabled
      const reminderEnabled = await Settings.isReminderEnabled(reminderType);
      if (!reminderEnabled) {
        console.log(`📧 ${reminderType} reminder is disabled, skipping email`);
        return false;
      }

      console.log(`📧 Sending email reminder to ${userEmail} for ${eventTitle}`);
      
      // Fix: Use the correct EmailService method signature
      const eventData = {
        title: eventTitle,
        start_time: eventStartTime,
        end_time: eventEndTime,
        location: eventLocation,
        description: eventDescription
      };

      await EmailService.sendReminderEmail(userEmail, userName, eventData, reminderType);
      console.log(`📧 Email reminder sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending email reminder:', error);
      return false;
    }
  }

  // Schedule reminders for a specific event
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

      // Get users who should receive reminders for this event
      const users = await this.getEventUsers(eventId);

      if (!users || !Array.isArray(users)) {
        console.log(`⚠️ No users found for event ${eventId}`);
        return;
      }

      console.log(`👥 Found ${users.length} users to notify for event ${eventId}`);

      // Schedule reminders for each user
      for (const user of users) {
        // 1 day before
        const oneDayBefore = new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000);
        await this.scheduleReminder(eventId, user.id, '1_day', oneDayBefore);

        // Same day reminder logic:
        // - If event is after 9 AM: send at 9 AM same day
        // - If event is before 9 AM: send at 8 PM the evening before
        const eventHour = eventStartTime.getHours();
        let sameDay;
        
        if (eventHour >= 9) {
          // Event is after 9 AM, send reminder at 9 AM same day
          sameDay = new Date(eventStartTime);
          sameDay.setHours(9, 0, 0, 0);
        } else {
          // Event is before 9 AM, send reminder at 8 PM the evening before
          sameDay = new Date(eventStartTime);
          sameDay.setDate(sameDay.getDate() - 1); // Previous day
          sameDay.setHours(20, 0, 0, 0); // 8 PM
        }
        
        // Only schedule if reminder time is before event and in the future
        if (sameDay < eventStartTime && sameDay > new Date()) {
          await this.scheduleReminder(eventId, user.id, 'same_day', sameDay);
        }

        // 1 hour before
        const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
        await this.scheduleReminder(eventId, user.id, '1_hour', oneHourBefore);
      }

      console.log(`✅ Scheduled reminders for event ${eventId}`);
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
      throw error;
    }
  }

  // Get users who should receive reminders for an event
  async getEventUsers(eventId) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT u.id, u.name, u.email
         FROM users u
         WHERE u.id IN (
           SELECT created_by FROM calendar_events WHERE id = $1
           UNION
           SELECT assigned_to FROM calendar_events WHERE id = $1 AND assigned_to IS NOT NULL
         )`,
        [eventId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting event users:', error);
      return [];
    }
  }

  // Schedule a single reminder
  async scheduleReminder(eventId, userId, reminderType, scheduledTime) {
    try {
      console.log(`📅 Scheduled ${reminderType} reminder for user ${userId} at ${scheduledTime}`);
      
      // When rescheduling (ON CONFLICT), reset the sent flags so reminders can be sent again
      await pool.query(
        `INSERT INTO reminder_tracking (event_id, user_id, reminder_type, scheduled_time)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, user_id, reminder_type) 
         DO UPDATE SET 
           scheduled_time = EXCLUDED.scheduled_time,
           email_sent = false,
           notification_sent = false,
           sent_at = NULL`,
        [eventId, userId, reminderType, scheduledTime]
      );
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      throw error;
    }
  }

  // Clean up old reminders
  async cleanupOldReminders() {
    try {
      const eventCleanup = await pool.query(
        `DELETE FROM reminder_tracking 
         WHERE created_at < NOW() - INTERVAL '7 days'`,
        []
      );
      console.log(`🧹 Cleaned up ${eventCleanup.rowCount} old reminder records`);

      await this.ensureViewingReminderTable();

      const viewingCleanup = await pool.query(
        `DELETE FROM viewing_update_reminders
         WHERE last_reminder_sent_at IS NOT NULL
           AND last_reminder_sent_at < NOW() - INTERVAL '90 days'`,
        []
      );
      console.log(`🧹 Cleaned up ${viewingCleanup.rowCount} old viewing update reminder records`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  // Reset reminder tracking for a specific reminder type
  // Useful when an admin re-enables a previously disabled reminder setting
  async resetReminderTrackingForType(reminderType) {
    try {
      const result = await pool.query(
        `DELETE FROM reminder_tracking rt
         USING calendar_events ce
         WHERE rt.event_id = ce.id
           AND rt.reminder_type = $1
           AND ce.start_time > NOW()
           AND rt.email_sent = false`,
        [reminderType]
      );
      console.log(`🔄 Reset ${result.rowCount} tracking records for ${reminderType} reminders`);
      return result.rowCount;
    } catch (error) {
      console.error('Error resetting reminder tracking:', error);
      throw error;
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    return await EmailService.testEmailConfiguration();
  }

  async getViewingsNeedingUpdateReminders() {
    await this.ensureViewingReminderTable();

    const query = `
      SELECT
        v.id AS viewing_id,
        v.agent_id,
        v.status,
        u.name AS agent_name,
        u.email AS agent_email,
        p.reference_number AS property_reference,
        p.location AS property_location,
        l.customer_name AS lead_name,
        v.viewing_date,
        v.viewing_time,
        GREATEST(
          COALESCE(MAX(vu.update_date), v.created_at::date),
          v.updated_at::date
        ) AS last_activity_date,
        vr.last_reminder_sent_at,
        vr.last_email_sent_at,
        vr.last_notification_sent_at,
        vr.reminder_count
      FROM viewings v
      JOIN users u ON u.id = v.agent_id
      LEFT JOIN viewing_updates vu ON vu.viewing_id = v.id
      LEFT JOIN viewing_update_reminders vr
        ON vr.viewing_id = v.id
       AND vr.agent_id = v.agent_id
      LEFT JOIN properties p ON p.id = v.property_id
      LEFT JOIN leads l ON l.id = v.lead_id
      WHERE v.status NOT IN ('Completed', 'Cancelled')
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      GROUP BY
        v.id,
        v.agent_id,
        v.status,
        u.name,
        u.email,
        p.reference_number,
        p.location,
        l.customer_name,
        v.viewing_date,
        v.viewing_time,
        v.created_at,
        v.updated_at,
        vr.last_reminder_sent_at,
        vr.last_email_sent_at,
        vr.last_notification_sent_at,
        vr.reminder_count
      HAVING GREATEST(
        COALESCE(MAX(vu.update_date), v.created_at::date),
        v.updated_at::date
      ) <= CURRENT_DATE - INTERVAL '1 month'
        AND (
          vr.last_reminder_sent_at IS NULL
          OR vr.last_reminder_sent_at::date < CURRENT_DATE
        )
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  async sendViewingUpdateReminder(viewing) {
    const {
      viewing_id,
      agent_id,
      agent_name,
      agent_email,
      property_reference,
      property_location,
      lead_name,
      viewing_date,
      viewing_time,
      last_activity_date,
      reminder_count = 0
    } = viewing;

    if (!agent_id) {
      console.warn(`⚠️ Viewing ${viewing_id} has no assigned agent, skipping reminder`);
      return;
    }

    let emailSent = false;
    let notificationSent = false;

    try {
      notificationSent = await this.createViewingUpdateNotification({
        viewingId: viewing_id,
        agentId: agent_id,
        propertyReference: property_reference,
        propertyLocation: property_location,
        leadName: lead_name,
        lastActivityDate: last_activity_date
      });
    } catch (error) {
      console.error(`Error sending viewing update notification for viewing ${viewing_id}:`, error);
    }

    try {
      emailSent = await this.trySendViewingUpdateEmail(
        agent_email,
        agent_name,
        {
          propertyReference: property_reference,
          propertyLocation: property_location,
          leadName: lead_name,
          viewingDate: viewing_date,
          viewingTime: viewing_time,
          lastActivityDate: last_activity_date,
          reminderCount
        }
      );
    } catch (error) {
      console.error(`Error sending viewing update email for viewing ${viewing_id}:`, error);
    }

    if (emailSent || notificationSent) {
      await this.recordViewingReminder(viewing_id, agent_id, emailSent, notificationSent);
      console.log(`✅ Viewing update reminder sent to agent ${agent_id} for viewing ${viewing_id} (email: ${emailSent}, notification: ${notificationSent})`);
    } else {
      console.log(`⚠️ No viewing update reminder sent for viewing ${viewing_id} (email and notification skipped or failed)`);
    }
  }

  async createViewingUpdateNotification({
    viewingId,
    agentId,
    propertyReference,
    propertyLocation,
    leadName,
    lastActivityDate
  }) {
    try {
      const lastActivityDateStr = lastActivityDate
        ? new Date(lastActivityDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null;

      const propertyLabel = propertyReference || propertyLocation || `Viewing #${viewingId}`;
      const leadLabel = leadName ? ` for ${leadName}` : '';
      const message = [
        `Please add an update for viewing ${propertyLabel}${leadLabel}.`,
        lastActivityDateStr ? `Last activity recorded on ${lastActivityDateStr}.` : null,
        `Reminders will continue daily until an update is submitted.`
      ]
        .filter(Boolean)
        .join(' ');

      await Notification.createNotification({
        user_id: agentId,
        title: 'Viewing Update Required',
        message,
        type: 'warning',
        entity_type: 'viewing',
        entity_id: viewingId
      });

      return true;
    } catch (error) {
      console.error('Error creating viewing update notification:', error);
      return false;
    }
  }

  async trySendViewingUpdateEmail(agentEmail, agentName, viewingData) {
    if (!agentEmail) {
      return false;
    }

    const emailEnabled = await Settings.isEmailNotificationsEnabled();
    if (!emailEnabled) {
      console.log('📧 Email notifications are globally disabled, skipping viewing update email');
      return false;
    }

    const viewingsEmailEnabled = await Settings.isEmailNotificationTypeEnabled('viewings');
    if (!viewingsEmailEnabled) {
      console.log('📧 Viewing email notifications are disabled, skipping viewing update email');
      return false;
    }

    await EmailService.sendViewingUpdateReminderEmail(agentEmail, agentName, viewingData);
    return true;
  }

  async recordViewingReminder(viewingId, agentId, emailSent, notificationSent) {
    await this.ensureViewingReminderTable();

    await pool.query(
      `INSERT INTO viewing_update_reminders (
        viewing_id,
        agent_id,
        last_reminder_sent_at,
        last_email_sent_at,
        last_notification_sent_at,
        reminder_count
      ) VALUES (
        $1,
        $2,
        NOW(),
        CASE WHEN $3 THEN NOW() ELSE NULL END,
        CASE WHEN $4 THEN NOW() ELSE NULL END,
        1
      )
      ON CONFLICT (viewing_id, agent_id)
      DO UPDATE SET
        last_reminder_sent_at = NOW(),
        last_email_sent_at = CASE WHEN $3 THEN NOW() ELSE viewing_update_reminders.last_email_sent_at END,
        last_notification_sent_at = CASE WHEN $4 THEN NOW() ELSE viewing_update_reminders.last_notification_sent_at END,
        reminder_count = viewing_update_reminders.reminder_count + 1,
        updated_at = NOW()`,
      [viewingId, agentId, emailSent, notificationSent]
    );
  }

  async clearViewingReminder(viewingId, agentId = null) {
    try {
      await this.ensureViewingReminderTable();

      if (agentId) {
        await pool.query(
          `DELETE FROM viewing_update_reminders
           WHERE viewing_id = $1 AND agent_id = $2`,
          [viewingId, agentId]
        );
      } else {
        await pool.query(
          `DELETE FROM viewing_update_reminders
           WHERE viewing_id = $1`,
          [viewingId]
        );
      }
    } catch (error) {
      console.error('Error clearing viewing reminder tracking:', error);
    }
  }
}

module.exports = new ReminderService();