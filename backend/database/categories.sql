-- Categories table for property types
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, code, description) VALUES
  ('Apartment', 'A', 'Residential apartment units'),
  ('Chalet', 'C', 'Mountain or vacation chalets'),
  ('Duplex', 'D', 'Two-story residential units'),
  ('Factory', 'F', 'Industrial factory buildings'),
  ('Land', 'L', 'Vacant land for development'),
  ('Office', 'O', 'Commercial office spaces'),
  ('Cloud Kitchen', 'CK', 'Food preparation facilities'),
  ('Polyclinic', 'PC', 'Medical clinic facilities'),
  ('Project', 'P', 'Development projects'),
  ('Pub', 'PB', 'Bar and pub establishments'),
  ('Restaurant', 'R', 'Dining establishments'),
  ('Rooftop', 'RT', 'Rooftop spaces and terraces'),
  ('Shop', 'S', 'Retail shop spaces'),
  ('Showroom', 'SR', 'Display and exhibition spaces'),
  ('Studio', 'ST', 'Small residential or work units'),
  ('Villa', 'V', 'Luxury residential villas'),
  ('Warehouse', 'W', 'Storage and logistics facilities'),
  ('Industrial Building', 'IB', 'Industrial facilities'),
  ('Pharmacy', 'PH', 'Medical pharmacy facilities'),
  ('Bank', 'B', 'Financial institution facilities'),
  ('Hangar', 'H', 'Aircraft storage facilities'),
  ('Industrial Warehouse', 'IW', 'Large industrial storage facilities')
ON CONFLICT (name) DO NOTHING;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_categories_updated_at();
