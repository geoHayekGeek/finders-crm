-- Total Operations Commission Reports Table
CREATE TABLE IF NOT EXISTS operations_commission_reports (
  id SERIAL PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  total_properties_count INTEGER NOT NULL DEFAULT 0,
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_rent_count INTEGER NOT NULL DEFAULT 0,
  total_sales_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_rent_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique report per date range
  UNIQUE(start_date, end_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operations_commission_reports_month_year ON operations_commission_reports(year, month);
CREATE INDEX IF NOT EXISTS idx_operations_commission_reports_date_range ON operations_commission_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_operations_commission_reports_created_at ON operations_commission_reports(created_at);

-- Comments for documentation
COMMENT ON TABLE operations_commission_reports IS 'Monthly reports showing operations commission from all closed properties';
COMMENT ON COLUMN operations_commission_reports.month IS 'Month of the report (1-12)';
COMMENT ON COLUMN operations_commission_reports.year IS 'Year of the report';
COMMENT ON COLUMN operations_commission_reports.commission_percentage IS 'Operations commission percentage used for calculations';
COMMENT ON COLUMN operations_commission_reports.total_properties_count IS 'Total number of closed properties in the month';
COMMENT ON COLUMN operations_commission_reports.total_sales_count IS 'Total number of sold properties';
COMMENT ON COLUMN operations_commission_reports.total_rent_count IS 'Total number of rented properties';
COMMENT ON COLUMN operations_commission_reports.total_sales_value IS 'Total value of sold properties';
COMMENT ON COLUMN operations_commission_reports.total_rent_value IS 'Total value of rented properties';
COMMENT ON COLUMN operations_commission_reports.total_commission_amount IS 'Total commission amount for operations';

