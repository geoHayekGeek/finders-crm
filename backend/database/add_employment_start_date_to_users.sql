-- Optional HR-only: when the person starts (or is planned to start) in this role.
-- Not auto-filled; leave NULL if you are only pre-provisioning the account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_start_date DATE;

COMMENT ON COLUMN users.employment_start_date IS 'Optional: planned or actual employment/role start date (set manually in HR; not automatic)';
