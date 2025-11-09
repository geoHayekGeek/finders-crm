// services/emailService.js
const nodemailer = require('nodemailer');
const SettingsModel = require('../models/settingsModel');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.settings = null;
    this.lastSettingsLoad = null;
    this.settingsCacheDuration = 60000; // 1 minute cache
  }

  async getEmailSettings() {
    // Cache settings for 1 minute to avoid constant database queries
    const now = Date.now();
    if (this.settings && this.lastSettingsLoad && (now - this.lastSettingsLoad < this.settingsCacheDuration)) {
      return this.settings;
    }

    try {
      const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'email_from_name', 'email_from_address'];
      const settingsArray = await SettingsModel.getByKeys(keys);
      
      const settings = {};
      settingsArray.forEach(setting => {
        settings[setting.setting_key] = SettingsModel.convertValue(setting.setting_value, setting.setting_type);
      });
      
      this.settings = settings;
      this.lastSettingsLoad = now;
      return settings;
    } catch (error) {
      console.error('Failed to load email settings from database, using environment variables as fallback:', error);
      // Fallback to environment variables if database is unavailable
      return {
        smtp_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.EMAIL_PORT) || 587,
        smtp_user: process.env.EMAIL_USER || 'your-email@gmail.com',
        smtp_pass: process.env.EMAIL_PASS || 'your-app-password',
        smtp_secure: false,
        email_from_name: 'Finders CRM',
        email_from_address: 'noreply@finderscrm.com'
      };
    }
  }

  async initializeTransporter() {
    const settings = await this.getEmailSettings();
    
    // Email configuration from database
    this.transporter = nodemailer.createTransport({
      host: settings.smtp_host || 'smtp.gmail.com',
      port: parseInt(settings.smtp_port) || 587,
      secure: settings.smtp_secure || false, // true for 465, false for other ports
      auth: {
        user: settings.smtp_user || 'your-email@gmail.com',
        pass: settings.smtp_pass || 'your-app-password'
      }
    });

    return this.transporter;
  }

  async getTransporter() {
    // Always reinitialize to get fresh settings
    await this.initializeTransporter();
    return this.transporter;
  }

  async sendReminderEmail(userEmail, userName, eventData, reminderType) {
    try {
      const { title, start_time, end_time, location, description } = eventData;
      const settings = await this.getEmailSettings();
      const transporter = await this.getTransporter();
      
      let subject, message;
      const eventDate = new Date(start_time);
      const eventTime = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const eventDateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      switch (reminderType) {
        case '1_day':
          subject = `📅 Reminder: ${title} - Tomorrow`;
          message = this.getOneDayReminderTemplate(userName, title, eventDateStr, eventTime, location, description);
          break;
        case 'same_day':
          subject = `⏰ Reminder: ${title} - Today`;
          message = this.getSameDayReminderTemplate(userName, title, eventTime, location, description);
          break;
        case '1_hour':
          subject = `🚨 Reminder: ${title} - Starting Soon`;
          message = this.getOneHourReminderTemplate(userName, title, eventTime, location, description);
          break;
        default:
          subject = `📅 Reminder: ${title}`;
          message = this.getDefaultReminderTemplate(userName, title, eventDateStr, eventTime, location, description);
      }

      const fromEmail = settings.email_from_address || 'noreply@finderscrm.com';
      const fromName = settings.email_from_name || 'Finders CRM';
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: userEmail,
        subject: subject,
        html: message
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Reminder email sent to ${userEmail} for event: ${title}`);
      return result;
    } catch (error) {
      console.error(`❌ Error sending reminder email to ${userEmail}:`, error);
      throw error;
    }
  }

  async sendViewingUpdateReminderEmail(userEmail, userName, viewingData) {
    try {
      const settings = await this.getEmailSettings();
      const transporter = await this.getTransporter();

      const {
        propertyReference,
        propertyLocation,
        leadName,
        viewingDate,
        viewingTime,
        lastActivityDate,
        reminderCount = 0
      } = viewingData;

      const formattedViewingDate = viewingDate
        ? new Date(viewingDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null;

      const viewingTimeString = viewingTime
        ? (() => {
            const [hours, minutes] = viewingTime.toString().split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          })()
        : null;

      const lastActivityDateString = lastActivityDate
        ? new Date(lastActivityDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null;

      const subjectProperty =
        propertyReference || propertyLocation || leadName || 'assigned viewing';

      const subject = `Reminder: Add update for ${subjectProperty}`;

      const message = this.getViewingUpdateReminderTemplate(userName, {
        propertyReference,
        propertyLocation,
        leadName,
        formattedViewingDate,
        viewingTimeString,
        lastActivityDateString,
        reminderCount: reminderCount + 1
      });

      const fromEmail = settings.email_from_address || 'noreply@finderscrm.com';
      const fromName = settings.email_from_name || 'Finders CRM';

      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: userEmail,
        subject,
        html: message
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Viewing update reminder email sent to ${userEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Error sending viewing update reminder email to ${userEmail}:`, error);
      throw error;
    }
  }

  getOneDayReminderTemplate(userName, title, eventDate, eventTime, location, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .time-badge { background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📅 Calendar Event Reminder</h2>
            <p>Hi ${userName}, you have an event tomorrow!</p>
          </div>
          <div class="content">
            <div class="event-details">
              <h3>${title}</h3>
              <p><strong>📅 Date:</strong> ${eventDate}</p>
              <p><strong>🕐 Time:</strong> <span class="time-badge">${eventTime}</span></p>
              ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
              ${description ? `<p><strong>📝 Description:</strong> ${description}</p>` : ''}
            </div>
            <p>Don't forget to prepare for this event. If you need to make any changes, please contact your team lead or admin.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Finders CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getSameDayReminderTemplate(userName, title, eventTime, location, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #fef3c7; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .time-badge { background: #DC2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⏰ Calendar Event Reminder</h2>
            <p>Hi ${userName}, you have an event today!</p>
          </div>
          <div class="content">
            <div class="event-details">
              <h3>${title}</h3>
              <p><strong>🕐 Time:</strong> <span class="time-badge">${eventTime}</span></p>
              ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
              ${description ? `<p><strong>📝 Description:</strong> ${description}</p>` : ''}
            </div>
            <p>This event is happening today. Make sure you're prepared and ready!</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Finders CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOneHourReminderTemplate(userName, title, eventTime, location, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .time-badge { background: #DC2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .urgent { color: #DC2626; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 Calendar Event Reminder</h2>
            <p class="urgent">Hi ${userName}, your event is starting soon!</p>
          </div>
          <div class="content">
            <div class="event-details">
              <h3>${title}</h3>
              <p><strong>🕐 Time:</strong> <span class="time-badge">${eventTime}</span></p>
              ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
              ${description ? `<p><strong>📝 Description:</strong> ${description}</p>` : ''}
            </div>
            <p class="urgent">This event starts in 1 hour. Please make sure you're ready!</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Finders CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultReminderTemplate(userName, title, eventDate, eventTime, location, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6B7280; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .time-badge { background: #6B7280; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📅 Calendar Event Reminder</h2>
            <p>Hi ${userName}, you have a calendar event reminder!</p>
          </div>
          <div class="content">
            <div class="event-details">
              <h3>${title}</h3>
              <p><strong>📅 Date:</strong> ${eventDate}</p>
              <p><strong>🕐 Time:</strong> <span class="time-badge">${eventTime}</span></p>
              ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
              ${description ? `<p><strong>📝 Description:</strong> ${description}</p>` : ''}
            </div>
            <p>This is a reminder for your upcoming calendar event.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Finders CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getViewingUpdateReminderTemplate(userName, data) {
    const {
      propertyReference,
      propertyLocation,
      leadName,
      formattedViewingDate,
      viewingTimeString,
      lastActivityDateString,
      reminderCount
    } = data;

    const propertyDetails = propertyReference
      ? `<p><strong>📄 Reference:</strong> ${propertyReference}</p>`
      : '';

    const locationDetails = propertyLocation
      ? `<p><strong>📍 Location:</strong> ${propertyLocation}</p>`
      : '';

    const leadDetails = leadName
      ? `<p><strong>🧑 Client:</strong> ${leadName}</p>`
      : '';

    const viewingDateDetails = formattedViewingDate
      ? `<p><strong>📅 Viewing Date:</strong> ${formattedViewingDate}${viewingTimeString ? ` at <span class="time-badge">${viewingTimeString}</span>` : ''}</p>`
      : '';

    const lastActivityDetails = lastActivityDateString
      ? `<p><strong>⏱ Last Update:</strong> ${lastActivityDateString}</p>`
      : '<p><strong>⏱ Last Update:</strong> Not recorded</p>';

    const reminderCountText =
      reminderCount > 1
        ? `<p class="reminder-count">This is reminder #${reminderCount}. Please submit an update to reset reminders.</p>`
        : `<p>Please add your first update so we can keep this viewing on track.</p>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; }
          .container { max-width: 620px; margin: 0 auto; padding: 24px; }
          .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); }
          .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 28px 32px; }
          .header h2 { margin: 0 0 8px 0; font-size: 24px; }
          .header p { margin: 0; font-size: 16px; opacity: 0.9; }
          .content { padding: 24px 32px; }
          .viewing-details { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px; background: #f9fafb; }
          .viewing-details h3 { margin-top: 0; color: #111827; }
          .time-badge { display: inline-block; background: #2563eb; color: white; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-left: 6px; }
          .cta { display: block; text-align: center; background: #2563eb; color: white; padding: 14px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .cta:hover { background: #1d4ed8; }
          .reminder-count { background: #fef3c7; padding: 12px 16px; border-radius: 8px; border: 1px solid #f59e0b33; color: #b45309; font-size: 14px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h2>Viewing Update Needed</h2>
              <p>Hi ${userName}, please add a progress update for this viewing.</p>
            </div>
            <div class="content">
              <div class="viewing-details">
                <h3>Viewing Details</h3>
                ${propertyDetails}
                ${locationDetails}
                ${leadDetails}
                ${viewingDateDetails}
                ${lastActivityDetails}
              </div>
              <p>Keeping your viewings up to date helps the operations team track progress and provide timely support. Please add a note summarizing the latest activity or outcome.</p>
              ${reminderCountText}
              <p>If this viewing has been completed or cancelled, update the status so we can stop sending reminders.</p>
              <p>Thank you!</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from Finders CRM.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration
  async testEmailConfiguration(testConfig = null) {
    try {
      let transporter;
      
      if (testConfig) {
        // Use provided test configuration
        transporter = nodemailer.createTransport({
          host: testConfig.host,
          port: parseInt(testConfig.port),
          secure: testConfig.secure || false,
          auth: {
            user: testConfig.user,
            pass: testConfig.pass
          }
        });
      } else {
        // Use current transporter
        transporter = await this.getTransporter();
      }
      
      await transporter.verify();
      console.log('✅ Email configuration is valid');
      return true;
    } catch (error) {
      console.error('❌ Email configuration error:', error);
      return false;
    }
  }

  async sendTestEmail(recipientEmail, testConfig = null) {
    try {
      let transporter, fromName, fromEmail;
      
      if (testConfig) {
        // Use provided test configuration
        transporter = nodemailer.createTransport({
          host: testConfig.host,
          port: parseInt(testConfig.port),
          secure: testConfig.secure || false,
          auth: {
            user: testConfig.user,
            pass: testConfig.pass
          }
        });
        fromName = testConfig.fromName || 'Finders CRM';
        fromEmail = testConfig.from || testConfig.user;
      } else {
        // Use current settings
        transporter = await this.getTransporter();
        const settings = await this.getEmailSettings();
        fromName = settings.email_from_name || 'Finders CRM';
        fromEmail = settings.email_from_address || 'noreply@finderscrm.com';
      }

      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        subject: 'Test Email - Finders CRM',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .success { color: #10B981; font-weight: bold; font-size: 18px; }
              .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>✅ Email Configuration Test</h2>
              </div>
              <div class="content">
                <p class="success">Success! Your email configuration is working correctly.</p>
                <p>This is a test email from your Finders CRM system to verify that your SMTP settings are properly configured.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                  <li>From: ${fromName} &lt;${fromEmail}&gt;</li>
                  <li>Date: ${new Date().toLocaleString()}</li>
                </ul>
                <p>If you received this email, your email notifications system is ready to use!</p>
              </div>
              <div class="footer">
                <p>This is a test message from Finders CRM</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Test email sent to ${recipientEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Error sending test email to ${recipientEmail}:`, error);
      throw error;
    }
  }
}

module.exports = new EmailService();
