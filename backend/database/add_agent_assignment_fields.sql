-- Migration: Add agent assignment tracking fields

-- Add is_assigned boolean field to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_assigned') THEN
        ALTER TABLE users ADD COLUMN is_assigned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_assigned column to users table';
    ELSE
        RAISE NOTICE 'is_assigned column already exists in users table';
    END IF;
END $$;

-- Add assigned_to field to track which team leader an agent is assigned to
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_to') THEN
        ALTER TABLE users ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added assigned_to column to users table';
    ELSE
        RAISE NOTICE 'assigned_to column already exists in users table';
    END IF;
END $$;

-- Create index on is_assigned for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_assigned ON users(is_assigned);

-- Create index on assigned_to for better performance
CREATE INDEX IF NOT EXISTS idx_users_assigned_to ON users(assigned_to);

-- Add comment to columns
COMMENT ON COLUMN users.is_assigned IS 'Boolean flag indicating if agent is assigned to a team leader';
COMMENT ON COLUMN users.assigned_to IS 'ID of the team leader this agent is assigned to (NULL if not assigned)';

