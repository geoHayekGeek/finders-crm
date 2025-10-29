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
