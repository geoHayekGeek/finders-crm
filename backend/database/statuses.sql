-- Statuses table for property statuses
CREATE TABLE IF NOT EXISTS statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT TRUE,
  can_be_referred BOOLEAN DEFAULT TRUE,
  is_closure_status BOOLEAN DEFAULT FALSE,
  is_default_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE statuses
  ADD COLUMN IF NOT EXISTS can_be_referred BOOLEAN DEFAULT TRUE;

ALTER TABLE statuses
  ADD COLUMN IF NOT EXISTS is_closure_status BOOLEAN DEFAULT FALSE;

ALTER TABLE statuses
  ADD COLUMN IF NOT EXISTS is_default_status BOOLEAN DEFAULT FALSE;

-- Insert default statuses
INSERT INTO statuses (name, code, description, color, can_be_referred, is_closure_status, is_default_status) VALUES
  ('Active', 'active', 'Property is available for sale/rent', '#10B981', TRUE, FALSE, TRUE),
  ('Inactive', 'inactive', 'Property is temporarily unavailable', '#6B7280', TRUE, FALSE, FALSE),
  ('Sold', 'sold', 'Property has been sold', '#EF4444', FALSE, TRUE, FALSE),
  ('Rented', 'rented', 'Property has been rented', '#8B5CF6', FALSE, TRUE, FALSE),
  ('Under Contract', 'under_contract', 'Property is under contract', '#F59E0B', TRUE, FALSE, FALSE),
  ('Pending', 'pending', 'Property is pending approval', '#3B82F6', TRUE, FALSE, FALSE),
  ('Reserved', 'reserved', 'Property is reserved for a client', '#EC4899', TRUE, FALSE, FALSE)
ON CONFLICT (name) DO NOTHING;

UPDATE statuses
SET can_be_referred = FALSE
WHERE LOWER(code) IN ('sold', 'rented', 'closed')
   OR LOWER(name) IN ('sold', 'rented', 'closed');

UPDATE statuses
SET is_closure_status = TRUE
WHERE LOWER(code) IN ('sold', 'rented', 'closed')
   OR LOWER(name) IN ('sold', 'rented', 'closed');

UPDATE statuses
SET is_closure_status = FALSE
WHERE is_closure_status IS NULL;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_statuses_code ON statuses(code);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_statuses_name ON statuses(name);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_statuses_updated_at ON statuses;
CREATE TRIGGER update_statuses_updated_at 
  BEFORE UPDATE ON statuses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_statuses_updated_at();
