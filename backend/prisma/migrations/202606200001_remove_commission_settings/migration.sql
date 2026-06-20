-- Remove all commission-related settings now that commissions are entered manually
BEGIN;

DELETE FROM system_settings
WHERE setting_key LIKE 'commission_%';

COMMENT ON TABLE monthly_agent_reports IS 'Stores monthly performance reports for agents with manual commission amounts and auto-calculated operational metrics';
COMMENT ON COLUMN monthly_agent_reports.agent_commission IS 'Agent commission amount entered manually on the report';
COMMENT ON COLUMN monthly_agent_reports.finders_commission IS 'Finders commission amount entered manually on the report';
COMMENT ON COLUMN monthly_agent_reports.referral_commission IS 'Legacy referral commission field kept for compatibility';
COMMENT ON COLUMN monthly_agent_reports.team_leader_commission IS 'Team leader commission amount entered manually on the report';
COMMENT ON COLUMN monthly_agent_reports.administration_commission IS 'Administration commission amount entered manually on the report';
COMMENT ON COLUMN monthly_agent_reports.total_commission IS 'Total commission amount entered manually on the report';

COMMENT ON TABLE operations_commission_reports IS 'Monthly reports showing operations commission from all closed properties with a manually entered percentage';
COMMENT ON COLUMN operations_commission_reports.commission_percentage IS 'Operations commission percentage entered manually for the report';
COMMENT ON COLUMN operations_commission_reports.total_commission_amount IS 'Total commission amount entered manually for the report';

COMMIT;
