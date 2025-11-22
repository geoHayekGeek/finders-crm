-- Operations Daily Reports Table
CREATE TABLE IF NOT EXISTS operations_daily_reports (
  id SERIAL PRIMARY KEY,
  operations_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  operations_name VARCHAR(255) NOT NULL,
  report_date DATE NOT NULL,
  
  -- Calculated fields (from database)
  properties_added INTEGER NOT NULL DEFAULT 0,
  leads_responded_to INTEGER NOT NULL DEFAULT 0,
  amending_previous_properties INTEGER NOT NULL DEFAULT 0,
  
  -- Manual input fields
  preparing_contract INTEGER NOT NULL DEFAULT 0,
  tasks_efficiency_duty_time INTEGER NOT NULL DEFAULT 0,
  tasks_efficiency_uniform INTEGER NOT NULL DEFAULT 0,
  tasks_efficiency_after_duty INTEGER NOT NULL DEFAULT 0,
  leads_responded_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique report per operations user per day
  UNIQUE(operations_id, report_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operations_daily_reports_operations_id ON operations_daily_reports(operations_id);
CREATE INDEX IF NOT EXISTS idx_operations_daily_reports_report_date ON operations_daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_operations_daily_reports_created_at ON operations_daily_reports(created_at);

-- Comments for documentation
COMMENT ON TABLE operations_daily_reports IS 'Daily reports for operations employees/managers tracking their daily activities';
COMMENT ON COLUMN operations_daily_reports.operations_id IS 'Operations employee or manager user ID';
COMMENT ON COLUMN operations_daily_reports.operations_name IS 'Name of the operations employee/manager (denormalized for display)';
COMMENT ON COLUMN operations_daily_reports.report_date IS 'Date of the report (one report per day per operations user)';
COMMENT ON COLUMN operations_daily_reports.properties_added IS 'Number of properties added on this day (calculated from properties.created_at)';
COMMENT ON COLUMN operations_daily_reports.leads_responded_to IS 'Number of leads responded to on this day (calculated from leads.updated_at where operations_id matches)';
COMMENT ON COLUMN operations_daily_reports.amending_previous_properties IS 'Number of properties amended on this day (calculated from properties.updated_at)';
COMMENT ON COLUMN operations_daily_reports.preparing_contract IS 'Number of contracts prepared (manual input)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_duty_time IS 'Duty time efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_uniform IS 'Uniform efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_after_duty IS 'After duty performance efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.leads_responded_out_of_duty_time IS 'Number of leads responded to outside duty time (manual input, subtracts from leads_responded_to)';

