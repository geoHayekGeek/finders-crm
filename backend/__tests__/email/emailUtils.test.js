// __tests__/email/emailUtils.test.js
const emailService = require('../../utils/email');
const SettingsModel = require('../../models/settingsModel');
const nodemailer = require('nodemailer');

// Mock dependencies
jest.mock('../../models/settingsModel');
jest.mock('nodemailer');

describe('EmailService (utils/email.js)', () => {
  let mockTransporter;

  beforeEach(() => {
    // Reset the email service instance state
    emailService.transporter = null;
    emailService.settings = null;
    emailService.lastSettingsLoad = null;

    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true)
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);
    jest.clearAllMocks();
  });

  describe('getEmailSettings', () => {
    it('should get email settings from database successfully', async () => {
      const mockSettings = [
        { setting_key: 'smtp_host', setting_value: 'smtp.gmail.com', setting_type: 'string' },
        { setting_key: 'smtp_port', setting_value: '587', setting_type: 'number' },
        { setting_key: 'smtp_user', setting_value: 'test@example.com', setting_type: 'string' },
        { setting_key: 'smtp_pass', setting_value: 'password123', setting_type: 'string' },
        { setting_key: 'smtp_secure', setting_value: 'false', setting_type: 'boolean' },
        { setting_key: 'email_from_name', setting_value: 'Finders CRM', setting_type: 'string' },
        { setting_key: 'email_from_address', setting_value: 'noreply@finderscrm.com', setting_type: 'string' }
      ];

      SettingsModel.getByKeys.mockResolvedValue(mockSettings);
      SettingsModel.convertValue.mockImplementation((value, type) => {
        if (type === 'number') return parseInt(value);
        if (type === 'boolean') return value === 'true';
        return value;
      });

      const settings = await emailService.getEmailSettings();

      expect(SettingsModel.getByKeys).toHaveBeenCalledWith([
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'email_from_name', 'email_from_address'
      ]);
      expect(settings.smtp_host).toBe('smtp.gmail.com');
      expect(settings.smtp_port).toBe(587);
      expect(settings.email_from_name).toBe('Finders CRM');
    });

    it('should cache settings for 1 minute', async () => {
      const mockSettings = [
        { setting_key: 'smtp_host', setting_value: 'smtp.gmail.com', setting_type: 'string' }
      ];

      SettingsModel.getByKeys.mockResolvedValue(mockSettings);
      SettingsModel.convertValue.mockReturnValue('smtp.gmail.com');

      await emailService.getEmailSettings();
      await emailService.getEmailSettings(); // Second call should use cache

      expect(SettingsModel.getByKeys).toHaveBeenCalledTimes(1);
    });

    it('should fallback to environment variables on database error', async () => {
      SettingsModel.getByKeys.mockRejectedValue(new Error('Database error'));

      const origHost = process.env.EMAIL_HOST;
      const origUser = process.env.EMAIL_USER;
      const origPass = process.env.EMAIL_PASS;
      process.env.EMAIL_HOST = 'smtp.gmail.com';
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_PASS = 'secret';
      try {
        const settings = await emailService.getEmailSettings();
        expect(settings.smtp_host).toBe('smtp.gmail.com');
        expect(settings.email_from_name).toBe('Finders CRM');
      } finally {
        if (origHost !== undefined) process.env.EMAIL_HOST = origHost; else delete process.env.EMAIL_HOST;
        if (origUser !== undefined) process.env.EMAIL_USER = origUser; else delete process.env.EMAIL_USER;
        if (origPass !== undefined) process.env.EMAIL_PASS = origPass; else delete process.env.EMAIL_PASS;
      }
    });
  });

  describe('initializeTransporter', () => {
    it('should initialize transporter with settings', async () => {
      const mockSettings = {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_user: 'test@example.com',
        smtp_pass: 'password123',
        smtp_secure: false
      };

      SettingsModel.getByKeys.mockResolvedValue([]);
      SettingsModel.convertValue.mockReturnValue('value');
      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);

      const transporter = await emailService.initializeTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password123'
        }
      });
      expect(transporter).toBe(mockTransporter);
    });
  });

  describe('getTransporter', () => {
    it('should get and reinitialize transporter', async () => {
      const mockSettings = {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_user: 'test@example.com',
        smtp_pass: 'password123',
        smtp_secure: false
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'initializeTransporter').mockImplementation(async () => {
        emailService.transporter = mockTransporter;
        return mockTransporter;
      });

      const transporter = await emailService.getTransporter();

      expect(emailService.initializeTransporter).toHaveBeenCalled();
      expect(transporter).toBe(mockTransporter);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM',
        smtp_user: 'noreply@finderscrm.com'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.sendPasswordResetEmail('user@example.com', '123456');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toBe('Password Reset Request - Finders CRM');
      expect(mailOptions.html).toContain('123456');
      expect(mailOptions.html).toContain('Password Reset Request');
      expect(mailOptions.html).toContain('10 minutes');
      expect(result).toBe(true);
    });

    it('should use email_from_address when available', async () => {
      const mockSettings = {
        email_from_address: 'custom@finderscrm.com',
        email_from_name: 'Finders CRM',
        smtp_user: 'noreply@finderscrm.com'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendPasswordResetEmail('user@example.com', '123456');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toContain('custom@finderscrm.com');
    });

    it('should fallback to smtp_user when email_from_address not available', async () => {
      const mockSettings = {
        email_from_name: 'Finders CRM',
        smtp_user: 'noreply@finderscrm.com'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendPasswordResetEmail('user@example.com', '123456');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toContain('noreply@finderscrm.com');
    });

    it('should handle errors when sending password reset email', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue({});
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await expect(emailService.sendPasswordResetEmail('user@example.com', '123456')).rejects.toThrow('SMTP error');
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send password changed email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM',
        smtp_user: 'noreply@finderscrm.com'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.sendPasswordChangedEmail('user@example.com');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toBe('Password Successfully Changed - Finders CRM');
      expect(mailOptions.html).toContain('Password Successfully Changed');
      expect(mailOptions.html).toContain('account may have been compromised');
      expect(result).toBe(true);
    });

    it('should handle errors when sending password changed email', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue({});
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await expect(emailService.sendPasswordChangedEmail('user@example.com')).rejects.toThrow('SMTP error');
    });
  });
});

