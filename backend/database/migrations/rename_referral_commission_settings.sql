-- Rename referral commission settings to internal/external naming
-- This makes the setting keys match the UI labels

-- Rename internal referral commission setting
UPDATE system_settings 
SET setting_key = 'commission_referral_internal_percentage',
    description = 'Internal referral commission percentage for employee referrals'
WHERE setting_key = 'commission_referral_percentage';

-- Rename external referral commission setting
UPDATE system_settings 
SET setting_key = 'commission_referral_external_percentage',
    description = 'External referral commission percentage for custom/non-employee referrals'
WHERE setting_key = 'commission_referral_extended_percentage';

