-- Add commission-related settings with defaults
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('commission_agent_percentage', '2', 'number', 'Default commission percentage for agents', 'commissions'),
('commission_finders_percentage', '1', 'number', 'Default commission percentage for finders', 'commissions'),
('commission_referral_percentage', '0.5', 'number', 'Default commission percentage for referrals', 'commissions'),
('commission_team_leader_percentage', '1', 'number', 'Default commission percentage for team leaders', 'commissions'),
('commission_administration_percentage', '4', 'number', 'Default commission percentage for administration (operations)', 'commissions'),
('commission_operations_manager_share_of_admin', '0.5', 'number', 'Operations manager share expressed as a percentage out of administration commission', 'commissions')
ON CONFLICT (setting_key) DO NOTHING;




