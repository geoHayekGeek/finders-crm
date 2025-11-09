-- Migration: Convert DCSR reports from agent-specific to company-wide totals
-- This removes agent_id and agent_name, making it one report per month for the entire company

-- Drop the existing table and recreate it
DROP TABLE IF EXISTS dcsr_monthly_reports CASCADE;

-- Create new company-wide DCSR reports table
CREATE TABLE dcsr_monthly_reports (
  id SERIAL PRIMARY KEY,
  
  -- Time period only (no agent)
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  
  -- Description (company-wide totals)
  listings_count INTEGER DEFAULT 0 NOT NULL, -- Total new listings added
  leads_count INTEGER DEFAULT 0 NOT NULL, -- Total leads/calls handled
  
  -- Closures (company-wide totals)
  sales_count INTEGER DEFAULT 0 NOT NULL, -- Total sale closures
  rent_count INTEGER DEFAULT 0 NOT NULL, -- Total rent closures
  
  -- Viewings (company-wide total)
  viewings_count INTEGER DEFAULT 0 NOT NULL, -- Total property viewings
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure one report per month (company-wide)
  UNIQUE(month, year)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dcsr_reports_period ON dcsr_monthly_reports(year, month);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dcsr_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dcsr_reports_updated_at
  BEFORE UPDATE ON dcsr_monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_dcsr_reports_updated_at();

-- Add comments to table
COMMENT ON TABLE dcsr_monthly_reports IS 'DCSR (Daily Client/Sales Report) - Company-wide monthly reports tracking total listings, leads, closures (sales & rent), and viewings across all agents';
COMMENT ON COLUMN dcsr_monthly_reports.listings_count IS 'Total number of property listings added in the month (all agents)';
COMMENT ON COLUMN dcsr_monthly_reports.leads_count IS 'Total number of leads/calls handled in the month (all agents)';
COMMENT ON COLUMN dcsr_monthly_reports.sales_count IS 'Total number of sale closures in the month (all agents)';
COMMENT ON COLUMN dcsr_monthly_reports.rent_count IS 'Total number of rent closures in the month (all agents)';
COMMENT ON COLUMN dcsr_monthly_reports.viewings_count IS 'Total number of property viewings in the month (all agents)';

