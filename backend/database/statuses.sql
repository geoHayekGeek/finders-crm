-- Statuses table for property statuses
CREATE TABLE IF NOT EXISTS statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT TRUE,
  can_be_referred BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default statuses
INSERT INTO statuses (name, code, description, color, can_be_referred) VALUES
  ('Active', 'active', 'Property is available for sale/rent', '#10B981', TRUE),
  ('Inactive', 'inactive', 'Property is temporarily unavailable', '#6B7280', TRUE),
  ('Sold', 'sold', 'Property has been sold', '#EF4444', FALSE),
  ('Rented', 'rented', 'Property has been rented', '#8B5CF6', FALSE),
  ('Under Contract', 'under_contract', 'Property is under contract', '#F59E0B', TRUE),
  ('Pending', 'pending', 'Property is pending approval', '#3B82F6', TRUE),
  ('Reserved', 'reserved', 'Property is reserved for a client', '#EC4899', TRUE)
ON CONFLICT (name) DO NOTHING;

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
