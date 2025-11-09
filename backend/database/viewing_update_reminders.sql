-- Ensure shared timestamp trigger helper exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Viewing Update Reminder Tracking Table
CREATE TABLE IF NOT EXISTS viewing_update_reminders (
  id SERIAL PRIMARY KEY,
  viewing_id INTEGER NOT NULL REFERENCES viewings(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  last_notification_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(viewing_id, agent_id)
);

-- Indexes to optimize reminder lookups
CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_viewing_id
  ON viewing_update_reminders(viewing_id);
CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_agent_id
  ON viewing_update_reminders(agent_id);
CREATE INDEX IF NOT EXISTS idx_viewing_update_reminders_last_sent
  ON viewing_update_reminders(last_reminder_sent_at);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_viewing_update_reminders_timestamp ON viewing_update_reminders;
CREATE TRIGGER update_viewing_update_reminders_timestamp
  BEFORE UPDATE ON viewing_update_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


