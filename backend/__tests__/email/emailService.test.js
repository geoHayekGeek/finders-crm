// __tests__/email/emailService.test.js
const emailService = require('../../services/emailService');
const SettingsModel = require('../../models/settingsModel');
const nodemailer = require('nodemailer');

// Mock dependencies
jest.mock('../../models/settingsModel');
jest.mock('nodemailer');

describe('EmailService (services/emailService.js)', () => {
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

      const settings = await emailService.getEmailSettings();

      expect(settings.smtp_host).toBe(process.env.EMAIL_HOST || 'smtp.gmail.com');
      expect(settings.email_from_name).toBe('Finders CRM');
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

  describe('sendReminderEmail', () => {
    it('should send 1 day reminder email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const eventData = {
        title: 'Test Event',
        start_time: new Date('2024-12-25T10:00:00'),
        end_time: new Date('2024-12-25T11:00:00'),
        location: 'Test Location',
        description: 'Test Description'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.sendReminderEmail('user@example.com', 'John Doe', eventData, '1_day');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toContain('Tomorrow');
      expect(mailOptions.html).toContain('John Doe');
      expect(mailOptions.html).toContain('Test Event');
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should send same day reminder email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const eventData = {
        title: 'Test Event',
        start_time: new Date('2024-12-25T10:00:00'),
        end_time: new Date('2024-12-25T11:00:00'),
        location: 'Test Location',
        description: 'Test Description'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendReminderEmail('user@example.com', 'John Doe', eventData, 'same_day');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toContain('Today');
    });

    it('should send 1 hour reminder email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const eventData = {
        title: 'Test Event',
        start_time: new Date('2024-12-25T10:00:00'),
        end_time: new Date('2024-12-25T11:00:00'),
        location: 'Test Location',
        description: 'Test Description'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendReminderEmail('user@example.com', 'John Doe', eventData, '1_hour');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toContain('Starting Soon');
    });

    it('should use default reminder template for unknown type', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const eventData = {
        title: 'Test Event',
        start_time: new Date('2024-12-25T10:00:00'),
        end_time: new Date('2024-12-25T11:00:00')
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendReminderEmail('user@example.com', 'John Doe', eventData, 'unknown');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toContain('Reminder');
    });

    it('should handle errors when sending reminder email', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const eventData = {
        title: 'Test Event',
        start_time: new Date('2024-12-25T10:00:00'),
        end_time: new Date('2024-12-25T11:00:00')
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await expect(
        emailService.sendReminderEmail('user@example.com', 'John Doe', eventData, '1_day')
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('sendViewingUpdateReminderEmail', () => {
    it('should send viewing update reminder email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const viewingData = {
        propertyReference: 'PROP001',
        propertyLocation: 'Beirut',
        leadName: 'John Doe',
        viewingDate: '2024-12-25',
        viewingTime: '10:00:00',
        lastActivityDate: '2024-12-20',
        reminderCount: 0
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.sendViewingUpdateReminderEmail(
        'user@example.com',
        'Agent Name',
        viewingData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toContain('Add update');
      expect(mailOptions.html).toContain('Agent Name');
      expect(mailOptions.html).toContain('PROP001');
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should handle missing optional viewing data', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      const viewingData = {
        propertyReference: 'PROP001',
        reminderCount: 1
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await emailService.sendViewingUpdateReminderEmail('user@example.com', 'Agent Name', viewingData);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle errors when sending viewing update reminder', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await expect(
        emailService.sendViewingUpdateReminderEmail('user@example.com', 'Agent Name', {})
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('testEmailConfiguration', () => {
    it('should test email configuration successfully', async () => {
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.testEmailConfiguration();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should test email configuration with custom config', async () => {
      const testConfig = {
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        user: 'test@test.com',
        pass: 'testpass'
      };

      const result = await emailService.testEmailConfiguration(testConfig);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        auth: {
          user: 'test@test.com',
          pass: 'testpass'
        }
      });
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on configuration error', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Invalid credentials'));

      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.testEmailConfiguration();

      expect(result).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      const mockSettings = {
        email_from_address: 'noreply@finderscrm.com',
        email_from_name: 'Finders CRM'
      };

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue(mockSettings);
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      const result = await emailService.sendTestEmail('test@example.com');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toBe('Test Email - Finders CRM');
      expect(mailOptions.html).toContain('Email Configuration Test');
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should send test email with custom config', async () => {
      const testConfig = {
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        user: 'test@test.com',
        pass: 'testpass',
        fromName: 'Custom Name',
        from: 'custom@test.com'
      };

      const result = await emailService.sendTestEmail('test@example.com', testConfig);

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toContain('Custom Name');
      expect(mailOptions.from).toContain('custom@test.com');
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should handle errors when sending test email', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      jest.spyOn(emailService, 'getEmailSettings').mockResolvedValue({});
      jest.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

      await expect(emailService.sendTestEmail('test@example.com')).rejects.toThrow('SMTP error');
    });
  });

  describe('Template methods', () => {
    it('should generate one day reminder template correctly', () => {
      const template = emailService.getOneDayReminderTemplate(
        'John Doe',
        'Test Event',
        'December 25, 2024',
        '10:00 AM',
        'Test Location',
        'Test Description'
      );

      expect(template).toContain('John Doe');
      expect(template).toContain('Test Event');
      expect(template).toContain('December 25, 2024');
      expect(template).toContain('10:00 AM');
      expect(template).toContain('Test Location');
      expect(template).toContain('Test Description');
      expect(template).toContain('tomorrow');
    });

    it('should generate same day reminder template correctly', () => {
      const template = emailService.getSameDayReminderTemplate(
        'John Doe',
        'Test Event',
        '10:00 AM',
        'Test Location',
        'Test Description'
      );

      expect(template).toContain('John Doe');
      expect(template).toContain('Test Event');
      expect(template).toContain('today');
    });

    it('should generate one hour reminder template correctly', () => {
      const template = emailService.getOneHourReminderTemplate(
        'John Doe',
        'Test Event',
        '10:00 AM',
        'Test Location',
        'Test Description'
      );

      expect(template).toContain('John Doe');
      expect(template).toContain('Test Event');
      expect(template).toContain('starting soon');
    });

    it('should generate default reminder template correctly', () => {
      const template = emailService.getDefaultReminderTemplate(
        'John Doe',
        'Test Event',
        'December 25, 2024',
        '10:00 AM',
        'Test Location',
        'Test Description'
      );

      expect(template).toContain('John Doe');
      expect(template).toContain('Test Event');
    });

    it('should generate viewing update reminder template correctly', () => {
      const data = {
        propertyReference: 'PROP001',
        propertyLocation: 'Beirut',
        leadName: 'John Doe',
        formattedViewingDate: 'December 25, 2024',
        viewingTimeString: '10:00 AM',
        lastActivityDateString: 'December 20, 2024',
        reminderCount: 1
      };

      const template = emailService.getViewingUpdateReminderTemplate('Agent Name', data);

      expect(template).toContain('Agent Name');
      expect(template).toContain('PROP001');
      expect(template).toContain('Beirut');
      expect(template).toContain('John Doe');
      expect(template).toContain('December 25, 2024');
      expect(template).toContain('10:00 AM');
    });

    it('should handle optional fields in viewing update reminder template', () => {
      const data = {
        propertyReference: 'PROP001',
        reminderCount: 0
      };

      const template = emailService.getViewingUpdateReminderTemplate('Agent Name', data);

      expect(template).toContain('Agent Name');
      expect(template).toContain('PROP001');
      expect(template).toContain('first update');
    });
  });
});

