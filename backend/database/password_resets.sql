-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email)
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- Create index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Add comment to table
COMMENT ON TABLE password_resets IS 'Stores password reset tokens with expiration times';
