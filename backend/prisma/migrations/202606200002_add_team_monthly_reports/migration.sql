-- Team monthly reports
-- Stores one summary row per team reporting window, plus the saved agent report snapshots

CREATE TABLE IF NOT EXISTS team_monthly_reports (
  id SERIAL PRIMARY KEY,
  team_leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  agent_count INTEGER NOT NULL DEFAULT 0,
  listings_count INTEGER DEFAULT 0,
  lead_sources JSONB DEFAULT '{}'::JSONB,
  viewings_count INTEGER DEFAULT 0,
  boosts DECIMAL(15,2) DEFAULT 0.00,
  sales_count INTEGER DEFAULT 0,
  sales_amount DECIMAL(15,2) DEFAULT 0,

  agent_commission DECIMAL(15,2) DEFAULT 0,
  finders_commission DECIMAL(15,2) DEFAULT 0,
  referral_commission DECIMAL(15,2) DEFAULT 0,
  team_leader_commission DECIMAL(15,2) DEFAULT 0,
  administration_commission DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,

  referral_received_count INTEGER DEFAULT 0,
  referral_received_commission DECIMAL(15,2) DEFAULT 0,
  referrals_on_properties_count INTEGER DEFAULT 0,
  referrals_on_properties_commission DECIMAL(15,2) DEFAULT 0,

  agent_reports JSONB NOT NULL DEFAULT '[]'::JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE(team_leader_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_team_monthly_reports_team_leader_id
  ON team_monthly_reports(team_leader_id);

CREATE INDEX IF NOT EXISTS idx_team_monthly_reports_month_year
  ON team_monthly_reports(month, year);

CREATE INDEX IF NOT EXISTS idx_team_monthly_reports_date_range
  ON team_monthly_reports(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_team_monthly_reports_created_at
  ON team_monthly_reports(created_at);

DROP TRIGGER IF EXISTS trigger_update_team_monthly_reports_timestamp ON team_monthly_reports;
CREATE TRIGGER trigger_update_team_monthly_reports_timestamp
  BEFORE UPDATE ON team_monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE team_monthly_reports IS 'Stores monthly performance reports for teams with saved per-agent snapshots';
COMMENT ON COLUMN team_monthly_reports.team_leader_id IS 'Reference to the team leader this report belongs to';
COMMENT ON COLUMN team_monthly_reports.agent_count IS 'Number of active team agents included in this report';
COMMENT ON COLUMN team_monthly_reports.agent_reports IS 'Saved per-agent report snapshots for the reporting window';
