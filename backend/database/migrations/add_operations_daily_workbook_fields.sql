-- Idempotent repair for operations_daily_reports workbook fields
-- This is safe to run on existing Railway databases that were created
-- before the workbook-style daily columns were added.

ALTER TABLE operations_daily_reports
  ADD COLUMN IF NOT EXISTS operations_rows JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS properties_added INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_responded_to INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amending_previous_properties INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preparing_daily_report INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_calls_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replying_to_msg_on_sm_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cvs INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS filling INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preparing_contract INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_efficiency INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_calls_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replying_to_msg_on_sm_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replying_to_whats_up_msg_out_of_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_efficiency_duty_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_efficiency_uniform INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_efficiency_after_duty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_responded_out_of_duty_time INTEGER NOT NULL DEFAULT 0;
