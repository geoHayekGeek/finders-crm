-- Create monthly_agent_reports table
-- This table stores monthly performance reports for each agent
CREATE TABLE IF NOT EXISTS monthly_agent_reports (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Listing count (auto-calculated)
  listings_count INTEGER DEFAULT 0,
  
  -- Lead sources (dynamic columns - stored as JSONB for flexibility)
  -- Structure: {"Dubizzle": 5, "Facebook": 3, "Instagram": 2, "Website": 1, "TikTok": 0, etc.}
  lead_sources JSONB DEFAULT '{}'::JSONB,
  
  -- Viewings count (auto-calculated)
  viewings_count INTEGER DEFAULT 0,
  
  -- Boosts (manual input field - dollar value)
  boosts DECIMAL(15,2) DEFAULT 0.00,
  
  -- Sales count (auto-calculated from closed_date)
  sales_count INTEGER DEFAULT 0,
  
  -- Sales amount (auto-calculated from closed properties)
  sales_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Commission calculations (auto-calculated based on settings)
  agent_commission DECIMAL(15,2) DEFAULT 0,
  finders_commission DECIMAL(15,2) DEFAULT 0,
  referral_commission DECIMAL(15,2) DEFAULT 0,
  team_leader_commission DECIMAL(15,2) DEFAULT 0,
  administration_commission DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  
  -- Referral received (for agents who received referrals)
  referral_received_count INTEGER DEFAULT 0,
  referral_received_commission DECIMAL(15,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure one report per agent per date range
  UNIQUE(agent_id, start_date, end_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_reports_agent_id ON monthly_agent_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month_year ON monthly_agent_reports(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_date_range ON monthly_agent_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_created_at ON monthly_agent_reports(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_reports_timestamp
BEFORE UPDATE ON monthly_agent_reports
FOR EACH ROW
EXECUTE FUNCTION update_monthly_reports_updated_at();

-- Add comments for documentation
COMMENT ON TABLE monthly_agent_reports IS 'Stores monthly performance reports for agents with auto-calculated metrics';
COMMENT ON COLUMN monthly_agent_reports.agent_id IS 'Reference to the agent (user) this report is for';
COMMENT ON COLUMN monthly_agent_reports.month IS 'Month of the report (1-12)';
COMMENT ON COLUMN monthly_agent_reports.year IS 'Year of the report';
COMMENT ON COLUMN monthly_agent_reports.start_date IS 'Inclusive start date for the reporting period';
COMMENT ON COLUMN monthly_agent_reports.end_date IS 'Inclusive end date for the reporting period';
COMMENT ON COLUMN monthly_agent_reports.listings_count IS 'Number of listings created by agent in this period';
COMMENT ON COLUMN monthly_agent_reports.lead_sources IS 'Count of leads by source (dynamic JSONB structure)';
COMMENT ON COLUMN monthly_agent_reports.viewings_count IS 'Number of viewings conducted by agent';
COMMENT ON COLUMN monthly_agent_reports.boosts IS 'Manual field for boosts in dollars (can be edited)';
COMMENT ON COLUMN monthly_agent_reports.sales_count IS 'Number of sales closed in this month';
COMMENT ON COLUMN monthly_agent_reports.sales_amount IS 'Total sales amount from closed properties';
COMMENT ON COLUMN monthly_agent_reports.agent_commission IS 'Agent commission calculated from settings';
COMMENT ON COLUMN monthly_agent_reports.finders_commission IS 'Finders commission calculated from settings';
COMMENT ON COLUMN monthly_agent_reports.referral_commission IS 'Referral commission calculated from settings';
COMMENT ON COLUMN monthly_agent_reports.team_leader_commission IS 'Team leader commission calculated from settings';
COMMENT ON COLUMN monthly_agent_reports.administration_commission IS 'Administration commission calculated from settings';
COMMENT ON COLUMN monthly_agent_reports.total_commission IS 'Total of all commissions';
COMMENT ON COLUMN monthly_agent_reports.referral_received_count IS 'Number of referrals received by this agent';
COMMENT ON COLUMN monthly_agent_reports.referral_received_commission IS 'Commission earned from referrals received';

