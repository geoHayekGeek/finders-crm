const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email, resetCode) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
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

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(email) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
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

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password changed email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password changed email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
