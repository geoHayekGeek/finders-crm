-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'string',
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
-- Company Information
('company_name', 'Finders CRM', 'string', 'Company name displayed throughout the system', 'company'),
('company_logo', NULL, 'string', 'Path to company logo file', 'company'),
('company_favicon', NULL, 'string', 'Path to company favicon file', 'company'),
('primary_color', '#3B82F6', 'string', 'Primary brand color (hex)', 'branding'),

-- Email Automation Global Settings
('email_notifications_enabled', 'true', 'boolean', 'Enable/disable all email notifications globally', 'email'),
('email_notifications_calendar_events', 'true', 'boolean', 'Enable email notifications for calendar events', 'email'),
('email_notifications_viewings', 'true', 'boolean', 'Enable email notifications for viewings', 'email'),
('email_notifications_properties', 'true', 'boolean', 'Enable email notifications for properties', 'email'),
('email_notifications_leads', 'true', 'boolean', 'Enable email notifications for leads', 'email'),
('email_notifications_users', 'true', 'boolean', 'Enable email notifications for users', 'email'),

-- Calendar Event Reminder Settings
('reminder_1_day_before', 'true', 'boolean', 'Send reminder 1 day before event', 'reminders'),
('reminder_same_day', 'true', 'boolean', 'Send reminder on the same day as event', 'reminders'),
('reminder_1_hour_before', 'true', 'boolean', 'Send reminder 1 hour before event', 'reminders'),

-- Email Configuration
('email_from_name', 'Finders CRM', 'string', 'Display name for outgoing emails', 'email'),
('email_from_address', 'noreply@finderscrm.com', 'string', 'From email address for outgoing emails', 'email'),
('email_reply_to', NULL, 'string', 'Reply-to email address (optional)', 'email'),

-- UI Preferences
('theme', 'light', 'string', 'System theme (light/dark/system)', 'appearance'),
('timezone', 'UTC', 'string', 'Default system timezone', 'general'),
('date_format', 'YYYY-MM-DD', 'string', 'Default date format', 'general'),
('time_format', '24h', 'string', 'Time format (12h/24h)', 'general'),

-- Feature Toggles
('enable_viewings', 'true', 'boolean', 'Enable viewings feature', 'features'),
('enable_properties', 'true', 'boolean', 'Enable properties feature', 'features'),
('enable_leads', 'true', 'boolean', 'Enable leads feature', 'features'),
('enable_calendar', 'true', 'boolean', 'Enable calendar feature', 'features')

ON CONFLICT (setting_key) DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
