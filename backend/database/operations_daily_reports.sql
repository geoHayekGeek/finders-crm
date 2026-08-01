-- Operations Daily Reports Table
CREATE TABLE IF NOT EXISTS operations_daily_reports (
  id SERIAL PRIMARY KEY,
  operations_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  operations_name VARCHAR(255) NOT NULL,
  report_date DATE NOT NULL,
  operations_rows JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Calculated fields (from database)
  properties_added INTEGER NOT NULL DEFAULT 0,
  leads_responded_to INTEGER NOT NULL DEFAULT 0,
  amending_previous_properties INTEGER NOT NULL DEFAULT 0,

  -- Workbook-style daily input fields
  preparing_daily_report INTEGER NOT NULL DEFAULT 0,
  phone_calls_duty_time INTEGER NOT NULL DEFAULT 0,
  replying_to_msg_on_sm_duty_time INTEGER NOT NULL DEFAULT 0,
  cvs INTEGER NOT NULL DEFAULT 0,
  filling INTEGER NOT NULL DEFAULT 0,
  preparing_contract INTEGER NOT NULL DEFAULT 0,
  tasks_efficiency INTEGER NOT NULL DEFAULT 0,
  phone_calls_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  replying_to_msg_on_sm_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  replying_to_whats_up_msg_out_of_duty_time INTEGER NOT NULL DEFAULT 0,

  -- Legacy compatibility fields retained for existing calculations and filters
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
COMMENT ON COLUMN operations_daily_reports.report_date IS 'Date of the report (one saved daily report per representative operations user)';
COMMENT ON COLUMN operations_daily_reports.operations_rows IS 'Serialized workbook rows used to render multi-row exports for a combined daily report';
COMMENT ON COLUMN operations_daily_reports.properties_added IS 'Default number of properties added on this day (database-calculated, editable in the report UI)';
COMMENT ON COLUMN operations_daily_reports.leads_responded_to IS 'Default number of leads responded to on this day for the selected operations user (database-calculated, editable in the report UI)';
COMMENT ON COLUMN operations_daily_reports.amending_previous_properties IS 'Default number of properties amended on this day, excluding same-day creates and system bookkeeping updates (database-calculated, editable in the report UI)';
COMMENT ON COLUMN operations_daily_reports.preparing_daily_report IS 'Preparing Daily report count or minutes (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.phone_calls_duty_time IS 'Phone calls during duty time (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.replying_to_msg_on_sm_duty_time IS 'Replying to messages on social media during duty time (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.cvs IS 'CV count (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.filling IS 'Filling count (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.preparing_contract IS 'Number of contracts prepared (manual input)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency IS 'Tasks Efficiency score from the workbook (manual input)';
COMMENT ON COLUMN operations_daily_reports.phone_calls_out_of_duty_time IS 'Phone calls outside duty time (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.replying_to_msg_on_sm_out_of_duty_time IS 'Replying to messages on social media outside duty time (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.replying_to_whats_up_msg_out_of_duty_time IS 'Replying to WhatsApp messages outside duty time (manual input to match workbook format)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_duty_time IS 'Duty time efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_uniform IS 'Uniform efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.tasks_efficiency_after_duty IS 'After duty performance efficiency points (manual input, can be negative)';
COMMENT ON COLUMN operations_daily_reports.leads_responded_out_of_duty_time IS 'Number of leads responded to outside duty time (manual input, subtracts from leads_responded_to)';

