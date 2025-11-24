-- Add external referral commission setting
-- This is for external (custom/non-employee) referrals
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('commission_referral_extended_percentage', '2', 'number', 'External referral commission percentage for custom/non-employee referrals', 'commissions')
ON CONFLICT (setting_key) DO UPDATE SET description = 'External referral commission percentage for custom/non-employee referrals';

