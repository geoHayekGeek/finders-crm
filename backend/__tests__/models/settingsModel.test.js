// backend/__tests__/models/settingsModel.test.js
// Unit tests for Settings Model

const SettingsModel = require('../../models/settingsModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Settings Model', () => {
  let mockQuery;
  let mockClient;
  let mockConnect;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    
    // Mock transaction client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);
    pool.connect = mockConnect;
    
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all settings', async () => {
      const mockSettings = {
        rows: [
          { setting_key: 'setting1', setting_value: 'value1', category: 'general' },
          { setting_key: 'setting2', setting_value: 'value2', category: 'email' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockSettings);

      const result = await SettingsModel.getAll();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('setting_key');
      expect(queryCall).toContain('setting_value');
    });
  });

  describe('getByCategory', () => {
    it('should get settings by category', async () => {
      const mockSettings = {
        rows: [
          { setting_key: 'email_host', setting_value: 'smtp.gmail.com', category: 'email' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockSettings);

      const result = await SettingsModel.getByCategory('email');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1'),
        ['email']
      );
    });
  });

  describe('getByKey', () => {
    it('should get a single setting by key', async () => {
      const mockSetting = {
        rows: [{
          setting_key: 'email_notifications_enabled',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockSetting);

      const result = await SettingsModel.getByKey('email_notifications_enabled');

      expect(result.setting_key).toBe('email_notifications_enabled');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE setting_key = $1'),
        ['email_notifications_enabled']
      );
    });

    it('should return null when setting not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.getByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByKeys', () => {
    it('should get multiple settings by keys', async () => {
      const mockSettings = {
        rows: [
          { setting_key: 'setting1', setting_value: 'value1' },
          { setting_key: 'setting2', setting_value: 'value2' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockSettings);

      const result = await SettingsModel.getByKeys(['setting1', 'setting2']);

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE setting_key = ANY'),
        [['setting1', 'setting2']]
      );
    });
  });

  describe('update', () => {
    it('should update a single setting', async () => {
      const mockUpdated = {
        rows: [{
          setting_key: 'email_notifications_enabled',
          setting_value: 'false',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockUpdated);

      const result = await SettingsModel.update('email_notifications_enabled', 'false');

      expect(result.setting_value).toBe('false');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE system_settings'),
        ['false', 'email_notifications_enabled']
      );
    });
  });

  describe('updateMultiple', () => {
    it('should update multiple settings in transaction', async () => {
      const settings = [
        { key: 'setting1', value: 'value1' },
        { key: 'setting2', value: 'value2' }
      ];

      const mockUpdated1 = { rows: [{ setting_key: 'setting1', setting_value: 'value1' }] };
      const mockUpdated2 = { rows: [{ setting_key: 'setting2', setting_value: 'value2' }] };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated1) // UPDATE setting1
        .mockResolvedValueOnce(mockUpdated2) // UPDATE setting2
        .mockResolvedValueOnce({}); // COMMIT

      const result = await SettingsModel.updateMultiple(settings);

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      const settings = [{ key: 'setting1', value: 'value1' }];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      await expect(SettingsModel.updateMultiple(settings)).rejects.toThrow('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('create', () => {
    it('should create a new setting', async () => {
      const settingData = {
        setting_key: 'new_setting',
        setting_value: 'new_value',
        setting_type: 'string',
        description: 'A new setting',
        category: 'general'
      };

      const mockCreated = {
        rows: [settingData]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await SettingsModel.create(settingData);

      expect(result.setting_key).toBe('new_setting');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_settings'),
        ['new_setting', 'new_value', 'string', 'A new setting', 'general']
      );
    });

    it('should use default values when not provided', async () => {
      const settingData = {
        setting_key: 'new_setting',
        setting_value: 'new_value'
      };

      const mockCreated = {
        rows: [{ ...settingData, setting_type: 'string', category: 'general' }]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await SettingsModel.create(settingData);

      expect(result.setting_type).toBe('string');
      expect(result.category).toBe('general');
    });
  });

  describe('delete', () => {
    it('should delete a setting', async () => {
      const mockDeleted = {
        rows: [{ setting_key: 'setting_to_delete' }]
      };

      mockQuery.mockResolvedValueOnce(mockDeleted);

      const result = await SettingsModel.delete('setting_to_delete');

      expect(result.setting_key).toBe('setting_to_delete');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM system_settings'),
        ['setting_to_delete']
      );
    });
  });

  describe('getKeyValueObject', () => {
    it('should return settings as key-value object', async () => {
      const mockSettings = {
        rows: [
          { setting_key: 'setting1', setting_value: 'value1', setting_type: 'string' },
          { setting_key: 'setting2', setting_value: 'true', setting_type: 'boolean' },
          { setting_key: 'setting3', setting_value: '123', setting_type: 'number' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockSettings);

      const result = await SettingsModel.getKeyValueObject();

      expect(result.setting1).toBe('value1');
      expect(result.setting2).toBe(true);
      expect(result.setting3).toBe(123);
    });
  });

  describe('convertValue', () => {
    it('should convert boolean string to boolean', () => {
      expect(SettingsModel.convertValue('true', 'boolean')).toBe(true);
      expect(SettingsModel.convertValue('false', 'boolean')).toBe(false);
      expect(SettingsModel.convertValue(true, 'boolean')).toBe(true);
    });

    it('should convert number string to number', () => {
      expect(SettingsModel.convertValue('123', 'number')).toBe(123);
      expect(SettingsModel.convertValue('123.45', 'number')).toBe(123.45);
    });

    it('should convert integer string to integer', () => {
      expect(SettingsModel.convertValue('123', 'integer')).toBe(123);
    });

    it('should return string as-is for string type', () => {
      expect(SettingsModel.convertValue('test', 'string')).toBe('test');
    });

    it('should return null for null or undefined', () => {
      expect(SettingsModel.convertValue(null, 'string')).toBeNull();
      expect(SettingsModel.convertValue(undefined, 'string')).toBeNull();
    });
  });

  describe('isEmailNotificationsEnabled', () => {
    it('should return true when enabled', async () => {
      const mockSetting = {
        rows: [{
          setting_key: 'email_notifications_enabled',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockSetting);

      const result = await SettingsModel.isEmailNotificationsEnabled();

      expect(result).toBe(true);
    });

    it('should return default true when setting not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.isEmailNotificationsEnabled();

      expect(result).toBe(true);
    });
  });

  describe('isEmailNotificationTypeEnabled', () => {
    it('should return false when global notifications disabled', async () => {
      const mockGlobal = {
        rows: [{
          setting_key: 'email_notifications_enabled',
          setting_value: 'false',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockGlobal);

      const result = await SettingsModel.isEmailNotificationTypeEnabled('viewing');

      expect(result).toBe(false);
    });

    it('should return true when type-specific setting enabled', async () => {
      const mockGlobal = {
        rows: [{
          setting_key: 'email_notifications_enabled',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };
      const mockType = {
        rows: [{
          setting_key: 'email_notifications_viewing',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockGlobal)
        .mockResolvedValueOnce(mockType);

      const result = await SettingsModel.isEmailNotificationTypeEnabled('viewing');

      expect(result).toBe(true);
    });
  });

  describe('isReminderEnabled', () => {
    it('should return true for enabled reminder type', async () => {
      const mockSetting = {
        rows: [{
          setting_key: 'reminder_1_day_before',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockSetting);

      const result = await SettingsModel.isReminderEnabled('1_day');

      expect(result).toBe(true);
    });

    it('should map reminder types correctly', async () => {
      const mockSetting = {
        rows: [{
          setting_key: 'reminder_same_day',
          setting_value: 'true',
          setting_type: 'boolean'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockSetting);

      const result = await SettingsModel.isReminderEnabled('same_day');

      expect(result).toBe(true);
    });

    it('should return default true when setting not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.isReminderEnabled('unknown');

      expect(result).toBe(true);
    });
  });
});

