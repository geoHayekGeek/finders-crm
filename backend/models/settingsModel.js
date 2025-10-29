// models/settingsModel.js
const pool = require('../config/db');

class SettingsModel {
  /**
   * Get all settings
   */
  static async getAll() {
    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description, category
       FROM system_settings
       ORDER BY category, setting_key`
    );
    return result.rows;
  }

  /**
   * Get settings by category
   */
  static async getByCategory(category) {
    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description, category
       FROM system_settings
       WHERE category = $1
       ORDER BY setting_key`,
      [category]
    );
    return result.rows;
  }

  /**
   * Get a single setting by key
   */
  static async getByKey(key) {
    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description, category
       FROM system_settings
       WHERE setting_key = $1`,
      [key]
    );
    return result.rows[0] || null;
  }

  /**
   * Get multiple settings by keys
   */
  static async getByKeys(keys) {
    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description, category
       FROM system_settings
       WHERE setting_key = ANY($1)`,
      [keys]
    );
    return result.rows;
  }

  /**
   * Update a single setting
   */
  static async update(key, value) {
    const result = await pool.query(
      `UPDATE system_settings
       SET setting_value = $1, updated_at = NOW()
       WHERE setting_key = $2
       RETURNING setting_key, setting_value, setting_type, description, category`,
      [value, key]
    );
    return result.rows[0];
  }

  /**
   * Update multiple settings
   */
  static async updateMultiple(settings) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updated = [];
      for (const { key, value } of settings) {
        const result = await client.query(
          `UPDATE system_settings
           SET setting_value = $1, updated_at = NOW()
           WHERE setting_key = $2
           RETURNING setting_key, setting_value, setting_type, description, category`,
          [value, key]
        );
        if (result.rows.length > 0) {
          updated.push(result.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new setting
   */
  static async create(data) {
    const { setting_key, setting_value, setting_type = 'string', description, category = 'general' } = data;
    
    const result = await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING setting_key, setting_value, setting_type, description, category`,
      [setting_key, setting_value, setting_type, description, category]
    );
    return result.rows[0];
  }

  /**
   * Delete a setting
   */
  static async delete(key) {
    const result = await pool.query(
      `DELETE FROM system_settings
       WHERE setting_key = $1
       RETURNING setting_key`,
      [key]
    );
    return result.rows[0];
  }

  /**
   * Get all settings as a key-value object
   */
  static async getKeyValueObject() {
    const settings = await this.getAll();
    const obj = {};
    settings.forEach(setting => {
      obj[setting.setting_key] = this.convertValue(setting.setting_value, setting.setting_type);
    });
    return obj;
  }

  /**
   * Convert string value to appropriate type
   */
  static convertValue(value, type) {
    if (value === null || value === undefined) return null;
    
    switch (type) {
      case 'boolean':
        return value === 'true' || value === true;
      case 'number':
        return parseFloat(value);
      case 'integer':
        return parseInt(value, 10);
      default:
        return value;
    }
  }

  /**
   * Check if email notifications are enabled
   */
  static async isEmailNotificationsEnabled() {
    const setting = await this.getByKey('email_notifications_enabled');
    return setting ? this.convertValue(setting.setting_value, setting.setting_type) : true;
  }

  /**
   * Check if specific email notification type is enabled
   */
  static async isEmailNotificationTypeEnabled(type) {
    const globalEnabled = await this.isEmailNotificationsEnabled();
    if (!globalEnabled) return false;

    const setting = await this.getByKey(`email_notifications_${type}`);
    return setting ? this.convertValue(setting.setting_value, setting.setting_type) : true;
  }

  /**
   * Check if a specific reminder type is enabled
   */
  static async isReminderEnabled(type) {
    // Map reminder types to database keys
    const reminderKeyMap = {
      '1_day': 'reminder_1_day_before',
      'same_day': 'reminder_same_day',
      '1_hour': 'reminder_1_hour_before'
    };
    
    const settingKey = reminderKeyMap[type] || `reminder_${type}`;
    const setting = await this.getByKey(settingKey);
    return setting ? this.convertValue(setting.setting_value, setting.setting_type) : true;
  }
}

module.exports = SettingsModel;
