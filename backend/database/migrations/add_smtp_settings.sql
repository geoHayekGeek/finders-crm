-- Migration: Add SMTP Configuration Settings
-- Description: Add SMTP settings to system_settings table to replace environment variables

-- Add SMTP configuration settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('smtp_host', 'smtp.gmail.com', 'string', 'SMTP server host', 'email'),
('smtp_port', '587', 'string', 'SMTP server port', 'email'),
('smtp_user', 'georgiohayek2002@gmail.com', 'string', 'SMTP username/email', 'email'),
('smtp_pass', 'koom meka czcb wpvq', 'string', 'SMTP password/app password', 'email'),
('smtp_secure', 'false', 'boolean', 'Use SSL/TLS (true for port 465, false for port 587)', 'email')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Note: After this migration, you can remove these environment variables from .env:
-- EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM

