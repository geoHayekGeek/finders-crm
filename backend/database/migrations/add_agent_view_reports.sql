-- Create agent_view_reports table
-- Stores multi-month agent view workbooks with editable targets and saved workbook payloads.

CREATE TABLE IF NOT EXISTS agent_view_reports (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_months INTEGER NOT NULL CHECK (period_months IN (3, 6, 9, 12)),

  -- Period summary values for quick listing and filtering
  listings_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  viewings_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  sales_amount DECIMAL(15,2) DEFAULT 0,
  dev_count INTEGER DEFAULT 0,
  new_join_count INTEGER DEFAULT 0,
  reviews_count DECIMAL(15,2) DEFAULT 0,
  agent_commission DECIMAL(15,2) DEFAULT 0,
  referral_received_commission DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,

  -- Saved workbook payload used to recreate the exact Excel output
  report_payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE(agent_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_view_reports_agent_id
  ON agent_view_reports(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_view_reports_period
  ON agent_view_reports(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_agent_view_reports_created_at
  ON agent_view_reports(created_at);

CREATE OR REPLACE FUNCTION update_agent_view_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_view_reports_timestamp ON agent_view_reports;
CREATE TRIGGER trigger_update_agent_view_reports_timestamp
  BEFORE UPDATE ON agent_view_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_view_reports_updated_at();

COMMENT ON TABLE agent_view_reports IS 'Stores multi-month agent view workbooks with per-month snapshots and editable targets';
COMMENT ON COLUMN agent_view_reports.agent_id IS 'Reference to the agent this workbook belongs to';
COMMENT ON COLUMN agent_view_reports.start_date IS 'Inclusive start date for the selected reporting period';
COMMENT ON COLUMN agent_view_reports.end_date IS 'Inclusive end date for the selected reporting period';
COMMENT ON COLUMN agent_view_reports.period_months IS 'Number of months in the workbook period (3, 6, 9, or 12)';
COMMENT ON COLUMN agent_view_reports.report_payload IS 'Serialized workbook data used to recreate the agent view Excel file';
