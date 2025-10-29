const nodemailer = require('nodemailer');
const SettingsModel = require('../models/settingsModel');

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
        smtp_host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
        smtp_user: process.env.SMTP_USER || process.env.EMAIL_USER,
        smtp_pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        smtp_secure: false,
        email_from_name: 'Finders CRM',
        email_from_address: process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@finderscrm.com'
      };
    }
  }

  async initializeTransporter() {
    const settings = await this.getEmailSettings();
    
    this.transporter = nodemailer.createTransport({
      host: settings.smtp_host || 'smtp.gmail.com',
      port: parseInt(settings.smtp_port) || 587,
      secure: settings.smtp_secure || false,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    return this.transporter;
  }

  async getTransporter() {
    // Always reinitialize to get fresh settings
    await this.initializeTransporter();
    return this.transporter;
  }

  async sendPasswordResetEmail(email, resetCode) {
    try {
      const settings = await this.getEmailSettings();
      const transporter = await this.getTransporter();
      const fromEmail = settings.email_from_address || settings.smtp_user;
      const fromName = settings.email_from_name || 'Finders CRM';
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Password Reset Request - Finders CRM',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Password Reset Request</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                You have requested to reset your password for your Finders CRM account.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Use the following code to reset your password:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${resetCode}
                </span>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                This code will expire in 10 minutes for security reasons.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px;">
                  This is an automated message, please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(email) {
    try {
      const settings = await this.getEmailSettings();
      const transporter = await this.getTransporter();
      const fromEmail = settings.email_from_address || settings.smtp_user;
      const fromName = settings.email_from_name || 'Finders CRM';
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Password Successfully Changed - Finders CRM',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; text-align: center; margin-bottom: 30px;">Password Successfully Changed</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Your password has been successfully changed for your Finders CRM account.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                If you made this change, you can safely ignore this email.
              </p>
              
              <p style="color: #dc2626; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                If you did not make this change, please contact support immediately as your account may have been compromised.
              </p>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px;">
                  This is an automated message, please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Password changed email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password changed email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
