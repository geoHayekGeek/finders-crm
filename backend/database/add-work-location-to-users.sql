-- Add work_location field to users table
-- This allows HR to track where employees work (e.g., "Beirut", "Kesserwan", etc.)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS work_location VARCHAR(255);

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_work_location ON users(work_location);

-- Add comment to column
COMMENT ON COLUMN users.work_location IS 'Physical work location of the employee (e.g., Beirut, Kesserwan)';
