-- DCSR (Daily Client/Sales Report) Monthly Reports Table
-- This table stores monthly aggregated data about listings, leads, closures, and viewings

CREATE TABLE IF NOT EXISTS dcsr_monthly_reports (
  id SERIAL PRIMARY KEY,
  
  -- Reporting window (company-wide)
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Data & Calls (Effort/Input)
  listings_count INTEGER DEFAULT 0 NOT NULL, -- Number of new listings added
  leads_count INTEGER DEFAULT 0 NOT NULL, -- Number of leads/calls handled
  
  -- Closures (Output/Results)
  sales_count INTEGER DEFAULT 0 NOT NULL, -- Number of successful sale closures
  rent_count INTEGER DEFAULT 0 NOT NULL, -- Number of successful rent closures
  
  -- Viewings
  viewings_count INTEGER DEFAULT 0 NOT NULL, -- Number of property viewings
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure one report per date range
  UNIQUE(start_date, end_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dcsr_reports_period ON dcsr_monthly_reports(year, month);
CREATE INDEX IF NOT EXISTS idx_dcsr_reports_date_range ON dcsr_monthly_reports(start_date, end_date);

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

-- Add comment to table
COMMENT ON TABLE dcsr_monthly_reports IS 'DCSR (Daily Client/Sales Report) - Aggregated reports tracking company-wide listings, leads, closures (sales & rent), and viewings for a date range';
COMMENT ON COLUMN dcsr_monthly_reports.listings_count IS 'Number of new property listings added by agent in the month';
COMMENT ON COLUMN dcsr_monthly_reports.leads_count IS 'Number of leads/calls handled by agent in the month';
COMMENT ON COLUMN dcsr_monthly_reports.sales_count IS 'Number of successful sale closures in the month';
COMMENT ON COLUMN dcsr_monthly_reports.rent_count IS 'Number of successful rent closures in the month';
COMMENT ON COLUMN dcsr_monthly_reports.viewings_count IS 'Number of property viewings conducted in the month';

